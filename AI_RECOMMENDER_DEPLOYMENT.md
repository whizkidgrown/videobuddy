# AI Recommender Deployment Guide

## Overview
On-demand AI recommender using Google Gemini Flash (free tier) that reads user ratings and generates personalized show recommendations.

**Commit:** f57311a  
**PR/Branch:** main

---

## Features Implemented

### 1. Supabase Edge Function
- **Location:** `supabase/functions/recommend/index.ts`
- **Function:** Reads all ratings from database, calls Google Gemini Flash API
- **Output:** 5 top picks + 10 "have you seen these" shows
- **Deduplication:** Server-side case-insensitive dedupe against ratings and shows.json
- **Storage:** Results stored in `suggestions` table

### 2. Database Table
- **Table:** `suggestions`
- **Schema:**
  - `id` (bigserial, primary key)
  - `title` (text, unique)
  - `kind` (text, 'top' or 'batch')
  - `meta` (jsonb, show data)
  - `created_at` (timestamptz)
- **RLS:** Anonymous read access enabled

### 3. UI Changes
- Removed page header "Hemant's TV Tracker"
- Page title changed to "VideoBuddy"
- Tabs now at top of page
- Filters moved to right side panel (icon button)
- Removed page headings under tabs
- Added "✨ Get new picks" button on New Ratings tab
- Cleaner, content-focused layout

---

## Deployment Steps

### Step 1: Run SQL Migration

Connect to your Supabase project and run the migration:

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Run SQL directly in Supabase Dashboard (SQL Editor)
```

**SQL to execute** (if running manually):

```sql
-- Create suggestions table for AI recommendations
CREATE TABLE IF NOT EXISTS suggestions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('top', 'batch')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suggestions_kind ON suggestions(kind);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to read all suggestions
CREATE POLICY "Allow anonymous select on suggestions"
  ON suggestions
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Only service role can insert/update/delete
CREATE POLICY "Service role can manage suggestions"
  ON suggestions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Step 2: Get Google Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Create or select a project
3. Click "Create API Key"
4. Copy the API key (starts with `AIza...`)
5. **Free tier:** 60 requests per minute, no cost

### Step 3: Set Supabase Secret

```bash
# Set the Gemini API key as a Supabase secret
supabase secrets set GEMINI_API_KEY=AIzaSy...your_key_here
```

**Or via Supabase Dashboard:**
1. Project Settings → Edge Functions → Secrets
2. Add new secret:
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSy...your_key_here`

### Step 4: Deploy Edge Function

```bash
# Deploy the recommend function
supabase functions deploy recommend
```

**Expected output:**
```
Deploying function recommend...
Function recommend deployed successfully.
```

### Step 5: Test the Function

```bash
# Test locally (optional)
supabase functions serve recommend

# Test deployed function
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/recommend' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

**Expected response:**
```json
{
  "success": true,
  "topPicks": 5,
  "batch": 10
}
```

### Step 6: Verify Database

Check that suggestions were stored:

```sql
SELECT title, kind, created_at FROM suggestions ORDER BY created_at DESC;
```

You should see ~15 rows (5 'top', 10 'batch').

---

## Environment Variables Required

The Edge Function requires these environment variables (automatically available):

- ✅ `SUPABASE_URL` - Auto-provided by Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase
- ⚠️ `GEMINI_API_KEY` - **YOU MUST SET THIS** (Step 3)

---

## How It Works

### User Flow
1. User clicks "✨ Get new picks" button
2. Loading state shown
3. Edge Function called:
   - Reads all user ratings from database
   - Fetches shows.json titles
   - Calls Google Gemini with ratings as context
   - Asks for 5 top picks + 10 broader recommendations
   - Dedupes against existing ratings and shows
   - Stores in `suggestions` table
4. UI reloads and renders new suggestions
5. Success message shown

### Gemini Prompt
Provides user's:
- ❤️ Loved shows (as positive signals)
- 👍 Okay shows (as mild positive signals)
- 👎 Disliked shows (as negative signals)
- ✗ Not interested shows (as strong negatives)
- ? Not seen shows (as candidates)

Asks for mix of US, Indian, UK/Nordic titles available on subscribed services.

### Deduplication
- Server-side case-insensitive check
- Excludes any title in:
  - `ratings` table (any rating)
  - `shows.json` (existing catalog)
- Prevents duplicate recommendations

---

## Testing Locally

### 1. Start Local Supabase
```bash
supabase start
```

### 2. Apply Migration
```bash
supabase db reset
```

### 3. Set Local Secret
```bash
supabase secrets set --env-file .env.local GEMINI_API_KEY=AIza...
```

### 4. Serve Function
```bash
supabase functions serve recommend
```

### 5. Test Request
```bash
curl http://localhost:54321/functions/v1/recommend \
  -H "Authorization: Bearer $(supabase status -o json | jq -r .anon_key)"
```

---

## Cost Estimate (Free Tier)

- **Google Gemini Flash:** FREE (60 requests/min)
- **Supabase Edge Functions:** FREE (500K invocations/month)
- **Supabase Database:** FREE (500MB storage)

**Total:** $0/month for typical usage

---

## Troubleshooting

### Function fails with "GEMINI_API_KEY not configured"
→ Run `supabase secrets set GEMINI_API_KEY=...` (Step 3)

### Function returns 400/500 error
→ Check Edge Function logs:
```bash
supabase functions logs recommend --tail
```

### No suggestions appearing in database
→ Verify RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'suggestions';
```

### Gemini returns parsing error
→ Response format changed. Check function logs for raw response.

---

## Next Steps (NOT YET IMPLEMENTED)

The following UI wiring is NOT complete yet:

1. ⚠️ **Filter panel JavaScript** - `toggleFilterPanel()` function needs implementation
2. ⚠️ **Dynamic filter population** - Side panel should populate based on active tab
3. ⚠️ **AI suggestions rendering** - `renderNewRatings()` should include suggestions from database
4. ⚠️ **Database credentials** - UI needs Supabase URL/key in localStorage or env

These will be implemented in the next iteration.

---

## Files Modified

- `supabase/functions/recommend/index.ts` ← NEW Edge Function
- `supabase/migrations/20261102_create_suggestions.sql` ← NEW Migration
- `index.html` - UI cleanup (header removed, filters to side panel)
- `styles.css` - Side panel styles, cleaner layout
- `app.js` - Added `getNewRecommendations()` and `loadSuggestionsFromDatabase()` (partial)

---

## Deployment Checklist

- [ ] SQL migration applied (`suggestions` table created)
- [ ] Google Gemini API key obtained
- [ ] Gemini API key set as Supabase secret
- [ ] Edge Function deployed (`recommend`)
- [ ] Test function call (should return `{success: true}`)
- [ ] Verify suggestions in database (should have ~15 rows)
- [ ] Complete filter panel JavaScript (next step)
- [ ] Wire AI suggestions to UI rendering (next step)

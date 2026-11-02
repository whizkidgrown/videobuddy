# Supabase Database Setup Guide

Your TV tracker now saves ratings to a persistent Supabase database (not just localStorage). This allows your assistant to read all your ratings server-side to suggest new titles.

## One-Time Setup (5 minutes)

### Step 1: Create a Free Supabase Account

1. Go to https://supabase.com
2. Click "Start your project" 
3. Sign up with GitHub or email (free forever tier)

### Step 2: Create a New Project

1. Click "New Project"
2. Choose any name (e.g., "tv-tracker")
3. Create a strong database password (save it!)
4. Select a region close to you
5. Click "Create new project"
6. Wait ~2 minutes for setup to complete

### Step 3: Create the Ratings Table

1. In your project, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Paste this SQL and click "Run":

```sql
-- Create ratings table
CREATE TABLE ratings (
    id BIGSERIAL PRIMARY KEY,
    show_title TEXT UNIQUE NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('loved', 'okay', 'disliked')),
    imdb_id TEXT,
    rated_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts and updates (for the website)
CREATE POLICY "Allow anonymous inserts" ON ratings
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anonymous updates" ON ratings
    FOR UPDATE
    TO anon
    USING (true);

-- Create index for faster lookups
CREATE INDEX idx_ratings_show_title ON ratings(show_title);
CREATE INDEX idx_ratings_rated_at ON ratings(rated_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE
    ON ratings FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Step 4: Get Your API Credentials

1. Click "Settings" (gear icon) in the left sidebar
2. Click "API" under Project Settings
3. You'll see two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

4. Copy both values

### Step 5: Send Me These Two Values

**I need you to provide me with:**

```
SUPABASE_URL: https://xxxxx.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

Once you give me these, I'll update the site configuration and push it live. The anon key is safe to expose in client code because Row Level Security (RLS) restricts what it can do.

## How Your Assistant Reads Ratings (Server-Side)

Your assistant can fetch all ratings using this REST API:

### Option 1: Simple REST API Call

```bash
curl "https://YOUR_PROJECT_URL.supabase.co/rest/v1/ratings?select=*&order=rated_at.desc" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Option 2: Filter and Sort

Get only "loved" shows:
```bash
curl "https://YOUR_PROJECT_URL.supabase.co/rest/v1/ratings?rating=eq.loved&select=*&order=rated_at.desc" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Get recent ratings (last 30 days):
```bash
curl "https://YOUR_PROJECT_URL.supabase.co/rest/v1/ratings?rated_at=gte.$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S.000Z)&select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Option 3: JavaScript/Node.js

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_KEY = 'your-anon-key';

const response = await fetch(`${SUPABASE_URL}/rest/v1/ratings?select=*&order=rated_at.desc`, {
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
});

const ratings = await response.json();
console.log(ratings);
```

### Response Format

```json
[
    {
        "id": 1,
        "show_title": "Happy Valley",
        "rating": "loved",
        "imdb_id": "tt3428912",
        "rated_at": "2026-11-02T20:15:30.123Z",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2026-11-02T20:15:30.123Z",
        "updated_at": "2026-11-02T20:15:30.123Z"
    },
    ...
]
```

## Query Examples

### Get count of ratings by type
```
GET /rest/v1/ratings?select=rating&rating=eq.loved
GET /rest/v1/ratings?select=rating&rating=eq.okay
GET /rest/v1/ratings?select=rating&rating=eq.disliked
```

### Get most recently rated shows
```
GET /rest/v1/ratings?select=*&order=rated_at.desc&limit=10
```

### Get shows rated in the last 7 days
```
GET /rest/v1/ratings?rated_at=gte.2026-10-26T00:00:00Z&select=*
```

## Security Notes

✅ **Safe to expose:**
- Supabase URL
- Anon public key
- Both are in client-side code and that's by design

✅ **Protected by RLS:**
- Anonymous users can only INSERT and UPDATE ratings
- They CANNOT DELETE ratings
- Read access requires authentication (your assistant uses the anon key)

✅ **No GitHub tokens:**
- No write access tokens in the code
- No security risks

## Troubleshooting

**Problem:** "Row Level Security policy violation"
- Solution: Make sure you ran the RLS policy SQL in Step 3

**Problem:** "relation 'ratings' does not exist"
- Solution: Run the CREATE TABLE SQL in Step 3 again

**Problem:** Ratings not showing up
- Solution: Check the browser console (F12) for errors

**Problem:** Can't read ratings from server
- Solution: Make sure you're using the anon key in the Authorization header

## Migration Notes

- Old ratings from localStorage will be merged with database ratings
- localStorage serves as a backup if database is unavailable
- Once database is configured, all new ratings go to both places
- No data loss during transition

---

**Ready to go?** Just send me your SUPABASE_URL and SUPABASE_ANON_KEY and I'll configure the site!

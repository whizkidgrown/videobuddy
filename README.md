# 📺 Hemant's TV Tracker

A beautiful, dark IMDb-style personal TV tracker to rate and track shows.

## 🚀 Live Site

Once GitHub Pages is enabled, the site will be live at: **https://whizkidgrown.github.io/videobuddy/**

## ⚙️ Setup Instructions

Since this repository is currently private, follow these steps to deploy the site:

### 1. Make Repository Public

1. Go to **https://github.com/whizkidgrown/videobuddy/settings**
2. Scroll down to the **Danger Zone** section
3. Click **Change visibility** → **Make public**
4. Confirm by typing the repository name

### 2. Enable GitHub Pages

1. Go to **https://github.com/whizkidgrown/videobuddy/settings/pages**
2. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions**
3. Click **Save**

The site will automatically deploy! The workflow is already set up and will run automatically once Pages is enabled.

### 3. Access Your Site

After the deployment completes (takes ~1 minute), visit:
**https://whizkidgrown.github.io/videobuddy/**

## ✨ Features

- **Today's Batch**: 7 curated shows to rate (Loved/Okay/Disliked/Haven't Seen)
- **Top 5 Picks**: Personalized recommendations with streaming info
- **My Shows Library**: Full collection with:
  - Filter by rating and watch status
  - Real-time search
  - Sort by IMDb rating
  - Every card shows poster, IMDb rating, genres, and streaming service
- **Want to Watch/Watching/Watched** buttons for status tracking
- **Export My Ratings**: Copy your ratings as JSON to share
- **Dark IMDb-style theme**: Professional, mobile-friendly design
- **Persistent storage**: All ratings saved in browser localStorage

## 📊 Data Structure

Show data is stored in `data/shows.json` and can be updated daily by committing changes to this file.

Each show includes:
- Title, year, language
- IMDb ID and rating
- Poster image URL
- Genres
- Your rating (loved/okay/disliked)
- Watch status
- US streaming service

## 🎨 Design

- Dark theme inspired by IMDb
- Yellow accent colors (#f5c518)
- Responsive grid layout
- Mobile-optimized
- High-quality poster images with fallback tiles

## 🔄 Daily Updates

To update show data:
1. Edit `data/shows.json` directly in GitHub
2. Commit the changes to `main` branch
3. GitHub Actions will automatically redeploy the site

## 💾 Export Your Ratings

Click the **Export My Ratings** button in the top right to copy your personal ratings as JSON. You can share this to update the data file with your latest preferences.

---

Built with vanilla JavaScript, no frameworks needed. Fast, lightweight, and always available.

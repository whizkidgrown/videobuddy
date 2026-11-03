# Version Bump Reminder

## Cache-Busting Version Strings

To prevent browser caching issues (especially Safari), all CSS and JS files have version query strings.

### Current Versions (as of commit e2e3965)
- `styles.css?v=20261103a`
- `database.js?v=20261103a`
- `app.js?v=20261103a`

---

## When to Bump

**Bump the version string** in `index.html` whenever you modify:
- `styles.css` → Increment version
- `database.js` → Increment version
- `app.js` → Increment version

### Version Format

Use: `YYYYMMDD` + letter (`a`, `b`, `c`, etc.)

**Examples:**
- First change on Nov 3, 2026: `20261103a`
- Second change same day: `20261103b`
- Third change same day: `20261103c`
- Next day first change: `20261104a`

---

## How to Bump

1. **Make your changes** to CSS/JS files

2. **Update index.html:**
   ```html
   <!-- Bump the version letter or date -->
   <link rel="stylesheet" href="styles.css?v=20261103b">
   <script src="database.js?v=20261103b"></script>
   <script src="app.js?v=20261103b"></script>
   ```

3. **Commit together:**
   ```bash
   git add styles.css index.html
   git commit -m "Update styles and bump cache version to 20261103b"
   git push origin main
   ```

---

## Why This Matters

Without version bumps:
- Safari aggressively caches JS/CSS
- iPhone users see old code
- New features don't work
- Bugs persist even after fixes

With version bumps:
- Browser sees new URL
- Forces fresh download
- Users get latest code immediately
- No cache issues

---

## Quick Reference

**Location:** `index.html` (top and bottom)

**Lines to update:**
- Line ~7: `<link rel="stylesheet" href="styles.css?v=...">`
- Line ~86: `<script src="database.js?v=...">`
- Line ~87: `<script src="app.js?v=...">`

**Rule:** Changed file = bump version in index.html

---

## Automation Idea (Future)

Consider adding a build script that auto-generates versions:
- Hash-based: `app.js?v=abc123def`
- Timestamp-based: `app.js?v=1699747200`
- Git commit-based: `app.js?v=e2e3965`

For now, manual bumps work fine for this small project.

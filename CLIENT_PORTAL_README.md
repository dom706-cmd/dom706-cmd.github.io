# Aleandri Creative Client Portal

## Files added
- `portal.html` — private client portal entry page
- `portal.js` — portal UI logic, browser-local persistence, notes, uploads
- `portal-config.js` — editable passwords and brand configuration

## Default passwords to change immediately
Edit `portal-config.js` and change:
- `clientPassword: 'client-preview-2026'`
- `adminPassword: 'dom-admin-2026'`

## What this build does
- Static-site client portal with password-only entry
- Separate client and admin access modes
- Brand project boards for:
  - Ecko Unltd.
  - Ecko Red
  - Rocawear
  - Material Girl
  - Zoo York
- Each brand has 3 asset pools:
  - outfits
  - locations
  - models
- Each brand also has look boards:
  - Look 1
  - Look 2
  - Look 3
  - Look 4
  - plus add-look support
- Each look can contain:
  - selected outfit
  - selected location
  - selected model
  - production notes
  - client feedback
  - status (draft / under review / approved / revise)
- Assets can be assigned into looks two ways:
  - click "Add to Look X"
  - drag/drop into the matching look slot
- Click-to-enlarge modal image previews
- Approval/status color-coding on look cards
- Print / export via browser print layout per brand
- Each asset can carry notes/comments
- Admin mode can upload images into each pool using browser file input
- Shared project notes per brand
- Suggested examples for outfits / locations / models

## Important limitation
This version is **browser-local only**.
That means:
- passwords are visible in the static JS config file
- uploads are stored in the current browser's `localStorage`
- comments/notes are stored in the current browser's `localStorage`
- this is not yet a true multi-user synced backend

## Why it was built this way
You asked for it built now directly into the current site without standing up a backend. This gives you a working visual/client-review structure immediately and clean upgrade points later.

## Recommended next upgrade
For production use with a real client:
1. move auth to a real backend
2. store uploaded assets in S3 / Supabase storage / Cloudflare R2
3. store project/brand/notes data in a database
4. add signed client links or per-project passwords
5. optionally add image annotation overlays instead of note-only comments

## Entry points
- Main site: `index.html`
- Client portal: `portal.html`

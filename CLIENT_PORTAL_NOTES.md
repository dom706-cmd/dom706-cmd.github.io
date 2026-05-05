# Client Portal Notes

## Editable Passwords

The static portal passwords live in `portal/config.js`.

- Client password default: `client-preview-2026`
- Admin password default: `admin-studio-2026`

Change both before using this outside of internal review. This is only in-browser gating, not secure authentication.

## Local-Only Persistence

The portal is a pure static HTML/CSS/JS build. There is no backend.

- Comments are stored in `localStorage` under the key `aleandriCreativePortalState`.
- Admin image uploads are converted to browser-local data URLs and stored in the same `localStorage` object.
- Uploaded assets and comments persist only in the same browser on the same device.
- Clearing browser storage, using private browsing, or opening the site in another browser will lose or isolate that data.

## Upgrade Path

When a backend is added, replace the following concerns in `portal/app.js`:

- Password checking in `handleLogin`
- `loadStore` / `persistStore`
- Admin upload handling in `handleAdminUpload`
- Comment submission in `handleCommentSubmit`

The UI and brand seed data can remain mostly intact while persistence and auth move to a real API.

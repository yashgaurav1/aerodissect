# AeroDissect — deployment

A static website: no build step, no server code and no database. Upload this folder as it is to any static host.

## What's in the folder
- `index.html`: the site (landing page and workbench).
- `assets/`: Three.js r128 and OrbitControls (bundled locally, no CDN needed), the app code, icons and the share image.
- `manifest.webmanifest` and `sw.js`: make it installable as an app on phones and desktop, and let it reopen offline after the first visit (needs HTTPS).
- `netlify.toml` and `vercel.json`: caching headers for those hosts.
- `404.html`: sends unknown URLs back to the site.
- `.nojekyll`: lets GitHub Pages serve the folder as it is.

## Option 1 — Netlify Drop (fastest, no account setup)
1. Go to https://app.netlify.com/drop
2. Drag this whole `deploy` folder onto the page.
3. You get a live HTTPS URL in seconds. Sign in to keep it and rename it (Site settings → Change site name).

## Option 2 — Vercel
1. Install the CLI: `npm i -g vercel`
2. In this folder, run `vercel` and accept the defaults (there is no build command; the output directory is `.`).
3. Run `vercel --prod` for the production URL.

## Option 3 — GitHub Pages (free, from a repository)
1. Create a repository and push the contents of this folder to the `main` branch, with `index.html` at the root.
2. In the repository, go to Settings → Pages → Source: "Deploy from a branch", then choose `main` and `/ (root)`.
3. The site goes live at `https://<user>.github.io/<repo>/` within a minute or two.

## Option 4 — Cloudflare Pages
In Cloudflare, go to Workers & Pages → Create → Pages → "Upload assets", then drag this folder in. No build settings are needed.

## Testing locally
Service workers and some browser features need a real HTTP server, so don't open `index.html` from disk.
```
cd deploy
python3 -m http.server 8080
# then open http://localhost:8080
```

## Updating
Replace `index.html` and `assets/app.js`, and bump `VERSION` in `sw.js` so returning visitors get the new version.

## Custom domain
Every host above lets you add a domain under its Domains settings. Point a CNAME (or an A record at the apex) at the host, as it instructs. HTTPS is issued automatically.

## Requirements for visitors
Any current browser with WebGL: Chrome, Edge, Safari 15+ (iOS and macOS), Firefox or Samsung Internet. Fonts load from Google Fonts and fall back to system fonts when offline.

Designed by Yash Gaurav — https://www.linkedin.com/in/yash-gaurav/

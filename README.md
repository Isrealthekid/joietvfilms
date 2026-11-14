# JTVF — The Film Gallery

A responsive Next.js exhibition of films, inspired by framed artwork on a red gallery wall.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. `npm run build` generates the static production site in `out/`.

## Deploy on Vercel

Import this repository with the repository root as the Root Directory and `main` as the production branch. The tracked `vercel.json` runs `npm ci`, builds the Next.js static export, and publishes `out/`, which contains `index.html`, JavaScript, CSS, and posters. The framework preset is explicitly `Other` because this deployment serves the exported site without a Next.js server.

Do not publish `public/` or the repository root: neither contains the generated homepage. If a deployment still returns Vercel's `NOT_FOUND`, confirm the project is using the latest `main` commit and that the domain is assigned to that production deployment.

## Deploy on Cloudflare Workers

The gallery is a Next.js static export. `wrangler.jsonc` builds it with `npm run build` and deploys `out/` as Workers Static Assets. OpenNext is not needed for this phase.

For a Git-connected Worker, use the repository root, production branch `main`, and deploy command `npx wrangler deploy`. Leave the dashboard Build command empty because Wrangler runs the configured build itself. Remove any dashboard command that runs `opennextjs-cloudflare`. The configured Worker name is `joietvfilms`; if your existing Worker has a different name, match it in `wrangler.jsonc` before deployment.

Validate without uploading with `npx wrangler deploy --dry-run`. For Cloudflare Pages instead of Workers, use build command `npm run build` and output directory `out` with no OpenNext adapter.

## Included in this first phase

- Gold rectangular frames with locally stored photographic poster artwork.
- Three-second eased depth transitions: the selected frame recedes toward the wall while other frames move forward, blur, and fade.
- Film title, synopsis, director, and cast alongside the selected poster; stacked below on mobile.
- Continuous automatic marquee with hover/focus pause and a pause/play control.
- Minimal transparent navigation text: Films — Works / Collaborate — Contact.
- Navigation labels without supplied destinations remain plain text.
- Keyboard controls, Escape to return, and reduced-motion preferences.

Films, cast, directors, and synopses are fictional demo content. Photographic artwork is sourced from Unsplash. Replace the sample records in `app/page.tsx` and images in `public/posters/` with your licensed film assets.

## Dashboard, database, and poster storage

The `/dashboard` route manages films, drafts, publishing, order, NEW ribbons, posters, and YouTube links. Supabase provides authentication and an RLS-protected database; a separate Cloudflare Worker uploads posters into a private R2 bucket. The frontend remains a static export on both hosts. See [dashboard setup](docs/dashboard-setup.md) for deployment commands, environment configuration, and access controls.

Reduced-motion users can browse all films using keyboard focus, without automatic movement.

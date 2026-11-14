# JTVF — The Film Gallery

A responsive Next.js exhibition of films, inspired by framed artwork on a red gallery wall.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. `npm run build` generates the static production site in `out/`.

## Included in this first phase

- Gold rectangular frames with locally stored photographic poster artwork.
- Three-second eased depth transitions: the selected frame recedes toward the wall while other frames move forward, blur, and fade.
- Film title, synopsis, director, and cast alongside the selected poster; stacked below on mobile.
- Continuous automatic marquee with hover/focus pause and a pause/play control.
- Minimal transparent navigation text: Films — Works / Collaborate — Contact.
- Navigation labels without supplied destinations remain plain text.
- Keyboard controls, Escape to return, and reduced-motion preferences.

Films, cast, directors, and synopses are fictional demo content. Photographic artwork is sourced from Unsplash. Replace the sample records in `app/page.tsx` and images in `public/posters/` with your licensed film assets.

## Next phase

The admin dashboard, Supabase database/authentication, and Cloudflare R2 uploads are not implemented in this display-first phase. The current app is a static export and needs no credentials. A future authenticated admin area should use Supabase row-level security and server-side signed R2 upload URLs; never expose privileged keys in the browser. Remove static-export mode or host the backend separately when adding server routes.

Reduced-motion users can browse all films using keyboard focus, without automatic movement.

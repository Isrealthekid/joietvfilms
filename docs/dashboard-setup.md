# Film dashboard and storage

## Architecture

- `/dashboard` is a static Next.js route with Supabase email/password sign-in.
- Supabase stores film metadata and administrator membership. RLS makes published films public, drafts administrator-only, and all writes administrator-only.
- The separate `joietvfilms-media` Cloudflare Worker validates each upload session with Supabase and checks current administrator membership before writing to R2.
- The R2 bucket stays private. The media Worker serves poster images at random public URLs. Poster images are public assets even when the associated film is a draft; confidential artwork should not be uploaded.
- YouTube links are normalized to video IDs and played through a `youtube-nocookie.com` embed. There are no video-file uploads.
- Both the Vercel and Cloudflare frontend deployments use this same database and media service.

## Configuration

`lib/public-config.json` contains only browser-safe connection details (project URL, publishable key, and media API URL). These are deliberately versioned so both Git-connected hosts work without separate dashboard environment changes. Optional `NEXT_PUBLIC_*` variables in `.env.example` override them at build time.

The supplied administrator credentials are in ignored `.env.local` as `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Neither is read by frontend code or given a `NEXT_PUBLIC_` prefix. Supabase stores the password hash; the dashboard does not compare passwords locally. Do not commit `.env.local`, service-role keys, or Cloudflare tokens.

Project: `anmyxgevwunuwinspioi` (JTVF, Ireland). Schema: `supabase/migrations/20261114222630_film_dashboard.sql`.

## R2 activation and deployment

1. Activate R2 Object Storage in the Cloudflare dashboard if it is not already enabled. Cloudflare may require billing setup.
2. Sign in with `npx wrangler login`.
3. Create the bucket: `npx wrangler r2 bucket create joietvfilms-posters`.
4. Verify `workers/wrangler.jsonc` contains the correct Supabase public connection details and all frontend origins in `ALLOWED_ORIGINS`.
5. Run `npm run check:media`, then `npm run deploy:media`.
6. Copy the returned HTTPS Worker URL into `lib/public-config.json` → `mediaApiUrl` (and any nonempty `NEXT_PUBLIC_MEDIA_API_URL` override), then rebuild and deploy the frontend.

No R2 S3 secret is needed: the Worker accesses its bucket through a binding. CORS is handled by the Worker; browsers never access the R2 S3 API directly.

Frontend Cloudflare deployment remains `npx wrangler deploy` at the repository root. The separate media service uses `npm run deploy:media`. Do not point the frontend deploy command at the media configuration.

## Managing films

Sign in at `/dashboard`, choose **Add a film**, upload a portrait JPEG/PNG/WebP (10 MB maximum), fill in the details, and optionally add a YouTube link. Use **Show NEW ribbon** and **Gallery order** to control presentation. Save as a draft or turn on **Publish to the gallery**. Publishing requires a poster, synopsis, director, and cast.

Films load when the gallery opens, when the tab regains focus, and every minute while visible. Drafts do not appear publicly. No redeploy is required for film changes. A newly connected database starts empty; the original fictional sample films are retained in `lib/sample-films.ts` for offline development, not inserted into the live collection.

Edits check `updated_at` to prevent silently overwriting another admin's changes. Replaced posters are deleted only after saving the new record. Deleting a film removes its record first, then attempts poster cleanup. Cleanup failures are reported; an admin can retry cleanup through the media API or R2 dashboard. Unsaved uploads from interrupted requests may need occasional R2 cleanup.

## Additional administrators

Create a user through Supabase Auth's admin tools, then insert its verified user ID into `public.gallery_admins` using the SQL editor. Frontend users cannot grant themselves this role. Remove the membership to revoke editing and uploading access immediately.

The one-time provisioning function used for initial setup has been disabled and no longer creates users. The supplied initial password remains as requested; update it through Supabase Auth before wider use. Supabase currently reports leaked-password protection as disabled: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Verification

`npm test` checks media authorization, file types/size limits, deletion safety, and YouTube validation. `npm run build` exports the gallery and dashboard. `npm run check:media` validates the Worker bundle without deploying.

Before production use, verify administrator sign-in, an actual R2 upload, draft/public visibility, editing, deletion, and YouTube playback on both hosts. Browsers may block YouTube playback when a video's owner disables embedding; **Watch on YouTube** remains available.

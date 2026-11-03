# Whimsy Post — SPEC

Virtual postcard app inspired by myvirtualpostcard.com. Whimsical vintage-postal design (Lora / Plus Jakarta Sans / IBM Plex Mono, paper tones).

## Flows
- `/` landing: hero with flippable demo card, how it works, design marquee (from `/api/designs`), sizes, FAQ.
- Auth: Clerk (email+password AND Google) when both Clerk keys are set. `/sign-in`, `/sign-up` render Clerk components. Without those keys, the same pages create a local desk account and the API accepts that session token instead. Frontend sends `Authorization: Bearer <token>` via `setTokenGetter` in `lib/api.ts` (registered by `AuthBridge`).
- `/app` dashboard (signed-in): greeting from `/api/me`, stats (total/sent/opened), search, tiles with status (Draft / Sent / Opened N×), copy link, activity popover (open history), delete w/ confirm.
- `/app/new`, `/app/edit/:id` editor: tabs Front (upload photo → `/api/uploads`, or pick 1 of 6 AI-illustrated designs), Format (landscape/portrait; standard 6x4, large 7x5, square), Message (to, from, message ≤600), Stamp (12 illustrated SVG stamps grouped by occasion tabs — Travel, Love, Birthday, Night & Nature, Your photo; the "photo" stamp renders the card's front image vintage-tinted; holographic foil sweep + hover tilt; 5 wax seal colours). Live 3D flip preview. "Save draft" (is_draft=true) or "Seal & send" (is_draft=false) → share dialog with link `/p/<share_id>`, WhatsApp, email, preview.
- `/p/:shareId` public recipient page: envelope with wax seal → tap → flap opens, card slides out, confetti, flip card. Tap records open (`POST /api/public/postcards/{share_id}/open`). Drafts are not public (404).

## Data (Mongo)
- `users`: user_id (Clerk id), email, name, image_url, created_at — sender profile, upserted on `GET /api/me`.
- `postcards`: id, share_id, owner_id, title, front_image_url, orientation, size, message, recipient_name, sender_name, stamp_id, seal_color, is_draft, date_str, created_at, updated_at, opened_count, last_opened_at, opens[{at, device}] (last 50).
- `uploads`: id, owner_id, content_type, data (binary) — served at `GET /api/uploads/{id}`.

## API (all /api)
GET /today, GET /designs, GET /me*, GET/POST /postcards*, GET/PUT/DELETE /postcards/{id}*, GET /public/postcards/{share_id}, POST /public/postcards/{share_id}/open, POST /uploads* (multipart `file`), GET /uploads/{id}, GET /clerk/config. (* = requires Clerk session)

Free — no payments/credits.

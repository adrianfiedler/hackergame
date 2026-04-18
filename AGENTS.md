# AGENTS Summary

## What this is
- Browser game with a retro `HX//OS` desktop fantasy: terminal hacking, passive crypto mining, IRC/browser/notepad apps, and a light multiplayer foundation.
- Monorepo with `client/` (React + Vite) and `server/` (Fastify + MySQL + Socket.IO).

## Run / build
- Root dev: `npm run dev`
- Client dev server: Vite on `5173`, proxying `/api`, `/auth`, and `/socket.io` to the Fastify server on `3000`.
- Production build writes client assets to `server/public`.

## Gameplay + data flow
- Auth flow is Google OAuth. Client boot is gated by `client/src/auth/AuthContext.jsx`, which fetches `/api/me` and only renders the desktop after auth.
- Core progression loop:
  - Passive mining is server-authoritative in `server/src/ticker.js` on a 10s interval.
  - Upgrade purchases are server-authoritative in `server/src/routes/player.js`.
  - Terminal hack targets and puzzle logic are currently client-side in `client/src/terminal.jsx`.
  - Cosmetic/local desktop state (notes, trash, snake score, hackedHosts) is kept in React state, mirrored to `localStorage`, and debounced to `/api/player/sync` via `client/src/state.jsx`.
- DB schema already includes future-facing multiplayer systems: machines, machine access, hack logs, guilds, channels, messages.

## Source of truth
- Prefer editing `client/src/*` and `server/src/*`.
- The old singleplayer root app has been moved to `legacy/singleplayer-root/` for reference. The repo root is now just the workspace/package entrypoint.

## Important caveats
- `server/src/migrate.js` uses a naive semicolon split on `schema.sql`; keep SQL simple unless migration parsing is improved.
- The repo currently depends on env config for MySQL, JWT, cookies, and Google OAuth in `server/.env`.

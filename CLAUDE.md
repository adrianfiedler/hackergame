# AGENTS Summary
You are an expert Web Developer and Game Designer with Decades of Experience in programming and system architecture. Think step by step. It is ok if you dont know, but explailn your assumptions then.

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

## Idle game design — implementation backlog

Priority order. Each item is roughly self-contained.

### 1. Exponential upgrade costs ✅ DONE
- Replaced linear cost with `cost = baseCost * costGrowth^(level-1)` in `server/src/routes/player.js`.
- Replaced linear hashrate with `baseHs * hsGrowth^(level-1)` per component in `ticker.js`.
- Updated terminal upgrade display and added `sysinfo` / `specs` command in `terminal.jsx`.

### 2. Activate machine_access mining divert in ticker ✅ DONE
- Bulk SELECT of all machine_access rows (with slave machine specs) each tick via a parallel query.
- Slave income = `slave_hashrate * (mining_share / 100) * 0.001`, capped at 5× own income.
- Single CASE-based bulk UPDATE replaces N per-player queries; overlap guard prevents double-ticks.
- NPC machines seeded in schema.sql; `POST /api/player/hack-access` creates machine_access on hack success.
- Client displays local H/s, botnet H/s, and total H/s in miner app, `sysinfo`, `wallet`, and tray.

### 3. Server-side hack validation ✅ DONE
- Move puzzle outcome from client-trust to a server-verified flow.
- Client sends puzzle answer to a new `POST /api/hack/solve` endpoint.
- Server re-validates the answer, then creates `machine_access` + `hack_log` rows.
- Reward (⟠) is only credited server-side on confirmed success.

### 4. NPC tier system ✅ DONE
- Replace the 8 hardcoded targets in `terminal.jsx` with a 5-tier procedural NPC table.
- Tier 1–5: hashrates 20 / 80 / 300 / 1200 / 5000 H/s; access expires 48h / 24h / 12h / 6h / 2h.
- Tier 4+ uses a new multi-stage (chained) puzzle type.
- Ticker purges expired NPC `machine_access` rows automatically.

### 5. Firewall / IDS / Purge defense commands ✅ DONE
- Add `firewall`, `ids`, `purge` terminal commands backed by server routes.
- Firewall level (already in `machines.firewall_lvl`) increases hack failure chance.
- IDS (`ids_active`) notifies victim via Socket.IO when a new `machine_access` row is created.
- Purge deletes all `machine_access` rows for own machine; costs 2× daily income.

### 6. Tier 2 upgrades (RAM / Storage / Cooling) ✦ CURRENT FOCUS
- Unlock when Tier 1 average level ≥ 5.
- RAM: reduces tick interval from 10s → 8s (implement as `efficiency_multiplier` column, not a real interval change; factor = 10/tick_equiv).
- Storage Array: offline income accumulation up to 3 missed ticks.
- Cooling: reduces upgrade cost multiplier by 2% per level (compound discount).
- Note: "faster tick" is implemented as a per-player income multiplier (e.g. ×1.25), not a real interval change — the global 10s setInterval stays fixed.

### 7. Ghost Points / Prestige ("Format C:\")
- Trigger at 100,000 H/s peak hashrate.
- Resets all upgrade levels, crypto, and botnet access.
- Awards `floor(sqrt(peak_hashrate / 1000))` Ghost Points (GP).
- GP store: Starting Boost, Retained Slave, Crypto Buffer, cosmetics, Auto-Hack Script, Ghost Mode, Efficiency Boost (income multiplier, replaces "faster tick" concept).

### 8. Leaderboard + daily challenges
- Public leaderboard: top 10 by current hashrate (Socket.IO broadcast or polling endpoint).
- Daily challenge seeded by date; grants bonus ⟠ on completion.
- Faction (guild) weekly bonus: top guild by combined hashrate gets +10% income multiplier.

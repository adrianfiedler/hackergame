Main Conflicts

CLAUDE.md currently matches the same project summary/backlog as AGENTS.md, but one caveat is already stale: it says migrate.js does a naive semicolon split, while the actual code sends the whole SQL file in one db.query(sql) call in server/src/migrate.js (line 7). That matters because future schema advice is being written against the wrong migration behavior.
The backlog’s multiplayer direction is only partially supported. The schema has machine_access, hack_log, guilds, channels, and messages in server/src/schema.sql (line 41), but the live server only registers auth, /api/me, and player sync/upgrade routes in server/src/index.js (line 64). There is no hack route, no guild route, no leaderboard route, and no defense route yet.
Hacking is still fully client-trusted, exactly as the backlog warns. Rewards are granted directly in the browser with setState(...) in client/src/terminal.jsx (line 232), while machine_access and hack_log are never touched anywhere server-side. That is the biggest integrity gap.
The UI already over-promises some multiplayer features. The wiki says players can chat in “your guild, or DM another operator” in client/src/apps.jsx (line 91), but the actual client/server only support #general, #trading, and #wanted in client/src/apps.jsx (line 291) and server/src/index.js (line 80).
A per-player system channel is created on account creation in server/src/routes/auth.js (line 85), but the IRC UI’s SYSTEM tab is just seeded local text, not backed by that channel in client/src/apps.jsx (line 293). So the schema and onboarding flow are ahead of the actual feature.
The reset command is misleading. It wipes localStorage only in client/src/terminal.jsx (line 130), but real progression is server-side for crypto and machine levels. Players will expect a full reset and won’t get one.
Upgrade state can temporarily desync. The terminal does an optimistic local deduction and level/hashrate bump before the server confirms in client/src/terminal.jsx (line 276), and on failure it never rolls back. That is a reliability issue even before future systems land.
Backlog vs Schema

Item 1 fits the current schema well. Exponential costs/hashrate only need logic changes in ticker.js, me.js, player.js, and terminal display. --> DONE
Item 2 mostly fits, but machine_access is missing a good lookup index for controller_id; the current unique key is (machine_id, controller_id) in server/src/schema.sql (line 48), which is not ideal for “find all slaves controlled by player X”. -->  DONE: added KEY idx_ma_controller (controller_id) to machine_access
Item 3 fits the schema well. machine_access and hack_log are already shaped for it.
Item 4 has a real schema conflict. NPC access expiry needs either an expires_at column on machine_access or a separate NPC access table; currently there is only installed_at in server/src/schema.sql (line 46). More importantly, NPCs don’t fit the current machines.owner_id -> players.id requirement in server/src/schema.sql (line 23). You would need fake players for NPC machines, nullable ownership, or a dedicated NPC target table.
Item 5 fits reasonably. firewall_lvl, ids_active, and honeypot_on already exist in server/src/schema.sql (line 29), but there is no system yet to emit alerts into the real per-player system channel.
Item 6 conflicts with the current model. There are no columns for efficiency multiplier, offline tick bank, cooling discount, or second-tier upgrade levels. Also, the current ticker grants income to every player forever regardless of online status or last_seen_at in server/src/ticker.js (line 23), which clashes with “offline accumulation up to 3 missed ticks”.
Item 7 conflicts with the schema. There is no peak_hashrate, ghost_points, prestige metadata, retained-slave slot, or buffer capacity anywhere yet.
Item 8 is mixed. Leaderboards can be computed from existing tables, guild bonus can use guild_members, but daily challenges need their own persistence if you want anti-repeat protection, rewards claiming, and date-seeded completion tracking.
Game Design Improvements

Make hacking feed the idle loop more directly. Right now hacks are mostly one-off cash injections; the future machine_access botnet mechanic is much more interesting, and I’d make that the core reward instead of raw payout.
Add a “heat/trace” layer before deepening puzzle complexity. Firewall, IDS, honeypots, purge, and grace windows become more fun if players are managing risk over time instead of just pass/fail puzzles.
Be careful with exponential growth on both cost and hashrate at the same time. That can feel great early, then become unreadable fast. I’d keep one curve strongly exponential and the other slightly softer or partially logarithmic.
Give players short-session goals. Daily challenges, bounty boards, and rotating target modifiers would help a lot because the fantasy is strong, but the current loop is still very numbers-forward.
Make guilds cooperative, not just leaderboard math. Shared raids, temporary intel sharing, pooled purge defense, or guild-only target chains would be much more fun than a passive +10% winner bonus.
Reliability Improvements

Move every reward source server-side: hacks, snake payout, future dailies, prestige rewards. Right now multiple reward paths are still client-owned.
Add an append-only economy/event log. With mining, hacks, upgrades, prestige, purge, and botnet shares, you will want auditability very quickly.
Make tick processing idempotent or time-based instead of “blind setInterval adds income”. The current loop in server/src/ticker.js (line 20) can drift and won’t scale cleanly.
Separate authoritative progression from cosmetic local_data more strictly. Right now local storage still mirrors the whole client state in client/src/App.jsx (line 71), which invites confusion.
Define NPCs as a first-class backend concept before building tier 4/5 puzzle chains. Trying to squeeze them into player-owned machines will create awkward exceptions all over the codebase.
Clean up the mojibake/encoding issues visible across the repo and docs. It’s not gameplay-critical, but it hurts the retro polish and will make content-heavy features like BBS, mail, and system logs feel rough.
Overall: the backlog direction is good, especially the shift toward server-authoritative hacking and botnet control. The biggest design risk is trying to build advanced mechanics on top of a data model that still assumes every machine belongs to a real player and every passive income source is always-on. The biggest fun opportunity is to make successful hacks grant durable strategic power, not just extra currency.
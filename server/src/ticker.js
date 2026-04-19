import db from './db.js'

const TICK_MS = 10_000              // 10 seconds
const INCOME_PER_HS_PER_TICK = 0.001 // ⟠ per H/s per tick

// baseHs * hsGrowth^(level-1) — must mirror UPGRADE_CONFIG in routes/player.js
const HS_CONFIG = {
  rig_level: { baseHs: 5,  hsGrowth: 1.4 },
  cpu_level: { baseHs: 12, hsGrowth: 1.5 },
  net_level: { baseHs: 30, hsGrowth: 1.7 },
}

export function calcHashrate(machine) {
  let hs = 1
  for (const [col, cfg] of Object.entries(HS_CONFIG)) {
    hs += cfg.baseHs * Math.pow(cfg.hsGrowth, machine[col] - 1)
  }
  return Math.round(hs)
}

function calcIncome(hashrate) {
  return parseFloat((hashrate * INCOME_PER_HS_PER_TICK).toFixed(6))
}

// onlinePlayers: Map<playerId, socketId> — injected by index.js
export function startTicker(io, onlinePlayers) {
  setInterval(async () => {
    try {
      const [rows] = await db.query(`
        SELECT p.id, p.crypto,
               m.rig_level, m.cpu_level, m.net_level
        FROM players p
        JOIN machines m ON m.owner_id = p.id
      `)

      for (const row of rows) {
        const hashrate = calcHashrate(row)
        const income   = calcIncome(hashrate)
        const newBalance = parseFloat((Number(row.crypto) + income).toFixed(6))

        await db.query(
          'UPDATE players SET crypto = ? WHERE id = ?',
          [newBalance, row.id]
        )

        const socketId = onlinePlayers.get(row.id)
        if (socketId) {
          io.to(socketId).emit('mining:tick', {
            earned:     income,
            newBalance,
            hashrate,
          })
        }
      }
    } catch (err) {
      console.error('[ticker] error:', err.message)
    }
  }, TICK_MS)

  console.log(`[ticker] mining tick every ${TICK_MS / 1000}s`)
}
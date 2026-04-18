import db from './db.js'

const TICK_MS = 10_000              // 10 seconds
const INCOME_PER_HS_PER_TICK = 0.001 // ⟠ per H/s per tick

export function calcHashrate(machine) {
  return (
    1 +
    (machine.rig_level - 1) * 5 +
    (machine.cpu_level - 1) * 10 +
    (machine.net_level - 1) * 25
  )
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
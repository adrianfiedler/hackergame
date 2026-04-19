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
  return hashrate * INCOME_PER_HS_PER_TICK
}

const SLAVE_CAP_MULTIPLIER = 5  // max slave income = 5× own income

// onlinePlayers: Map<playerId, socketId> — injected by index.js
export function startTicker(io, onlinePlayers) {
  let running = false

  setInterval(async () => {
    if (running) return
    running = true
    try {
      const [[rows], [slaveRows]] = await Promise.all([
        db.query(`
          SELECT p.id, p.crypto,
                 m.rig_level, m.cpu_level, m.net_level
          FROM players p
          JOIN machines m ON m.owner_id = p.id
        `),
        db.query(`
          SELECT ma.controller_id,
                 ma.mining_share,
                 sm.rig_level, sm.cpu_level, sm.net_level
          FROM machine_access ma
          JOIN machines sm ON sm.id = ma.machine_id
        `),
      ])

      // Build map: controller_id → [{slaveHashrate, miningShare}, ...]
      const slaveMap = new Map()
      for (const s of slaveRows) {
        const slaveHashrate = calcHashrate(s)
        const entry = { slaveHashrate, miningShare: Number(s.mining_share) }
        if (!slaveMap.has(s.controller_id)) slaveMap.set(s.controller_id, [])
        slaveMap.get(s.controller_id).push(entry)
      }

      // Compute new balances and collect socket notifications
      const updates = []       // [newBalance, playerId]
      const notifications = [] // { socketId, payload }

      for (const row of rows) {
        const hashrate  = calcHashrate(row)
        const ownIncome = calcIncome(hashrate)

        const cap = ownIncome * SLAVE_CAP_MULTIPLIER
        let slaveIncome = 0
        for (const { slaveHashrate, miningShare } of (slaveMap.get(row.id) ?? [])) {
          slaveIncome += slaveHashrate * (miningShare / 100) * INCOME_PER_HS_PER_TICK
        }
        slaveIncome = Math.min(slaveIncome, cap)

        const income     = ownIncome + slaveIncome
        const newBalance = Number(row.crypto) + income

        updates.push([row.id, newBalance])

        const socketId = onlinePlayers.get(row.id)
        if (socketId) {
          notifications.push({
            socketId,
            payload: { earned: income, ownEarned: ownIncome, slaveEarned: slaveIncome, newBalance, hashrate },
          })
        }
      }

      // Single bulk UPDATE for all players
      if (updates.length > 0) {
        const cases  = updates.map(() => 'WHEN ? THEN ?').join(' ')
        const ids    = updates.map(([id]) => id)
        const params = updates.flatMap(([id, bal]) => [id, bal])
        await db.query(
          `UPDATE players SET crypto = CASE id ${cases} END WHERE id IN (${ids.map(() => '?').join(', ')})`,
          [...params, ...ids]
        )
      }

      // Emit after DB write is confirmed
      for (const { socketId, payload } of notifications) {
        io.to(socketId).emit('mining:tick', payload)
      }
    } catch (err) {
      console.error('[ticker] error:', err.message)
    } finally {
      running = false
    }
  }, TICK_MS)

  console.log(`[ticker] mining tick every ${TICK_MS / 1000}s`)
}
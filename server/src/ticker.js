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

const RAM_MULT_PER_LEVEL = 0.25

function ramMultiplier(ramLevel) {
  return 1 + RAM_MULT_PER_LEVEL * ((ramLevel ?? 1) - 1)
}

// onlinePlayers: Map<playerId, socketId> — injected by index.js
export function startTicker(io, onlinePlayers) {
  let running = false

  setInterval(async () => {
    if (running) return
    running = true
    try {
      // Purge expired sessions and access rows (cheap indexed deletes, every tick)
      db.query('DELETE FROM hack_sessions WHERE expires_at < NOW()').catch(() => {})
      db.query('DELETE FROM machine_access WHERE expires_at IS NOT NULL AND expires_at < NOW()').catch(() => {})

      const [[rows], [slaveRows]] = await Promise.all([
        db.query(`
          SELECT p.id, p.crypto, p.last_ticked_at,
                 m.rig_level, m.cpu_level, m.net_level,
                 m.ram_level, m.storage_level
          FROM players p
          JOIN machines m ON m.owner_id = p.id
        `),
        db.query(`
          SELECT ma.controller_id,
                 ma.mining_share,
                 sm.rig_level, sm.cpu_level, sm.net_level,
                 sm.tier_hashrate
          FROM machine_access ma
          JOIN machines sm ON sm.id = ma.machine_id
          WHERE ma.expires_at IS NULL OR ma.expires_at > NOW()
        `),
      ])

      // Build map: controller_id → [{slaveHashrate, miningShare}, ...]
      const slaveMap = new Map()
      for (const s of slaveRows) {
        const slaveHashrate = s.tier_hashrate != null ? s.tier_hashrate : calcHashrate(s)
        const entry = { slaveHashrate, miningShare: Number(s.mining_share) }
        if (!slaveMap.has(s.controller_id)) slaveMap.set(s.controller_id, [])
        slaveMap.get(s.controller_id).push(entry)
      }

      // Compute new balances and collect socket notifications
      const updates       = []
      const notifications = []
      const tickedIds     = []

      for (const row of rows) {
        const hashrate  = calcHashrate(row)
        const ownIncome = calcIncome(hashrate)

        // RAM: income multiplier
        const ramMult = ramMultiplier(row.ram_level)

        // Storage: catch-up for missed ticks (server downtime)
        const storageMax = row.storage_level ?? 1
        let catchupTicks = 0
        if (row.last_ticked_at) {
          const msSinceTick = Date.now() - new Date(row.last_ticked_at).getTime()
          const missedTicks = Math.floor(msSinceTick / TICK_MS) - 1
          if (missedTicks > 0) {
            catchupTicks = Math.min(missedTicks, storageMax)
          }
        }

        const ownIncomeWithEffects = ownIncome * ramMult * (1 + catchupTicks)

        const cap = ownIncomeWithEffects * SLAVE_CAP_MULTIPLIER
        let slaveIncome = 0
        for (const { slaveHashrate, miningShare } of (slaveMap.get(row.id) ?? [])) {
          slaveIncome += slaveHashrate * (miningShare / 100) * INCOME_PER_HS_PER_TICK
        }
        slaveIncome = Math.min(slaveIncome, cap)

        const income     = ownIncomeWithEffects + slaveIncome
        const newBalance = Number(row.crypto) + income

        updates.push([row.id, newBalance])
        tickedIds.push(row.id)

        const socketId = onlinePlayers.get(row.id)
        if (socketId) {
          notifications.push({
            socketId,
            payload: { earned: income, ownEarned: ownIncomeWithEffects, slaveEarned: slaveIncome, newBalance, hashrate, ramMult, catchupTicks },
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

      if (tickedIds.length > 0) {
        await db.query(
          `UPDATE players SET last_ticked_at = NOW() WHERE id IN (${tickedIds.map(() => '?').join(', ')})`,
          tickedIds
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
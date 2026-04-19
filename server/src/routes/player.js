import db from '../db.js'
import { requireAuth } from '../auth/jwt.js'
import { calcHashrate } from '../ticker.js'

// cost(level) = baseCost * growthRate^(level-1)
// hsComponent(level) = baseHs * hsGrowth^(level-1)
const UPGRADE_CONFIG = {
  rig: { column: 'rig_level', baseHs: 5,  hsGrowth: 1.4, baseCost: 0.05, costGrowth: 1.6 },
  cpu: { column: 'cpu_level', baseHs: 12, hsGrowth: 1.5, baseCost: 0.12, costGrowth: 1.7 },
  net: { column: 'net_level', baseHs: 30, hsGrowth: 1.7, baseCost: 0.25, costGrowth: 1.9 },
}

export function upgradeCost(cfg, currentLevel) {
  return cfg.baseCost * Math.pow(cfg.costGrowth, currentLevel - 1)
}

export default async function playerRoutes(fastify) {
  // POST /api/player/sync — save local-only state (notepad, trash, snake score, etc.)
  fastify.post('/api/player/sync', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const localData = req.body || {}

    await db.query(
      'UPDATE players SET local_data = ?, last_seen_at = NOW() WHERE id = ?',
      [JSON.stringify(localData), playerId]
    )
    return { ok: true }
  })

  // POST /api/machine/upgrade — buy hardware upgrade (server validates crypto balance)
  fastify.post('/api/machine/upgrade', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const { kind } = req.body || {}

    const cfg = UPGRADE_CONFIG[kind]
    if (!cfg) return reply.code(400).send({ error: 'Unknown upgrade kind' })

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      const [[player]] = await conn.query(
        'SELECT crypto FROM players WHERE id = ? FOR UPDATE',
        [playerId]
      )
      const [[machine]] = await conn.query(
        `SELECT rig_level, cpu_level, net_level FROM machines WHERE owner_id = ? FOR UPDATE`,
        [playerId]
      )

      const currentLevel = machine[cfg.column]
      const cost = upgradeCost(cfg, currentLevel)

      if (Number(player.crypto) < cost) {
        await conn.rollback()
        return reply.code(402).send({ error: 'Insufficient funds', cost })
      }

      const newLevel   = currentLevel + 1
      const newCrypto  = Number(player.crypto) - cost
      const newHashrate = calcHashrate({ ...machine, [cfg.column]: newLevel })

      await conn.query(
        `UPDATE machines SET \`${cfg.column}\` = ? WHERE owner_id = ?`,
        [newLevel, playerId]
      )
      await conn.query(
        'UPDATE players SET crypto = ? WHERE id = ?',
        [newCrypto, playerId]
      )

      await conn.commit()

      return {
        ok: true,
        upgrade: { kind, newLevel },
        newCrypto,
        newHashrate,
      }
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  })

}
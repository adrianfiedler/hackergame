import db from '../db.js'
import { requireAuth } from '../auth/jwt.js'
import { calcHashrate } from '../ticker.js'

const UPGRADE_CONFIG = {
  rig: { column: 'rig_level', hsBonus: 5,  costMultiplier: 0.05 },
  cpu: { column: 'cpu_level', hsBonus: 10, costMultiplier: 0.08 },
  net: { column: 'net_level', hsBonus: 25, costMultiplier: 0.12 },
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
      const cost = parseFloat((currentLevel * cfg.costMultiplier).toFixed(6))

      if (Number(player.crypto) < cost) {
        await conn.rollback()
        return reply.code(402).send({ error: 'Insufficient funds', cost })
      }

      const newLevel   = currentLevel + 1
      const newCrypto  = parseFloat((Number(player.crypto) - cost).toFixed(6))
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
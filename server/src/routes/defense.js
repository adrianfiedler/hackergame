import db from '../db.js'
import { requireAuth } from '../auth/jwt.js'
import { calcHashrate } from '../ticker.js'

const FIREWALL_BASE_COST   = 0.10
const FIREWALL_COST_GROWTH = 2.0
const FIREWALL_MAX_LEVEL   = 5
const INCOME_PER_HS_TICK   = 0.001
const TICKS_PER_DAY        = 8640

function firewallCost(currentLevel) {
  return FIREWALL_BASE_COST * Math.pow(FIREWALL_COST_GROWTH, currentLevel - 1)
}
function dailyIncome(hashrate) {
  return hashrate * INCOME_PER_HS_TICK * TICKS_PER_DAY
}

export default async function defenseRoutes(fastify, io, onlinePlayers) {

  // POST /api/machine/defense/firewall — upgrade firewall level
  fastify.post('/api/machine/defense/firewall', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      const [[player]]  = await conn.query('SELECT crypto FROM players WHERE id = ? FOR UPDATE', [playerId])
      if (!player) {
        await conn.rollback()
        return reply.code(404).send({ error: 'player_not_found' })
      }

      const [[machine]] = await conn.query(
        'SELECT id, firewall_lvl FROM machines WHERE owner_id = ? FOR UPDATE',
        [playerId]
      )
      if (!machine) {
        await conn.rollback()
        return reply.code(404).send({ error: 'machine_not_found' })
      }

      if (machine.firewall_lvl >= FIREWALL_MAX_LEVEL) {
        await conn.rollback()
        return reply.code(400).send({ error: 'max_level', message: 'Firewall already at maximum level.' })
      }

      const cost = firewallCost(machine.firewall_lvl)
      if (Number(player.crypto) < cost) {
        await conn.rollback()
        return reply.code(402).send({ error: 'insufficient_funds', cost, message: `Need ${cost.toFixed(4)} ⟠.` })
      }

      const newLevel  = machine.firewall_lvl + 1
      const newCrypto = Number(player.crypto) - cost

      await conn.query('UPDATE machines SET firewall_lvl = ? WHERE id = ?', [newLevel, machine.id])
      await conn.query('UPDATE players SET crypto = ? WHERE id = ?', [newCrypto, playerId])

      await conn.commit()
      return { ok: true, newFirewallLvl: newLevel, newCrypto }
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  })

  // POST /api/machine/defense/ids — toggle IDS on/off (no cost)
  fastify.post('/api/machine/defense/ids', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player

    const [result] = await db.query(
      'UPDATE machines SET ids_active = 1 - ids_active WHERE owner_id = ?',
      [playerId]
    )
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'machine_not_found' })

    const [[machine]] = await db.query('SELECT ids_active FROM machines WHERE owner_id = ?', [playerId])
    return { ok: true, idsActive: !!machine.ids_active }
  })

  // POST /api/machine/defense/purge — evict all intruders; costs 2× daily income
  fastify.post('/api/machine/defense/purge', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      const [[player]]  = await conn.query('SELECT crypto FROM players WHERE id = ? FOR UPDATE', [playerId])
      if (!player) {
        await conn.rollback()
        return reply.code(404).send({ error: 'player_not_found' })
      }

      const [[machine]] = await conn.query(
        'SELECT id, rig_level, cpu_level, net_level FROM machines WHERE owner_id = ? FOR UPDATE',
        [playerId]
      )
      if (!machine) {
        await conn.rollback()
        return reply.code(404).send({ error: 'machine_not_found' })
      }

      const hashrate = calcHashrate(machine)
      const cost     = dailyIncome(hashrate) * 2

      if (Number(player.crypto) < cost) {
        await conn.rollback()
        return reply.code(402).send({ error: 'insufficient_funds', cost, message: `Need ${cost.toFixed(4)} ⟠ to purge.` })
      }

      const [[{ count }]] = await conn.query(
        'SELECT COUNT(*) AS count FROM machine_access WHERE machine_id = ?',
        [machine.id]
      )

      const newCrypto = Number(player.crypto) - cost
      await conn.query('DELETE FROM machine_access WHERE machine_id = ?', [machine.id])
      await conn.query('UPDATE players SET crypto = ? WHERE id = ?', [newCrypto, playerId])

      await conn.commit()
      return { ok: true, purgedCount: count, cost, newCrypto }
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  })
}

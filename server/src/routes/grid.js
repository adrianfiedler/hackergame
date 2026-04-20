import db from '../db.js'
import { requireAuth } from '../auth/jwt.js'

export default async function gridRoutes(fastify) {
  // GET /api/grid/neighborhood — returns all nodes in the player's subnet
  fastify.get('/api/grid/neighborhood', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player

    // 1. Get player's IP
    const [[machine]] = await db.query(
      'SELECT ip_address FROM machines WHERE owner_id = ? AND ip_address LIKE "10.%" LIMIT 1',
      [playerId]
    )

    if (!machine) {
      return reply.code(404).send({ error: 'No player machine found in grid.' })
    }

    const parts = machine.ip_address.split('.')
    const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.%`

    // 2. Fetch all nodes in this subnet
    const [nodes] = await db.query(
      `SELECT m.hostname, m.ip_address, m.tier, m.owner_id, 
              p.username AS owner_name,
              ma.expires_at AS access_expires
       FROM machines m
       LEFT JOIN players p ON p.id = m.owner_id
       LEFT JOIN machine_access ma ON ma.machine_id = m.id AND ma.controller_id = ? AND ma.expires_at > NOW()
       WHERE m.ip_address LIKE ?`,
      [playerId, prefix]
    )

    return {
      sector: parseInt(parts[1]),
      subnet: parseInt(parts[2]),
      nodes: nodes.map(n => ({
        hostname: n.hostname,
        ip:       n.ip_address,
        tier:     n.tier,
        is_npc:   n.owner_id === '00000000-0000-0000-0000-000000000001',
        owner:    n.owner_name || '[NPC]',
        owned:    n.access_expires !== null,
        is_self:  n.owner_id === playerId,
        node_id:  parseInt(n.ip_address.split('.')[3])
      }))
    }
  })
}

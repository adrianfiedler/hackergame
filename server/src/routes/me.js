import db from '../db.js'
import { requireAuth } from '../auth/jwt.js'
import { calcHashrate } from '../ticker.js'

export default async function meRoutes(fastify) {
  // GET /api/me — returns player + machine data to bootstrap client state
  fastify.get('/api/me', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player

    const [[player]] = await db.query(
      `SELECT id, username, wallet_addr, crypto, avatar_url, grace_ends_at, local_data
       FROM players WHERE id = ?`,
      [playerId]
    )
    if (!player) return reply.code(404).send({ error: 'Player not found' })

    const [[machine]] = await db.query(
      `SELECT id, hostname, ip_address, rig_level, cpu_level, net_level, firewall_lvl,
              ids_active, honeypot_on, ram_level, storage_level, cooling_level
       FROM machines WHERE owner_id = ?`,
      [playerId]
    )

    const hashrate = calcHashrate(machine)
    const localData = typeof player.local_data === 'string'
      ? JSON.parse(player.local_data)
      : (player.local_data || {})

    // Override hackedHosts with the DB-authoritative list from machine_access
    const [accessRows] = await db.query(
      `SELECT m.hostname FROM machine_access ma
       JOIN machines m ON m.id = ma.machine_id
       WHERE ma.controller_id = ?`,
      [playerId]
    )
    localData.hackedHosts = accessRows.map(r => r.hostname)

    return {
      player: {
        id:           player.id,
        username:     player.username,
        wallet_addr:  player.wallet_addr,
        crypto:       Number(player.crypto),
        avatar_url:   player.avatar_url,
        grace_ends_at: player.grace_ends_at,
      },
      machine: {
        id:          machine.id,
        hostname:    machine.hostname,
        ip_address:  machine.ip_address,
        rig_level:   machine.rig_level,
        cpu_level:   machine.cpu_level,
        net_level:   machine.net_level,
        firewall_lvl:   machine.firewall_lvl,
        ids_active:     !!machine.ids_active,
        honeypot_on:    !!machine.honeypot_on,
        ram_level:      machine.ram_level,
        storage_level:  machine.storage_level,
        cooling_level:  machine.cooling_level,
        hashrate,
      },
      localData,
    }
  })
}
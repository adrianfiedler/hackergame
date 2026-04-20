import { randomUUID } from 'crypto'
import db from '../db.js'
import { requireAuth } from '../auth/jwt.js'

const OPERATIONS = {
  scan_ports: {
    label:          'SCAN PORTS',
    base_ms:        5 * 1000,
    base_success:   0.85,
    stealth:        true,
    intel:          2,
    zero_day_chance: 0,
    crypto_mult:    0,
    grants_access:  false,
    reveals:        'success_rates',
  },
  probe_ids: {
    label:          'PROBE IDS',
    base_ms:        10 * 1000,
    base_success:   0.70,
    stealth:        true,
    intel:          5,
    zero_day_chance: 0,
    crypto_mult:    0,
    grants_access:  false,
    reveals:        'firewall',
  },
  hijack: {
    label:          'HIJACK',
    base_ms:        15 * 1000,
    base_success:   0.45,
    stealth:        false,
    intel:          0,
    zero_day_chance: 0,
    crypto_mult:    1,
    grants_access:  true,
    reveals:        null,
  },
  data_exfil: {
    label:          'DATA EXFIL',
    base_ms:        20 * 1000,
    base_success:   0.30,
    stealth:        false,
    intel:          8,
    zero_day_chance: 0.20,
    crypto_mult:    2,
    grants_access:  false,
    reveals:        null,
  },
}

function calcSuccess(opCfg, attacker, target) {
  const bonus   = (attacker.cpu_level * 0.03) + (attacker.net_level * 0.02)
  const penalty = (target.firewall_lvl * 0.08) + (target.ids_active ? 0.05 : 0)
  return Math.min(0.95, Math.max(0.05, opCfg.base_success + bonus - penalty))
}

function calcDurationMs(opCfg, attacker, target) {
  const aMult = Math.max(0.5, 1 - (attacker.cpu_level - 1) * 0.04)
  const tMult = 1 + (target.firewall_lvl - 1) * 0.05
  return Math.round(opCfg.base_ms * aMult * tMult)
}

function maxSlots(netLevel) {
  return Math.floor(netLevel / 3) + 1
}

export default async function operationsRoutes(fastify, io, onlinePlayers) {
  // GET /api/operations/info?hostname=X — per-op estimates for a target
  fastify.get('/api/operations/info', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const { hostname } = req.query
    if (!hostname) return reply.code(400).send({ error: 'hostname required' })

    const [[target]] = await db.query(
      'SELECT id, firewall_lvl, ids_active, hack_reward, tier FROM machines WHERE hostname = ?',
      [hostname]
    )
    if (!target) return reply.code(404).send({ error: 'unknown target' })

    const [[attacker]] = await db.query(
      'SELECT cpu_level, net_level FROM machines WHERE owner_id = ?',
      [playerId]
    )
    if (!attacker) return reply.code(404).send({ error: 'player machine not found' })

    // Running ops on this target by this player
    const [runningRows] = await db.query(
      `SELECT operation FROM hack_operations
       WHERE attacker_id = ? AND target_id = ? AND status = 'running'`,
      [playerId, target.id]
    )
    const runningOps = new Set(runningRows.map(r => r.operation))

    // Slot usage
    const [[{ used }]] = await db.query(
      `SELECT COUNT(*) AS used FROM hack_operations
       WHERE attacker_id = ? AND status = 'running'`,
      [playerId]
    )
    const max = maxSlots(attacker.net_level)

    // Completed scan_ports result (most recent success)
    const [[scanRow]] = await db.query(
      `SELECT reward_meta FROM hack_operations
       WHERE attacker_id = ? AND target_id = ? AND operation = 'scan_ports' AND status = 'success'
       ORDER BY completes_at DESC LIMIT 1`,
      [playerId, target.id]
    )
    const scanResult = scanRow?.reward_meta ?? null

    // Completed probe_ids result (most recent success)
    const [[probeRow]] = await db.query(
      `SELECT reward_meta FROM hack_operations
       WHERE attacker_id = ? AND target_id = ? AND operation = 'probe_ids' AND status = 'success'
       ORDER BY completes_at DESC LIMIT 1`,
      [playerId, target.id]
    )
    const probed = probeRow?.reward_meta ?? null

    const ops = Object.entries(OPERATIONS).map(([type, cfg]) => {
      const success_pct  = Math.round(calcSuccess(cfg, attacker, target) * 100)
      const duration_ms  = calcDurationMs(cfg, attacker, target)
      const rewards_parts = []
      if (cfg.intel)          rewards_parts.push(`+${cfg.intel} [INT]`)
      if (cfg.zero_day_chance) rewards_parts.push(`+[0DAY]?`)
      if (cfg.crypto_mult)    rewards_parts.push(`+⟠`)
      if (cfg.grants_access)  rewards_parts.push('ACCESS')

      return {
        type,
        label:       cfg.label,
        duration_ms,
        success_pct,
        rewards_desc: rewards_parts.join(' '),
        running:     runningOps.has(type),
      }
    })

    return { slots: { used: Number(used), max }, probed, scan_result: scanResult, ops }
  })

  // GET /api/operations — all active + uncollected ops for player
  fastify.get('/api/operations', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player

    const [[attacker]] = await db.query(
      'SELECT net_level FROM machines WHERE owner_id = ?',
      [playerId]
    )
    if (!attacker) return reply.code(404).send({ error: 'player machine not found' })
    const max = maxSlots(attacker.net_level)

    const [rows] = await db.query(
      `SELECT o.id, o.operation, o.started_at, o.completes_at, o.status,
              o.reward_crypto, o.reward_intel, o.reward_zeroday, o.reward_meta,
              m.hostname AS target_hostname
       FROM hack_operations o
       JOIN machines m ON m.id = o.target_id
       WHERE o.attacker_id = ? AND o.status IN ('running','success','failed')
       ORDER BY o.completes_at ASC`,
      [playerId]
    )

    const [[{ used }]] = await db.query(
      `SELECT COUNT(*) AS used FROM hack_operations
       WHERE attacker_id = ? AND status = 'running'`,
      [playerId]
    )

    const now = Date.now()
    const ops = rows.map(r => ({
      id:              r.id,
      operation:       r.operation,
      label:           OPERATIONS[r.operation]?.label ?? r.operation,
      target_hostname: r.target_hostname,
      started_at:      r.started_at,
      completes_at:    r.completes_at,
      status:          r.status,
      collectable:     r.status === 'running' && new Date(r.completes_at).getTime() <= now,
      reward_crypto:   Number(r.reward_crypto),
      reward_intel:    r.reward_intel,
      reward_zeroday:  r.reward_zeroday,
      reward_meta:     r.reward_meta,
    }))

    return { slots: { used: Number(used), max }, ops }
  })

  // POST /api/operations/start — launch an operation
  fastify.post('/api/operations/start', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const { hostname, operation } = req.body || {}
    if (!hostname || !operation) return reply.code(400).send({ error: 'hostname and operation required' })

    const opCfg = OPERATIONS[operation]
    if (!opCfg) return reply.code(400).send({ error: 'unknown operation' })

    const [[target]] = await db.query(
      'SELECT id, firewall_lvl, ids_active, hack_reward, tier, owner_id FROM machines WHERE hostname = ?',
      [hostname]
    )
    if (!target) return reply.code(404).send({ error: 'unknown target' })

    const [[attacker]] = await db.query(
      'SELECT cpu_level, net_level FROM machines WHERE owner_id = ?',
      [playerId]
    )
    if (!attacker) return reply.code(404).send({ error: 'player machine not found' })

    // Slot check
    const [[{ used }]] = await db.query(
      `SELECT COUNT(*) AS used FROM hack_operations
       WHERE attacker_id = ? AND status = 'running'`,
      [playerId]
    )
    if (Number(used) >= maxSlots(attacker.net_level)) {
      return reply.code(409).send({ error: 'slot_full', message: 'No free operation slots.' })
    }

    // Duplicate op type on same target check
    const [[existing]] = await db.query(
      `SELECT id FROM hack_operations
       WHERE attacker_id = ? AND target_id = ? AND operation = ? AND status = 'running'`,
      [playerId, target.id, operation]
    )
    if (existing) return reply.code(409).send({ error: 'already_running', message: 'Op already running on this target.' })

    const success_pct  = calcSuccess(opCfg, attacker, target)
    const duration_ms  = calcDurationMs(opCfg, attacker, target)
    const will_succeed = Math.random() < success_pct ? 1 : 0
    const completes_at = new Date(Date.now() + duration_ms)

    // Pre-compute reward values
    const reward_crypto  = will_succeed ? Number((target.hack_reward * opCfg.crypto_mult).toFixed(6)) : 0
    const reward_intel   = will_succeed ? opCfg.intel : 0
    const reward_zeroday = will_succeed && opCfg.zero_day_chance > 0 && Math.random() < opCfg.zero_day_chance ? 1 : 0

    // Pre-compute reveal metadata (stored regardless of success so failed ops reveal nothing on collect)
    let reward_meta = null
    if (will_succeed) {
      if (opCfg.reveals === 'success_rates') {
        const meta = {}
        for (const [type, cfg] of Object.entries(OPERATIONS)) {
          if (type !== 'scan_ports') {
            meta[`${type}_success_pct`] = Math.round(calcSuccess(cfg, attacker, target) * 100)
          }
        }
        reward_meta = meta
      } else if (opCfg.reveals === 'firewall') {
        reward_meta = { firewall_lvl: target.firewall_lvl, ids_active: !!target.ids_active }
      }
    }

    const started_at = new Date()
    await db.query(
      `INSERT INTO hack_operations
         (id, attacker_id, target_id, operation, started_at, completes_at, will_succeed,
          reward_crypto, reward_intel, reward_zeroday, reward_meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), playerId, target.id, operation, started_at, completes_at, will_succeed,
       reward_crypto, reward_intel, reward_zeroday,
       reward_meta ? JSON.stringify(reward_meta) : null]
    )

    // IDS alert for non-stealth ops
    if (!opCfg.stealth && target.ids_active) {
      try {
        const ownerSocket = onlinePlayers.get(target.owner_id)
        if (ownerSocket) {
          io.to(ownerSocket).emit('defense:ids_alert', {
            attacker: req.player.username ?? 'unknown',
            machineId: target.id,
            operation,
          })
        }
      } catch {}
    }

    return {
      started_at,
      completes_at,
      duration_ms,
      success_pct: Math.round(success_pct * 100),
    }
  })

  // POST /api/operations/:id/collect — collect a completed operation
  fastify.post('/api/operations/:id/collect', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const { id } = req.params

    const [[op]] = await db.query(
      `SELECT id, attacker_id, operation, completes_at, status, will_succeed,
              reward_crypto, reward_intel, reward_zeroday, reward_meta, target_id
       FROM hack_operations WHERE id = ?`,
      [id]
    )
    if (!op)                          return reply.code(404).send({ error: 'not found' })
    if (op.attacker_id !== playerId)  return reply.code(403).send({ error: 'forbidden' })
    if (op.status !== 'running')      return reply.code(409).send({ error: 'already_collected' })
    if (new Date(op.completes_at).getTime() > Date.now() + 1500) {
      return reply.code(409).send({ error: 'not_ready', message: 'Operation still in progress.' })
    }

    const success = !!op.will_succeed
    const newStatus = success ? 'success' : 'failed'

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      await conn.query(
        'UPDATE hack_operations SET status = ? WHERE id = ?',
        [newStatus, id]
      )

      if (success) {
        await conn.query(
          'UPDATE players SET crypto = crypto + ?, intel = intel + ?, zero_days = zero_days + ? WHERE id = ?',
          [op.reward_crypto, op.reward_intel, op.reward_zeroday, playerId]
        )

        // Grant machine access for hijack
        const opCfg = OPERATIONS[op.operation]
        if (opCfg?.grants_access) {
          const [[machine]] = await conn.query(
            'SELECT tier FROM machines WHERE id = ?', [op.target_id]
          )
          const TIER_EXPIRY = { 1: 48, 2: 24, 3: 12, 4: 6, 5: 2 }
          const expiryHours = TIER_EXPIRY[machine?.tier] ?? 24
          const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000)
          await conn.query(
            `INSERT IGNORE INTO machine_access (id, machine_id, controller_id, mining_share, expires_at)
             VALUES (UUID(), ?, ?, 15.00, ?)`,
            [op.target_id, playerId, expiresAt]
          )
        }
      }

      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }

    return {
      success,
      operation: op.operation,
      rewards: {
        crypto:    success ? Number(op.reward_crypto) : 0,
        intel:     success ? op.reward_intel : 0,
        zero_days: success ? op.reward_zeroday : 0,
      },
      meta: success ? op.reward_meta : null,
    }
  })
}

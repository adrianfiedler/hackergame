import { randomUUID } from 'crypto'
import db from '../db.js'
import { requireAuth } from '../auth/jwt.js'

const PASSWORDS      = ['godmode','swordfish','hunter2','rosebud','letmein','joshua','orange','trustno1','matrix','neural','megaman','zer0cool','crashoverride','acid','phreak','cyber']
const CIPHER_PHRASES = ['THE MEDIUM IS THE MESSAGE','HACK THE PLANET','MESS WITH THE BEST','TRUST NO ONE','MIND IS A RAZOR BLADE','RESISTANCE IS FUTILE']
const PORT_POOL      = [21,22,23,25,80,110,143,443,445,1337,3389,8080,31337]
const PORT_SVC       = {21:'ftp',22:'ssh',23:'telnet',25:'smtp',80:'http',110:'pop3',143:'imap',443:'https',445:'smb',1337:'elite',3389:'rdp',8080:'http-alt',31337:'backdoor'}
const MAX_ATTEMPTS   = 3
const FIREWALL_FAIL_RATE = 0.15  // per level above 1

// Hours of machine_access granted per tier; tier 0 = player machine (no expiry)
const TIER_EXPIRY_HOURS = { 1: 48, 2: 24, 3: 12, 4: 6, 5: 2 }

function shuffle(arr) { return arr.slice().sort(() => Math.random() - 0.5) }

function rot13(s) {
  return s.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + 13) % 26 + 65))
}

function generatePortscan(difficulty) {
  const shuffled     = shuffle(PORT_POOL)
  const displayCount = Math.min(8 + difficulty, PORT_POOL.length)
  const display      = shuffled.slice(0, displayCount)
  const openCount    = 3 + difficulty
  const openSet      = new Set(display.slice(0, openCount))
  const target       = display[openCount - 1]
  return {
    kind:    'portscan',
    answer:  String(target),
    choices: null,
    display: { ports: display.map(p => ({ port: p, open: openSet.has(p), service: PORT_SVC[p] || '?' })) },
  }
}

function generatePassword() {
  const real    = PASSWORDS[Math.floor(Math.random() * PASSWORDS.length)]
  const hint    = real[0] + '·'.repeat(real.length - 2) + real[real.length - 1]
  const similar = PASSWORDS.filter(p => p !== real && p.length >= real.length - 1 && p.length <= real.length + 1)
  let choices   = shuffle([real, ...similar]).slice(0, 5)
  if (!choices.includes(real)) choices[0] = real
  return {
    kind:    'password',
    answer:  real,
    choices,
    display: { hint, length: real.length, choices },
  }
}

function generateCipher() {
  const phrase  = CIPHER_PHRASES[Math.floor(Math.random() * CIPHER_PHRASES.length)]
  const encoded = rot13(phrase)
  return {
    kind:    'cipher',
    answer:  phrase,
    choices: null,
    display: { encoded },
  }
}

// Chained puzzle: T4 = 2 stages [portscan→password], T5 = 3 stages [portscan→password→cipher]
function generateChained(tier, difficulty) {
  const kinds = tier >= 5
    ? ['portscan', 'password', 'cipher']
    : ['portscan', 'password']

  const stages = kinds.map(k => {
    if (k === 'portscan') return generatePortscan(difficulty)
    if (k === 'password') return generatePassword()
    return generateCipher()
  })

  return {
    answer:       stages[0].answer,
    puzzle_data:  JSON.stringify({ stages }),
    display:      stages[0].display,
    total_stages: stages.length,
    first_kind:   stages[0].kind,
  }
}

// Validate a single answer against a puzzle kind + stored correct answer
function checkAnswer(kind, normalized, correctAnswer, choices) {
  if (kind === 'portscan') return parseInt(normalized) === parseInt(correctAnswer)
  if (kind === 'cipher')   return normalized.toUpperCase().replace(/[^A-Z ]/g, '') === correctAnswer
  if (kind === 'password') {
    const idx = parseInt(normalized) - 1
    return Array.isArray(choices) && choices[idx] === correctAnswer
  }
  return false
}

export default async function hackRoutes(fastify, io, onlinePlayers) {
  // GET /api/hack/targets — list all NPC machines with the player's current access status
  fastify.get('/api/hack/targets', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player

    const [rows] = await db.query(
      `SELECT m.hostname, m.ip_address, m.tier, m.tier_hashrate, m.puzzle_kind,
              m.hack_reward, m.flavor,
              ma.installed_at, ma.expires_at
       FROM machines m
       LEFT JOIN machine_access ma ON ma.machine_id = m.id AND ma.controller_id = ?
       WHERE m.owner_id = '00000000-0000-0000-0000-000000000001'
       ORDER BY m.tier ASC, m.hostname ASC`,
      [playerId]
    )

    return rows.map(r => ({
      hostname:    r.hostname,
      ip:          r.ip_address,
      tier:        r.tier,
      hashrate:    r.tier_hashrate,
      puzzle_kind: r.puzzle_kind,
      reward:      r.hack_reward,
      flavor:      r.flavor,
      owned:       r.expires_at !== null,
      expires_at:  r.expires_at,
    }))
  })

  // POST /api/hack/start — generate a server-side puzzle session for a target machine
  fastify.post('/api/hack/start', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const { hostname } = req.body || {}
    if (!hostname) return reply.code(400).send({ error: 'hostname required' })

    const [[machine]] = await db.query(
      'SELECT id, rig_level, puzzle_kind, hack_reward, tier, flavor FROM machines WHERE hostname = ?',
      [hostname]
    )
    if (!machine) return reply.code(404).send({ error: 'unknown target' })

    const [[owned]] = await db.query(
      'SELECT id FROM machine_access WHERE machine_id = ? AND controller_id = ?',
      [machine.id, playerId]
    )
    if (owned) return reply.code(409).send({ error: 'already_owned', message: 'Access already established.' })

    let puzzle, puzzleKind, totalStages
    if (machine.puzzle_kind === 'chained') {
      const ch  = generateChained(machine.tier, machine.rig_level)
      puzzle     = { answer: ch.answer, puzzle_data: ch.puzzle_data, display: ch.display }
      puzzleKind = ch.first_kind
      totalStages = ch.total_stages
    } else {
      const gen  = machine.puzzle_kind === 'portscan' ? generatePortscan(machine.rig_level)
                 : machine.puzzle_kind === 'password'  ? generatePassword()
                 : generateCipher()
      puzzle     = { answer: gen.answer, puzzle_data: gen.choices ? JSON.stringify({ choices: gen.choices }) : null, display: gen.display }
      puzzleKind = machine.puzzle_kind
      totalStages = 1
    }

    const sessionId = randomUUID()

    await db.query(
      `INSERT INTO hack_sessions
         (id, player_id, machine_id, puzzle_kind, answer, puzzle_data, current_stage, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
       ON DUPLICATE KEY UPDATE
         id = VALUES(id), puzzle_kind = VALUES(puzzle_kind),
         answer = VALUES(answer), puzzle_data = VALUES(puzzle_data),
         attempts = 0, current_stage = 0, expires_at = VALUES(expires_at), used = 0`,
      [sessionId, playerId, machine.id, machine.puzzle_kind, puzzle.answer, puzzle.puzzle_data]
    )

    return {
      session_id:   sessionId,
      puzzle_kind:  puzzleKind,
      display:      puzzle.display,
      total_stages: totalStages,
      flavor:       machine.flavor,
    }
  })

  // POST /api/hack/solve — validate answer; advance chain stage or grant access on completion
  fastify.post('/api/hack/solve', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const { session_id, answer } = req.body || {}
    if (!session_id || answer === undefined) return reply.code(400).send({ error: 'session_id and answer required' })

    const [[session]] = await db.query(
      `SELECT id, player_id, machine_id, puzzle_kind, answer AS correct_answer,
              puzzle_data, attempts, current_stage, expires_at, used
       FROM hack_sessions WHERE id = ?`,
      [session_id]
    )

    if (!session)                                       return reply.code(404).send({ error: 'session not found' })
    if (session.player_id !== playerId)                 return reply.code(403).send({ error: 'forbidden' })
    if (session.used)                                   return reply.code(410).send({ error: 'session_used',    message: 'Session already consumed.' })
    if (new Date(session.expires_at) < new Date())      return reply.code(410).send({ error: 'session_expired', message: 'Session expired. Re-establish connection.' })

    const normalized = String(answer).trim()
    const data = session.puzzle_data
      ? (typeof session.puzzle_data === 'string' ? JSON.parse(session.puzzle_data) : session.puzzle_data)
      : null

    // Determine effective puzzle kind and choices for this step
    let effectiveKind, choices
    if (session.puzzle_kind === 'chained') {
      const stage = data.stages[session.current_stage]
      effectiveKind = stage.kind
      choices       = stage.choices
    } else {
      effectiveKind = session.puzzle_kind
      choices       = data?.choices ?? null
    }

    const correct      = checkAnswer(effectiveKind, normalized, session.correct_answer, choices)
    const newAttempts  = session.attempts + 1
    const attemptsLeft = MAX_ATTEMPTS - newAttempts

    if (!correct) {
      const exhausted = newAttempts >= MAX_ATTEMPTS
      await db.query(
        'UPDATE hack_sessions SET attempts = ?, used = ? WHERE id = ?',
        [newAttempts, exhausted ? 1 : 0, session_id]
      )
      await db.query(
        'INSERT INTO hack_log (id, attacker_id, target_id, puzzle_kind, success, reward) VALUES (UUID(), ?, ?, ?, 0, 0)',
        [playerId, session.machine_id, session.puzzle_kind]
      )
      return {
        success:      false,
        attemptsLeft: exhausted ? 0 : attemptsLeft,
        message:      exhausted
          ? 'Connection terminated. ICE engaged.'
          : `Wrong. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
      }
    }

    // Correct answer — handle chain advancement vs. final completion
    if (session.puzzle_kind === 'chained') {
      const totalStages = data.stages.length
      const nextStage   = session.current_stage + 1

      if (nextStage < totalStages) {
        // Advance to next stage; reset attempts budget for fresh stage
        const nextStageData = data.stages[nextStage]
        await db.query(
          'UPDATE hack_sessions SET current_stage = ?, answer = ?, attempts = 0 WHERE id = ?',
          [nextStage, nextStageData.answer, session_id]
        )
        return {
          success:      true,
          complete:     false,
          stage:        nextStage,
          total_stages: totalStages,
          puzzle_kind:  nextStageData.kind,
          display:      nextStageData.display,
        }
      }
      // Last stage falls through to completion below
    }

    // Mark session consumed before the transaction (prevents race replay)
    await db.query('UPDATE hack_sessions SET used = 1, attempts = ? WHERE id = ?', [newAttempts, session_id])

    const [[machine]] = await db.query(
      'SELECT hack_reward, tier, firewall_lvl, owner_id FROM machines WHERE id = ?',
      [session.machine_id]
    )

    // Firewall roll — session already consumed so client can't replay on a blocked attempt
    const failChance = (machine.firewall_lvl - 1) * FIREWALL_FAIL_RATE
    if (failChance > 0 && Math.random() < failChance) {
      await db.query(
        'INSERT INTO hack_log (id, attacker_id, target_id, puzzle_kind, success, reward) VALUES (UUID(), ?, ?, ?, 0, 0)',
        [playerId, session.machine_id, session.puzzle_kind]
      )
      return {
        success: false,
        attemptsLeft: 0,
        message: `Firewall L${machine.firewall_lvl} blocked the intrusion. Connection severed.`,
      }
    }

    const expiryHours = TIER_EXPIRY_HOURS[machine.tier] ?? null

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      const expiresAt = expiryHours
        ? new Date(Date.now() + expiryHours * 3600 * 1000)
        : null
      await conn.query(
        'INSERT IGNORE INTO machine_access (id, machine_id, controller_id, mining_share, expires_at) VALUES (UUID(), ?, ?, 15.00, ?)',
        [session.machine_id, playerId, expiresAt]
      )
      await conn.query(
        'INSERT INTO hack_log (id, attacker_id, target_id, puzzle_kind, success, reward) VALUES (UUID(), ?, ?, ?, 1, ?)',
        [playerId, session.machine_id, session.puzzle_kind, machine.hack_reward]
      )
      await conn.query(
        'UPDATE players SET crypto = crypto + ? WHERE id = ?',
        [machine.hack_reward, playerId]
      )

      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }

    return { success: true, complete: true, reward: machine.hack_reward }
  })
}

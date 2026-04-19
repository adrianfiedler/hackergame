import { randomUUID } from 'crypto'
import db from '../db.js'
import { requireAuth } from '../auth/jwt.js'

const PASSWORDS      = ['godmode','swordfish','hunter2','rosebud','letmein','joshua','orange','trustno1','matrix','neural','megaman','zer0cool','crashoverride','acid','phreak','cyber']
const CIPHER_PHRASES = ['THE MEDIUM IS THE MESSAGE','HACK THE PLANET','MESS WITH THE BEST','TRUST NO ONE','MIND IS A RAZOR BLADE','RESISTANCE IS FUTILE']
const PORT_POOL      = [21,22,23,25,80,110,143,443,445,1337,3389,8080,31337]
const PORT_SVC       = {21:'ftp',22:'ssh',23:'telnet',25:'smtp',80:'http',110:'pop3',143:'imap',443:'https',445:'smb',1337:'elite',3389:'rdp',8080:'http-alt',31337:'backdoor'}
const MAX_ATTEMPTS   = 3

function shuffle(arr) { return arr.slice().sort(() => Math.random() - 0.5) }

function rot13(s) {
  return s.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + 13) % 26 + 65))
}

function generatePortscan(difficulty) {
  const shuffled    = shuffle(PORT_POOL)
  const displayCount = Math.min(8 + difficulty, PORT_POOL.length)
  const display     = shuffled.slice(0, displayCount)
  const openCount   = 3 + difficulty
  const openSet     = new Set(display.slice(0, openCount))
  const target      = display[openCount - 1]
  return {
    answer:      String(target),
    puzzle_data: null,
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
    answer:      real,
    puzzle_data: JSON.stringify({ choices }),
    display:     { hint, length: real.length, choices },
  }
}

function generateCipher() {
  const phrase  = CIPHER_PHRASES[Math.floor(Math.random() * CIPHER_PHRASES.length)]
  const encoded = rot13(phrase)
  return {
    answer:      phrase,
    puzzle_data: null,
    display:     { encoded },
  }
}

export default async function hackRoutes(fastify) {
  // POST /api/hack/start — generate a server-side puzzle session for a target machine
  fastify.post('/api/hack/start', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const { hostname } = req.body || {}
    if (!hostname) return reply.code(400).send({ error: 'hostname required' })

    const [[machine]] = await db.query(
      'SELECT id, rig_level, puzzle_kind, hack_reward FROM machines WHERE hostname = ?',
      [hostname]
    )
    if (!machine) return reply.code(404).send({ error: 'unknown target' })

    const [[owned]] = await db.query(
      'SELECT id FROM machine_access WHERE machine_id = ? AND controller_id = ?',
      [machine.id, playerId]
    )
    if (owned) return reply.code(409).send({ error: 'already_owned', message: 'Access already established.' })

    let puzzle
    if (machine.puzzle_kind === 'portscan')    puzzle = generatePortscan(machine.rig_level)
    else if (machine.puzzle_kind === 'password') puzzle = generatePassword()
    else if (machine.puzzle_kind === 'cipher')   puzzle = generateCipher()
    else return reply.code(500).send({ error: 'unknown puzzle type' })

    const sessionId = randomUUID()

    // Upsert: replace any existing unexpired session for this player+machine
    await db.query(
      `INSERT INTO hack_sessions (id, player_id, machine_id, puzzle_kind, answer, puzzle_data, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
       ON DUPLICATE KEY UPDATE
         id = VALUES(id), puzzle_kind = VALUES(puzzle_kind),
         answer = VALUES(answer), puzzle_data = VALUES(puzzle_data),
         attempts = 0, expires_at = VALUES(expires_at), used = 0`,
      [sessionId, playerId, machine.id, machine.puzzle_kind, puzzle.answer, puzzle.puzzle_data]
    )

    return { session_id: sessionId, puzzle_kind: machine.puzzle_kind, display: puzzle.display }
  })

  // POST /api/hack/solve — validate player's answer; on success credit reward + register access
  fastify.post('/api/hack/solve', { preHandler: requireAuth }, async (req, reply) => {
    const { playerId } = req.player
    const { session_id, answer } = req.body || {}
    if (!session_id || answer === undefined) return reply.code(400).send({ error: 'session_id and answer required' })

    const [[session]] = await db.query(
      `SELECT id, player_id, machine_id, puzzle_kind, answer AS correct_answer,
              puzzle_data, attempts, expires_at, used
       FROM hack_sessions WHERE id = ?`,
      [session_id]
    )

    if (!session)                          return reply.code(404).send({ error: 'session not found' })
    if (session.player_id !== playerId)    return reply.code(403).send({ error: 'forbidden' })
    if (session.used)                      return reply.code(410).send({ error: 'session_used',    message: 'Session already consumed.' })
    if (new Date(session.expires_at) < new Date()) return reply.code(410).send({ error: 'session_expired', message: 'Session expired. Re-establish connection.' })

    const normalized = String(answer).trim()
    let correct = false

    if (session.puzzle_kind === 'portscan') {
      correct = parseInt(normalized) === parseInt(session.correct_answer)
    } else if (session.puzzle_kind === 'password') {
      const data = typeof session.puzzle_data === 'string'
        ? JSON.parse(session.puzzle_data)
        : session.puzzle_data
      const idx = parseInt(normalized) - 1
      correct = Array.isArray(data?.choices) && data.choices[idx] === session.correct_answer
    } else if (session.puzzle_kind === 'cipher') {
      correct = normalized.toUpperCase().replace(/[^A-Z ]/g, '') === session.correct_answer
    }

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

    // Mark session consumed before transaction so a retry can't race in
    await db.query('UPDATE hack_sessions SET used = 1, attempts = ? WHERE id = ?', [newAttempts, session_id])

    const [[machine]] = await db.query('SELECT hack_reward FROM machines WHERE id = ?', [session.machine_id])

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      await conn.query(
        'INSERT IGNORE INTO machine_access (id, machine_id, controller_id, mining_share) VALUES (UUID(), ?, ?, 15.00)',
        [session.machine_id, playerId]
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

    return { success: true, reward: machine.hack_reward }
  })
}

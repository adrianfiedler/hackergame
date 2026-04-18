import { randomBytes, randomUUID } from 'crypto'
import db from '../db.js'
import { signJwt } from '../auth/jwt.js'

const ADJECTIVES = ['dark','ghost','shadow','void','null','zero','cyber','neo','byte','hex','neon','phr34k']
const NOUNS      = ['net','node','sys','core','data','root','host','gate','flux','r00t','0day','shell']
const IP_SUBNETS = ['10','172','192']

function generateWallet() {
  return '0x' + randomBytes(20).toString('hex')
}

function generateHostname(base) {
  const clean = base.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8) || 'op'
  const suffix = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${clean}.${suffix}`
}

function generateIp() {
  const sub = IP_SUBNETS[Math.floor(Math.random() * IP_SUBNETS.length)]
  const r = () => Math.floor(Math.random() * 254) + 1
  return `${sub}.${r()}.${r()}.${r()}`
}

function sanitizeUsername(googleName) {
  return (googleName || 'operator')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 16) || 'operator'
}

async function findUniqueUsername(base) {
  let username = base
  for (let i = 0; i < 10; i++) {
    const [rows] = await db.query('SELECT id FROM players WHERE username = ?', [username])
    if (!rows.length) return username
    username = `${base.slice(0, 12)}_${Math.floor(Math.random() * 900 + 100)}`
  }
  return base + '_' + Date.now().toString(36)
}

async function findUniqueHostname(base) {
  let hostname = generateHostname(base)
  for (let i = 0; i < 20; i++) {
    const [rows] = await db.query('SELECT id FROM machines WHERE hostname = ?', [hostname])
    if (!rows.length) return hostname
    hostname = generateHostname(base)
  }
  return `op${randomBytes(3).toString('hex')}.node`
}

async function findUniqueIp() {
  for (let i = 0; i < 50; i++) {
    const ip = generateIp()
    const [rows] = await db.query('SELECT id FROM machines WHERE ip_address = ?', [ip])
    if (!rows.length) return ip
  }
  throw new Error('Could not generate unique IP after 50 attempts')
}

async function upsertPlayer(profile) {
  const { sub: googleId, name, picture } = profile

  // Check if player already exists
  const [existing] = await db.query(
    'SELECT p.id, p.username FROM players p WHERE p.google_id = ?',
    [googleId]
  )

  if (existing.length) {
    await db.query('UPDATE players SET last_seen_at = NOW() WHERE id = ?', [existing[0].id])
    return existing[0]
  }

  // New player — create account + machine
  const playerId  = randomUUID()
  const username  = await findUniqueUsername(sanitizeUsername(name))
  const wallet    = generateWallet()
  const hostname  = await findUniqueHostname(username)
  const ip        = await findUniqueIp()
  const machineId = randomUUID()

  // System channel (personal log) for the player
  const systemChannelId = randomUUID()

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO players (id, google_id, username, wallet_addr, crypto, avatar_url, grace_ends_at)
       VALUES (?, ?, ?, ?, 0, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
      [playerId, googleId, username, wallet, picture || null]
    )

    await conn.query(
      `INSERT INTO machines (id, owner_id, hostname, ip_address)
       VALUES (?, ?, ?, ?)`,
      [machineId, playerId, hostname, ip]
    )

    await conn.query(
      `INSERT INTO channels (id, name, kind) VALUES (?, NULL, 'system')`,
      [systemChannelId]
    )
    await conn.query(
      `INSERT INTO channel_members (channel_id, player_id) VALUES (?, ?)`,
      [systemChannelId, playerId]
    )

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  console.log(`[auth] new player created: ${username} (${ip})`)
  return { id: playerId, username }
}

export default async function authRoutes(fastify) {
  // Google OAuth start — @fastify/oauth2 registers /auth/google automatically
  // This is the callback after Google redirects back
  fastify.get('/auth/google/callback', async (req, reply) => {
    try {
      const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req)

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      })
      if (!profileRes.ok) throw new Error('Failed to fetch Google profile')
      const profile = await profileRes.json()

      const player = await upsertPlayer(profile)

      const jwtToken = signJwt({ playerId: player.id, username: player.username })

      reply
        .setCookie('hx_token', jwtToken, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path:     '/',
          maxAge:   7 * 24 * 60 * 60,
        })
        .redirect('/')
import { randomBytes, randomUUID } from 'crypto'
import db from '../db.js'
import { signJwt } from '../auth/jwt.js'

const ADJECTIVES = ['dark','ghost','shadow','void','null','zero','cyber','neo','byte','hex','neon','phr34k']
const NOUNS      = ['net','node','sys','core','data','root','host','gate','flux','r00t','0day','shell']

function generateWallet() {
  return '0x' + randomBytes(20).toString('hex')
}

function generateHostname(base) {
  const clean = base.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8) || 'op'
  const suffix = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${clean}.${suffix}`
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

/**
 * Finds a suitable IP in the 10.S.B.N format.
 * Clusters players into subnets.
 * Returns { ip, sector, subnet }
 */
async function allocateHierarchicalIp() {
  // Find latest player-occupied subnet
  const [latest] = await db.query(`
    SELECT ip_address FROM machines 
    WHERE owner_id != '00000000-0000-0000-0000-000000000001'
    AND ip_address LIKE '10.%'
    ORDER BY created_at DESC LIMIT 1
  `)

  let sector = 0
  let subnet = 0

  if (latest.length) {
    const parts = latest[0].ip_address.split('.').map(Number)
    sector = parts[1]
    subnet = parts[2]
  }

  // Check density (players only)
  const [countRows] = await db.query(
    "SELECT COUNT(*) as count FROM machines WHERE ip_address LIKE ? AND owner_id != '00000000-0000-0000-0000-000000000001'",
    [`10.${sector}.${subnet}.%`]
  )

  const isFull = countRows[0].count >= 40

  if (isFull) {
    subnet++
    if (subnet > 255) {
      subnet = 0
      sector++
    }
  }

  // Find a free node in this subnet
  for (let i = 0; i < 50; i++) {
    const node = Math.floor(Math.random() * 254) + 1 // 1-254
    const ip = `10.${sector}.${subnet}.${node}`
    const [rows] = await db.query('SELECT id FROM machines WHERE ip_address = ?', [ip])
    if (!rows.length) return { ip, sector, subnet }
  }

  throw new Error('Failed to find free node in subnet')
}

const NPC_SYSTEM_ID = '00000000-0000-0000-0000-000000000001'

const NPC_TIERS = [
  { tier: 1, puzzle: 'portscan', reward: 0.01,  flavor: 'Low-sec workstation. Easy pickings.'              },
  { tier: 1, puzzle: 'portscan', reward: 0.01,  flavor: 'Misconfigured IoT device. Wide open.'             },
  { tier: 2, puzzle: 'password', reward: 0.05,  flavor: 'SMB server. Default creds suspected.'             },
  { tier: 2, puzzle: 'password', reward: 0.05,  flavor: 'FTP host. Brute-force viable.'                    },
  { tier: 3, puzzle: 'cipher',   reward: 0.20,  flavor: 'Encrypted gateway. Cipher lock active.'           },
  { tier: 3, puzzle: 'cipher',   reward: 0.20,  flavor: 'Hardened relay node. Needs decryption.'           },
  { tier: 4, puzzle: 'chained',  reward: 0.80,  flavor: 'Multi-stage intrusion required.'                  },
  { tier: 5, puzzle: 'chained',  reward: 2.50,  flavor: 'Hardened node. Advanced persistent threat zone.'  },
]

// Weighted random: tiers 1-2 most common, 4-5 rare
const NPC_WEIGHTS = [22, 22, 16, 16, 10, 10, 6, 4] // maps to NPC_TIERS indices

function pickNpcTier() {
  const total = NPC_WEIGHTS.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < NPC_WEIGHTS.length; i++) {
    r -= NPC_WEIGHTS[i]
    if (r <= 0) return NPC_TIERS[i]
  }
  return NPC_TIERS[0]
}

async function seedNeighborhoodNPCs(conn, sector, subnet) {
  const npcCount = 10 + Math.floor(Math.random() * 6) // 10-15 NPCs

  for (let i = 0; i < npcCount; i++) {
    let ip = ''
    let attempts = 0
    while (attempts < 50) {
      const node = Math.floor(Math.random() * 254) + 1
      ip = `10.${sector}.${subnet}.${node}`
      const [rows] = await conn.query('SELECT id FROM machines WHERE ip_address = ?', [ip])
      if (!rows.length) break
      attempts++
    }

    if (attempts >= 50) continue

    const { tier, puzzle, reward, flavor } = pickNpcTier()
    const hostname = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]}-${NOUNS[Math.floor(Math.random() * NOUNS.length)]}.local`

    await conn.query(
      `INSERT IGNORE INTO machines (id, owner_id, hostname, ip_address, tier, puzzle_kind, hack_reward, flavor)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [NPC_SYSTEM_ID, hostname, ip, tier, puzzle, reward, flavor]
    )
  }
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
  const { ip, sector, subnet } = await allocateHierarchicalIp()
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

    const [npcCount] = await conn.query(
      'SELECT COUNT(*) as count FROM machines WHERE ip_address LIKE ? AND owner_id = ?',
      [`10.${sector}.${subnet}.%`, NPC_SYSTEM_ID]
    )
    if (npcCount[0].count < 15) {
      await seedNeighborhoodNPCs(conn, sector, subnet)
    }

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

  console.log(`[auth] new player created: ${username} (${ip}) in subnet ${sector}.${subnet}`)
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
    } catch (err) {
      console.error('[auth] callback error:', err)
      reply.redirect('/?auth_error=1')
    }
  })

  fastify.get('/auth/logout', async (req, reply) => {
    reply
      .clearCookie('hx_token', { path: '/' })
      .redirect('/')
  })
}

import 'dotenv/config'
import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyOauth2 from '@fastify/oauth2'
import fastifyCors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { Server as SocketIO } from 'socket.io'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { existsSync } from 'fs'

import { randomUUID } from 'crypto'
import { migrate } from './migrate.js'
import { verifyJwt } from './auth/jwt.js'
import { startTicker } from './ticker.js'
import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'
import playerRoutes from './routes/player.js'
import hackRoutes from './routes/hack.js'
import defenseRoutes from './routes/defense.js'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '3000')
const IS_PROD = process.env.NODE_ENV === 'production'

const fastify = Fastify({ logger: { level: IS_PROD ? 'warn' : 'info' } })

// ── Plugins ──────────────────────────────────────────────────────────────────

await fastify.register(fastifyCors, {
  origin: IS_PROD ? false : process.env.CLIENT_ORIGIN,
  credentials: true,
})

await fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET,
})

// Google OAuth2 — only register when credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  await fastify.register(fastifyOauth2, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id:     process.env.GOOGLE_CLIENT_ID,
        secret: process.env.GOOGLE_CLIENT_SECRET,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: `${process.env.CALLBACK_BASE_URL}/auth/google/callback`,
  })
} else {
  console.warn('[auth] GOOGLE_CLIENT_ID/SECRET not set — OAuth disabled. Set them in server/.env')
}

// ── Static files (production: serve Vite build) ───────────────────────────
const publicDir = join(__dirname, '../public')
if (existsSync(publicDir)) {
  await fastify.register(fastifyStatic, { root: publicDir, prefix: '/' })
  fastify.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'))
}

// ── Socket.IO (created early so routes can use io) ────────────────────────
const io = new SocketIO(fastify.server, {
  cors: {
    origin:      IS_PROD ? false : process.env.CLIENT_ORIGIN,
    credentials: true,
  },
})
const onlinePlayers = new Map()

// ── Routes ────────────────────────────────────────────────────────────────
await fastify.register(authRoutes)
await fastify.register(meRoutes)
await fastify.register(playerRoutes)
await fastify.register((f) => hackRoutes(f, io, onlinePlayers))
await fastify.register((f) => defenseRoutes(f, io, onlinePlayers))

// Channel name → channel_id (seeded in schema.sql)
const PUBLIC_CHANNEL_IDS = {
  '#general': '00000000-0000-0000-0001-000000000001',
  '#trading':  '00000000-0000-0000-0001-000000000002',
  '#wanted':   '00000000-0000-0000-0001-000000000003',
}

io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...rest] = c.trim().split('=')
      return [k, decodeURIComponent(rest.join('='))]
    })
  )
  const token = cookies['hx_token']
  if (!token) return next(new Error('Unauthorized'))
  try {
    socket.player = verifyJwt(token)
    next()
  } catch {
    next(new Error('Invalid token'))
  }
})

io.on('connection', (socket) => {
  const { playerId, username } = socket.player
  onlinePlayers.set(playerId, socket.id)
  console.log(`[socket] ${username} connected (${socket.id})`)

  socket.on('disconnect', () => {
    if (onlinePlayers.get(playerId) === socket.id) {
      onlinePlayers.delete(playerId)
    }
    console.log(`[socket] ${username} disconnected`)
  })

  // ── IRC ────────────────────────────────────────────────────────────────────
  socket.on('irc:join', async (channelName) => {
    const channelId = PUBLIC_CHANNEL_IDS[channelName]
    if (!channelId) return
    socket.join(channelName)
    try {
      const [rows] = await db.query(
        `SELECT m.id, m.content, m.msg_kind, m.sent_at,
                p.username AS sender
         FROM messages m
         LEFT JOIN players p ON p.id = m.sender_id
         WHERE m.channel_id = ?
         ORDER BY m.sent_at DESC LIMIT 50`,
        [channelId]
      )
      socket.emit('irc:history', { channel: channelName, messages: rows.reverse() })
    } catch (err) {
      console.error('[irc:join]', err)
    }
  })

  socket.on('irc:message', async ({ channel, content }) => {
    const channelId = PUBLIC_CHANNEL_IDS[channel]
    if (!channelId || !content?.trim()) return
    const id = randomUUID()
    try {
      await db.query(
        `INSERT INTO messages (id, channel_id, sender_id, content, msg_kind) VALUES (?,?,?,?,'chat')`,
        [id, channelId, playerId, content.trim()]
      )
      const msg = { id, sender: username, content: content.trim(), kind: 'chat', ts: new Date() }
      io.to(channel).emit('irc:message', { channel, msg })
    } catch (err) {
      console.error('[irc:message]', err)
    }
  })
})

// ── Start ─────────────────────────────────────────────────────────────────
try {
  await migrate()
  startTicker(io, onlinePlayers)
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`[server] listening on http://localhost:${PORT}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}

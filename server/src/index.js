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

import { migrate } from './migrate.js'
import { verifyJwt } from './auth/jwt.js'
import { startTicker } from './ticker.js'
import authRoutes from './routes/auth.js'
import meRoutes from './routes/me.js'
import playerRoutes from './routes/player.js'

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

// ── Routes ────────────────────────────────────────────────────────────────
await fastify.register(authRoutes)
await fastify.register(meRoutes)
await fastify.register(playerRoutes)

// ── Socket.io ─────────────────────────────────────────────────────────────
const io = new SocketIO(fastify.server, {
  cors: {
    origin:      IS_PROD ? false : process.env.CLIENT_ORIGIN,
    credentials: true,
  },
})

// playerId → socketId (for mining tick delivery)
const onlinePlayers = new Map()

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
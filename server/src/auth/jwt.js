import jwt from 'jsonwebtoken'
import 'dotenv/config'

const SECRET = process.env.JWT_SECRET

export function signJwt(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyJwt(token) {
  return jwt.verify(token, SECRET)
}

// Fastify preHandler — attaches req.player or replies 401
export async function requireAuth(req, reply) {
  const token = req.cookies?.hx_token
  if (!token) return reply.code(401).send({ error: 'Unauthorized' })
  try {
    req.player = verifyJwt(token)
  } catch {
    return reply.code(401).send({ error: 'Invalid token' })
  }
}
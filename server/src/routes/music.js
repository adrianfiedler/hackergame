import { readdir } from 'fs/promises'
import { createReadStream, existsSync, statSync } from 'fs'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MUSIC_DIR = join(__dirname, '../../../music')

const AUDIO_MIME = {
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
}

export default async function musicRoutes(fastify) {
  // List tracks
  fastify.get('/api/music', async (_req, reply) => {
    if (!existsSync(MUSIC_DIR)) return reply.send([])
    try {
      const files = await readdir(MUSIC_DIR)
      const tracks = files
        .filter(f => AUDIO_MIME[extname(f).toLowerCase()])
        .map((f, i) => {
          const noExt    = f.replace(/\.[^.]+$/, '')
          const dashIdx  = noExt.indexOf(' - ')
          const title    = (dashIdx > 0 ? noExt.slice(dashIdx + 3) : noExt).trim().toUpperCase()
          const artist   = (dashIdx > 0 ? noExt.slice(0, dashIdx).trim().toLowerCase() : '')
          return { id: `file_${i}`, title, artist, src: `/music/${encodeURIComponent(f)}`, type: 'file' }
        })
      return reply.send(tracks)
    } catch (err) {
      fastify.log.error('[music] list error:', err)
      return reply.send([])
    }
  })

  // Stream track with range support (required for browser seek)
  fastify.get('/music/:filename', async (req, reply) => {
    const { filename } = req.params
    if (filename.includes('/') || filename.includes('..')) return reply.code(400).send()

    const filepath = join(MUSIC_DIR, decodeURIComponent(filename))
    if (!existsSync(filepath)) return reply.code(404).send()

    const mime = AUDIO_MIME[extname(filename).toLowerCase()] || 'application/octet-stream'
    const stat = statSync(filepath)
    const range = req.headers.range

    if (range) {
      const [rawStart, rawEnd] = range.replace('bytes=', '').split('-')
      const start   = parseInt(rawStart, 10)
      const end     = rawEnd ? parseInt(rawEnd, 10) : stat.size - 1
      const chunkLen = end - start + 1
      reply.code(206)
        .header('Content-Range',  `bytes ${start}-${end}/${stat.size}`)
        .header('Accept-Ranges',  'bytes')
        .header('Content-Length', chunkLen)
        .header('Content-Type',   mime)
      return reply.send(createReadStream(filepath, { start, end }))
    }

    reply
      .header('Content-Length', stat.size)
      .header('Content-Type',   mime)
      .header('Accept-Ranges',  'bytes')
    return reply.send(createReadStream(filepath))
  })
}

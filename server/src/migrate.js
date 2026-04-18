import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  // Split on semicolons, filter blanks, run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    await db.query(stmt)
  }
  console.log('[db] migrations applied')
}
// state.jsx — game defaults, persistence helpers, audio, formatting

export const STORAGE_KEY = 'hackergame:v1'

export const DEFAULT_STATE = {
  crypto:      0,
  hashrate:    1,
  rigLevel:    1,
  cpuLevel:    1,
  netLevel:    1,
  hackedHosts: [],
  snakeHigh:   0,
  notepadText: '// TODO:\n// - crack 10.0.4.7\n// - buy rig upgrade\n// - route TCP/IP thru Geneva\n',
  trashFiles: [
    { id: 'f1', name: 'readme.txt',      kind: 'txt' },
    { id: 'f2', name: 'old_resume.doc',  kind: 'doc' },
    { id: 'f3', name: 'clippy.exe',      kind: 'exe' },
    { id: 'f4', name: 'photo001.jpg',    kind: 'img' },
  ],
}

// Local-only fields that we still persist to localStorage as a fallback
export function loadLocalState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (s && typeof s === 'object') return { ...DEFAULT_STATE, ...s }
  } catch {}
  return { ...DEFAULT_STATE }
}

export function saveLocalState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

// Debounced sync of local-only fields to the server
let syncTimer = null
export function scheduleSyncToServer(s) {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    const localData = {
      notepadText: s.notepadText,
      trashFiles:  s.trashFiles,
      snakeHigh:   s.snakeHigh,
      hackedHosts: s.hackedHosts,
    }
    fetch('/api/player/sync', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify(localData),
    }).catch(() => {})
  }, 5000)
}

// ── Audio (tiny Web Audio blips) ─────────────────────────────────────────────
export const Audio = {
  ctx:     null,
  enabled: true,
  ensure() {
    if (!this.enabled) return null
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)() } catch {}
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  },
  blip(freq = 440, dur = 0.05, type = 'square', gain = 0.04) {
    const ctx = this.ensure(); if (!ctx) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type; o.frequency.value = freq
    g.gain.value = gain
    o.connect(g); g.connect(ctx.destination)
    o.start()
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.stop(ctx.currentTime + dur + 0.02)
  },
  key()  { this.blip(900 + Math.random() * 200, 0.03, 'square', 0.02) },
  ok()   { this.blip(660, 0.08); setTimeout(() => this.blip(990, 0.12), 80) },
  err()  { this.blip(180, 0.2, 'sawtooth', 0.05) },
  coin() { this.blip(1200, 0.04); setTimeout(() => this.blip(1600, 0.08), 40) },
}

// ── Formatting ────────────────────────────────────────────────────────────────
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']
export function fmtCrypto(n) {
  if (!isFinite(n) || isNaN(n)) return '0'
  if (n < 1)    return n.toFixed(4)
  if (n < 1000) return n.toFixed(3)
  const exp   = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1)
  const value = n / Math.pow(1000, exp)
  return value.toFixed(3) + SUFFIXES[exp]
}
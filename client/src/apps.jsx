import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './auth/AuthContext.jsx'
import { Audio, fmtCrypto, fmtHs } from './state.jsx'
import { I } from './icons.jsx'
import socket from './socket.js'

// ── Browser ───────────────────────────────────────────────────────────────────
const BBS_POSTS = [
  { user: 'zer0_c00l',     time: '04/17/26 23:41', body: 'Anyone cracked orbital.sat-7 yet? I keep getting ICE\'d on the decode step. The phrases are all old McLuhan quotes.' },
  { user: 'acid_burn',     time: '04/17/26 23:58', body: '@zer0_c00l ROT-13 decoder. Try it on paper. It\'s that easy. Don\'t forget spaces matter.' },
  { user: 'crashoverride', time: '04/18/26 00:12', body: 'Protip for gibson.mil — the backdoor port is always 31337 on military boxes. Always.' },
  { user: 'phantom',       time: '04/18/26 00:44', body: 'BNK switch open. Password hint: 5-letter fish. Starts with S. You know the one.' },
  { user: 'lord_nikon',    time: '04/18/26 01:20', body: 'Mine with 3+ rig upgrades then sell clicks for exploit tokens. Don\'t bother hacking nsa until you have ⟠ 1.5+ reserves.' },
]

const SEARCH = [
  { url: 'hx://bbs.undernet',       title: 'The Undernet BBS',                  desc: 'Home of the l33t. Operator guides, target leaks, flame wars.',     page: 'bbs'    },
  { url: 'hx://wiki.hx-os',         title: 'HX//OS Wiki',                       desc: 'Official documentation for your totally-legal terminal.',           page: 'wiki'   },
  { url: 'hx://searchy',            title: 'Searchy — the one good search engine', desc: 'Try searching \'hacking\', \'snake\', \'crypto\'…',              page: 'search' },
  { url: 'hx://geocities.retro/~clippy', title: '~clippy\'s homepage',           desc: 'IT LOOKS LIKE YOU\'RE TRYING TO HACK THE GIBSON. Would you like help?', page: 'clippy' },
  { url: 'hx://hotdogwatr',         title: 'HotDogWaterMail — login',            desc: 'your inbox is empty and full of ads',                              page: 'mail'   },
]

export function Browser() {
  const [url, setUrl]     = useState('hx://searchy')
  const [input, setInput] = useState('hx://searchy')
  const [history, setHistory] = useState(['hx://searchy'])
  const [idx, setIdx]     = useState(0)
  const [query, setQuery] = useState('')

  const go = (u) => {
    const h = [...history.slice(0, idx + 1), u]
    setHistory(h); setIdx(h.length - 1); setUrl(u); setInput(u); Audio.key()
  }
  const back = () => { if (idx > 0) { setIdx(idx - 1); setUrl(history[idx - 1]); setInput(history[idx - 1]) } }
  const fwd  = () => { if (idx < history.length - 1) { setIdx(idx + 1); setUrl(history[idx + 1]); setInput(history[idx + 1]) } }

  const renderPage = () => {
    if (url === 'hx://searchy' || url.startsWith('hx://searchy?')) {
      const q = url.includes('?') ? decodeURIComponent(url.split('?q=')[1] || '') : ''
      const results = q ? SEARCH.filter(s => (s.title + s.desc + s.url).toLowerCase().includes(q.toLowerCase())) : SEARCH
      return (
        <div>
          <h1>◢ SEARCHY ◣</h1>
          <div className="marquee"><span>★ NEW: Search engine no longer sells your data to THREE separate agencies! ★ Please enjoy your crypto hacking responsibly. ★</span></div>
          <div style={{ margin: '18px 0 12px' }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go('hx://searchy?q=' + encodeURIComponent(query))}
              placeholder="search the nets…"
              style={{ width: '70%', background: '#02040a', border: '1px solid #00e7ff', color: '#9bff3c', padding: '6px 10px', fontFamily: 'VT323, monospace', fontSize: 17, outline: 'none' }} />
            <button onClick={() => go('hx://searchy?q=' + encodeURIComponent(query))}
              style={{ marginLeft: 6, padding: '6px 14px', background: '#00e7ff', color: '#000', border: 'none', fontFamily: 'Share Tech Mono', cursor: 'pointer', fontSize: 12 }}>SEARCH</button>
          </div>
          {q && <div style={{ color: '#6b7aa8', marginBottom: 8 }}>{results.length} results for "{q}"</div>}
          {results.map((r, i) => (
            <div className="sresult" key={i}>
              <a className="title" onClick={() => go(r.url)}>{r.title}</a>
              <div className="url">{r.url}</div>
              <div className="desc">{r.desc}</div>
            </div>
          ))}
        </div>
      )
    }
    if (url === 'hx://bbs.undernet') return (
      <div>
        <h1>▓ THE UNDERNET BBS ▓</h1>
        <div style={{ color: '#6b7aa8' }}>Users online: 47 · Last post: 3 min ago</div>
        <hr />
        <h2>// general chat</h2>
        {BBS_POSTS.map((p, i) => (
          <div className="post" key={i}>
            <div className="meta">► {p.user} <span style={{ color: '#6b7aa8' }}>at {p.time}</span></div>
            <div className="body">{p.body}</div>
          </div>
        ))}
        <div className="box m">
          <span className="blink">▐</span> post reply: <em style={{ color: '#6b7aa8' }}>[you must be a registered l33t to post]</em>
        </div>
      </div>
    )
    if (url === 'hx://wiki.hx-os') return (
      <div>
        <h1>HX//OS WIKI</h1>
        <div style={{ color: '#6b7aa8' }}>A collaborative manual for the operating system you're currently using.</div>
        <h2>getting started</h2>
        <div className="box">Open the <strong style={{color:'#ff2bd6'}}>Terminal</strong> from the desktop. Type <em style={{color:'#9bff3c'}}>help</em> to list commands. Money comes from <em>hacking</em> remote hosts and running the <em>miner</em>. Use <em>irc</em> to chat with other operators.</div>
        <h2>hacking</h2>
        <div className="box">1. <em>scan</em> to list hosts.<br/>2. <em>hack &lt;host&gt;</em> to breach.<br/>3. Three puzzle types: <strong style={{color:'#00e7ff'}}>PORTSCAN</strong> · <strong style={{color:'#00e7ff'}}>PASSWORD</strong> · <strong style={{color:'#00e7ff'}}>CIPHER</strong></div>
        <h2>mining</h2>
        <div className="box">Run the <em>miner</em> app. Server-side tick adds ⟠ every 10s even when offline. Spend ⟠ on <em>upgrade rig / cpu / net</em>.</div>
        <h2>irc</h2>
        <div className="box">Type <em>irc</em> or open IRC.EXE from the desktop. Chat in #general, #trading, #wanted, your guild, or DM another operator.</div>
        <h2>snake</h2>
        <div className="box">Type <em>snake</em> in terminal. Every 3 points = 0.002 ⟠.</div>
      </div>
    )
    if (url === 'hx://geocities.retro/~clippy') return (
      <div>
        <h1 style={{color:'#ffd23f'}}>📎 WELCOME TO CLIPPY'S PAGE 📎</h1>
        <div className="marquee"><span>under construction · under construction · under construction ·</span></div>
        <div className="box">
          <strong>IT LOOKS LIKE YOU'RE TRYING TO HACK THE GIBSON.</strong><br/><br/>
          Would you like to:<br/>
          ○ Continue without paperclip assistance<br/>
          ○ Receive federal prison sentence<br/>
          ○ <span className="blink">○</span> Install 47 browser toolbars
        </div>
        <div style={{ color: '#6b7aa8', marginTop: 12 }}>this page best viewed in Netscape Navigator 3.0 @ 800×600</div>
      </div>
    )
    if (url === 'hx://hotdogwatr') return (
      <div>
        <h1 style={{color:'#ff3b5c'}}>HOTDOGWATRMAIL</h1>
        <div className="box m">WELCOME BACK, user43. You have <strong>0</strong> new messages and <strong>12,847</strong> promotional offers.</div>
        <div className="post"><div className="meta">▼ SIRS@nigerian-prince.gov</div><div className="body">Dear Esteemed Operator, I have 45,000,000 ⟠ that I need to transfer through your wallet urgently…</div></div>
        <div className="post"><div className="meta">▼ noreply@singles-in-your-segment.net</div><div className="body">HOT ROUTERS IN YOUR AREA WANT TO PEER WITH YOU</div></div>
        <div className="post"><div className="meta">▼ admin@ellingson.corp</div><div className="body">Someone (you?) logged into our mainframe from IP 127.0.0.1. If this was not you, please ignore.</div></div>
      </div>
    )
    return (
      <div>
        <h1 style={{color:'#ff3b5c'}}>404 — PAGE NOT FOUND</h1>
        <div className="box">The net is vast and infinite. This address is not.</div>
        <a onClick={() => go('hx://searchy')}>→ return to Searchy</a>
      </div>
    )
  }

  return (
    <div className="browser">
      <div className="toolbar">
        <button onClick={back} disabled={idx === 0}>◄</button>
        <button onClick={fwd}  disabled={idx >= history.length - 1}>►</button>
        <button onClick={() => go(url)}>⟳</button>
        <button onClick={() => go('hx://searchy')}>⌂</button>
        <input className="urlbar" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go(input)} />
      </div>
      <div className="page" key={url}>{renderPage()}</div>
    </div>
  )
}

// ── Notepad ───────────────────────────────────────────────────────────────────
export function Notepad({ state, setState }) {
  return (
    <div className="notepad" style={{ height: '100%' }}>
      <textarea value={state.notepadText}
        onChange={e => setState(s => ({ ...s, notepadText: e.target.value }))}
        spellCheck={false} />
    </div>
  )
}

// ── Calculator ────────────────────────────────────────────────────────────────
export function Calculator() {
  const [disp, setDisp]   = useState('0')
  const [acc, setAcc]     = useState(null)
  const [op, setOp]       = useState(null)
  const [fresh, setFresh] = useState(true)

  const pressNum = (n) => { Audio.key(); setDisp(fresh ? n : (disp === '0' ? n : disp + n)); setFresh(false) }
  const pressDot = () => { Audio.key(); if (!disp.includes('.')) setDisp(disp + '.'); setFresh(false) }
  const pressOp  = (newOp) => {
    Audio.key()
    const cur = parseFloat(disp)
    if (acc == null) setAcc(cur)
    else if (op) setAcc(calc(acc, cur, op))
    setOp(newOp); setFresh(true)
  }
  const calc = (a, b, o) => ({ '+': a + b, '-': a - b, '×': a * b, '÷': b === 0 ? 0 : a / b })[o]
  const pressEq = () => {
    Audio.ok()
    if (op != null && acc != null) {
      const r = calc(acc, parseFloat(disp), op)
      setDisp(String(Math.round(r * 1e9) / 1e9)); setAcc(null); setOp(null); setFresh(true)
    }
  }
  const pressC = () => { Audio.err(); setDisp('0'); setAcc(null); setOp(null); setFresh(true) }

  const btn = (label, cls, fn) => <button className={cls} onClick={fn}>{label}</button>
  return (
    <div className="calc">
      <div className="disp">{disp}{op ? ` ${op}` : ''}</div>
      <div className="pad">
        {btn('C', 'clr', pressC)}
        {btn('±', '', () => setDisp(disp.startsWith('-') ? disp.slice(1) : '-' + disp))}
        {btn('%', '', () => setDisp(String(parseFloat(disp) / 100)))}
        {btn('÷', 'op', () => pressOp('÷'))}
        {['7','8','9'].map(n => btn(n, '', () => pressNum(n)))}
        {btn('×', 'op', () => pressOp('×'))}
        {['4','5','6'].map(n => btn(n, '', () => pressNum(n)))}
        {btn('-', 'op', () => pressOp('-'))}
        {['1','2','3'].map(n => btn(n, '', () => pressNum(n)))}
        {btn('+', 'op', () => pressOp('+'))}
        {btn('0', '', () => pressNum('0'))}
        {btn('.', '', pressDot)}
        {btn('=', 'eq', pressEq)}
      </div>
    </div>
  )
}

// ── Trash ─────────────────────────────────────────────────────────────────────
export function TrashApp({ state, setState }) {
  const [dragId, setDragId] = useState(null)
  const empty = state.trashFiles.length === 0
  const onDragStart = (e, f) => { setDragId(f.id); e.dataTransfer.setData('text/plain', f.id); e.dataTransfer.effectAllowed = 'move' }
  return (
    <div className="trashwin">
      {empty ? (
        <div className="empty">[ /tmp/.Trash — empty ]<br/><br/>drag files here to delete them.</div>
      ) : (
        <div className="files">
          {state.trashFiles.map(f => (
            <div key={f.id} className={'file ' + (dragId === f.id ? 'dragging' : '')}
              draggable onDragStart={e => onDragStart(e, f)} onDragEnd={() => setDragId(null)} title={f.name}>
              <div className="g">
                {f.kind === 'doc' ? <I.Doc /> : f.kind === 'exe' ? <I.Exe /> : f.kind === 'img' ? <I.Img /> : <I.File />}
              </div>
              <div>{f.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Miner ─────────────────────────────────────────────────────────────────────
// Visual display only — balance is updated by server-side mining:tick via Socket.io
const TICK_MS = 10_000

export function Miner({ state }) {
  const [hash, setHash]   = useState('0x00000000000000000000000000000000')
  const [running, setRunning] = useState(true)
  const [blocks, setBlocks]   = useState(0)
  const [log, setLog]         = useState([])
  const [synced, setSynced]   = useState(false)
  const [tickCount, setTickCount] = useState(0)

  // Hash scramble — purely cosmetic, independent of tick
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const rand = Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      setHash('0x' + rand)
    }, 80)
    return () => clearInterval(id)
  }, [running])

  // Ignore tick value that existed before this component mounted.
  const staleTickRef = useRef(state.lastTickAt)

  useEffect(() => {
    if (!state.lastTickAt || state.lastTickAt === staleTickRef.current) return
    const elapsed = Date.now() - state.lastTickAt
    console.log('[Miner] tick — lastTickAt:', state.lastTickAt,
      '| elapsed since tick:', elapsed + 'ms')
    setSynced(true)
    setTickCount(c => c + 1)
  }, [state.lastTickAt])

  // Fire block-found visual on each real server tick
  useEffect(() => {
    if (!state.lastTickAt) return
    const earned      = state.lastTickEarned ?? 0
    const slaveEarned = state.slaveEarned ?? 0
    const detail      = slaveEarned > 0
      ? `+${fmtCrypto(earned - slaveEarned)} local +${fmtCrypto(slaveEarned)} botnet`
      : `+${fmtCrypto(earned)}`
    setBlocks(b => b + 1)
    setLog(l => [`[+] BLOCK ${String(state.lastTickAt).slice(-6)} confirmed — ${detail} ⟠`, ...l].slice(0, 6))
    Audio.coin()
  }, [state.lastTickAt])

  return (
    <div className="miner">
      <h3>◆ CRYPTO MINER v2.3 ◆</h3>
      <div className="hashdisplay">
        hashing...{'\n'}{hash}{'\n'}
        nonce: {Math.floor(Math.random() * 99999999)}
      </div>
      <div className="progress">
        {synced && <div key={tickCount} style={{ animation: `miner-bar ${TICK_MS}ms linear forwards` }} />}
      </div>
      <div className="stats">
        <div className="k">local H/s</div><div className="v">{fmtHs(state.hashrate)} H/s</div>
        <div className="k">botnet H/s</div><div className="v">{fmtHs(Math.round((state.slaveEarned ?? 0) * 1000))} H/s</div>
        <div className="k">total H/s</div><div className="v">{fmtHs(state.hashrate + Math.round((state.slaveEarned ?? 0) * 1000))} H/s</div>
        <div className="k">blocks hashed</div><div className="v">{blocks}</div>
        <div className="k">wallet</div><div className="v">{fmtCrypto(state.crypto)} ⟠</div>
        <div className="k">status</div><div className="v" style={{color: !synced ? '#f5a623' : running ? 'var(--primary)' : '#6b7aa8'}}>{!synced ? 'CONNECTING...' : running ? 'ONLINE' : 'paused'}</div>
      </div>
      <div className="btns">
        <button onClick={() => setRunning(r => !r)}>{running ? '⏸ pause' : '▶ resume'}</button>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#6b7aa8', textAlign: 'center' }}>
        income credited server-side every 10s
      </div>
      <div style={{ marginTop: 4 }}>
        {log.map((l, i) => <div key={i} style={{ color: '#9bff3c', fontSize: 13 }}>{l}</div>)}
      </div>
    </div>
  )
}

// ── IRC Messenger ─────────────────────────────────────────────────────────────
const PUBLIC_CHANNELS = ['#general', '#trading', '#wanted']

const SEED_MSGS = {
  '#general': [{ id: 's1', sender: null, content: 'Welcome to #general. Hack the planet.', kind: 'system_alert', ts: new Date() }],
  '#trading': [{ id: 's2', sender: null, content: 'Trade zero-days, hardware, and exploit kits here.', kind: 'system_alert', ts: new Date() }],
  '#wanted':  [{ id: 's3', sender: null, content: 'Post bounties on enemy operators. Watch your back.', kind: 'system_alert', ts: new Date() }],
  'SYSTEM':   [{ id: 's4', sender: null, content: 'System log initialized. Mining income will appear here.', kind: 'system_mine', ts: new Date() }],
}

export function IrcApp({ player }) {
  const [activeChannel, setActiveChannel] = useState('#general')
  const [messages, setMessages]           = useState(SEED_MSGS)
  const [input, setInput]                 = useState('')
  const bodyRef   = useRef(null)
  const prevCh    = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, activeChannel])

  // Join/leave socket rooms and load history when channel changes
  useEffect(() => {
    if (activeChannel === 'SYSTEM') return
    if (prevCh.current && prevCh.current !== activeChannel) {
      socket.emit('irc:leave', prevCh.current)
    }
    prevCh.current = activeChannel
    socket.emit('irc:join', activeChannel)
  }, [activeChannel])

  // Listen for incoming messages and history
  useEffect(() => {
    const onMsg = ({ channel, msg }) => {
      const ts = msg.ts ? new Date(msg.ts) : new Date()
      setMessages(m => ({ ...m, [channel]: [...(m[channel] || []), { ...msg, ts }] }))
    }
    const onHistory = ({ channel, messages: rows }) => {
      const hydrated = rows.map(r => ({ ...r, kind: r.msg_kind || r.kind || 'chat', ts: new Date(r.sent_at || r.ts) }))
      setMessages(m => ({ ...m, [channel]: [...(SEED_MSGS[channel] || []), ...hydrated] }))
    }
    socket.on('irc:message', onMsg)
    socket.on('irc:history', onHistory)
    return () => {
      socket.off('irc:message', onMsg)
      socket.off('irc:history', onHistory)
    }
  }, [])

  const sendMessage = () => {
    if (!input.trim() || activeChannel === 'SYSTEM') return
    socket.emit('irc:message', { channel: activeChannel, content: input.trim() })
    setInput('')
    Audio.key()
  }

  const fmtTime = (d) => {
    try { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
    catch { return '--:--' }
  }

  const channelMsgs = messages[activeChannel] || []

  return (
    <div className="irc-app">
      <div className="irc-sidebar">
        <div className="irc-section-hd">CHANNELS</div>
        {PUBLIC_CHANNELS.map(ch => (
          <div key={ch} className={'irc-channel' + (activeChannel === ch ? ' active' : '')}
            onClick={() => setActiveChannel(ch)}>{ch}</div>
        ))}
        <div className="irc-section-hd" style={{ marginTop: 12 }}>SYSTEM</div>
        <div className={'irc-channel' + (activeChannel === 'SYSTEM' ? ' active' : '')}
          onClick={() => setActiveChannel('SYSTEM')}>system log</div>
      </div>
      <div className="irc-main">
        <div className="irc-messages" ref={bodyRef}>
          {channelMsgs.map(m => (
            <div key={m.id} className={'irc-msg' + (m.kind !== 'chat' ? ' irc-sys' : '')}>
              <span className="irc-time">[{fmtTime(m.ts)}]</span>
              {m.sender ? <span className="irc-nick">&lt;{m.sender}&gt;</span>
                        : <span className="irc-nick irc-sys-tag">[SYS]</span>}
              <span className="irc-content">{m.content}</span>
            </div>
          ))}
        </div>
        {activeChannel !== 'SYSTEM' && (
          <div className="irc-input-row">
            <span className="irc-prompt">[{activeChannel}]&nbsp;&gt;</span>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="type message…" autoFocus spellCheck={false} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── NetMap ────────────────────────────────────────────────────────────────────
function fmtDuration(ms) {
  if (ms <= 0) return 'READY'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function successColor(pct) {
  if (pct >= 70) return 'var(--neon-g, #39ff14)'
  if (pct >= 45) return 'var(--neon-y)'
  return '#ff4444'
}

export function NetMap({ onRunCommand }) {
  const { player, setPlayer } = useAuth()
  const [loading, setLoading]     = useState(true)
  const [data, setData]           = useState({ sector: 0, subnet: 0, nodes: [] })
  const [selected, setSelected]   = useState(null)
  const [ops, setOps]             = useState([])
  const [slots, setSlots]         = useState({ used: 0, max: 1 })
  const [opInfo, setOpInfo]       = useState(null)
  const [opInfoLoading, setOpInfoLoading] = useState(false)
  const [launching, setLaunching] = useState(null)
  const [collecting, setCollecting] = useState(null)
  const [now, setNow]             = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const fetchNeighborhood = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/grid/neighborhood')
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error('[NetMap] fetch failed:', err)
    } finally {
      setTimeout(() => setLoading(false), 800)
    }
  }

  const fetchOps = useCallback(async () => {
    try {
      const res = await fetch('/api/operations')
      if (res.ok) {
        const d = await res.json()
        setOps(d.ops)
        setSlots(d.slots)
      }
    } catch {}
  }, [])

  const fetchOpInfo = useCallback(async (hostname) => {
    setOpInfoLoading(true)
    setOpInfo(null)
    try {
      const res = await fetch(`/api/operations/info?hostname=${encodeURIComponent(hostname)}`)
      if (res.ok) setOpInfo(await res.json())
    } catch {}
    setOpInfoLoading(false)
  }, [])

  useEffect(() => {
    fetchNeighborhood()
    fetchOps()
    const id = setInterval(fetchOps, 30000)
    return () => clearInterval(id)
  }, [fetchOps])

  useEffect(() => {
    if (selected && !selected.is_self) fetchOpInfo(selected.hostname)
    else setOpInfo(null)
  }, [selected, fetchOpInfo])

  const launchOp = async (opType) => {
    setLaunching(opType)
    try {
      const res = await fetch('/api/operations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: selected.hostname, operation: opType }),
      })
      if (res.ok) {
        const d = await res.json()
        // Inject op immediately so progress bar starts at 0% without waiting for fetchOps
        setOps(prev => [...prev, {
          id:              '_pending_' + opType,
          operation:       opType,
          label:           opType.replace(/_/g, ' ').toUpperCase(),
          target_hostname: selected.hostname,
          started_at:      d.started_at,
          completes_at:    d.completes_at,
          status:          'running',
          collectable:     false,
        }])
        setSlots(s => ({ ...s, used: s.used + 1 }))
        await fetchOps()          // replaces pending entry with real DB row
        await fetchOpInfo(selected.hostname)
      }
    } catch {}
    setLaunching(null)
  }

  const collectOp = async (opId) => {
    setCollecting(opId)
    try {
      const res = await fetch(`/api/operations/${opId}/collect`, { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        const op = ops.find(o => o.id === opId)
        if (d.success) {
          Audio.ok()
          setPlayer(p => ({
            ...p,
            crypto:    p.crypto    + (d.rewards.crypto    || 0),
            intel:     (p.intel    || 0) + (d.rewards.intel    || 0),
            zero_days: (p.zero_days || 0) + (d.rewards.zero_days || 0),
          }))
          const parts = [
            d.rewards.crypto    > 0 && `+⟠${d.rewards.crypto.toFixed(3)}`,
            d.rewards.intel     > 0 && `+${d.rewards.intel} INT`,
            d.rewards.zero_days > 0 && `+${d.rewards.zero_days} 0DAY`,
          ].filter(Boolean).join(' ')
          window.dispatchEvent(new CustomEvent('hx:notify', { detail: {
            type: 'success',
            text: `${(d.operation || '').toUpperCase()} COMPLETE: ${op?.target_hostname}${parts ? ' — ' + parts : ''}`,
          }}))
        } else {
          Audio.err()
          window.dispatchEvent(new CustomEvent('hx:notify', { detail: {
            type: 'fail',
            text: `${(d.operation || '').toUpperCase()} FAILED: ${op?.target_hostname} — connection rejected`,
          }}))
        }
        await fetchOps()
        if (selected && !selected.is_self) await fetchOpInfo(selected.hostname)
      }
    } catch {}
    setCollecting(null)
  }

  const grid = Array.from({ length: 256 }, (_, i) =>
    data.nodes.find(n => n.node_id === i) || null
  )

  return (
    <div className="netmap">
      <div className="netmap-header">
        <div className="netmap-title">NETMAP v4.0 — SCANNING 10.{data.sector}.{data.subnet}.*</div>
        <div className="netmap-header-right">
          <span className="nm-resource">[INT: {player?.intel ?? 0}]</span>
          <span className="nm-resource nm-zeroday">[0DAY: {player?.zero_days ?? 0}]</span>
          <button onClick={fetchNeighborhood} disabled={loading} className="netmap-refresh">RE-SCAN</button>
        </div>
      </div>

      <div className="netmap-body">
        <div className="netmap-grid-container">
          {loading && (
            <div className="netmap-overlay">
              <div className="scanline-y" />
              <div className="loading-text">INITIALIZING SUBSURFACE SCAN...</div>
            </div>
          )}
          <div className="netmap-grid">
            {grid.map((node, i) => (
              <div key={i}
                className={`netmap-node ${node ? 'occupied' : ''} ${node?.is_self ? 'self' : ''} ${node?.is_npc ? 'npc' : ''} ${selected?.node_id === i ? 'selected' : ''} ${node?.owned ? 'owned' : ''}`}
                onClick={() => node && setSelected(node)}
                title={node ? `${node.hostname} (${node.ip})` : `10.${data.sector}.${data.subnet}.${i}`}
              >
                {node ? (node.is_self ? 'Y' : node.is_npc ? 'N' : 'P') : '·'}
              </div>
            ))}
          </div>
        </div>

        <div className="netmap-sidebar">
          {/* ── Node info ── */}
          {selected ? (
            <div className="node-info">
              <div className="info-label">HOSTNAME</div>
              <div className="info-value">{selected.hostname}</div>
              <div className="info-label">ADDRESS</div>
              <div className="info-value" style={{ color: 'var(--primary)' }}>{selected.ip}</div>
              <div className="info-label">OWNER</div>
              <div className="info-value">{selected.owner}</div>
              <div className="info-label">CLASS</div>
              <div className="info-value">{selected.is_npc ? `Tier ${selected.tier} NPC` : 'Remote Operator'}</div>

              {selected.is_self ? (
                <div className="self-tag">LOCAL MACHINE</div>
              ) : (
                <>
                  {/* Firewall info — always shown, REDACTED until probed */}
                  {opInfo && (
                    <div className="nm-probed-info">
                      {opInfo.probed ? (
                        <>
                          <span>FW LVL {opInfo.probed.firewall_lvl}</span>
                          <span>{opInfo.probed.ids_active ? '⚠ IDS ON' : 'IDS OFF'}</span>
                        </>
                      ) : (
                        <span className="nm-redacted">FW [REDACTED] — probe IDS first</span>
                      )}
                    </div>
                  )}
                  {/* Slot indicator */}
                  <div className="nm-slots">
                    SLOTS {slots.used}/{slots.max}
                    {slots.used >= slots.max && <span className="nm-slots-full"> FULL</span>}
                  </div>
                  {/* Operations list */}
                  <div className="nm-op-list">
                    {opInfoLoading && <div className="nm-op-loading">SCANNING TARGET...</div>}
                    {opInfo?.ops.map(op => {
                      const isRunning  = op.running
                      const slotFull   = slots.used >= slots.max && !isRunning
                      const disabled   = isRunning || slotFull || launching === op.type
                      // scan_ports always shows own rate; others need scan_result first
                      const revealedPct = opInfo.scan_result?.[`${op.type}_success_pct`]
                      const showRate    = op.type === 'scan_ports' || revealedPct != null
                      const displayPct  = op.type === 'scan_ports' ? op.success_pct : revealedPct
                      return (
                        <div key={op.type} className={`nm-op-row ${isRunning ? 'running' : ''}`}>
                          <div className="nm-op-top">
                            <button
                              className="nm-op-btn"
                              disabled={disabled}
                              onClick={() => launchOp(op.type)}
                            >
                              {isRunning ? '▶ RUNNING' : launching === op.type ? '...' : op.label}
                            </button>
                            {showRate ? (
                              <span className="nm-op-success" style={{ color: successColor(displayPct) }}>
                                {displayPct}%
                              </span>
                            ) : (
                              <span className="nm-op-success nm-redacted">??%</span>
                            )}
                          </div>
                          <div className="nm-op-meta">
                            <span className="nm-op-dur">{fmtDuration(op.duration_ms)}</span>
                            <span className="nm-op-rew">{op.rewards_desc}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="no-node">SELECT A NODE TO ANALYZE</div>
          )}

          {/* ── Active operations ── */}
          {ops.length > 0 && (
            <div className="nm-active-ops">
              <div className="nm-active-title">ACTIVE OPS</div>
              {ops.map(op => {
                const remaining = new Date(op.completes_at).getTime() - now
                const total     = new Date(op.completes_at).getTime() - new Date(op.started_at).getTime()
                const progress  = Math.min(1, Math.max(0, 1 - remaining / total))
                const ready     = op.collectable || remaining <= 0
                return (
                  <div key={op.id} className="nm-op-active-row">
                    <div className="nm-op-active-header">
                      <span className="nm-op-active-host">{op.target_hostname}</span>
                      <span className="nm-op-active-type">{op.label}</span>
                    </div>
                    <div className="nm-op-bar-row">
                      <div className="nm-op-bar">
                        <div className="nm-op-bar-fill" style={{ width: `${progress * 100}%` }} />
                      </div>
                      {ready ? (
                        <button
                          className="nm-collect-btn"
                          disabled={collecting === op.id}
                          onClick={() => collectOp(op.id)}
                        >
                          {collecting === op.id ? '...' : 'COLLECT'}
                        </button>
                      ) : (
                        <span className="nm-op-timer">{fmtDuration(remaining)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="legend">
            <div className="leg-item"><span className="self">Y</span> YOU</div>
            <div className="leg-item"><span className="npc">N</span> NPC</div>
            <div className="leg-item"><span className="occupied">P</span> PLAYER</div>
            <div className="leg-item"><span className="owned-indicator">█</span> ACCESSED</div>
          </div>
        </div>
      </div>
    </div>
  )
}

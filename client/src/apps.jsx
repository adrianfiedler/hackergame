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
export function Miner({ state }) {
  const [hash, setHash]       = useState('0x00000000000000000000000000000000')
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(true)
  const [blocks, setBlocks]   = useState(0)
  const [log, setLog]         = useState([])
  const hrRef = useRef(state.hashrate)
  hrRef.current = state.hashrate

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const rand = Array.from({ length: 32 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      setHash('0x' + rand)
      setProgress(p => {
        const step = 0.2 + hrRef.current * 0.08
        const np = p + step
        if (np >= 100) {
          const reward = 0.003 + hrRef.current * 0.0006
          setBlocks(b => b + 1)
          setLog(l => [`[+] BLOCK ${String(Date.now()).slice(-6)} hashed — ${reward.toFixed(5)} ⟠ pending`, ...l].slice(0, 6))
          Audio.coin()
          return 0
        }
        return np
      })
    }, 80)
    return () => clearInterval(id)
  }, [running])

  return (
    <div className="miner">
      <h3>◆ CRYPTO MINER v2.3 ◆</h3>
      <div className="hashdisplay">
        hashing...{'\n'}{hash}{'\n'}
        nonce: {Math.floor(Math.random() * 99999999)}
      </div>
      <div className="progress"><div style={{ width: progress + '%' }}/></div>
      <div className="stats">
        <div className="k">hashrate</div><div className="v">{state.hashrate} H/s</div>
        <div className="k">blocks hashed</div><div className="v">{blocks}</div>
        <div className="k">wallet</div><div className="v">{fmtCrypto(state.crypto)} ⟠</div>
        <div className="k">status</div><div className="v" style={{color: running ? 'var(--primary)' : '#6b7aa8'}}>{running ? 'ONLINE' : 'paused'}</div>
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

export function IrcApp({ player }) {
  const [activeChannel, setActiveChannel] = useState('#general')
  const [messages, setMessages]           = useState({
    '#general': [
      { id: 1, sender: 'SYSTEM', content: 'Welcome to #general. Hack the planet.', kind: 'system_alert', ts: new Date() },
    ],
    '#trading': [
      { id: 2, sender: 'SYSTEM', content: 'Trade zero-days, hardware, and exploit kits here.', kind: 'system_alert', ts: new Date() },
    ],
    '#wanted': [
      { id: 3, sender: 'SYSTEM', content: 'Post bounties on enemy operators. ⚠ Watch your back.', kind: 'system_alert', ts: new Date() },
    ],
    'SYSTEM': [
      { id: 4, sender: null, content: 'System log initialized. Mining income will appear here.', kind: 'system_mine', ts: new Date() },
    ],
  })
  const [input, setInput]   = useState('')
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, activeChannel])

  const sendMessage = () => {
    if (!input.trim()) return
    const msg = { id: Math.random(), sender: player?.username || 'you', content: input, kind: 'chat', ts: new Date() }
    setMessages(m => ({ ...m, [activeChannel]: [...(m[activeChannel] || []), msg] }))
    setInput('')
    Audio.key()
    // TODO Phase 3: emit to socket for real multiplayer chat
  }

  const fmtTime = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`

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
            <div key={m.id} className={'irc-msg' + (m.sender === null || m.kind !== 'chat' ? ' irc-sys' : '')}>
              <span className="irc-time">[{fmtTime(m.ts)}]</span>
              {m.sender && <span className="irc-nick">&lt;{m.sender}&gt;</span>}
              {!m.sender && <span className="irc-nick irc-sys-tag">[SYS]</span>}
              <span className="irc-content">{m.content}</span>
            </div>
          ))}
        </div>
        {activeChannel !== 'SYSTEM' && (
          <div className="irc-input-row">
            <span className="irc-prompt">[{activeChannel}]</span>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="type message…" autoFocus spellCheck={false} />
          </div>
        )}
      </div>
    </div>
  )
}
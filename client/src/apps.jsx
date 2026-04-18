import { useState, useEffect, useRef } from 'react'
import { Audio, fmtCrypto } from './state.jsx'
import { I } from './icons.jsx'

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
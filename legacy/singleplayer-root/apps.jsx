// apps.jsx — Browser, Notepad, Calculator, Trash, Miner

const { useState: useS, useEffect: useE, useRef: useR } = React;

// ============ BROWSER ============
const BBS_POSTS = [
  { user: "zer0_c00l", time: "04/17/26 23:41", body: "Anyone cracked orbital.sat-7 yet? I keep getting ICE'd on the decode step. The phrases are all old McLuhan quotes." },
  { user: "acid_burn", time: "04/17/26 23:58", body: "@zer0_c00l ROT-13 decoder. Try it on paper. It's that easy. Don't forget spaces matter." },
  { user: "crashoverride", time: "04/18/26 00:12", body: "Protip for gibson.mil — the backdoor port is always 31337 on military boxes. Always." },
  { user: "phantom", time: "04/18/26 00:44", body: "BNK switch open. Password hint: 5-letter fish. Starts with S. You know the one." },
  { user: "lord_nikon", time: "04/18/26 01:20", body: "Mine with 3+ rig upgrades then sell clicks for exploit tokens. Don't bother hacking nsa until you have ⟠ 1.5+ reserves." },
];

const SEARCH = [
  { url: "hx://bbs.undernet", title: "The Undernet BBS", desc: "Home of the l33t. Operator guides, target leaks, flame wars.", page: "bbs" },
  { url: "hx://wiki.hx-os", title: "HX//OS Wiki", desc: "Official documentation for your totally-legal terminal.", page: "wiki" },
  { url: "hx://searchy", title: "Searchy — the one good search engine", desc: "Try searching 'hacking', 'snake', 'crypto'…", page: "search" },
  { url: "hx://geocities.retro/~clippy", title: "~clippy's homepage", desc: "IT LOOKS LIKE YOU'RE TRYING TO HACK THE GIBSON. Would you like help?", page: "clippy" },
  { url: "hx://hotdogwatr", title: "HotDogWaterMail — login", desc: "your inbox is empty and full of ads", page: "mail" },
];

function Browser() {
  const [url, setUrl] = useS("hx://searchy");
  const [input, setInput] = useS("hx://searchy");
  const [history, setHistory] = useS(["hx://searchy"]);
  const [idx, setIdx] = useS(0);
  const [query, setQuery] = useS("");

  const go = (u) => {
    const newHist = [...history.slice(0, idx + 1), u];
    setHistory(newHist); setIdx(newHist.length - 1);
    setUrl(u); setInput(u); Audio.key();
  };
  const back = () => { if (idx > 0) { setIdx(idx - 1); setUrl(history[idx - 1]); setInput(history[idx - 1]); } };
  const fwd = () => { if (idx < history.length - 1) { setIdx(idx + 1); setUrl(history[idx + 1]); setInput(history[idx + 1]); } };

  const renderPage = () => {
    if (url === "hx://searchy" || url.startsWith("hx://searchy?")) {
      const q = url.includes("?") ? decodeURIComponent(url.split("?q=")[1] || "") : "";
      const results = q ? SEARCH.filter(s => (s.title + s.desc + s.url).toLowerCase().includes(q.toLowerCase())) : SEARCH;
      return (
        <div>
          <h1>◢ SEARCHY ◣</h1>
          <div className="marquee"><span>★ NEW: Search engine no longer sells your data to THREE separate agencies! ★ Please enjoy your crypto hacking responsibly. ★</span></div>
          <div style={{ margin: "18px 0 12px" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go("hx://searchy?q=" + encodeURIComponent(query))}
              placeholder="search the nets…"
              style={{ width: "70%", background: "#02040a", border: "1px solid #00e7ff", color: "#9bff3c", padding: "6px 10px", fontFamily: "VT323, monospace", fontSize: 17, outline: "none" }}
            />
            <button onClick={() => go("hx://searchy?q=" + encodeURIComponent(query))} style={{ marginLeft: 6, padding: "6px 14px", background: "#00e7ff", color: "#000", border: "none", fontFamily: "Share Tech Mono", cursor: "pointer", fontSize: 12 }}>SEARCH</button>
          </div>
          {q && <div style={{ color: "#6b7aa8", marginBottom: 8 }}>{results.length} results for "{q}"</div>}
          {results.map((r, i) => (
            <div className="sresult" key={i}>
              <a className="title" onClick={() => go(r.url)}>{r.title}</a>
              <div className="url">{r.url}</div>
              <div className="desc">{r.desc}</div>
            </div>
          ))}
        </div>
      );
    }
    if (url === "hx://bbs.undernet") return (
      <div>
        <h1>▓ THE UNDERNET BBS ▓</h1>
        <div style={{ color: "#6b7aa8" }}>Users online: 47 · Last post: 3 min ago</div>
        <hr />
        <h2>// general chat</h2>
        {BBS_POSTS.map((p, i) => (
          <div className="post" key={i}>
            <div className="meta">► {p.user} <span style={{ color: "#6b7aa8" }}>at {p.time}</span></div>
            <div className="body">{p.body}</div>
          </div>
        ))}
        <div className="box m">
          <span className="blink">▐</span> post reply: <em style={{ color: "#6b7aa8" }}>[you must be a registered l33t to post]</em>
        </div>
      </div>
    );
    if (url === "hx://wiki.hx-os") return (
      <div>
        <h1>HX//OS WIKI</h1>
        <div style={{ color: "#6b7aa8" }}>A collaborative manual for the operating system you're currently using.</div>
        <h2>getting started</h2>
        <div className="box">
          Open the <strong style={{color:"#ff2bd6"}}>Terminal</strong> from the desktop or the ⟐ START menu. Type <em style={{color:"#9bff3c"}}>help</em> to list commands. Most money comes from two sources: <em>hacking</em> remote hosts, and running the <em>miner</em> in the background.
        </div>
        <h2>hacking</h2>
        <div className="box">
          1. <em>scan</em> to list reachable hosts.<br/>
          2. <em>hack &lt;host&gt;</em> to attempt a breach.<br/>
          3. Three puzzle types:<br/>
          &nbsp;&nbsp;&nbsp;<strong style={{color:"#00e7ff"}}>PORTSCAN</strong> — the last open port is the backdoor.<br/>
          &nbsp;&nbsp;&nbsp;<strong style={{color:"#00e7ff"}}>PASSWORD</strong> — match the fragment hint (first + last char).<br/>
          &nbsp;&nbsp;&nbsp;<strong style={{color:"#00e7ff"}}>CIPHER</strong> — ROT-13 a famous phrase.
        </div>
        <h2>mining</h2>
        <div className="box">
          Run the <em>miner</em> app. It hashes continuously and rewards blocks based on your <em>hashrate</em>. Spend ⟠ on <em>upgrade rig / cpu / net</em> in the terminal.
        </div>
        <h2>snake</h2>
        <div className="box">Type <em>snake</em> in terminal. Every 3 points = 0.002 ⟠.</div>
        <h2>the trash</h2>
        <div className="box">Drag desktop files onto the Trash icon. Satisfying.</div>
      </div>
    );
    if (url === "hx://geocities.retro/~clippy") return (
      <div>
        <h1 style={{color:"#ffd23f"}}>📎 WELCOME TO CLIPPY'S PAGE 📎</h1>
        <div className="marquee"><span>under construction · under construction · under construction ·</span></div>
        <div className="box">
          <strong>IT LOOKS LIKE YOU'RE TRYING TO HACK THE GIBSON.</strong><br/><br/>
          Would you like to:<br/>
          ○ Continue without paperclip assistance<br/>
          ○ Receive federal prison sentence<br/>
          ○ <span className="blink">○</span> Install 47 browser toolbars
        </div>
        <div style={{ color: "#6b7aa8", marginTop: 12 }}>this page best viewed in Netscape Navigator 3.0 @ 800x600</div>
      </div>
    );
    if (url === "hx://hotdogwatr") return (
      <div>
        <h1 style={{color:"#ff3b5c"}}>HOTDOGWATRMAIL</h1>
        <div className="box m">WELCOME BACK, user43. You have <strong>0</strong> new messages and <strong>12,847</strong> promotional offers.</div>
        <div className="post"><div className="meta">▼ SIRS@nigerian-prince.gov</div><div className="body">Dear Esteemed Operator, I have 45,000,000 ⟠ that I need to transfer through your wallet urgently…</div></div>
        <div className="post"><div className="meta">▼ noreply@singles-in-your-segment.net</div><div className="body">HOT ROUTERS IN YOUR AREA WANT TO PEER WITH YOU</div></div>
        <div className="post"><div className="meta">▼ admin@ellingson.corp</div><div className="body">Someone (you?) logged into our mainframe from IP 127.0.0.1. If this was not you, please ignore.</div></div>
      </div>
    );
    return (
      <div>
        <h1 style={{color:"#ff3b5c"}}>404 — PAGE NOT FOUND</h1>
        <div className="box">The net is vast and infinite. This address is not.</div>
        <a onClick={() => go("hx://searchy")}>→ return to Searchy</a>
      </div>
    );
  };

  return (
    <div className="browser">
      <div className="toolbar">
        <button onClick={back} disabled={idx === 0}>◄</button>
        <button onClick={fwd} disabled={idx >= history.length - 1}>►</button>
        <button onClick={() => go(url)}>⟳</button>
        <button onClick={() => go("hx://searchy")}>⌂</button>
        <input
          className="urlbar"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go(input)}
        />
      </div>
      <div className="page" key={url}>{renderPage()}</div>
    </div>
  );
}

// ============ NOTEPAD ============
function Notepad({ state, setState }) {
  return (
    <div className="notepad" style={{ height: "100%" }}>
      <textarea
        value={state.notepadText}
        onChange={(e) => setState(s => ({ ...s, notepadText: e.target.value }))}
        spellCheck={false}
      />
    </div>
  );
}

// ============ CALCULATOR ============
function Calculator() {
  const [disp, setDisp] = useS("0");
  const [acc, setAcc] = useS(null);
  const [op, setOp] = useS(null);
  const [fresh, setFresh] = useS(true);

  const pressNum = (n) => { Audio.key(); setDisp(fresh ? n : (disp === "0" ? n : disp + n)); setFresh(false); };
  const pressDot = () => { Audio.key(); if (!disp.includes(".")) setDisp(disp + "."); setFresh(false); };
  const pressOp = (newOp) => {
    Audio.key();
    const cur = parseFloat(disp);
    if (acc == null) setAcc(cur);
    else if (op) setAcc(calc(acc, cur, op));
    setOp(newOp); setFresh(true);
  };
  const calc = (a, b, o) => ({ "+": a + b, "-": a - b, "×": a * b, "÷": b === 0 ? 0 : a / b })[o];
  const pressEq = () => {
    Audio.ok();
    if (op != null && acc != null) {
      const r = calc(acc, parseFloat(disp), op);
      setDisp(String(Math.round(r * 1e9) / 1e9)); setAcc(null); setOp(null); setFresh(true);
    }
  };
  const pressC = () => { Audio.err(); setDisp("0"); setAcc(null); setOp(null); setFresh(true); };

  const btn = (label, cls, fn) => <button className={cls} onClick={fn}>{label}</button>;
  return (
    <div className="calc">
      <div className="disp">{disp}{op ? ` ${op}` : ""}</div>
      <div className="pad">
        {btn("C", "clr", pressC)}
        {btn("±", "", () => setDisp(disp.startsWith("-") ? disp.slice(1) : "-" + disp))}
        {btn("%", "", () => setDisp(String(parseFloat(disp) / 100)))}
        {btn("÷", "op", () => pressOp("÷"))}
        {["7","8","9"].map(n => btn(n, "", () => pressNum(n)))}
        {btn("×", "op", () => pressOp("×"))}
        {["4","5","6"].map(n => btn(n, "", () => pressNum(n)))}
        {btn("-", "op", () => pressOp("-"))}
        {["1","2","3"].map(n => btn(n, "", () => pressNum(n)))}
        {btn("+", "op", () => pressOp("+"))}
        {btn("0", "", () => pressNum("0"))}
        {btn(".", "", pressDot)}
        {btn("=", "eq", pressEq)}
      </div>
    </div>
  );
}

// ============ TRASH ============
function TrashApp({ state, setState }) {
  const [dragId, setDragId] = useS(null);
  const empty = state.trashFiles.length === 0;
  const onDragStart = (e, f) => {
    setDragId(f.id);
    e.dataTransfer.setData("text/plain", f.id);
    e.dataTransfer.effectAllowed = "move";
  };
  return (
    <div className="trashwin">
      {empty ? (
        <div className="empty">[ /tmp/.Trash — empty ]<br/><br/>drag files here to delete them.</div>
      ) : (
        <div className="files">
          {state.trashFiles.map(f => (
            <div key={f.id} className={"file " + (dragId === f.id ? "dragging" : "")}
              draggable
              onDragStart={(e) => onDragStart(e, f)}
              onDragEnd={() => setDragId(null)}
              title={f.name}>
              <div className="g">
                {f.kind === "doc" ? <I.Doc /> :
                 f.kind === "exe" ? <I.Exe /> :
                 f.kind === "img" ? <I.Img /> : <I.File />}
              </div>
              <div>{f.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MINER ============
function Miner({ state, setState }) {
  const [hash, setHash] = useS("0x00000000000000000000000000000000");
  const [progress, setProgress] = useS(0);
  const [running, setRunning] = useS(true);
  const [blocks, setBlocks] = useS(0);
  const [log, setLog] = useS([]);
  const hrRef = useR(state.hashrate);
  hrRef.current = state.hashrate;

  useE(() => {
    if (!running) return;
    const id = setInterval(() => {
      // random hash churn
      const rand = Array.from({ length: 32 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
      setHash("0x" + rand);
      setProgress(p => {
        const step = 0.2 + hrRef.current * 0.08;
        const np = p + step;
        if (np >= 100) {
          const reward = 0.003 + hrRef.current * 0.0006;
          setBlocks(b => b + 1);
          setLog(l => [`[+] BLOCK ${String(Date.now()).slice(-6)} mined — ${reward.toFixed(5)} ⟠`, ...l].slice(0, 6));
          setState(s => ({ ...s, crypto: s.crypto + reward }));
          Audio.coin();
          return 0;
        }
        return np;
      });
    }, 80);
    return () => clearInterval(id);
  }, [running]);

  const upgrade = (kind) => {
    const prices = { rig: state.rigLevel * 0.05, cpu: state.cpuLevel * 0.08, net: state.netLevel * 0.12 };
    const effects = { rig: 5, cpu: 10, net: 25 };
    const cost = prices[kind];
    if (state.crypto < cost) { Audio.err(); return; }
    setState(s => {
      const n = { ...s, crypto: s.crypto - cost, hashrate: s.hashrate + effects[kind] };
      if (kind === "rig") n.rigLevel += 1;
      if (kind === "cpu") n.cpuLevel += 1;
      if (kind === "net") n.netLevel += 1;
      return n;
    });
    Audio.ok();
  };

  return (
    <div className="miner">
      <h3>◆ CRYPTO MINER v2.3 ◆</h3>
      <div className="hashdisplay">
        hashing...{"\n"}{hash}{"\n"}
        nonce: {Math.floor(Math.random() * 99999999)}
      </div>
      <div className="progress"><div style={{ width: progress + "%" }}/></div>
      <div className="stats">
        <div className="k">hashrate</div><div className="v">{state.hashrate} H/s</div>
        <div className="k">blocks mined</div><div className="v">{blocks}</div>
        <div className="k">wallet</div><div className="v">{fmtCrypto(state.crypto)} ⟠</div>
        <div className="k">status</div><div className="v">{running ? "ONLINE" : "paused"}</div>
      </div>
      <div className="btns">
        <button onClick={() => setRunning(r => !r)}>{running ? "⏸ pause" : "▶ resume"}</button>
      </div>

      <h3 style={{ marginTop: 8 }}>UPGRADES</h3>
      <div className="upgrade">
        <div><span className="name">RIG</span> L{state.rigLevel} · <span style={{color:"#9bff3c"}}>+5 H/s</span></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="cost">{fmtCrypto(state.rigLevel * 0.05)} ⟠</span>
          <button onClick={() => upgrade("rig")} disabled={state.crypto < state.rigLevel * 0.05}>BUY</button>
        </div>
      </div>
      <div className="upgrade">
        <div><span className="name">CPU</span> L{state.cpuLevel} · <span style={{color:"#9bff3c"}}>+10 H/s</span></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="cost">{fmtCrypto(state.cpuLevel * 0.08)} ⟠</span>
          <button onClick={() => upgrade("cpu")} disabled={state.crypto < state.cpuLevel * 0.08}>BUY</button>
        </div>
      </div>
      <div className="upgrade">
        <div><span className="name">NET</span> L{state.netLevel} · <span style={{color:"#9bff3c"}}>+25 H/s</span></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="cost">{fmtCrypto(state.netLevel * 0.12)} ⟠</span>
          <button onClick={() => upgrade("net")} disabled={state.crypto < state.netLevel * 0.12}>BUY</button>
        </div>
      </div>

      <div style={{ marginTop: 4, color: "#6b7aa8", fontSize: 13 }}>
        {log.map((l, i) => <div key={i} style={{ color: "#9bff3c" }}>{l}</div>)}
      </div>
    </div>
  );
}

Object.assign(window, { Browser, Notepad, Calculator, TrashApp, Miner });

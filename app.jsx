// app.jsx — root React app: desktop, window manager, taskbar, start menu, tweaks, boot
const { useState: uS, useEffect: uE, useRef: uR, useCallback: uC } = React;

// ==== TWEAK DEFAULTS (persisted to disk via __edit_mode_set_keys) ====
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "cyan",
  "scanlineIntensity": 35,
  "typingSpeed": 22,
  "audioOn": true,
  "bootEnabled": true
}/*EDITMODE-END*/;

const APPS = {
  terminal:   { title: "TERMINAL",       size: { w: 640, h: 420 } },
  browser:    { title: "NET::BROWSER",   size: { w: 640, h: 480 } },
  notepad:    { title: "NOTEPAD.SYS",    size: { w: 420, h: 340 } },
  calculator: { title: "CALC.EXE",       size: { w: 260, h: 340 } },
  trash:      { title: "/tmp/.TRASH",    size: { w: 420, h: 300 } },
  miner:      { title: "CRYPTO-MINER",   size: { w: 420, h: 560 } },
};

const DESKTOP_ICONS = [
  { app: "terminal",   label: "Terminal",   Glyph: () => <I.Terminal /> },
  { app: "browser",    label: "Net Browser", Glyph: () => <I.Browser /> },
  { app: "notepad",    label: "Notepad",    Glyph: () => <I.Notepad /> },
  { app: "calculator", label: "Calc",       Glyph: () => <I.Calculator /> },
  { app: "miner",      label: "Miner",      Glyph: () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 3l12 7v12l-12 7L4 22V10z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 3v26M4 10l12 7 12-7" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ) },
  { app: "trash",      label: "Trash",      Glyph: ({full}) => full ? <I.TrashFull /> : <I.Trash /> },
];

function App() {
  const [state, setState] = uS(() => loadState());
  const [wins, setWins] = uS([]);
  const [zCounter, setZCounter] = uS(10);
  const [activeId, setActiveId] = uS(null);
  const [selectedIcon, setSelectedIcon] = uS(null);
  const [startOpen, setStartOpen] = uS(false);
  const [tweaksOpen, setTweaksOpen] = uS(false);
  const [tweaks, setTweaks] = uS({ ...TWEAK_DEFAULTS });
  const [clock, setClock] = uS(new Date());
  const [trashDrop, setTrashDrop] = uS(false);
  const [deletedAnim, setDeletedAnim] = uS([]);
  const [booting, setBooting] = uS(tweaks.bootEnabled);

  // persist state
  uE(() => { saveState(state); }, [state]);

  // clock
  uE(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // apply tweaks
  uE(() => {
    document.body.dataset.theme = tweaks.theme;
    document.documentElement.style.setProperty("--scan", (tweaks.scanlineIntensity / 100).toFixed(2));
    document.getElementById("crt-scan").style.display = tweaks.scanlineIntensity > 0 ? "block" : "none";
    window.__typeSpeed = tweaks.typingSpeed;
    Audio.enabled = tweaks.audioOn;
  }, [tweaks]);

  // ---- Tweaks host protocol ----
  uE(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);
  const updateTweak = (k, v) => {
    setTweaks(t => ({ ...t, [k]: v }));
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*"); } catch {}
  };

  // ---- boot sequence ----
  uE(() => {
    if (!booting) return;
    const lines = [
      "HX//OS BIOS v2.4.1 — (c) Ellingson Mineral Co., 1994",
      "",
      "Memory test: 640K base, 31744K extended .... OK",
      "Detecting CPU: RISC-V subneural @ 33.6 MHz .... OK",
      "Loading kernel: /boot/hx-os ................ OK",
      "Mounting /dev/wallet ....................... OK",
      "Starting network: eth0, eth1, darkfiber0 ... OK",
      "Probing neural interface ................... OK",
      "Loading modules: [crypto] [snake] [exploit]  OK",
      "Initializing desktop environment ............",
      "",
      "Welcome, operator.",
    ];
    const el = document.getElementById("boot");
    el.innerHTML = "<div class='hdr'>HX//OS BOOT SEQUENCE</div>";
    let i = 0;
    const id = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(id);
        el.innerHTML += "<div style='margin-top:8px;color:#ff2bd6'>▶ READY <span class='blink' style='display:inline-block;width:10px;height:14px;background:#ff2bd6'></span></div>";
        setTimeout(() => {
          el.classList.add("done");
          setBooting(false);
          setTimeout(() => { el.style.display = "none"; }, 500);
        }, 500);
        return;
      }
      const div = document.createElement("div");
      div.textContent = lines[i];
      el.appendChild(div);
      i++;
    }, 140);
    return () => clearInterval(id);
  }, []);

  // ---- window management ----
  const openApp = (appId) => {
    Audio.blip(660, 0.04);
    setStartOpen(false);
    const existing = wins.find(w => w.appId === appId);
    if (existing) {
      focusWin(existing.id);
      if (existing.minimized) setWins(ws => ws.map(w => w.id === existing.id ? { ...w, minimized: false } : w));
      return;
    }
    const meta = APPS[appId];
    const id = "w" + Math.random().toString(36).slice(2, 8);
    const z = zCounter + 1;
    setZCounter(z);
    const offset = (wins.length % 6) * 24;
    const win = {
      id, appId,
      title: meta.title,
      size: meta.size,
      x: 140 + offset,
      y: 60 + offset,
      z,
      minimized: false,
    };
    setWins(ws => [...ws, win]);
    setActiveId(id);
  };
  const closeWin = (id) => {
    setWins(ws => ws.filter(w => w.id !== id));
    Audio.blip(240, 0.06);
  };
  const minimizeWin = (id) => { setWins(ws => ws.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w)); Audio.blip(440, 0.03); };
  const focusWin = (id) => {
    setActiveId(id);
    setZCounter(z => {
      const nz = z + 1;
      setWins(ws => ws.map(w => w.id === id ? { ...w, z: nz } : w));
      return nz;
    });
  };

  // ---- trash drop ----
  uE(() => {
    const onOver = (e) => {
      const target = e.target.closest('[data-app="trash"]');
      setTrashDrop(!!target);
      if (target) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
    };
    const onDrop = (e) => {
      const target = e.target.closest('[data-app="trash"]');
      if (!target) { setTrashDrop(false); return; }
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;
      const f = state.trashFiles.find(x => x.id === id);
      if (!f) return;
      // splash animation
      const rect = target.getBoundingClientRect();
      const anim = { id: Math.random(), x: rect.left + rect.width / 2 - 30, y: rect.top, text: `~${f.name}~` };
      setDeletedAnim(a => [...a, anim]);
      setTimeout(() => setDeletedAnim(a => a.filter(x => x.id !== anim.id)), 800);
      setState(s => ({ ...s, trashFiles: s.trashFiles.filter(x => x.id !== id) }));
      Audio.err();
      setTrashDrop(false);
    };
    const onEnd = () => setTrashDrop(false);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onEnd);
    return () => {
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", onEnd);
    };
  }, [state.trashFiles]);

  // ---- desktop click closes start menu etc ----
  const onDesktopClick = (e) => {
    setStartOpen(false);
    setSelectedIcon(null);
    document.getElementById("ctxmenu").classList.remove("open");
  };

  // ---- start menu ----
  const renderStartMenu = () => (
    <div id="startmenu" style={{ display: startOpen ? "block" : "none" }} onClick={(e) => e.stopPropagation()}>
      <div className="header">▓ HX//OS ▓ PROGRAMS</div>
      {Object.entries(APPS).map(([id, meta]) => (
        <div className="item" key={id} onClick={() => { openApp(id); setStartOpen(false); }}>
          <span className="g">▸</span>{meta.title}
        </div>
      ))}
      <div className="sep"/>
      <div className="item" onClick={() => { setTweaksOpen(v => !v); setStartOpen(false); }}>
        <span className="g">⚙</span>Tweaks
      </div>
      <div className="item" onClick={() => { if (confirm("wipe progress?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); }}}>
        <span className="g">⟲</span>Reset Progress
      </div>
    </div>
  );

  // ---- content for a window ----
  const appContent = (win) => {
    switch (win.appId) {
      case "terminal": return <Terminal state={state} setState={setState} onOpenApp={openApp} />;
      case "browser": return <Browser />;
      case "notepad": return <Notepad state={state} setState={setState} />;
      case "calculator": return <Calculator />;
      case "trash": return <TrashApp state={state} setState={setState} />;
      case "miner": return <Miner state={state} setState={setState} />;
    }
  };

  const fmtClock = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  const fmtDate = (d) => {
    const m = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getMonth()];
    return `${String(d.getDate()).padStart(2,"0")}-${m}-${String(d.getFullYear()).slice(2)}`;
  };

  return (
    <>
      {/* Desktop surface */}
      <div style={{ position: "fixed", inset: "0 0 28px 0", zIndex: 1 }} onClick={onDesktopClick}>
        <div className="icon-grid">
          {DESKTOP_ICONS.map(icon => {
            const full = icon.app === "trash" && state.trashFiles.length > 0;
            return (
              <div
                key={icon.app}
                className={"icon" + (selectedIcon === icon.app ? " selected" : "") + (icon.app === "trash" && trashDrop ? " drop-target" : "")}
                data-app={icon.app}
                onClick={(e) => { e.stopPropagation(); setSelectedIcon(icon.app); }}
                onDoubleClick={(e) => { e.stopPropagation(); openApp(icon.app); }}
              >
                <div className="glyph"><icon.Glyph full={full} /></div>
                <div className="label">{icon.label}</div>
              </div>
            );
          })}
        </div>

        {wins.map(w => (
          <Win
            key={w.id}
            win={w}
            active={activeId === w.id}
            onFocus={focusWin}
            onClose={closeWin}
            onMinimize={minimizeWin}
          >
            {appContent(w)}
          </Win>
        ))}
      </div>

      {/* Taskbar */}
      <div id="taskbar">
        <div id="startbtn" onClick={(e) => { e.stopPropagation(); setStartOpen(v => !v); Audio.key(); }}>
          <span className="dot"></span><span>HX//OS</span>
        </div>
        <div id="task-list">
          {wins.map(w => (
            <div key={w.id}
              className={"task-item " + (activeId === w.id && !w.minimized ? "active" : "")}
              onClick={() => {
                if (w.minimized) { setWins(ws => ws.map(x => x.id === w.id ? { ...x, minimized: false } : x)); focusWin(w.id); }
                else if (activeId === w.id) minimizeWin(w.id);
                else focusWin(w.id);
              }}>
              <span>▸ {w.title}</span>
            </div>
          ))}
        </div>
        <div id="tray">
          <div className="stat"><span className="k">⟠</span><span className="v">{fmtCrypto(state.crypto)}</span></div>
          <div className="stat"><span className="k">H/s</span><span className="v">{state.hashrate}</span></div>
          <div id="clock" title={fmtDate(clock)}>{fmtClock(clock)} · {fmtDate(clock)}</div>
        </div>
      </div>

      {renderStartMenu()}

      {/* Tweaks panel */}
      <div id="tweaks" className={tweaksOpen ? "open" : ""}>
        <div className="hd">▓ TWEAKS ▓</div>
        <div className="row">
          <label>Phosphor theme</label>
          <div className="swatches">
            {[["cyan","#00e7ff"],["magenta","#ff2bd6"],["lime","#9bff3c"],["amber","#ffd23f"]].map(([k, c]) => (
              <div key={k} className={"sw " + (tweaks.theme === k ? "active" : "")}
                style={{ background: c, color: c }}
                onClick={() => updateTweak("theme", k)} title={k} />
            ))}
          </div>
        </div>
        <div className="row">
          <label>Scanline intensity · {tweaks.scanlineIntensity}%</label>
          <input type="range" min="0" max="100" value={tweaks.scanlineIntensity}
            onChange={(e) => updateTweak("scanlineIntensity", parseInt(e.target.value))} />
        </div>
        <div className="row">
          <label>Typing speed · {tweaks.typingSpeed} cps</label>
          <input type="range" min="4" max="80" value={tweaks.typingSpeed}
            onChange={(e) => updateTweak("typingSpeed", parseInt(e.target.value))} />
        </div>
        <div className="row">
          <div className="toggle">
            <span>Audio (key clicks, blips)</span>
            <button className={"btn " + (tweaks.audioOn ? "on" : "")} onClick={() => updateTweak("audioOn", !tweaks.audioOn)}>{tweaks.audioOn ? "ON" : "OFF"}</button>
          </div>
        </div>
        <div className="row">
          <div className="toggle">
            <span>Boot sequence on load</span>
            <button className={"btn " + (tweaks.bootEnabled ? "on" : "")} onClick={() => updateTweak("bootEnabled", !tweaks.bootEnabled)}>{tweaks.bootEnabled ? "ON" : "OFF"}</button>
          </div>
        </div>
      </div>

      {/* delete animations */}
      {deletedAnim.map(a => (
        <div key={a.id} className="trash-deleted-anim" style={{ left: a.x, top: a.y }}>{a.text}</div>
      ))}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("desktop").parentNode.appendChild(document.createElement("div")));
// but we need to portal into specific slots. Simpler: render App into body, which will place things via fixed positioning / specific ids
document.body.removeChild(document.getElementById("desktop").parentNode.lastChild);

// Just mount a wrapper that replaces our manual taskbar/startmenu placeholders
// Clear the static placeholders first, since App renders its own
document.getElementById("desktop").innerHTML = "";
document.getElementById("taskbar").remove();
document.getElementById("startmenu").remove();
const tweakPlaceholder = document.getElementById("tweaks");
if (tweakPlaceholder) tweakPlaceholder.remove();
const ctxPlaceholder = document.getElementById("ctxmenu");
if (ctxPlaceholder) ctxPlaceholder.remove();

const mountEl = document.createElement("div");
document.body.appendChild(mountEl);
ReactDOM.createRoot(mountEl).render(<App />);

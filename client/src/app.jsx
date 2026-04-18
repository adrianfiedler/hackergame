      const anim = { id: Math.random(), x: rect.left + rect.width / 2 - 30, y: rect.top, text: `~${f.name}~` }
      setDeletedAnim(a => [...a, anim])
      setTimeout(() => setDeletedAnim(a => a.filter(x => x.id !== anim.id)), 800)
      setState(s => ({ ...s, trashFiles: s.trashFiles.filter(x => x.id !== id) }))
      Audio.err()
      setTrashDrop(false)
    }
    const onEnd = () => setTrashDrop(false)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragend', onEnd)
    return () => {
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragend', onEnd)
    }
  }, [state.trashFiles])

  const onDesktopClick = () => {
    setStartOpen(false)
    setSelectedIcon(null)
    const ctx = document.getElementById('ctxmenu')
    if (ctx) ctx.classList.remove('open')
  }

  const appContent = (win) => {
    switch (win.appId) {
      case 'terminal':   return <Terminal state={state} setState={setState} onOpenApp={openApp} />
      case 'browser':    return <Browser />
      case 'notepad':    return <Notepad state={state} setState={setState} />
      case 'calculator': return <Calculator />
      case 'trash':      return <TrashApp state={state} setState={setState} />
      case 'miner':      return <Miner state={state} />
      case 'irc':        return <IrcApp player={player} />
    }
  }

  const pad = (n) => String(n).padStart(2, '0')
  const fmtClock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  const fmtDate  = (d) => {
    const m = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]
    return `${pad(d.getDate())}-${m}-${String(d.getFullYear()).slice(2)}`
  }

  return (
    <>
      {/* Desktop surface */}
      <div style={{ position: 'fixed', inset: '0 0 28px 0', zIndex: 1 }} onClick={onDesktopClick}>
        <div className="icon-grid">
          {DESKTOP_ICONS.map(icon => {
            const full = icon.app === 'trash' && state.trashFiles.length > 0
            return (
              <div key={icon.app}
                className={'icon' + (selectedIcon === icon.app ? ' selected' : '') + (icon.app === 'trash' && trashDrop ? ' drop-target' : '')}
                data-app={icon.app}
                onClick={(e) => { e.stopPropagation(); setSelectedIcon(icon.app) }}
                onDoubleClick={(e) => { e.stopPropagation(); openApp(icon.app) }}
              >
                <div className="glyph"><icon.Glyph full={full} /></div>
                <div className="label">{icon.label}</div>
              </div>
            )
          })}
        </div>

        {wins.map(w => (
          <Win key={w.id} win={w} active={activeId === w.id} onFocus={focusWin} onClose={closeWin} onMinimize={minimizeWin}>
            {appContent(w)}
          </Win>
        ))}
      </div>

      {/* Taskbar */}
      <div id="taskbar">
        <div id="startbtn" onClick={(e) => { e.stopPropagation(); setStartOpen(v => !v); Audio.key() }}>
          <span className="dot"/>
          <span>HX//OS</span>
          <span style={{ color: '#6b7aa8', fontSize: 10, marginLeft: 6 }}>{player.username}</span>
        </div>
        <div id="task-list">
          {wins.map(w => (
            <div key={w.id}
              className={'task-item ' + (activeId === w.id && !w.minimized ? 'active' : '')}
              onClick={() => {
                if (w.minimized) { setWins(ws => ws.map(x => x.id === w.id ? { ...x, minimized: false } : x)); focusWin(w.id) }
                else if (activeId === w.id) minimizeWin(w.id)
                else focusWin(w.id)
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

      {/* Start menu */}
      <div id="startmenu" style={{ display: startOpen ? 'block' : 'none' }} onClick={(e) => e.stopPropagation()}>
        <div className="header">▓ HX//OS ▓ PROGRAMS</div>
        {Object.entries(APPS).map(([id, meta]) => (
          <div className="item" key={id} onClick={() => { openApp(id); setStartOpen(false) }}>
            <span className="g">▸</span>{meta.title}
          </div>
        ))}
        <div className="sep"/>
        <div className="item" onClick={() => { setTweaksOpen(v => !v); setStartOpen(false) }}>
          <span className="g">⚙</span>Tweaks
        </div>
        <div className="sep"/>
        <div className="item" onClick={() => { window.location.href = '/auth/logout' }}>
          <span className="g">⏻</span>Logout ({player.username})
        </div>
      </div>

      {/* Tweaks panel */}
      <div id="tweaks" className={tweaksOpen ? 'open' : ''}>
        <div className="hd">▓ TWEAKS ▓</div>
        <div className="row">
          <label>Phosphor theme</label>
          <div className="swatches">
            {[['cyan','#00e7ff'],['magenta','#ff2bd6'],['lime','#9bff3c'],['amber','#ffd23f']].map(([k, c]) => (
              <div key={k} className={'sw ' + (tweaks.theme === k ? 'active' : '')}
                style={{ background: c, color: c }}
                onClick={() => updateTweak('theme', k)} title={k} />
            ))}
          </div>
        </div>
        <div className="row">
          <label>Scanline intensity · {tweaks.scanlineIntensity}%</label>
          <input type="range" min="0" max="100" value={tweaks.scanlineIntensity}
            onChange={(e) => updateTweak('scanlineIntensity', parseInt(e.target.value))} />
        </div>
        <div className="row">
          <label>Typing speed · {tweaks.typingSpeed} cps</label>
          <input type="range" min="4" max="80" value={tweaks.typingSpeed}
            onChange={(e) => updateTweak('typingSpeed', parseInt(e.target.value))} />
        </div>
        <div className="row">
          <div className="toggle">
            <span>Audio (key clicks, blips)</span>
            <button className={'btn ' + (tweaks.audioOn ? 'on' : '')} onClick={() => updateTweak('audioOn', !tweaks.audioOn)}>{tweaks.audioOn ? 'ON' : 'OFF'}</button>
          </div>
        </div>
        <div className="row">
          <div className="toggle">
            <span>Boot sequence on load</span>
            <button className={'btn ' + (tweaks.bootEnabled ? 'on' : '')} onClick={() => updateTweak('bootEnabled', !tweaks.bootEnabled)}>{tweaks.bootEnabled ? 'ON' : 'OFF'}</button>
          </div>
        </div>
      </div>

      {/* Delete animations */}
      {deletedAnim.map(a => (
        <div key={a.id} className="trash-deleted-anim" style={{ left: a.x, top: a.y }}>{a.text}</div>
      ))}
    </>
  )
}
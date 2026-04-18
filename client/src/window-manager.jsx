import { useState, useEffect, useRef } from 'react'

export function useDraggable(initial) {
  const [pos, setPos] = useState(initial)
  const posRef = useRef(pos)
  posRef.current = pos
  const startDrag = (e) => {
    if (e.button !== 0) return
    const startX = e.clientX, startY = e.clientY
    const orig = { ...posRef.current }
    const onMove = (ev) => {
      setPos({
        x: Math.max(-20, Math.min(window.innerWidth - 80,  orig.x + ev.clientX - startX)),
        y: Math.max(0,   Math.min(window.innerHeight - 60, orig.y + ev.clientY - startY)),
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  return [pos, startDrag, setPos]
}

export function Win({ win, onFocus, onClose, onMinimize, active, children }) {
  const [pos, startDrag, setPos] = useDraggable({ x: win.x, y: win.y })
  const size = win.size || { w: 520, h: 360 }
  useEffect(() => { setPos({ x: win.x, y: win.y }) }, [win.id])
  if (win.minimized) return null
  return (
    <div
      className={`win ${active ? '' : 'inactive'}`}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: win.z }}
      onMouseDown={() => onFocus(win.id)}
    >
      <div className="titlebar" onMouseDown={startDrag}>
        <span className="title">{win.title}</span>
        <div className="win-btns">
          <button className="win-btn" title="Minimize" onClick={(e) => { e.stopPropagation(); onMinimize(win.id) }}>_</button>
          <button className="win-btn close" title="Close"    onClick={(e) => { e.stopPropagation(); onClose(win.id) }}>×</button>
        </div>
      </div>
      <div className="win-body">{children}</div>
      <div className="statusbar">
        <span>[{win.appId.toUpperCase()}]</span>
        <span>{size.w}×{size.h}</span>
      </div>
    </div>
  )
}
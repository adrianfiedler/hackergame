import { useState, useEffect, useRef } from 'react'
import { Win } from './window-manager.jsx'
import { Terminal } from './terminal.jsx'
import { Browser, Notepad, Calculator, TrashApp, Miner, IrcApp } from './apps.jsx'
import { I } from './icons.jsx'
import { Audio, fmtCrypto, DEFAULT_STATE, saveLocalState, scheduleSyncToServer } from './state.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import socket from './socket.js'

const TWEAK_DEFAULTS = {
  theme:            'cyan',
  scanlineIntensity: 35,
  typingSpeed:       22,
  audioOn:           true,
  bootEnabled:       true,
}

const APPS = {
  terminal:   { title: 'TERMINAL',      size: { w: 640, h: 420 } },
  browser:    { title: 'NET::BROWSER',  size: { w: 640, h: 480 } },
  notepad:    { title: 'NOTEPAD.SYS',   size: { w: 420, h: 340 } },
  calculator: { title: 'CALC.EXE',      size: { w: 260, h: 340 } },
  trash:      { title: '/tmp/.TRASH',   size: { w: 420, h: 300 } },
  miner:      { title: 'CRYPTO-MINER',  size: { w: 420, h: 560 } },
  irc:        { title: 'IRC.EXE',       size: { w: 580, h: 420 } },
}

const DESKTOP_ICONS = [
  { app: 'terminal',   label: 'Terminal',    Glyph: () => <I.Terminal /> },
  { app: 'browser',    label: 'Net Browser', Glyph: () => <I.Browser /> },
  { app: 'notepad',    label: 'Notepad',     Glyph: () => <I.Notepad /> },
  { app: 'calculator', label: 'Calc',        Glyph: () => <I.Calculator /> },
  { app: 'miner',      label: 'Miner',       Glyph: () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 3l12 7v12l-12 7L4 22V10z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 3v26M4 10l12 7 12-7" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )},
  { app: 'irc',        label: 'IRC',         Glyph: () => <I.Irc /> },
  { app: 'trash',      label: 'Trash',       Glyph: ({ full }) => full ? <I.TrashFull /> : <I.Trash /> },
]

export default function App() {
  const { player, machine, localData } = useAuth()

  // Initialize state from server data (AuthProvider ensures these are set before App renders)
  const [state, setState] = useState(() => ({
    crypto:      Number(player.crypto),
    hashrate:    machine.hashrate,
    rigLevel:    machine.rig_level,
    cpuLevel:    machine.cpu_level,
    netLevel:    machine.net_level,
    hackedHosts: localData?.hackedHosts  || [],
    snakeHigh:   localData?.snakeHigh    || 0,
    notepadText: localData?.notepadText  || DEFAULT_STATE.notepadText,
    trashFiles:  localData?.trashFiles   || DEFAULT_STATE.trashFiles,
  }))

  const [wins, setWins]           = useState([])
  const [zCounter, setZCounter]   = useState(10)
  const [activeId, setActiveId]   = useState(null)
  const [selectedIcon, setSelectedIcon] = useState(null)
  const [startOpen, setStartOpen] = useState(false)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [tweaks, setTweaks]       = useState({ ...TWEAK_DEFAULTS })
  const [clock, setClock]         = useState(new Date())
  const [trashDrop, setTrashDrop] = useState(false)
  const [deletedAnim, setDeletedAnim] = useState([])
  const [booting, setBooting]     = useState(tweaks.bootEnabled)

  // Sync local-only fields to server and localStorage on state change
  useEffect(() => {
    saveLocalState(state)
    scheduleSyncToServer(state)
  }, [state])

  // Socket.io: receive mining tick from server → update balance
  useEffect(() => {
    socket.on('mining:tick', ({ newBalance, hashrate }) => {
      setState(s => ({ ...s, crypto: newBalance, hashrate }))
    })
    return () => { socket.off('mining:tick') }
  }, [])

  // Clock
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Apply tweaks to DOM
  useEffect(() => {
    document.body.dataset.theme = tweaks.theme
    document.documentElement.style.setProperty('--scan', (tweaks.scanlineIntensity / 100).toFixed(2))
    const scan = document.getElementById('crt-scan')
    if (scan) scan.style.display = tweaks.scanlineIntensity > 0 ? 'block' : 'none'
    window.__typeSpeed = tweaks.typingSpeed
    Audio.enabled = tweaks.audioOn
  }, [tweaks])

  // Tweaks host protocol (edit mode)
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return
      if (e.data.type === '__activate_edit_mode')   setTweaksOpen(true)
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false)
    }
    window.addEventListener('message', onMsg)
    window.parent.postMessage({ type: '__edit_mode_available' }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const updateTweak = (k, v) => {
    setTweaks(t => ({ ...t, [k]: v }))
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*') } catch {}
  }

  // Boot sequence
  useEffect(() => {
    if (!booting) return
    const lines = [
      'HX//OS BIOS v2.4.1 — (c) Ellingson Mineral Co., 1994',
      '',
      'Memory test: 640K base, 31744K extended .... OK',
      'Detecting CPU: RISC-V subneural @ 33.6 MHz .... OK',
      'Loading kernel: /boot/hx-os ................ OK',
      'Mounting /dev/wallet ....................... OK',
      'Starting network: eth0, eth1, darkfiber0 ... OK',
      'Probing neural interface ................... OK',
      'Loading modules: [crypto] [snake] [exploit]  OK',
      `Authenticating operator: ${player.username} ......... OK`,
      'Initializing desktop environment ............',
      '',
      'Welcome, operator.',
    ]
    const el = document.getElementById('boot')
    if (!el) return
    el.innerHTML = "<div class='hdr'>HX//OS BOOT SEQUENCE</div>"
    el.style.display = 'flex'
    let i = 0
    const id = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(id)
        el.innerHTML += "<div style='margin-top:8px;color:#ff2bd6'>▶ READY <span class='blink' style='display:inline-block;width:10px;height:14px;background:#ff2bd6'></span></div>"
        setTimeout(() => {
          el.classList.add('done')
          setBooting(false)
          setTimeout(() => { el.style.display = 'none' }, 500)
        }, 500)
        return
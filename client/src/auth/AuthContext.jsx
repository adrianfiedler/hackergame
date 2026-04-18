import { createContext, useContext, useState, useEffect } from 'react'
import LoginScreen from './LoginScreen.jsx'
import socket from '../socket.js'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// main.jsx wraps <App /> in <AuthProvider> as children.
// AuthProvider gatekeeps rendering: shows loader → login → game.
export function AuthProvider({ children }) {
  const [status, setStatus]       = useState('loading') // 'loading' | 'anon' | 'authed'
  const [player, setPlayer]       = useState(null)
  const [machine, setMachine]     = useState(null)
  const [localData, setLocalData] = useState({})

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.player) {
          setPlayer(data.player)
          setMachine(data.machine)
          setLocalData(data.localData || {})
          setStatus('authed')
          socket.connect()
        } else {
          setStatus('anon')
        }
      })
      .catch(() => setStatus('anon'))
  }, [])

  if (status === 'loading') return <BootLoader />
  if (status === 'anon')    return <LoginScreen />

  return (
    <AuthContext.Provider value={{ player, setPlayer, machine, setMachine, localData, setLocalData }}>
      {children}
    </AuthContext.Provider>
  )
}

function BootLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#02040a', color: 'var(--primary)',
      fontFamily: 'VT323, monospace', fontSize: 20,
    }}>
      <div>
        <div style={{ marginBottom: 8, opacity: 0.6 }}>HX//OS NETWORK ACCESS TERMINAL</div>
        <div>AUTHENTICATING<span className="blink">▌</span></div>
      </div>
    </div>
  )
}
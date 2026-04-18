export default function LoginScreen() {
  const hasError = window.location.search.includes('auth_error=1')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#05060a',
      fontFamily: "'VT323', 'Courier New', monospace",
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        padding: '40px 48px',
        border: '1px solid #00e7ff',
        boxShadow: '0 0 24px #00e7ff, inset 0 0 24px rgba(0,231,255,0.04)',
        maxWidth: 480, width: '100%',
      }}>
        <pre style={{ color: '#00e7ff', fontSize: 14, lineHeight: 1.2, margin: 0, textAlign: 'center' }}>{`
 ██╗  ██╗██╗  ██╗    ██████╗ ███████╗
 ██║  ██║╚██╗██╔╝   ██╔═══██╗██╔════╝
 ███████║ ╚███╔╝    ██║   ██║███████╗
 ██╔══██║ ██╔██╗    ██║   ██║╚════██║
 ██║  ██║██╔╝ ██╗   ╚██████╔╝███████║
 ╚═╝  ╚═╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝`}</pre>

        <div style={{ color: '#00e7ff', fontSize: 22, letterSpacing: 4 }}>
          NETWORK ACCESS TERMINAL
        </div>
        <div style={{ color: '#6b7aa8', fontSize: 14, letterSpacing: 2, textAlign: 'center' }}>
          AUTHENTICATION REQUIRED — OPERATORS ONLY
        </div>

        {hasError && (
          <div style={{ color: '#ff3b5c', fontSize: 14, textAlign: 'center' }}>
            !! AUTH FAILED — Google login rejected. Try again.
          </div>
        )}

        <a href="/auth/google" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 8, padding: '12px 28px',
          border: '1px solid #00e7ff', color: '#00e7ff',
          fontFamily: "'VT323', monospace", fontSize: 20, letterSpacing: 2,
          textDecoration: 'none', background: 'transparent', cursor: 'pointer',
        }}>
          ⬡ LOGIN WITH GOOGLE
        </a>

        <div style={{ color: '#ffd23f', fontSize: 13, letterSpacing: 1, textAlign: 'center' }}>
          ⚠ UNAUTHORIZED ACCESS IS MONITORED AND PROSECUTED
        </div>
        <div style={{ color: '#6b7aa8', fontSize: 12, opacity: 0.5 }}>
          HX//OS v2.4.1 — (c) Ellingson Mineral Co., 1994
        </div>
      </div>
    </div>
  )
}

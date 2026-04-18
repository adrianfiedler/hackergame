export default function LoginScreen() {
  const hasError = window.location.search.includes('auth_error=1')

  return (
    <div className="login-screen">
      <div className="login-box">
        <pre className="login-art">{`
 ██╗  ██╗██╗  ██╗    ██████╗ ███████╗
 ██║  ██║╚██╗██╔╝   ██╔═══██╗██╔════╝
 ███████║ ╚███╔╝    ██║   ██║███████╗
 ██╔══██║ ██╔██╗    ██║   ██║╚════██║
 ██║  ██║██╔╝ ██╗   ╚██████╔╝███████║
 ╚═╝  ╚═╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝`}</pre>

        <div className="login-title">NETWORK ACCESS TERMINAL</div>
        <div className="login-subtitle">
          AUTHENTICATION REQUIRED — OPERATORS ONLY
        </div>

        {hasError && (
          <div className="login-error">
            !! AUTH FAILED — Google login rejected. Try again.
          </div>
        )}

        <a href="/auth/google" className="login-btn">
          <span className="login-btn-icon">⬡</span> LOGIN WITH GOOGLE
        </a>

        <div className="login-warning">
          ⚠ UNAUTHORIZED ACCESS IS MONITORED AND PROSECUTED
        </div>
        <div className="login-footer">
          HX//OS v2.4.1 — (c) Ellingson Mineral Co., 1994
        </div>
      </div>

      <div id="crt-scan" style={{ display: 'block' }} />
      <div id="crt-vign" />
    </div>
  )
}
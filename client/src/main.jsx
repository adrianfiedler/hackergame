import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthContext.jsx'
import App from './app.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)

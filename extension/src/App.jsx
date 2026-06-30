import { useState, useEffect } from 'react'
import Auth from './components/Auth'
import PromptCraft from './components/PromptCraft'

function App() {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (chrome && chrome.storage) {
      chrome.storage.local.get(['token', 'user'], (result) => {
        if (result.token) {
          setToken(result.token)
          setUser(result.user)
        }
        setLoading(false)
      })
    } else {
      // Fallback for browser testing
      setLoading(false)
    }
  }, [])

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    if (chrome && chrome.storage) {
      chrome.storage.local.set({ token: newToken, user: newUser })
    }
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    if (chrome && chrome.storage) {
      chrome.storage.local.remove(['token', 'user'])
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900"><span className="animate-pulse">Cargando...</span></div>
  }

  return token ? (
    <PromptCraft token={token} user={user} onLogout={handleLogout} />
  ) : (
    <Auth onLoginSuccess={handleLoginSuccess} />
  )
}

export default App

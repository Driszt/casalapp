import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Login from './Login'
import { supabase } from './supabase'

function Root() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    // Handle email confirmation redirect
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setUser(session.user)
          setConfirmed(true)
          // Clean URL
          window.history.replaceState(null, '', window.location.pathname)
        }
        setLoading(false)
      })
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontFamily: 'Georgia, serif', fontSize: 16 }}>
      ♥
    </div>
  )

  if (confirmed && user) return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 24, fontWeight: 400, color: '#1a1a1a', margin: '0 0 8px' }}>Email confirmado!</h2>
        <p style={{ color: '#888', margin: '0 0 24px' }}>A tua conta está ativa.</p>
        <button onClick={() => setConfirmed(false)} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
          Entrar na app →
        </button>
      </div>
    </div>
  )

  return user ? <App user={user} /> : <Login />
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<Root />)

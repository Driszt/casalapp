import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Login from './Login'
import { supabase } from './supabase'

function Root() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a0a, #2d1b2e, #0d1a2d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0a882', fontFamily: 'Georgia, serif', fontSize: 20 }}>
      ❤️
    </div>
  )

  return user ? <App user={user} /> : <Login />
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<Root />)

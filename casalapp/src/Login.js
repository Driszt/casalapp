import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handle = async () => {
    if (!email || !password) return setError('Preenche email e password')
    setLoading(true); setError(''); setSuccess('')
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Conta criada! Já podes entrar.')
        setIsRegister(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e) {
      setError(e.message === 'Invalid login credentials' ? 'Email ou password incorretos' : e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1b2e 50%, #0d1a2d 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif', padding: 20,
    }}>
      {/* Decorative orbs */}
      <div style={{ position: 'fixed', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,57,43,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(142,68,173,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>❤️</div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 'normal', color: '#f0e6d3', letterSpacing: 2 }}>CasalApp</h1>
          <p style={{ color: '#7a6a5a', fontSize: 13, marginTop: 8, letterSpacing: 1 }}>O vosso espaço privado</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, padding: '32px 28px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 13, color: '#c0a882', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 24, textAlign: 'center' }}>
            {isRegister ? 'Criar conta' : 'Entrar'}
          </div>

          {error && (
            <div style={{ background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e74c3c' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#2ecc71' }}>
              {success}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#7a6a5a', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="o.teu@email.com"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '12px 16px', color: '#f0e6d3', fontSize: 14,
                fontFamily: 'Georgia, serif', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, color: '#7a6a5a', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="••••••••"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '12px 16px', color: '#f0e6d3', fontSize: 14,
                fontFamily: 'Georgia, serif', outline: 'none',
              }}
            />
          </div>

          <button onClick={handle} disabled={loading} style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: loading ? 'rgba(192,57,43,0.5)' : 'linear-gradient(135deg, #8e1a1a, #c0392b)',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            color: '#fff', fontSize: 15, fontFamily: 'Georgia, serif',
            letterSpacing: 1, transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(192,57,43,0.3)',
          }}>
            {loading ? '...' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess('') }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#c0a882', fontSize: 13, fontFamily: 'Georgia, serif',
              textDecoration: 'underline',
            }}>
              {isRegister ? 'Já tens conta? Entra aqui' : 'Primeira vez? Cria uma conta'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#3a2a2a', fontSize: 11, marginTop: 24, letterSpacing: 1 }}>
          Os vossos dados são privados e encriptados
        </p>
      </div>
    </div>
  )
}

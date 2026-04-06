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
    if (!email || !password) return setError('Preenche o email e a password.')
    setLoading(true); setError(''); setSuccess('')
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin }
        })
        if (error) throw error
        setSuccess('Conta criada! Verifica o teu email para confirmar a conta.')
        setIsRegister(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e) {
      if (e.message === 'Invalid login credentials') setError('Email ou password incorretos.')
      else if (e.message.includes('already registered')) setError('Este email já tem conta. Faz login.')
      else setError(e.message)
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', boxSizing: 'border-box',
    border: '1px solid #ddd', borderRadius: 6,
    padding: '11px 14px', fontSize: 14, color: '#1a1a1a',
    background: '#fff', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', fontFamily: "'Georgia', serif" }}>
      {/* Left */}
      <div style={{ width: '52%', background: '#1c1c1c', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 70px' }}>
        <div style={{ maxWidth: 380 }}>
          <div style={{ fontSize: 36, marginBottom: 28, color: '#fff' }}>♥</div>
          <h1 style={{ fontSize: 38, fontWeight: 400, color: '#f5f5f3', margin: '0 0 18px', lineHeight: 1.2, letterSpacing: -0.5 }}>
            O vosso espaço privado
          </h1>
          <p style={{ fontSize: 15, color: '#777', lineHeight: 1.8, margin: '0 0 48px' }}>
            Tudo o que precisam para o dia a dia, num só lugar — só para vocês dois.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['💬', 'Chat em tempo real'],
              ['✅', 'Tarefas partilhadas'],
              ['📅', 'Calendário e eventos'],
              ['🤖', 'Bot inteligente offline'],
              ['👤', 'Estado de disponibilidade'],
            ].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 14, color: '#888' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ fontSize: 26, fontWeight: 400, color: '#1a1a1a', margin: '0 0 6px', letterSpacing: -0.3 }}>
            {isRegister ? 'Criar conta' : 'Bem-vindo de volta'}
          </h2>
          <p style={{ fontSize: 14, color: '#999', margin: '0 0 32px' }}>
            {isRegister ? 'Regista-te gratuitamente' : 'Entra na vossa app de casal'}
          </p>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '11px 14px', marginBottom: 20, fontSize: 13, color: '#dc2626' }}>{error}</div>}
          {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '11px 14px', marginBottom: 20, fontSize: 13, color: '#16a34a' }}>{success}</div>}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="o.teu@email.com" style={inp} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} placeholder="••••••••" style={inp} />
          </div>

          <button onClick={handle} disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#aaa' : '#1c1c1c', border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 0.3 }}>
            {loading ? 'A processar...' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {isRegister ? 'Já tens conta? Entra aqui' : 'Primeira vez? Cria uma conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

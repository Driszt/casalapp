import { useState } from 'react'
import { supabase } from './supabase'

const T = {
  bg: "#f2ece0",
  card: "#faf6ef",
  border: "#ddd5c4",
  text: "#1e1810",
  muted: "#9a8e7e",
  accent: "#7c6d52",
  accentDark: "#5c4f3a",
  accentLight: "#f0ead8",
  sidebar: "#e8dfd0",
  sidebarBorder: "#d8cebb",
}

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
        setSuccess('Conta criada! Verifica o teu email para confirmar.')
        setIsRegister(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e) {
      if (e.message === 'Invalid login credentials') setError('Email ou password incorretos.')
      else if (e.message?.includes('already registered')) setError('Este email já tem conta. Faz login.')
      else setError(e.message)
    }
    setLoading(false)
  }

  const inp = {
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: '11px 14px',
    fontSize: 14,
    color: T.text,
    background: T.bg,
    outline: 'none',
    fontFamily: "'Georgia', serif",
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      {/* LEFT PANEL — decorative */}
      <div style={{
        width: '48%',
        background: T.accentDark,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background texture lines */}
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: -40,
            top: `${i * 14}%`,
            width: '140%',
            height: 1,
            background: 'rgba(240,234,216,0.06)',
            transform: `rotate(-${8 + i * 1.5}deg)`,
          }} />
        ))}
        {/* Soft orb */}
        <div style={{
          position: 'absolute',
          bottom: -120,
          right: -120,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,109,82,0.3) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: -80,
          left: -80,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,234,216,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Top */}
        <div>
          <div style={{ fontSize: 13, color: 'rgba(240,234,216,0.35)', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 48 }}>
            CasalApp
          </div>
          <h1 style={{
            fontSize: 42,
            fontWeight: 400,
            color: '#f5f0e8',
            lineHeight: 1.2,
            letterSpacing: -1,
            margin: '0 0 20px',
          }}>
            O vosso<br />espaço<br />privado.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(240,234,216,0.5)', lineHeight: 1.8, margin: 0, maxWidth: 300 }}>
            Um lugar só para vocês dois — tarefas, calendário e conversa em tempo real.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            ['Chat', 'Conversa privada e sincronizada'],
            ['Tarefas', 'Kanban partilhado entre os dois'],
            ['Calendário', 'Eventos e datas importantes'],
            ['Assistente', 'Bot offline para gerir tudo'],
          ].map(([title, desc]) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 1, height: 36, background: 'rgba(240,234,216,0.2)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, color: '#f5f0e8', letterSpacing: 0.3 }}>{title}</div>
                <div style={{ fontSize: 11, color: 'rgba(240,234,216,0.4)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom quote */}
        <div style={{ fontSize: 12, color: 'rgba(240,234,216,0.2)', letterSpacing: 1 }}>
          Privado · Seguro · Só vosso
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 48px',
        background: T.bg,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, color: T.muted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
              {isRegister ? 'Criar conta' : 'Entrar'}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 400, color: T.text, margin: 0, letterSpacing: -0.5, lineHeight: 1.2 }}>
              {isRegister ? 'Bem-vindo ao CasalApp' : 'Bem-vindo de volta'}
            </h2>
            <div style={{ width: 32, height: 2, background: T.accent, marginTop: 14, borderRadius: 2 }} />
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ background: '#fdf2f2', border: `1px solid #e8c8c8`, borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#8a3a3a' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#f2f7f2', border: `1px solid #c0d8c0`, borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#3a6a3a' }}>
              {success}
            </div>
          )}

          {/* Fields */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: T.muted, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="o.teu@email.com"
              style={inp}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 11, color: T.muted, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="••••••••"
              style={inp}
              onFocus={e => e.target.style.borderColor = T.accent}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>

          {/* Button */}
          <button
            onClick={handle}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: loading ? T.muted : T.accentDark,
              border: 'none',
              borderRadius: 8,
              color: '#f5f0e8',
              fontSize: 14,
              fontFamily: "'Georgia', serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 0.5,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if(!loading) e.target.style.background = T.accent }}
            onMouseLeave={e => { if(!loading) e.target.style.background = T.accentDark }}
          >
            {loading ? 'A processar...' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>

          {/* Switch */}
          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 13, fontFamily: "'Georgia', serif", textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              {isRegister ? 'Já tens conta? Entra aqui' : 'Primeira vez? Cria uma conta'}
            </button>
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: T.sidebarBorder, letterSpacing: 0.5 }}>
            Os vossos dados são privados e encriptados
          </div>
        </div>
      </div>
    </div>
  )
}

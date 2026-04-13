import { useState } from 'react';
import { supabase } from './supabase';

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mode, setMode]         = useState('login');

  const handle = async () => {
    if (!email || !password) { setError('Preenche email e password.'); return; }
    setLoading(true); setError('');
    try {
      let result;
      if (mode === 'login') {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
        if (!result.error && result.data.user) {
          await supabase.from('profiles').upsert({
            id: result.data.user.id, email, name: email.split('@')[0]
          });
        }
      }
      if (result.error) setError(result.error.message);
      else if (result.data.user) onLogin(result.data.user);
    } catch (e) { setError('Erro de ligacao.'); }
    setLoading(false);
  };

  const blob1 = { position:'absolute', top:'20%', left:'-5%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,169,110,0.12),transparent)', filter:'blur(70px)', pointerEvents:'none' };
  const blob2 = { position:'absolute', bottom:'25%', right:'-5%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,169,110,0.08),transparent)', filter:'blur(80px)', pointerEvents:'none' };
  const logoBox = { width:72, height:72, borderRadius:24, margin:'0 auto 20px', background:'linear-gradient(135deg,rgba(201,169,110,0.2),rgba(201,169,110,0.05))', border:'1px solid rgba(201,169,110,0.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 40px rgba(201,169,110,0.15)' };
  const goldLine = { width:56, height:1, background:'linear-gradient(90deg,transparent,#C9A96E,transparent)', margin:'12px auto' };
  const card = { borderRadius:32, padding:36, background:'rgba(30,42,74,0.5)', backdropFilter:'blur(60px)', border:'1px solid rgba(201,169,110,0.1)' };
  const inp = { width:'100%', boxSizing:'border-box', padding:'14px 16px', borderRadius:14, background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontSize:14, fontFamily:'inherit', outline:'none' };
  const label = { display:'block', fontSize:10, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.2em', marginBottom:8, fontWeight:600 };

  return (
    <div
      onKeyDown={e => e.key === 'Enter' && handle()}
      tabIndex={-1}
      style={{ minHeight:'100vh', background:'linear-gradient(155deg,#0C1525 0%,#1B2A4A 40%,#141F38 70%,#0A1020 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, position:'relative', overflow:'hidden', fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", outline:'none' }}
    >
      <div style={blob1} />
      <div style={blob2} />

      <div style={{ width:'100%', maxWidth:380, position:'relative', zIndex:10 }}>

        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={logoBox}>
            <span style={{ fontSize:32, fontFamily:"'Fraunces',Georgia,serif", color:'#C9A96E', fontWeight:700 }}>C</span>
          </div>
          <h1 style={{ fontSize:38, fontWeight:700, color:'#fff', fontFamily:"'Fraunces',Georgia,serif", letterSpacing:'-0.02em', margin:0 }}>CasalApp</h1>
          <div style={goldLine} />
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.3em', textTransform:'uppercase', margin:0 }}>O vosso espaco</p>
        </div>

        <div style={card}>
          <div style={{ display:'flex', gap:10, marginBottom:32 }}>
            {[['login','Entrar'],['register','Registar']].map(([m,l]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{ flex:1, padding:'12px', borderRadius:14, fontSize:14, fontWeight:700, cursor:'pointer', border:'none', fontFamily:'inherit', transition:'all 0.3s', background: mode===m ? 'linear-gradient(135deg,#C9A96E,#D4B87E)' : 'rgba(255,255,255,0.05)', color: mode===m ? '#0C1525' : 'rgba(255,255,255,0.5)' }}
              >{l}</button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <label style={label}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
                style={inp}
                onFocus={e => e.target.style.background='rgba(255,255,255,0.13)'}
                onBlur={e => e.target.style.background='rgba(255,255,255,0.08)'}
              />
            </div>
            <div>
              <label style={label}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={inp}
                onFocus={e => e.target.style.background='rgba(255,255,255,0.13)'}
                onBlur={e => e.target.style.background='rgba(255,255,255,0.08)'}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop:14, padding:'12px 14px', borderRadius:14, background:'rgba(239,68,68,0.15)', color:'#fca5a5', fontSize:13 }}>
              {error}
            </div>
          )}

          <button
            onClick={handle}
            disabled={loading}
            style={{ width:'100%', marginTop:24, padding:'14px', borderRadius:14, background:'linear-gradient(135deg,#C9A96E,#D4B87E)', border:'none', color:'#0C1525', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 8px 24px rgba(201,169,110,0.25)', opacity: loading ? 0.7 : 1, transition:'all 0.2s' }}
          >
            {loading ? 'A processar...' : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
          </button>

          <p style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:20, marginBottom:0 }}>
            Privado e seguro. Apenas vos tem acesso.
          </p>
        </div>

      </div>
    </div>
  );
}

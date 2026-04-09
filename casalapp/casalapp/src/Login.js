import { useState } from 'react';
import { supabase } from './supabase';

const T = {
  bg:'#1e1810', card:'#2a2318', border:'#3a3228', text:'#f0e8d8',
  muted:'#9a8e7e', accent:'#c8a87a', accentDark:'#a88a5a', danger:'#c06060',
};

export default function Login({ onLogin }) {
  const [email,setEmail]       = useState('');
  const [password,setPassword] = useState('');
  const [loading,setLoading]   = useState(false);
  const [error,setError]       = useState('');
  const [mode,setMode]         = useState('login'); // 'login' | 'register'

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
          // Create profile
          await supabase.from('profiles').upsert({
            id: result.data.user.id,
            email,
            name: email.split('@')[0],
            created_at: new Date().toISOString(),
          });
        }
      }
      if (result.error) { setError(result.error.message); }
      else if (result.data.user) { onLogin(result.data.user); }
      else if (mode === 'register') { setError('Verifica o teu email para confirmar o registo.'); }
    } catch(e) {
      setError('Erro de ligação. Tenta novamente.');
    }
    setLoading(false);
  };

  const inp = {
    width:'100%', boxSizing:'border-box', background:T.bg,
    border:'1px solid '+T.border, borderRadius:9, padding:'12px 16px',
    fontSize:14, color:T.text, outline:'none', fontFamily:'inherit',
  };

  return (
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Georgia','Times New Roman',serif"}}>
      <div style={{width:360,background:T.card,border:'1px solid '+T.border,borderRadius:20,padding:36,boxShadow:'0 20px 60px rgba(0,0,0,0.4)'}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:32,marginBottom:8}}>❤️</div>
          <div style={{fontSize:22,color:T.text,letterSpacing:-0.5}}>CasalApp</div>
          <div style={{fontSize:11,color:T.muted,marginTop:4,letterSpacing:2,textTransform:'uppercase'}}>O vosso espaço</div>
        </div>

        {/* Toggle */}
        <div style={{display:'flex',background:T.bg,borderRadius:10,padding:4,marginBottom:24}}>
          {[['login','Entrar'],['register','Registar']].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setError('');}}
              style={{flex:1,padding:'8px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,background:mode===m?T.accent:'transparent',color:mode===m?'#1a1008':T.muted,transition:'all 0.2s'}}>
              {l}
            </button>
          ))}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div>
            <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Email</div>
            <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} type="email" placeholder="tu@email.com" style={inp}/>
          </div>
          <div>
            <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Password</div>
            <input value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handle()} type="password" placeholder="••••••••" style={inp}/>
          </div>
        </div>

        {error && <div style={{marginTop:14,padding:'10px 14px',background:'rgba(192,96,96,0.15)',border:'1px solid '+T.danger,borderRadius:8,fontSize:12,color:T.danger}}>{error}</div>}

        <button onClick={handle} disabled={loading}
          style={{width:'100%',marginTop:22,padding:'13px',background:loading?T.border:T.accent,border:'none',borderRadius:10,color:'#1a1008',fontSize:14,cursor:loading?'not-allowed':'pointer',fontFamily:'inherit',fontWeight:500,transition:'all 0.2s'}}>
          {loading ? 'A processar...' : mode==='login' ? 'Entrar' : 'Criar conta'}
        </button>

        <div style={{textAlign:'center',marginTop:20,fontSize:11,color:T.muted,lineHeight:1.6}}>
          Privado e seguro. Apenas vós têm acesso.
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import App from './App';
import Login from './Login';

// ── INVITE BANNER ─────────────────────────────────────────────────────────────
function InviteBanner({ invite, onAccept, onDismiss, loading }) {
  return (
    <div style={{
      position:'fixed',top:0,left:0,right:0,zIndex:9999,
      background:'linear-gradient(135deg,#2a1e10,#3a2a18)',
      borderBottom:'2px solid #7c6d52',
      padding:'18px 24px',
      display:'flex',alignItems:'center',gap:16,
      fontFamily:"'Georgia','Times New Roman',serif",
      boxShadow:'0 4px 20px rgba(0,0,0,0.4)'
    }}>
      <div style={{width:48,height:48,borderRadius:12,background:invite.color||'#7c6d52',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>
        {invite.emoji||'👥'}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:16,color:'#f0e8d8',fontWeight:500,marginBottom:2}}>
          Convite para entrar em <strong>"{invite.name}"</strong>
        </div>
        <div style={{fontSize:12,color:'#9a8e7e'}}>
          {invite.createdByName ? 'Convidado por '+invite.createdByName+' · ' : ''}
          {invite.type==='casal'?'❤️ Grupo de Casal':'👥 Grupo Colaborativo'}
        </div>
      </div>
      <button onClick={onAccept} disabled={loading}
        style={{padding:'10px 22px',background:'#7c6d52',border:'none',borderRadius:9,color:'#f5f0e8',fontSize:14,cursor:loading?'wait':'pointer',fontFamily:'inherit',fontWeight:500,flexShrink:0}}>
        {loading?'A entrar...':'✓ Entrar no grupo'}
      </button>
      <button onClick={onDismiss}
        style={{padding:'10px 14px',background:'none',border:'1px solid rgba(255,255,255,0.2)',borderRadius:9,color:'#9a8e7e',fontSize:13,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
        Ignorar
      </button>
    </div>
  );
}

function Root() {
  const [user,setUser]           = useState(null);
  const [loading,setLoading]     = useState(true);
  const [invite,setInvite]       = useState(null);
  const [inviteLoading,setIL]    = useState(false);
  const [userGroups,setUGroups]  = useState(null); // null = not loaded yet

  // ── DETECT INVITE IN URL ────────────────────────────────────────────────────
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('invite');
    if(code) {
      // Fetch invite from Supabase
      supabase.from('invites').select('*').eq('id',code).single()
        .then(({data,error})=>{
          if(data && !error && !data.used_by) {
            setInvite({
              id: data.id,
              groupId: data.group_id,
              name: data.group_name||'Grupo',
              emoji: data.group_emoji||'👥',
              color: data.group_color||'#7c6d52',
              type:  data.group_type||'colaborativo',
              perms: data.group_perms,
              admins: data.group_admins||[],
              createdByName: data.created_by_name,
            });
          }
          // Clean URL
          window.history.replaceState({},'',window.location.pathname);
        });
    }
  },[]);

  // ── AUTH ────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user??null);
      setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,session)=>{
      setUser(session?.user??null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // ── LOAD USER GROUPS ────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!user) return;
    supabase.from('user_groups').select('*').eq('user_id',user.id)
      .then(({data})=>{
        setUGroups(data||[]);
      });
  },[user]);

  // ── ACCEPT INVITE ───────────────────────────────────────────────────────────
  const acceptInvite = async () => {
    if(!user||!invite) return;
    setIL(true);
    try {
      // Add user to this group in user_groups table
      await supabase.from('user_groups').upsert({
        user_id:    user.id,
        group_id:   invite.groupId,
        group_name: invite.name,
        group_emoji:invite.emoji,
        group_color:invite.color,
        group_type: invite.type,
        group_admins: JSON.stringify([]),
        group_perms:  JSON.stringify(invite.perms||{}),
      });
      // Mark invite as used
      await supabase.from('invites').update({
        used_by: user.id,
        used_at: new Date().toISOString()
      }).eq('id',invite.id);
      // Refresh groups
      const {data} = await supabase.from('user_groups').select('*').eq('user_id',user.id);
      setUGroups(data||[]);
      setInvite(null);
      alert('Entraste no grupo "'+invite.name+'"! Recarrega a página para ver o grupo.');
    } catch(e) {
      alert('Erro ao entrar no grupo. Tenta novamente.');
    }
    setIL(false);
  };

  if(loading || (user && userGroups===null)) {
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(155deg,#0C1525,#1B2A4A)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>❤️</div>
          <div style={{fontSize:14,color:'#9a8e7e'}}>A carregar...</div>
        </div>
      </div>
    );
  }

  if(!user) {
    return (
      <>
        {invite&&(
          <div style={{background:'#2a1e10',padding:'14px 24px',textAlign:'center',fontFamily:"'Georgia',serif",borderBottom:'2px solid #7c6d52',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
            <span style={{fontSize:20}}>{invite.emoji}</span>
            <span style={{color:'#f0e8d8',fontSize:14}}>Faz login para aceitar o convite para <strong>"{invite.name}"</strong></span>
          </div>
        )}
        <Login onLogin={setUser}/>
      </>
    );
  }

  return (
    <>
      {invite&&(
        <InviteBanner invite={invite} onAccept={acceptInvite} onDismiss={()=>setInvite(null)} loading={inviteLoading}/>
      )}
      <div style={{paddingTop:invite?84:0,height:'100vh',boxSizing:'border-box'}}>
        <App user={user} onLogout={async()=>{await supabase.auth.signOut();setUser(null);setUGroups(null);}} userGroups={userGroups||[]}/>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><Root/></React.StrictMode>);

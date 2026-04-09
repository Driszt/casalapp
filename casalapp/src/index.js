import React from 'react';
import ReactDOM from 'react-dom/client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import App from './App';
import Login from './Login';

function InviteBanner({ invite, onAccept, onDismiss }) {
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,background:'#5c4f3a',borderBottom:'2px solid #7c6d52',padding:'16px 24px',display:'flex',alignItems:'center',gap:16,fontFamily:"'Georgia',serif"}}>
      <span style={{fontSize:24}}>{invite.emoji||'👥'}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:15,color:'#f0e8d8',fontWeight:500}}>Convite para "{invite.name}"</div>
        <div style={{fontSize:12,color:'#9a8e7e',marginTop:2}}>Foste convidado para entrar neste grupo</div>
      </div>
      <button onClick={onAccept} style={{padding:'8px 20px',background:'#7c6d52',border:'none',borderRadius:8,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>✓ Aceitar</button>
      <button onClick={onDismiss} style={{padding:'8px 14px',background:'none',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,color:'#9a8e7e',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Ignorar</button>
    </div>
  );
}

function Root() {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [pendingInvite, setPending] = useState(null);

  useEffect(() => {
    // Check for invite in URL
    const params = new URLSearchParams(window.location.search);
    const inviteId = params.get('invite');
    const groupId  = params.get('group');
    const groupName= params.get('name');
    const groupEmoji=params.get('emoji');

    if(inviteId && groupId) {
      setPending({ id: inviteId, groupId, name: groupName||'Grupo', emoji: groupEmoji||'👥' });
      // Clean URL without removing invite info
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const acceptInvite = async () => {
    if(!user || !pendingInvite) return;
    // Save acceptance to Supabase (update invite record)
    try {
      await supabase.from('invites').update({
        used_by: user.id,
        used_at: new Date().toISOString()
      }).eq('id', pendingInvite.id);
    } catch(e) {}
    // The App will handle adding the user to the group
    setPending(null);
    window.location.reload(); // reload so App picks up the group membership
  };

  if (loading) {
    return (
      <div style={{minHeight:'100vh',background:'#1e1810',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Georgia',serif"}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>❤️</div>
          <div style={{fontSize:14,color:'#9a8e7e'}}>A carregar...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {pendingInvite && (
          <div style={{background:'#2a2318',padding:'16px 24px',textAlign:'center',fontFamily:"'Georgia',serif",borderBottom:'2px solid #7c6d52'}}>
            <span style={{fontSize:18}}>{pendingInvite.emoji}</span>
            <span style={{color:'#f0e8d8',fontSize:14,marginLeft:8}}>Faz login para aceitar o convite para "{pendingInvite.name}"</span>
          </div>
        )}
        <Login onLogin={setUser}/>
      </>
    );
  }

  return (
    <>
      {pendingInvite && (
        <InviteBanner
          invite={pendingInvite}
          onAccept={acceptInvite}
          onDismiss={()=>setPending(null)}
        />
      )}
      <div style={{marginTop: pendingInvite ? 70 : 0}}>
        <App user={user} onLogout={()=>setUser(null)} pendingInvite={pendingInvite} onInviteAccepted={()=>setPending(null)}/>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><Root/></React.StrictMode>);

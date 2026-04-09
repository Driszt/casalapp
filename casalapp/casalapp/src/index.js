import React from 'react';
import ReactDOM from 'react-dom/client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import App from './App';
import Login from './Login';

function Root() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#1e1810', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Georgia',serif" }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>❤️</div>
          <div style={{ fontSize:14, color:'#9a8e7e' }}>A carregar...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser}/>;
  }

  return <App user={user} onLogout={()=>setUser(null)}/>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><Root/></React.StrictMode>);

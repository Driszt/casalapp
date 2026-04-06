import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from './supabase';

const T = {
  bg: "#f2ece0",
  sidebar: "#e8dfd0",
  sidebarBorder: "#d8cebb",
  card: "#faf6ef",
  border: "#ddd5c4",
  text: "#1e1810",
  muted: "#9a8e7e",
  accent: "#7c6d52",
  accentDark: "#5c4f3a",
  accentLight: "#f0ead8",
  accentMid: "#c8b99a",
  active: "#4a3f2e",
  success: "#5a8a5a",
  danger: "#c05a5a",
  warning: "#c09040",
};

const Icon = ({ name, size=16, color=T.muted }) => {
  const s = { width:size, height:size, display:"block", flexShrink:0 };
  if(name==="chat")     return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
  if(name==="tasks")    return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="13" y2="15"/></svg>;
  if(name==="calendar") return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  if(name==="logout")   return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
  if(name==="grid")     return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
  if(name==="layout")   return <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;
  return null;
};

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const TABS = [
  { id:'chat',     label:'Chat',       icon:'chat'     },
  { id:'tasks',    label:'Tarefas',    icon:'tasks'    },
  { id:'calendar', label:'Calendário', icon:'calendar' },
];
const TAB_LABEL = { chat:'Chat de Casal', tasks:'Tarefas · Kanban', calendar:'Calendário' };
const PRIORITY_COLOR = { alta: T.danger, média: T.warning, media: T.warning, baixa: T.success };
const INIT_WINS = {
  chat:     { pos:{x:60,  y:50},  size:{w:480,h:400}, minimized:false, z:10 },
  tasks:    { pos:{x:160, y:80},  size:{w:540,h:420}, minimized:false, z:9  },
  calendar: { pos:{x:260, y:110}, size:{w:640,h:460}, minimized:false, z:8  },
};
const KANBAN_COLS = ['A fazer','Em progresso','Concluído'];

// ── CALENDAR ─────────────────────────────────────────────────────────────────
function CalendarView({ events }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year,  setYear]  = useState(new Date().getFullYear());
  const [sel,   setSel]   = useState(null);

  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const days = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const today = new Date();
  const isToday = d => d===today.getDate() && month===today.getMonth() && year===today.getFullYear();
  const dateStr = d => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const getEvs  = d => events.filter(e => e.date && e.date.startsWith(dateStr(d)));
  const typeColor = { birthday:'#c05a5a', date:'#7c6d52', holiday:'#5a8a5a', medical:'#4a7a8a', other:'#8a7a6a' };

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1); setSel(null); };
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1); setSel(null); };

  return (
    <div style={{display:'flex',gap:16,padding:20,height:'100%',boxSizing:'border-box',overflow:'hidden'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexShrink:0}}>
          <button onClick={prevMonth} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,padding:'3px 12px',cursor:'pointer',fontSize:14,color:T.text,fontFamily:'inherit'}}>‹</button>
          <span style={{fontSize:14,fontWeight:400,color:T.text,letterSpacing:0.3}}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{background:'none',border:`1px solid ${T.border}`,borderRadius:6,padding:'3px 12px',cursor:'pointer',fontSize:14,color:T.text,fontFamily:'inherit'}}>›</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4,flexShrink:0}}>
          {DAYS_SHORT.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,color:T.muted,padding:'3px 0',textTransform:'uppercase',letterSpacing:0.6}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,flex:1}}>
          {days.map((day,i)=>{
            const es=day?getEvs(day):[]; const isTod=day&&isToday(day); const isSel=sel===day;
            return (
              <div key={i} onClick={()=>day&&setSel(isSel?null:day)}
                style={{padding:5,border:`1px solid ${isTod?T.accent:isSel?T.accentMid:T.border}`,borderRadius:8,cursor:day?'pointer':'default',background:isSel?T.accentLight:isTod?'rgba(124,109,82,0.06)':'transparent',transition:'all 0.1s',overflow:'hidden'}}>
                {day&&<>
                  <div style={{fontSize:11,fontWeight:isTod?600:400,color:isTod?T.accent:T.text,marginBottom:2}}>{day}</div>
                  {es.slice(0,2).map(ev=>(
                    <div key={ev.id} style={{fontSize:9,background:typeColor[ev.type]||typeColor.other,color:'#fff',borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.4}}>{ev.title}</div>
                  ))}
                </>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{width:180,flexShrink:0,overflowY:'auto',display:'flex',flexDirection:'column',gap:0}}>
        <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.8,marginBottom:10}}>Próximos</div>
        {events.filter(e=>e.date>=new Date().toISOString().split('T')[0]).slice(0,6).map(ev=>(
          <div key={ev.id} style={{padding:'9px 11px',background:T.card,border:`1px solid ${T.border}`,borderRadius:9,marginBottom:7,borderLeft:`3px solid ${typeColor[ev.type]||typeColor.other}`}}>
            <div style={{fontSize:12,color:T.text,lineHeight:1.4}}>{ev.title}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:2}}>{new Date(ev.date+'T12:00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'long'})}</div>
          </div>
        ))}
        {events.filter(e=>e.date>=new Date().toISOString().split('T')[0]).length===0&&(
          <div style={{fontSize:12,color:T.muted}}>Sem eventos próximos</div>
        )}
      </div>
    </div>
  );
}

// ── KANBAN ────────────────────────────────────────────────────────────────────
function KanbanView({ tasks, userId, onToggle, onDelete, onAdd }) {
  const [newText, setNewText] = useState({});
  const grouped = { 'A fazer': tasks.filter(t=>!t.done&&t.col!=='Em progresso'), 'Em progresso': tasks.filter(t=>!t.done&&t.col==='Em progresso'), 'Concluído': tasks.filter(t=>t.done) };

  return (
    <div style={{display:'flex',gap:14,padding:20,height:'100%',boxSizing:'border-box',overflowX:'auto',alignItems:'flex-start'}}>
      {KANBAN_COLS.map(col=>(
        <div key={col} style={{minWidth:210,flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:10}}>
            <span style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.5}}>{col}</span>
            <span style={{background:T.accentLight,color:T.accent,borderRadius:10,padding:'1px 7px',fontSize:10}}>{(grouped[col]||[]).length}</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {(grouped[col]||[]).map(t=>(
              <div key={t.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:'11px 13px',boxShadow:'0 1px 3px rgba(30,24,16,0.05)',transition:'box-shadow 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 14px rgba(30,24,16,0.1)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 3px rgba(30,24,16,0.05)'}>
                <div style={{fontSize:13,color:T.text,lineHeight:1.5,marginBottom:8}}>{t.text}</div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={()=>onToggle(t.id,t.done)} style={{fontSize:10,color:t.done?T.success:T.muted,background:'none',border:`1px solid ${t.done?T.success:T.border}`,borderRadius:4,padding:'2px 7px',cursor:'pointer',fontFamily:'inherit'}}>{t.done?'✓ Feito':'Marcar feito'}</button>
                  <span style={{fontSize:10,color:PRIORITY_COLOR[t.priority]||T.muted,marginLeft:'auto'}}>● {t.priority||'média'}</span>
                  {t.author_id===userId&&<button onClick={()=>onDelete(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:14,padding:'0 2px',lineHeight:1}}>×</button>}
                </div>
              </div>
            ))}
            <div style={{display:'flex',gap:6}}>
              <input value={newText[col]||''} onChange={e=>setNewText(p=>({...p,[col]:e.target.value}))}
                onKeyDown={e=>{ if(e.key==='Enter'&&newText[col]?.trim()){ onAdd(newText[col].trim(), col==='Em progresso'); setNewText(p=>({...p,[col]:''})); } }}
                placeholder="+ Adicionar..." style={{flex:1,border:`1px dashed ${T.border}`,borderRadius:8,padding:'8px 10px',background:'transparent',color:T.text,fontSize:12,outline:'none',fontFamily:'inherit'}}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function ChatView({ messages, userId, profiles, onSend }) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const send = () => { if(!input.trim()) return; onSend(input.trim()); setInput(''); };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{flex:1,padding:'18px 22px',display:'flex',flexDirection:'column',gap:12,overflowY:'auto'}}>
        {messages.map(m=>{
          const isMe = m.user_id===userId;
          const isBot = m.user_id===null;
          const sender = profiles[m.user_id];
          return (
            <div key={m.id} style={{display:'flex',flexDirection:isMe?'row-reverse':'row',gap:9,alignItems:'flex-end'}}>
              {!isMe&&<div style={{width:28,height:28,borderRadius:'50%',background:isBot?T.accentLight:T.accentLight,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>{isBot?'✦':(sender?.avatar||'👤')}</div>}
              <div style={{maxWidth:'60%',padding:'9px 13px',borderRadius:isMe?'14px 14px 3px 14px':'14px 14px 14px 3px',background:isMe?T.accentDark:T.card,color:isMe?'#f5f0e8':T.text,fontSize:13,lineHeight:1.55,border:isMe?'none':`1px solid ${T.border}`,whiteSpace:'pre-line'}}>
                {!isMe&&!isBot&&<div style={{fontSize:10,color:T.muted,marginBottom:3}}>{sender?.name||'Parceiro'}</div>}
                {m.text}
                <div style={{fontSize:10,color:isMe?'rgba(245,240,232,0.4)':T.muted,marginTop:3,textAlign:isMe?'right':'left'}}>{new Date(m.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>
      <div style={{padding:'12px 22px',background:T.card,borderTop:`1px solid ${T.border}`,display:'flex',gap:9,flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Escreve uma mensagem..."
          style={{flex:1,border:`1px solid ${T.border}`,borderRadius:8,padding:'9px 13px',fontSize:13,outline:'none',fontFamily:'inherit',background:T.bg,color:T.text}}/>
        <button onClick={send} style={{padding:'9px 18px',background:T.accentDark,border:'none',borderRadius:8,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Enviar</button>
      </div>
    </div>
  );
}

// ── FLOATING BOT ──────────────────────────────────────────────────────────────
function FloatingBot({ onCreateEvent, onCreateTask }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([{id:1,from:'bot',text:'Olá! Posso marcar eventos, criar tarefas e muito mais.\n\nExemplos:\n— "marca jantar amanhã às 20h"\n— "adiciona tarefa: comprar pão"\n— "estou ocupado"'}]);
  const endRef = useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs]);

  const send = () => {
    if(!input.trim()) return;
    const text=input.trim(); setInput('');
    setMsgs(m=>[...m,{id:Date.now(),from:'me',text}]);
    const q=text.toLowerCase();
    setTimeout(()=>{
      let reply='Não percebi. Tenta: "marca jantar amanhã" ou "adiciona tarefa: comprar pão"';
      if(q.includes('marca')||q.includes('jantar')||q.includes('evento')||q.includes('consulta')||q.includes('reserva')){
        reply='✅ Evento adicionado ao calendário!';
        if(onCreateEvent) onCreateEvent(text);
      } else if(q.includes('tarefa')||q.includes('adiciona')||q.includes('comprar')||q.includes('fazer')){
        reply='✅ Tarefa criada!';
        if(onCreateTask) onCreateTask(text);
      } else if(q.includes('disponível')||q.includes('livre')||q.includes('disponivel')){ reply='🟢 Estado: Disponível!'; }
      else if(q.includes('ocupado')){ reply='🔴 Estado: Ocupado!'; }
      else if(q.includes('ajuda')||q.includes('comandos')){ reply='📋 Comandos:\n— marca [evento] [data]\n— adiciona tarefa: [texto]\n— estou ocupado / livre'; }
      setMsgs(m=>[...m,{id:Date.now()+1,from:'bot',text:reply}]);
    },500);
  };

  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:2000,fontFamily:"'Georgia', serif"}}>
      {open&&(
        <div style={{position:'absolute',bottom:62,right:0,width:300,background:T.card,border:`1px solid ${T.border}`,borderRadius:16,boxShadow:'0 10px 50px rgba(30,24,16,0.2)',overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'13px 15px',background:T.accentDark,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:13,color:'#f5f0e8'}}>Assistente</div>
              <div style={{fontSize:10,color:'rgba(245,240,232,0.45)',marginTop:1}}>Comandos locais · offline</div>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:'rgba(245,240,232,0.1)',border:'none',borderRadius:6,width:26,height:26,cursor:'pointer',color:'#f5f0e8',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
          <div style={{height:230,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:10}}>
            {msgs.map(m=>(
              <div key={m.id} style={{display:'flex',flexDirection:m.from==='me'?'row-reverse':'row',gap:8,alignItems:'flex-end'}}>
                {m.from==='bot'&&<div style={{width:22,height:22,borderRadius:'50%',background:T.accentLight,border:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0}}>✦</div>}
                <div style={{maxWidth:'82%',padding:'8px 11px',borderRadius:m.from==='me'?'12px 12px 3px 12px':'12px 12px 12px 3px',background:m.from==='me'?T.accentDark:T.bg,color:m.from==='me'?'#f5f0e8':T.text,fontSize:12.5,lineHeight:1.55,border:m.from==='me'?'none':`1px solid ${T.border}`,whiteSpace:'pre-line'}}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef}/>
          </div>
          <div style={{padding:'10px 12px',borderTop:`1px solid ${T.border}`,display:'flex',gap:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="Escreve um comando..."
              style={{flex:1,border:`1px solid ${T.border}`,borderRadius:7,padding:'8px 11px',fontSize:12.5,outline:'none',fontFamily:'inherit',background:T.bg,color:T.text}}/>
            <button onClick={send} style={{padding:'8px 12px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>→</button>
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(o=>!o)} title="Assistente"
        style={{width:46,height:46,borderRadius:'50%',background:open?T.accentDark:T.accent,border:'none',cursor:'pointer',boxShadow:'0 4px 20px rgba(30,24,16,0.2)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}>
        <span style={{color:'#f5f0e8',fontSize:18}}>✦</span>
      </button>
    </div>
  );
}

// ── RESIZABLE WINDOW ──────────────────────────────────────────────────────────
function Window({ id, title, icon, children, state, onUpdate, onClose, onFocus, zIndex }) {
  const { pos, size, minimized } = state;
  const dragging = useRef(false);
  const resizing = useRef(null);
  const startData = useRef({});

  const startDrag = useCallback(e => {
    if(e.target.closest('.no-drag')) return;
    e.preventDefault();
    dragging.current = true;
    startData.current = { mx:e.clientX, my:e.clientY, ox:pos.x, oy:pos.y };
    onFocus(id);
    const move = e => {
      if(!dragging.current) return;
      onUpdate(id, { pos:{ x:Math.max(0,startData.current.ox+(e.clientX-startData.current.mx)), y:Math.max(0,startData.current.oy+(e.clientY-startData.current.my)) }});
    };
    const up = () => { dragging.current=false; window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  },[pos,id,onFocus,onUpdate]);

  const startResize = useCallback((e,dir) => {
    e.preventDefault(); e.stopPropagation();
    resizing.current=dir;
    startData.current={mx:e.clientX,my:e.clientY,ox:pos.x,oy:pos.y,ow:size.w,oh:size.h};
    onFocus(id);
    const move = e => {
      if(!resizing.current) return;
      const dx=e.clientX-startData.current.mx, dy=e.clientY-startData.current.my;
      const d=resizing.current;
      let nx=startData.current.ox, ny=startData.current.oy, nw=startData.current.ow, nh=startData.current.oh;
      if(d.includes('e')) nw=Math.max(280,startData.current.ow+dx);
      if(d.includes('s')) nh=Math.max(200,startData.current.oh+dy);
      if(d.includes('w')){ nw=Math.max(280,startData.current.ow-dx); nx=startData.current.ox+startData.current.ow-nw; }
      if(d.includes('n')){ nh=Math.max(200,startData.current.oh-dy); ny=startData.current.oy+startData.current.oh-nh; }
      onUpdate(id,{pos:{x:nx,y:ny},size:{w:nw,h:nh}});
    };
    const up=()=>{ resizing.current=null; window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  },[pos,size,id,onFocus,onUpdate]);

  const RH = ({ dir, style }) => (
    <div onMouseDown={e=>startResize(e,dir)} className="no-drag" style={{position:'absolute',zIndex:10,...style}}/>
  );

  return (
    <div onMouseDown={()=>onFocus(id)} style={{position:'fixed',left:pos.x,top:pos.y,width:size.w,height:minimized?40:size.h,zIndex,background:T.card,border:`1px solid ${T.border}`,borderRadius:14,boxShadow:'0 8px 36px rgba(30,24,16,0.15)',overflow:'hidden',userSelect:'none',display:'flex',flexDirection:'column'}}>
      {!minimized&&<>
        <RH dir="n"  style={{top:0,   left:8,   right:8,  height:4, cursor:'n-resize'}}/>
        <RH dir="s"  style={{bottom:0,left:8,   right:8,  height:4, cursor:'s-resize'}}/>
        <RH dir="w"  style={{left:0,  top:8,   bottom:8, width:4,  cursor:'w-resize'}}/>
        <RH dir="e"  style={{right:0, top:8,   bottom:8, width:4,  cursor:'e-resize'}}/>
        <RH dir="nw" style={{top:0,   left:0,  width:12, height:12,cursor:'nw-resize'}}/>
        <RH dir="ne" style={{top:0,   right:0, width:12, height:12,cursor:'ne-resize'}}/>
        <RH dir="sw" style={{bottom:0,left:0,  width:12, height:12,cursor:'sw-resize'}}/>
        <RH dir="se" style={{bottom:0,right:0, width:12, height:12,cursor:'se-resize'}}/>
      </>}
      <div onMouseDown={startDrag} style={{height:40,background:T.sidebar,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 12px',gap:10,cursor:'move',flexShrink:0}}>
        <div className="no-drag" style={{display:'flex',gap:6}}>
          <div onClick={()=>onClose(id)}                        style={{width:11,height:11,borderRadius:'50%',background:'#e06060',cursor:'pointer'}}/>
          <div onClick={()=>onUpdate(id,{minimized:!minimized})} style={{width:11,height:11,borderRadius:'50%',background:'#e0b040',cursor:'pointer'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:7,flex:1,justifyContent:'center',pointerEvents:'none'}}>
          <Icon name={icon} size={13} color={T.muted}/>
          <span style={{fontSize:12,color:T.muted,fontFamily:'inherit'}}>{title}</span>
        </div>
        <div style={{width:28}}/>
      </div>
      {!minimized&&<div style={{flex:1,overflow:'auto'}}>{children}</div>}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App({ user }) {
  const [tab,       setTab]       = useState('chat');
  const [mode,      setMode]      = useState('tabs');
  const [openWins,  setOpenWins]  = useState(['chat']);
  const [winStates, setWinStates] = useState(INIT_WINS);
  const [profiles,  setProfiles]  = useState({});
  const [messages,  setMessages]  = useState([]);
  const [tasks,     setTasks]     = useState([]);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const maxZ = useRef(10);

  // Load data
  useEffect(()=>{
    const init = async () => {
      let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if(!prof){ const name=user.email.split('@')[0]; await supabase.from('profiles').insert({id:user.id,name,avatar:'👤'}); prof={id:user.id,name,avatar:'👤'}; }
      const [{ data: msgs }, { data: tks }, { data: evs }, { data: profs }] = await Promise.all([
        supabase.from('messages').select('*').order('created_at',{ascending:true}).limit(100),
        supabase.from('tasks').select('*').order('created_at',{ascending:false}),
        supabase.from('events').select('*').order('date',{ascending:true}),
        supabase.from('profiles').select('*'),
      ]);
      setMessages(msgs||[]); setTasks(tks||[]); setEvents(evs||[]);
      const pm={}; (profs||[]).forEach(p=>{pm[p.id]=p}); setProfiles(pm);
      setLoading(false);
    };
    init();
  },[user]);

  // Realtime
  useEffect(()=>{
    const s1=supabase.channel('msgs-rt').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>setMessages(m=>[...m,p.new])).subscribe();
    const s2=supabase.channel('tasks-rt').on('postgres_changes',{event:'*',schema:'public',table:'tasks'},async()=>{ const {data}=await supabase.from('tasks').select('*').order('created_at',{ascending:false}); setTasks(data||[]); }).subscribe();
    const s3=supabase.channel('events-rt').on('postgres_changes',{event:'*',schema:'public',table:'events'},async()=>{ const {data}=await supabase.from('events').select('*').order('date',{ascending:true}); setEvents(data||[]); }).subscribe();
    const s4=supabase.channel('profs-rt').on('postgres_changes',{event:'*',schema:'public',table:'profiles'},async()=>{ const {data}=await supabase.from('profiles').select('*'); const pm={}; (data||[]).forEach(p=>{pm[p.id]=p}); setProfiles(pm); }).subscribe();
    return ()=>{ supabase.removeChannel(s1); supabase.removeChannel(s2); supabase.removeChannel(s3); supabase.removeChannel(s4); };
  },[]);

  const focusWin  = useCallback(id=>{ maxZ.current++; setWinStates(ws=>({...ws,[id]:{...ws[id],z:maxZ.current}})); },[]);
  const updateWin = useCallback((id,patch)=>{ setWinStates(ws=>({...ws,[id]:{...ws[id],...patch}})); },[]);
  const closeWin  = useCallback(id=>{ setOpenWins(o=>o.filter(x=>x!==id)); },[]);
  const openWin   = id=>{ if(!openWins.includes(id)) setOpenWins(o=>[...o,id]); else focusWin(id); };

  const sendMessage = async text => { await supabase.from('messages').insert({user_id:user.id,text}); };
  const toggleTask  = async (id,done) => { await supabase.from('tasks').update({done:!done}).eq('id',id); };
  const deleteTask  = async id => { await supabase.from('tasks').delete().eq('id',id); };
  const addTask     = async (text, inProgress=false) => { await supabase.from('tasks').insert({text,author_id:user.id,priority:'média',col:inProgress?'Em progresso':null}); };
  const addEvent    = async text => { await supabase.from('events').insert({title:text,date:new Date().toISOString().split('T')[0],type:'other'}); };

  const TabContent = ({ id }) => {
    if(id==='chat')     return <ChatView messages={messages} userId={user.id} profiles={profiles} onSend={sendMessage}/>;
    if(id==='tasks')    return <KanbanView tasks={tasks} userId={user.id} onToggle={toggleTask} onDelete={deleteTask} onAdd={addTask}/>;
    if(id==='calendar') return <CalendarView events={events}/>;
    return null;
  };

  if(loading) return <div style={{minHeight:'100vh',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',color:T.muted,fontFamily:'Georgia,serif',fontSize:16}}>A carregar...</div>;

  return (
    <div style={{display:'flex',height:'100vh',fontFamily:"'Georgia','Times New Roman',serif",background:T.bg,overflow:'hidden'}}>
      {/* SIDEBAR */}
      <div style={{width:210,background:T.sidebar,borderRight:`1px solid ${T.sidebarBorder}`,display:'flex',flexDirection:'column',flexShrink:0,zIndex:1}}>
        <div style={{padding:'26px 22px 20px',borderBottom:`1px solid ${T.sidebarBorder}`}}>
          <div style={{fontSize:19,color:T.active,letterSpacing:-0.5}}>CasalApp</div>
          <div style={{fontSize:10,color:T.muted,marginTop:3,letterSpacing:2.5,textTransform:'uppercase'}}>O vosso espaço</div>
        </div>
        <div style={{padding:'14px 16px',borderBottom:`1px solid ${T.sidebarBorder}`}}>
          <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>Vista</div>
          <div style={{display:'flex',gap:6}}>
            {[['tabs','layout','Padrão'],['windows','grid','Janelas']].map(([m,ic,l])=>(
              <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'6px 0',borderRadius:7,border:`1px solid ${mode===m?T.accent:T.border}`,background:mode===m?T.accentLight:'transparent',color:mode===m?T.accentDark:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'all 0.15s'}}>
                <Icon name={ic} size={12} color={mode===m?T.accentDark:T.muted}/>{l}
              </button>
            ))}
          </div>
        </div>
        <nav style={{flex:1,padding:'10px 10px'}}>
          {TABS.map(t=>{ const isActive=mode==='tabs'?tab===t.id:openWins.includes(t.id); return (
            <button key={t.id} onClick={()=>mode==='tabs'?setTab(t.id):openWin(t.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:isActive?T.accentLight:'transparent',border:'none',borderLeft:isActive?`2px solid ${T.accent}`:'2px solid transparent',cursor:'pointer',width:'100%',textAlign:'left',fontSize:13,color:isActive?T.accentDark:T.muted,fontFamily:'inherit',transition:'all 0.15s',marginBottom:2,boxSizing:'border-box'}}>
              <Icon name={t.icon} size={15} color={isActive?T.accentDark:T.muted}/>
              {t.label}
              {t.id==='tasks'&&<span style={{marginLeft:'auto',background:T.accent,color:'#f5f0e8',borderRadius:10,padding:'1px 7px',fontSize:10}}>{tasks.filter(x=>!x.done).length}</span>}
              {mode==='windows'&&openWins.includes(t.id)&&<div style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:T.accent}}/>}
            </button>
          );})}
        </nav>
        <div style={{padding:'14px 18px',borderTop:`1px solid ${T.sidebarBorder}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:11,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{user.email}</span>
          <button title="Sair" onClick={()=>supabase.auth.signOut()} style={{background:'none',border:'none',cursor:'pointer',padding:4,flexShrink:0}}>
            <Icon name="logout" size={15} color={T.muted}/>
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',position:'relative'}}>
        {mode==='tabs'&&<>
          <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:'13px 26px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
            <Icon name={TABS.find(t=>t.id===tab)?.icon||'chat'} size={16} color={T.accent}/>
            <h2 style={{margin:0,fontSize:16,fontWeight:400,color:T.text,letterSpacing:-0.2}}>{TAB_LABEL[tab]}</h2>
          </div>
          <div style={{flex:1,overflow:'auto'}}><TabContent id={tab}/></div>
        </>}

        {mode==='windows'&&(
          <div style={{flex:1,position:'relative',overflow:'hidden'}}>
            {openWins.length===0&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:13,color:T.muted,opacity:0.4}}>Seleciona uma secção na sidebar para abrir</div></div>}
            {TABS.filter(t=>openWins.includes(t.id)).map(t=>{ const ws=winStates[t.id]; return (
              <Window key={t.id} id={t.id} title={TAB_LABEL[t.id]} icon={t.icon} state={ws} zIndex={ws.z} onUpdate={updateWin} onClose={closeWin} onFocus={focusWin}>
                <TabContent id={t.id}/>
              </Window>
            );})}
          </div>
        )}
      </div>

      <FloatingBot onCreateEvent={addEvent} onCreateTask={text=>addTask(text.replace(/adiciona(r)?\s*(tarefa:?)?/i,'').trim())}/>
    </div>
  );
}

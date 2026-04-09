import React, { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from './supabase';

const T = {
  bg:"#f2ece0", sidebar:"#e8dfd0", sidebarBorder:"#d8cebb",
  card:"#faf6ef", border:"#ddd5c4", text:"#1e1810", muted:"#9a8e7e",
  accent:"#7c6d52", accentDark:"#5c4f3a", accentLight:"#f0ead8",
  accentMid:"#c8b99a", active:"#4a3f2e",
  success:"#5a8a5a", danger:"#c05a5a", warning:"#c09040",
};

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DAYS_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const EVENT_TYPES = { birthday:'#c05a5a', date:'#7c6d52', holiday:'#5a8a5a', medical:'#4a7a8a', work:'#7a6a9a', other:'#8a7a6a' };
const EVENT_TYPE_LABELS = { birthday:'Aniversário', date:'Encontro', holiday:'Feriado/Férias', medical:'Saúde', work:'Trabalho', other:'Outro' };
const PRIORITY_COLOR = { alta:T.danger, média:T.warning, baixa:T.success };
const COLS = ['A fazer','Em progresso','Concluído'];
const TABS = [
  { id:'dashboard', label:'Início',     icon:'home'     },
  { id:'chat',      label:'Chat',       icon:'chat'     },
  { id:'tasks',     label:'Tarefas',    icon:'tasks'    },
  { id:'notes',     label:'Notas',      icon:'notes'    },
  { id:'calendar',  label:'Calendário', icon:'calendar' },
];
const TAB_LABEL = { dashboard:'Início', chat:'Chat', tasks:'Tarefas', notes:'Notas', calendar:'Calendário' };

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function toDateStr(y,m,d){ return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
function parseDate(text){
  const t=text.toLowerCase(), now=new Date();
  if(t.includes('amanhã')||t.includes('amanha')){ const d=new Date(now); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; }
  if(t.includes('hoje')) return now.toISOString().split('T')[0];
  const meses={'janeiro':1,'fevereiro':2,'março':3,'marco':3,'abril':4,'maio':5,'junho':6,'julho':7,'agosto':8,'setembro':9,'outubro':10,'novembro':11,'dezembro':12};
  for(const [nome,num] of Object.entries(meses)){
    if(t.includes(nome)){
      const dm=t.match(/dia\s+(\d{1,2})|(\d{1,2})\s+de/i);
      const day=dm?parseInt(dm[1]||dm[2]):1;
      const yr=now.getMonth()+1>num?now.getFullYear()+1:now.getFullYear();
      return yr+'-'+String(num).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    }
  }
  const dm=t.match(/dia\s+(\d{1,2})/i);
  if(dm) return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(dm[1]).padStart(2,'0');
  return now.toISOString().split('T')[0];
}
function detectEventType(t){
  if(t.includes('aniversário')||t.includes('aniversario')) return 'birthday';
  if(t.includes('jantar')||t.includes('romântico')) return 'date';
  if(t.includes('férias')||t.includes('feriado')) return 'holiday';
  if(t.includes('consulta')||t.includes('médico')) return 'medical';
  if(t.includes('trabalho')||t.includes('reunião')) return 'work';
  return 'other';
}
function cleanTitle(text){
  return text.replace(/marca(r)?|adiciona(r)?|cria(r)?|evento|tarefa|no dia|às|para|amanhã|amanha|hoje/gi,'')
    .replace(/\d{1,2}[\/\-]\d{1,2}/g,'').replace(/\d{1,2}h\d*/g,'')
    .replace(/\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi,'')
    .replace(/dia\s+\d{1,2}/gi,'').replace(/\s+/g,' ').trim();
}

// ── ICONS ─────────────────────────────────────────────────────────────────────
function Icon({ name, size=16, color=T.muted }) {
  const s={width:size,height:size,display:'block',flexShrink:0};
  const p={fill:'none',stroke:color,strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round'};
  if(name==='chat')     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
  if(name==='tasks')    return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="13" y2="15"/></svg>;
  if(name==='calendar') return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  if(name==='logout')   return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
  if(name==='grid')     return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
  if(name==='layout')   return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;
  if(name==='plus')     return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
  if(name==='edit')     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
  if(name==='trash')    return <svg style={s} viewBox="0 0 24 24" {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
  if(name==='close')    return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  if(name==='users')    return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
  if(name==='link')     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
  if(name==='hash')     return <svg style={s} viewBox="0 0 24 24" {...p}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
  if(name==='settings') return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
  if(name==='home')     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if(name==='notes')    return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
  if(name==='pin')      return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
  if(name==='lock')     return <svg style={s} viewBox="0 0 24 24" {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
  if(name==='smile')    return <svg style={s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
  if(name==='bell')     return <svg style={s} viewBox="0 0 24 24" {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
  return null;
}

// ── INIT DATA ─────────────────────────────────────────────────────────────────
const INIT_GROUPS = [
  { id:'casal',   name:'Nos dois',  emoji:'❤️', color:'#7c6d52', members:['tu'], admins:['tu'], type:'casal',        perms:{addEvent:true,editEvent:true,deleteEvent:true,addTask:true,editTask:true,deleteTask:true,addNote:true,chat:true} },
  { id:'cozinha', name:'Cozinha',   emoji:'🍳', color:'#5a8a5a', members:['tu'], admins:['tu'], type:'colaborativo', perms:{addEvent:true,editEvent:true,deleteEvent:false,addTask:true,editTask:true,deleteTask:false,addNote:true,chat:true} },
  { id:'oracao',  name:'Oracao',    emoji:'🙏', color:'#4a7a8a', members:['tu'], admins:['tu'], type:'colaborativo', perms:{addEvent:false,editEvent:false,deleteEvent:false,addTask:true,editTask:false,deleteTask:false,addNote:false,chat:true} },
];
const GROUP_TYPES = {
  casal:        { label:'Grupo de Casal',        icon:'❤️', color:'#c05a5a', desc:'Alteracoes precisam de aprovacao dos dois membros antes de serem aplicadas.' },
  colaborativo: { label:'Grupo Colaborativo',    icon:'👥', color:'#5a8a5a', desc:'O admin define o que cada membro pode fazer.' },
};
const DEFAULT_PERMS = {
  casal:        {addEvent:true,editEvent:true,deleteEvent:true,addTask:true,editTask:true,deleteTask:true,addNote:true,chat:true},
  colaborativo: {addEvent:true,editEvent:true,deleteEvent:false,addTask:true,editTask:true,deleteTask:false,addNote:true,chat:true},
};
const INIT_EVENTS = { casal:[], cozinha:[], oracao:[] };

const INIT_TASKS = { casal:[], cozinha:[], oracao:[] };

const INIT_MSGS = { casal:[], cozinha:[], oracao:[] };

const INIT_WINS = {
  dashboard:{pos:{x:40, y:40}, size:{w:520,h:420},minimized:false,z:12},
  chat:     {pos:{x:80, y:60}, size:{w:480,h:400},minimized:false,z:11},
  tasks:    {pos:{x:150,y:80}, size:{w:560,h:430},minimized:false,z:10},
  notes:    {pos:{x:200,y:100},size:{w:500,h:380},minimized:false,z:9},
  calendar: {pos:{x:250,y:110},size:{w:660,h:480},minimized:false,z:8},
};

const DK = {
  bg:"#141210", sidebar:"#1c1916", sidebarBorder:"#2a2520",
  card:"#1e1b18", border:"#2e2a26", text:"#f0e8d8", muted:"#7a6e60",
  accent:"#c8a87a", accentDark:"#a88a5a", accentLight:"rgba(200,168,122,0.1)",
  accentMid:"#6a5a40", success:"#5a9a5a", danger:"#c06060", warning:"#c09040",
};

const INIT_NOTES = { casal:[], cozinha:[], oracao:[] };

function ArchiveInner({ events, tasks, T }) {
  const [activeTab,setAT] = useState('tasks');
  const today    = new Date().toISOString().split('T')[0];
  const done     = tasks.filter(t=>t.done);
  const past     = events.filter(e=>e.date<today).sort((a,b)=>b.date.localeCompare(a.date));
  const EVTYPES  = {birthday:'#c05a5a',date:'#7c6d52',holiday:'#5a8a5a',medical:'#4a7a8a',work:'#7a6a9a',other:'#8a7a6a'};
  return (
    <div style={{flex:1,overflow:'auto',padding:24}}>
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {[['tasks','Tarefas concluídas ('+done.length+')'],['events','Eventos passados ('+past.length+')']].map(([id,l])=>(
          <button key={id} onClick={()=>setAT(id)} style={{padding:'6px 16px',borderRadius:8,border:'1px solid '+(activeTab===id?T.accent:T.border),background:activeTab===id?T.accentLight:'transparent',color:activeTab===id?T.accentDark:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
        ))}
      </div>
      {activeTab==='tasks'&&(done.length===0?<div style={{fontSize:13,color:T.muted}}>Sem tarefas concluídas</div>:done.map(t=>(
        <div key={t.id} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 14px',background:T.bg,border:'1px solid '+T.border,borderRadius:10,marginBottom:8,opacity:0.75}}>
          <span style={{color:T.success}}>✓</span>
          <span style={{fontSize:13,color:T.muted,textDecoration:'line-through'}}>{t.text}</span>
        </div>
      )))}
      {activeTab==='events'&&(past.length===0?<div style={{fontSize:13,color:T.muted}}>Sem eventos passados</div>:past.map(ev=>(
        <div key={ev.id} style={{display:'flex',gap:12,alignItems:'center',padding:'10px 14px',background:T.bg,border:'1px solid '+T.border,borderRadius:10,marginBottom:8,opacity:0.65}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:EVTYPES[ev.type]||EVTYPES.other,flexShrink:0}}/>
          <div>
            <div style={{fontSize:13,color:T.muted}}>{ev.title}</div>
            <div style={{fontSize:10,color:T.muted}}>{new Date(ev.date+'T12:00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
        </div>
      )))}
    </div>
  );
}

// ── EVENT MODAL ───────────────────────────────────────────────────────────────
function EventModal({event,onSave,onDelete,onClose,defaultDate}){
  const T = G;
  const [title,setTitle]       = useState(event?.title||'');
  const [date,setDate]         = useState(event?.date||defaultDate||'');
  const [type,setType]         = useState(event?.type||'other');
  const [desc,setDesc]         = useState(event?.desc||'');
  const [reminder,setReminder] = useState(event?.reminder??1);
  const [recur,setRecur]       = useState(event?.recur||'none');
  const inp={width:'100%',boxSizing:'border-box',border:'1px solid '+T.border,borderRadius:7,padding:'9px 12px',fontSize:13,color:T.text,background:T.bg,outline:'none',fontFamily:'inherit'};
  const lbl={display:'block',fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:5};
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:16,padding:28,width:400,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 16px 60px rgba(30,24,16,0.2)',fontFamily:'inherit'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:400,color:T.text}}>{event?'Editar evento':'Novo evento'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><Icon name="close" size={16} color={T.muted}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div><label style={lbl}>Título</label><input value={title} onChange={e=>setTitle(e.target.value)} style={inp} placeholder="Nome do evento"/></div>
          <div><label style={lbl}>Data</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></div>
          <div><label style={lbl}>Tipo</label>
            <select value={type} onChange={e=>setType(e.target.value)} style={{...inp,cursor:'pointer'}}>
              {Object.entries(EVENT_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Descrição</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} style={{...inp,resize:'vertical',minHeight:60}} placeholder="Notas..."/></div>
          <div><label style={lbl}>Lembrete</label>
            <div style={{display:'flex',gap:8}}>
              {[[0,'No dia'],[1,'1 dia'],[3,'3 dias'],[7,'1 semana']].map(([v,l])=>(
                <button key={v} onClick={()=>setReminder(v)} style={{flex:1,padding:'6px 4px',borderRadius:7,border:'1px solid '+(reminder===v?T.accent:T.border),background:reminder===v?T.accentLight:'transparent',color:reminder===v?T.accentDark:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
              ))}
            </div>
          </div>
          <div><label style={lbl}>Repetição</label>
            <div style={{display:'flex',gap:8}}>
              {[['none','Nunca'],['weekly','Semanal'],['monthly','Mensal'],['yearly','Anual']].map(([v,l])=>(
                <button key={v} onClick={()=>setRecur(v)} style={{flex:1,padding:'6px 4px',borderRadius:7,border:'1px solid '+(recur===v?T.accent:T.border),background:recur===v?T.accentLight:'transparent',color:recur===v?T.accentDark:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:22}}>
          {event&&<button onClick={()=>onDelete(event.id)} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.danger,borderRadius:7,color:T.danger,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Eliminar</button>}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={()=>title&&date&&onSave({id:event?.id||genId(),title,date,type,desc,reminder,recur})} style={{padding:'9px 20px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{event?'Guardar':'Criar'}</button>
        </div>
      </div>
    </div>
  );
}

// ── DAY PANEL ─────────────────────────────────────────────────────────────────
function DayPanel({date,events,onClose,onEdit,onDelete,onAdd}){
  const T = G;
  const d=new Date(date+'T12:00:00');
  const dayEvents=events.filter(e=>e.date===date);
  return(
    <div style={{position:'absolute',top:0,right:0,bottom:0,width:290,background:T.card,borderLeft:'1px solid '+T.border,display:'flex',flexDirection:'column',zIndex:100,boxShadow:'-4px 0 20px rgba(30,24,16,0.08)'}}>
      <div style={{padding:'16px 18px',borderBottom:'1px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.5}}>{DAYS_FULL[d.getDay()]}</div>
          <div style={{fontSize:18,fontWeight:400,color:T.text}}>{d.getDate()} de {MONTHS[d.getMonth()]}</div>
        </div>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><Icon name="close" size={16} color={T.muted}/></button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'14px 18px'}}>
        {dayEvents.length===0
          ?<div style={{fontSize:13,color:T.muted,textAlign:'center',marginTop:24}}>Sem eventos neste dia</div>
          :dayEvents.map(ev=>(
            <div key={ev.id} style={{background:T.bg,border:'1px solid '+T.border,borderLeft:'3px solid '+(EVENT_TYPES[ev.type]||EVENT_TYPES.other),borderRadius:9,padding:'11px 13px',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:T.text,lineHeight:1.4}}>{ev.title}</div>
                  <div style={{fontSize:10,color:T.muted,marginTop:3}}>{EVENT_TYPE_LABELS[ev.type]||'Outro'}</div>
                  {ev.desc&&<div style={{fontSize:12,color:T.muted,marginTop:6}}>{ev.desc}</div>}
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>onEdit(ev)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><Icon name="edit" size={13} color={T.muted}/></button>
                  <button onClick={()=>onDelete(ev.id)} style={{background:'none',border:'none',cursor:'pointer',padding:4}}><Icon name="trash" size={13} color={T.muted}/></button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
      <div style={{padding:'12px 18px',borderTop:'1px solid '+T.border}}>
        <button onClick={()=>onAdd(date)} style={{width:'100%',padding:'9px',background:T.accentDark,border:'none',borderRadius:8,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <Icon name="plus" size={13} color="#f5f0e8"/>Novo evento
        </button>
      </div>
    </div>
  );
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
function CalendarView({events,onAddEvent,onEditEvent,onDeleteEvent}){
  const T = G;
  const [month,setMonth]=useState(3);
  const [year,setYear]=useState(2026);
  const [sel,setSel]=useState(null);
  const [modal,setModal]=useState(null);
  const [view,setView]=useState('month');

  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=new Date(year,month,1).getDay();
  const days=[...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const today=new Date();
  const isToday=d=>d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
  const dateStr=d=>toDateStr(year,month,d);
  const getEvs=d=>events.filter(e=>e.date===dateStr(d));

  const prevMonth=()=>{if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1);setSel(null);};
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1);setSel(null);};
  const handleSave=ev=>{if(modal?.event)onEditEvent(ev);else onAddEvent(ev);setModal(null);};
  const handleDelete=id=>{onDeleteEvent(id);setModal(null);};

  // Year view mini month — uses CSS grid that fills cell
  function MiniMonth({m}){
    const dim=new Date(year,m+1,0).getDate();
    const fd=new Date(year,m,1).getDay();
    // Always 6 rows so all months same height
    const mDays=[...Array(fd).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
    while(mDays.length<42) mDays.push(null);
    const mEvs=events.filter(e=>e.date&&e.date.startsWith(year+'-'+String(m+1).padStart(2,'0')));
    const isCurr=month===m;
    return(
      <div onClick={()=>{setMonth(m);setView('month');setSel(null);}}
        style={{background:T.card,border:'1px solid '+(isCurr?T.accent:T.border),borderRadius:12,padding:'10px 10px 6px',cursor:'pointer',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0,transition:'all 0.15s',boxSizing:'border-box'}}
        onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(30,24,16,0.1)';if(!isCurr)e.currentTarget.style.borderColor=T.accentMid;}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=isCurr?T.accent:T.border;}}>
        {/* Month name — prominent */}
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:6,flexShrink:0}}>
          <span style={{fontSize:13,fontWeight:500,color:isCurr?T.accent:T.text,letterSpacing:-0.2,lineHeight:1}}>{MONTHS[m]}</span>
          {mEvs.length>0&&<span style={{fontSize:9,color:T.accent,fontWeight:600}}>{mEvs.length}</span>}
        </div>
        {/* Day headers */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:3,flexShrink:0}}>
          {['D','S','T','Q','Q','S','S'].map((d,i)=>(
            <div key={i} style={{textAlign:'center',fontSize:8,color:T.muted,lineHeight:1.4}}>{d}</div>
          ))}
        </div>
        {/* 6 fixed rows — no empty space ever */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gridTemplateRows:'repeat(6,1fr)',flex:1,minHeight:0}}>
          {mDays.map((day,i)=>{
            if(!day) return <div key={i}/>;
            const evs=events.filter(e=>e.date===toDateStr(year,m,day));
            const isTod=day===today.getDate()&&m===today.getMonth()&&year===today.getFullYear();
            return(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:9,fontWeight:isTod?700:evs.length?500:400,color:isTod?'#f5f0e8':evs.length?T.accentDark:T.text,background:isTod?T.accentDark:evs.length?T.accentLight:'transparent',width:16,height:16,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return(
    <div style={{display:'flex',height:'100%',position:'relative',overflow:'hidden'}}>
      <div style={{flex:1,display:'flex',flexDirection:'column',padding:16,minWidth:0,overflow:'hidden'}}>
        {/* Controls */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12,flexShrink:0}}>
          {view==='month'&&<>
            <button onClick={()=>setYear(y=>y-1)} style={{background:'none',border:'1px solid '+T.border,borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:11,color:T.muted,fontFamily:'inherit'}}>‹‹</button>
            <button onClick={prevMonth} style={{background:'none',border:'1px solid '+T.border,borderRadius:6,padding:'3px 10px',cursor:'pointer',fontSize:14,color:T.text,fontFamily:'inherit'}}>‹</button>
            <button onClick={()=>setView('year')} style={{flex:1,background:'none',border:'none',cursor:'pointer',fontSize:14,color:T.text,fontFamily:'inherit',padding:'3px 6px',borderRadius:6}}
              onMouseEnter={e=>e.currentTarget.style.background=T.accentLight}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              {MONTHS[month]} <span style={{color:T.muted}}>{year}</span> <span style={{fontSize:10,color:T.muted}}>▾</span>
            </button>
            <button onClick={nextMonth} style={{background:'none',border:'1px solid '+T.border,borderRadius:6,padding:'3px 10px',cursor:'pointer',fontSize:14,color:T.text,fontFamily:'inherit'}}>›</button>
            <button onClick={()=>setYear(y=>y+1)} style={{background:'none',border:'1px solid '+T.border,borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:11,color:T.muted,fontFamily:'inherit'}}>››</button>
          </>}
          {view==='year'&&<>
            <button onClick={()=>setYear(y=>y-1)} style={{background:'none',border:'1px solid '+T.border,borderRadius:6,padding:'3px 10px',cursor:'pointer',fontSize:14,color:T.text,fontFamily:'inherit'}}>‹</button>
            <button onClick={()=>setView('month')} style={{flex:1,background:'none',border:'none',cursor:'pointer',fontSize:15,color:T.text,fontFamily:'inherit',borderRadius:6}}
              onMouseEnter={e=>e.currentTarget.style.background=T.accentLight}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              {year} <span style={{fontSize:10,color:T.muted}}>▴</span>
            </button>
            <button onClick={()=>setYear(y=>y+1)} style={{background:'none',border:'1px solid '+T.border,borderRadius:6,padding:'3px 10px',cursor:'pointer',fontSize:14,color:T.text,fontFamily:'inherit'}}>›</button>
          </>}
          <button onClick={()=>{setMonth(today.getMonth());setYear(today.getFullYear());setView('month');setSel(null);}} style={{background:T.accentLight,border:'1px solid '+T.border,borderRadius:6,padding:'3px 10px',cursor:'pointer',fontSize:11,color:T.accentDark,fontFamily:'inherit'}}>Hoje</button>
          <button onClick={()=>setModal({event:null,defaultDate:toDateStr(year,month,1)})} style={{background:T.accentDark,border:'none',borderRadius:6,padding:'3px 10px',cursor:'pointer',fontSize:11,color:'#f5f0e8',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
            <Icon name="plus" size={10} color="#f5f0e8"/>Evento
          </button>
        </div>

        {/* YEAR — fills all remaining space with no scroll */}
        {view==='year'&&(
          <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gridTemplateRows:'repeat(3,1fr)',gap:8,minHeight:0}}>
            {Array.from({length:12},(_,i)=><MiniMonth key={i} m={i}/>)}
          </div>
        )}

        {/* MONTH */}
        {view==='month'&&<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4,flexShrink:0}}>
            {DAYS_SHORT.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,color:T.muted,padding:'3px 0',textTransform:'uppercase',letterSpacing:0.6}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,flex:1}}>
            {days.map((day,i)=>{
              const es=day?getEvs(day):[]; const isTod=day&&isToday(day); const isSel=sel===day;
              return(
                <div key={i} onClick={()=>{if(!day)return;setSel(isSel?null:day);}}
                  style={{padding:5,border:'1px solid '+(isSel?T.accent:isTod?T.accentMid:T.border),borderRadius:8,cursor:day?'pointer':'default',background:isSel?T.accentLight:isTod?'rgba(124,109,82,0.07)':'transparent',overflow:'hidden'}}>
                  {day&&<>
                    <div style={{fontSize:11,fontWeight:isTod?700:400,color:isTod?T.accent:T.text,marginBottom:2}}>{day}</div>
                    {es.slice(0,3).map(ev=>(
                      <div key={ev.id} style={{fontSize:9,background:EVENT_TYPES[ev.type]||EVENT_TYPES.other,color:'#fff',borderRadius:3,padding:'1px 4px',marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.4}}>{ev.title}</div>
                    ))}
                    {es.length>3&&<div style={{fontSize:9,color:T.muted}}>+{es.length-3}</div>}
                  </>}
                </div>
              );
            })}
          </div>
        </>}
      </div>

      {sel&&view==='month'&&(
        <DayPanel date={dateStr(sel)} events={events} onClose={()=>setSel(null)}
          onEdit={ev=>setModal({event:ev})} onDelete={handleDelete} onAdd={date=>setModal({event:null,defaultDate:date})}/>
      )}
      {modal&&<EventModal event={modal.event} defaultDate={modal.defaultDate} onSave={handleSave} onDelete={handleDelete} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ── TASK MODAL ────────────────────────────────────────────────────────────────
function TaskModal({task,onSave,onDelete,onClose,cats}){
  const T = G;
  const [text,setText]         = useState(task?.text||'');
  const [priority,setPriority] = useState(task?.priority||'média');
  const [col,setCol]           = useState(task?.col||'A fazer');
  const [priv,setPriv]         = useState(task?.priv||false);
  const [cat,setCat]           = useState(task?.cat||'');
  const [dueDate,setDueDate]   = useState(task?.dueDate||'');
  const [recur,setRecur]       = useState(task?.recur||'none');
  const inp={width:'100%',boxSizing:'border-box',border:'1px solid '+T.border,borderRadius:7,padding:'9px 12px',fontSize:13,color:T.text,background:T.bg,outline:'none',fontFamily:'inherit'};
  const lbl={display:'block',fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:5};
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:16,padding:28,width:400,boxShadow:'0 16px 60px rgba(30,24,16,0.2)',fontFamily:'inherit'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:400,color:T.text}}>{task?'Editar tarefa':'Nova tarefa'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><Icon name="close" size={16} color={T.muted}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div><label style={lbl}>Tarefa</label><input value={text} onChange={e=>setText(e.target.value)} style={inp} placeholder="Descrição"/></div>
          <div><label style={lbl}>Coluna</label><select value={col} onChange={e=>setCol(e.target.value)} style={{...inp,cursor:'pointer'}}>{COLS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>Prioridade</label>
            <div style={{display:'flex',gap:8}}>
              {['alta','média','baixa'].map(p=>(
                <button key={p} onClick={()=>setPriority(p)} style={{flex:1,padding:'7px',borderRadius:7,border:'1px solid '+(priority===p?PRIORITY_COLOR[p]:T.border),background:priority===p?PRIORITY_COLOR[p]+'22':'transparent',color:priority===p?PRIORITY_COLOR[p]:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{p}</button>
              ))}
            </div>
          </div>
          <div><label style={lbl}>Categoria</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {(cats||[]).map(ca=><button key={ca} onClick={()=>setCat(cat===ca?'':ca)} style={{padding:'5px 10px',borderRadius:20,border:'1px solid '+(cat===ca?T.accent:T.border),background:cat===ca?T.accentLight:'transparent',color:cat===ca?T.accentDark:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{ca}</button>)}
              <input value={cat&&!(cats||[]).includes(cat)?cat:''} onChange={e=>setCat(e.target.value)}
                placeholder={(cats||[]).length===0?'Escreve uma categoria...':'+ nova...'}
                style={{border:'1px dashed '+T.border,borderRadius:20,padding:'4px 10px',fontSize:11,outline:'none',fontFamily:'inherit',background:'transparent',color:T.text,width:110}}
              />
            </div>
          </div>
          <div><label style={lbl}>Data limite (opcional)</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={{...inp,color:dueDate?T.text:T.muted}}/>
          </div>
          <div>
            <label style={lbl}>Repetição</label>
            <div style={{display:'flex',gap:7}}>
              {[['none','Nunca'],['daily','Diária'],['weekly','Semanal'],['monthly','Mensal']].map(([v,l])=>(
                <button key={v} onClick={()=>setRecur(v)} style={{flex:1,padding:'6px 4px',borderRadius:7,border:'1px solid '+(recur===v?T.accent:T.border),background:recur===v?T.accentLight:'transparent',color:recur===v?T.accentDark:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
              ))}
            </div>
          </div>
          <button onClick={()=>setPriv(p=>!p)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:priv?T.accentLight:T.bg,border:'1px solid '+(priv?T.accent:T.border),borderRadius:8,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
            <Icon name="lock" size={14} color={priv?T.accentDark:T.muted}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:priv?T.accentDark:T.text}}>Tarefa privada</div>
              <div style={{fontSize:11,color:T.muted}}>Só tu vês esta tarefa</div>
            </div>
            <div style={{width:32,height:18,borderRadius:9,background:priv?T.accentDark:T.border,position:'relative',flexShrink:0}}>
              <div style={{position:'absolute',top:2,left:priv?14:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
            </div>
          </button>
        </div>
        <div style={{display:'flex',gap:10,marginTop:22}}>
          {task&&<button onClick={()=>onDelete(task.id)} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.danger,borderRadius:7,color:T.danger,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Eliminar</button>}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={()=>text&&onSave({id:task?.id||genId(),text,col,priority,done:col==='Concluído',priv,cat,dueDate,recur})} style={{padding:'9px 20px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{task?'Guardar':'Criar'}</button>
        </div>
      </div>
    </div>
  );
}

// ── KANBAN ────────────────────────────────────────────────────────────────────
function KanbanView({tasks,onAddTask,onEditTask,onDeleteTask,onMoveTask,onSendToGroup,cats,onAddCat,onRemoveCat}){
  const T = G;
  const [modal,setModal]   = useState(null);
  const [catFilter,setCat] = useState("todas");
  const filtered = catFilter==="todas"?tasks:tasks.filter(t=>(t.cat||"")===catFilter);
  const [adding,setAdding]=useState({});
  const [newText,setNewText]=useState({});
  const [dragId,setDragId]       = useState(null);
  const [dragOver,setDragOver]   = useState(null);
  const [addingCat,setAddingCat] = useState(false);
  const [newCat,setNewCat]       = useState('');
  const handleSave=t=>{if(modal?.task)onEditTask(t);else onAddTask(t);setModal(null);};
  const handleDelete=id=>{onDeleteTask(id);setModal(null);};
  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'10px 18px',borderBottom:'1px solid '+T.border,display:'flex',alignItems:'center',gap:10,flexShrink:0,background:T.card}}>
        <span style={{fontSize:11,color:T.muted}}>Total: {tasks.length} · Pendentes: {tasks.filter(t=>t.col!=='Concluído').length}</span>
        <button onClick={()=>setModal({task:null})} style={{marginLeft:'auto',padding:'5px 12px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
          <Icon name="plus" size={11} color="#f5f0e8"/>Nova
        </button>
      </div>
      <div style={{padding:'6px 18px 8px',borderBottom:'1px solid '+T.border,display:'flex',gap:5,flexWrap:'wrap',background:T.card,flexShrink:0,alignItems:'center'}}>
        {/* "Todas" pill */}
        <button onClick={()=>setCat("todas")} style={{padding:'3px 10px',borderRadius:20,border:'1px solid '+(catFilter==="todas"?T.accent:T.border),background:catFilter==="todas"?T.accentLight:'transparent',color:catFilter==="todas"?T.accentDark:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>todas</button>
        {/* Custom category pills */}
        {(cats||[]).map(cat=>(
          <div key={cat} style={{display:'flex',alignItems:'center',gap:0}}>
            <button onClick={()=>setCat(cat==="todas"?cat:(catFilter===cat?"todas":cat))} style={{padding:'3px 10px',borderRadius:'20px 0 0 20px',border:'1px solid '+(catFilter===cat?T.accent:T.border),borderRight:'none',background:catFilter===cat?T.accentLight:'transparent',color:catFilter===cat?T.accentDark:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{cat}</button>
            <button onClick={()=>{if(catFilter===cat)setCat("todas");onRemoveCat&&onRemoveCat(cat);}} title="Remover categoria" style={{padding:'3px 6px',borderRadius:'0 20px 20px 0',border:'1px solid '+(catFilter===cat?T.accent:T.border),background:catFilter===cat?T.accentLight:'transparent',color:T.muted,fontSize:11,cursor:'pointer',lineHeight:1}}>×</button>
          </div>
        ))}
        {/* Add new category */}
        {addingCat?(
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <input autoFocus value={newCat} onChange={e=>setNewCat(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&newCat.trim()){onAddCat&&onAddCat(newCat.trim());setNewCat('');setAddingCat(false);}if(e.key==='Escape'){setNewCat('');setAddingCat(false);}}}
              placeholder="Nome..." style={{border:'1px solid '+T.accent,borderRadius:20,padding:'2px 10px',fontSize:11,outline:'none',fontFamily:'inherit',background:T.bg,color:T.text,width:90}}/>
            <button onClick={()=>{if(newCat.trim()){onAddCat&&onAddCat(newCat.trim());setNewCat('');setAddingCat(false);}}} style={{background:T.accentDark,border:'none',borderRadius:20,padding:'3px 10px',color:'#f5f0e8',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>+</button>
            <button onClick={()=>{setNewCat('');setAddingCat(false);}} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:14}}>×</button>
          </div>
        ):(
          <button onClick={()=>setAddingCat(true)} title="Nova categoria" style={{padding:'3px 10px',borderRadius:20,border:'1px dashed '+T.border,background:'transparent',color:T.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>+ categoria</button>
        )}
      </div>
      <div style={{display:'flex',gap:12,padding:16,flex:1,overflowX:'auto',alignItems:'flex-start'}}>
        {COLS.map(col=>{
          const colTasks=filtered.filter(t=>t.col===col);
          const isDT=dragOver===col;
          return(
            <div key={col} style={{minWidth:210,flex:1,display:'flex',flexDirection:'column'}}
              onDragOver={e=>{e.preventDefault();setDragOver(col);}}
              onDrop={e=>{e.preventDefault();if(dragId)onMoveTask(dragId,col);setDragId(null);setDragOver(null);}}
              onDragLeave={()=>setDragOver(null)}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:10}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:col==='A fazer'?T.danger:col==='Em progresso'?T.warning:T.success}}/>
                <span style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.5}}>{col}</span>
                <span style={{background:T.accentLight,color:T.accent,borderRadius:10,padding:'1px 6px',fontSize:9}}>{colTasks.length}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:7,flex:1,minHeight:50,padding:isDT?'6px':'0',background:isDT?T.accentLight:'transparent',borderRadius:10,border:'2px '+(isDT?'dashed '+T.accent:'solid transparent'),transition:'all 0.15s'}}>
                {colTasks.map(task=>{
                  const isDragging=dragId===task.id;
                  return(
                    <div key={task.id} draggable
                      onDragStart={e=>{setDragId(task.id);e.dataTransfer.effectAllowed='move';}}
                      onDragEnd={()=>{setDragId(null);setDragOver(null);}}
                      style={{background:T.card,border:'1px solid '+T.border,borderRadius:10,padding:'10px 12px',cursor:'grab',opacity:isDragging?0.4:1,userSelect:'none',boxShadow:'0 1px 3px rgba(30,24,16,0.05)'}}>
                      <div style={{fontSize:13,color:T.text,lineHeight:1.5,marginBottom:7}}>{task.text}</div>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <span style={{fontSize:10,color:PRIORITY_COLOR[task.priority]||T.muted}}>● {task.priority}</span>
                      {task.cat&&task.cat!=='geral'&&<span style={{fontSize:9,color:T.muted,background:T.accentLight,borderRadius:8,padding:'1px 6px'}}>{task.cat}</span>}
                      {task.dueDate&&(()=>{const diff=Math.ceil((new Date(task.dueDate+'T12:00:00')-new Date())/86400000);return <span style={{fontSize:9,color:diff<0?T.danger:diff<=2?T.warning:T.muted,borderRadius:8,padding:'1px 6px',border:'1px solid '+(diff<0?T.danger:diff<=2?T.warning:T.border)}}>📅 {diff<0?'Atrasada':diff===0?'Hoje':''+diff+'d'}</span>;})()}
                      {task.recur&&task.recur!=='none'&&<span style={{fontSize:9,color:T.accent,borderRadius:8,padding:'1px 6px',border:'1px solid '+T.border}}>↻ {task.recur==='daily'?'Diária':task.recur==='weekly'?'Semanal':'Mensal'}</span>}
                        <div style={{marginLeft:'auto',display:'flex',gap:3}}>
                          <button onClick={()=>setModal({task})} style={{background:'none',border:'none',cursor:'pointer',padding:3}}><Icon name="edit" size={12} color={T.muted}/></button>
                          <button onClick={()=>onDeleteTask(task.id)} style={{background:'none',border:'none',cursor:'pointer',padding:3}}><Icon name="trash" size={12} color={T.muted}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {adding[col]
                  ?<div style={{display:'flex',gap:5}}>
                    <input autoFocus value={newText[col]||''} onChange={e=>setNewText(p=>({...p,[col]:e.target.value}))}
                      onKeyDown={e=>{if(e.key==='Enter'&&newText[col]?.trim()){onAddTask({id:genId(),text:newText[col].trim(),col,priority:'média',done:col==='Concluído'});setNewText(p=>({...p,[col]:''}));setAdding(p=>({...p,[col]:false}));}if(e.key==='Escape')setAdding(p=>({...p,[col]:false}));}}
                      placeholder="Tarefa... (Enter)" style={{flex:1,border:'1px solid '+T.accent,borderRadius:7,padding:'7px 9px',background:T.bg,color:T.text,fontSize:12,outline:'none',fontFamily:'inherit'}}/>
                    <button onClick={()=>setAdding(p=>({...p,[col]:false}))} style={{background:'none',border:'none',cursor:'pointer',padding:3}}><Icon name="close" size={12} color={T.muted}/></button>
                  </div>
                  :<button onClick={()=>setAdding(p=>({...p,[col]:true}))} style={{border:'1.5px dashed '+T.border,borderRadius:9,padding:'8px 12px',background:'transparent',color:T.muted,fontSize:12,cursor:'pointer',textAlign:'left',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.accentLight}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <Icon name="plus" size={11} color={T.muted}/>Adicionar
                  </button>
                }
              </div>
            </div>
          );
        })}
      </div>
      {modal&&<TaskModal task={modal.task} onSave={handleSave} onDelete={handleDelete} onClose={()=>setModal(null)} cats={cats||[]}/>}
    </div>
  );
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function ChatView({messages,onSend,groupColor,onReact,reactions,onPin}){
  const T = G;
  const [input,setInput]         = useState('');
  const [showReactFor,setShowReactFor]    = useState(null);
  const [showEmoji,setShowEmoji] = useState(false);
  const [replyTo,setReplyTo]     = useState(null);
  const photoRef = useRef(null);
  const endRef   = useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);
  const send = () => { if(!input.trim())return; onSend(input.trim(),replyTo); setInput(''); setReplyTo(null); };
  const handlePhoto = e => { const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>onSend('__photo__'+ev.target.result,null); r.readAsDataURL(f); e.target.value=''; };
  const pinnedMsgs = messages.filter(m=>m.pinned);
  const EMOJIS = ['❤️','😂','👍','🔥','😢','🙏'];
  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Pinned messages bar */}
      {pinnedMsgs.length>0&&(
        <div style={{padding:'6px 16px',background:T.accentLight,borderBottom:'1px solid '+T.border,fontSize:12,color:T.accentDark,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          📌 <span style={{fontWeight:500}}>{pinnedMsgs.length} fixada{pinnedMsgs.length>1?'s':''}</span>
          <span style={{color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{pinnedMsgs[pinnedMsgs.length-1]?.text}</span>
        </div>
      )}
      <div style={{flex:1,padding:'16px 20px',display:'flex',flexDirection:'column',gap:10,overflowY:'auto'}} onClick={()=>setShowReactFor(null)}>
        {messages.map(m=>(
          <div key={m.id} style={{display:'flex',flexDirection:m.from==='me'?'row-reverse':'row',gap:9,alignItems:'flex-end',position:'relative'}}>
            {m.from!=='me'&&<div style={{width:28,height:28,borderRadius:'50%',background:T.accentLight,border:'1px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>
              {m.from==='her'?'👩':m.from==='mae'?'👵':m.from==='pedro'?'🧑':'👤'}
            </div>}
            <div style={{maxWidth:'60%',position:'relative'}}>
              {m.pinned&&<div style={{position:'absolute',top:-8,right:m.from==='me'?0:'auto',left:m.from!=='me'?0:'auto',fontSize:10,color:T.accent}}>📌</div>}
              <div style={{padding:'9px 13px',borderRadius:m.from==='me'?'14px 14px 3px 14px':'14px 14px 14px 3px',background:m.from==='me'?(groupColor||T.accentDark):T.card,color:m.from==='me'?'#f5f0e8':T.text,fontSize:13,lineHeight:1.55,border:m.from==='me'?'none':'1px solid '+T.border}}>
                {m.from!=='me'&&<div style={{fontSize:9,color:m.from==='me'?'rgba(245,240,232,0.5)':T.muted,marginBottom:2}}>{m.from}</div>}
                {m.text}
                <div style={{fontSize:10,color:m.from==='me'?'rgba(245,240,232,0.4)':T.muted,marginTop:3,textAlign:m.from==='me'?'right':'left',display:'flex',alignItems:'center',justifyContent:m.from==='me'?'flex-end':'flex-start',gap:3}}>{m.time}{m.from==='me'&&<span style={{fontSize:10,opacity:0.6}}>{m.read?'✓✓':'✓'}</span>}</div>
              </div>
              {/* Reactions display */}
              {reactions?.[m.id]&&Object.entries(reactions[m.id]).filter(([,c])=>c>0).length>0&&(
                <div style={{display:'flex',gap:4,marginTop:3,flexWrap:'wrap',justifyContent:m.from==='me'?'flex-end':'flex-start'}}>
                  {Object.entries(reactions[m.id]).filter(([,c])=>c>0).map(([emoji,count])=>(
                    <span key={emoji} onClick={e=>{e.stopPropagation();onReact(m.id,emoji);}} style={{background:T.card,border:'1px solid '+T.border,borderRadius:20,padding:'1px 7px',fontSize:11,cursor:'pointer',userSelect:'none'}}>{emoji} {count}</span>
                  ))}
                </div>
              )}
            </div>
            {/* Hover actions */}
            <div style={{display:'flex',gap:3,alignItems:'center',opacity:0,transition:'opacity 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.opacity=1}
              onMouseLeave={e=>e.currentTarget.style.opacity=0}>
              <button onClick={e=>{e.stopPropagation();setShowReactFor(showReactFor===m.id?null:m.id);}} style={{background:T.card,border:'1px solid '+T.border,borderRadius:6,padding:'3px 6px',cursor:'pointer',fontSize:12}}>😊</button>
              <button onClick={()=>onPin(m.id)} style={{background:T.card,border:'1px solid '+T.border,borderRadius:6,padding:'3px 6px',cursor:'pointer',fontSize:12}}>📌</button>
            </div>
            {/* Emoji picker */}
            {showReactFor===m.id&&(
              <div onClick={e=>e.stopPropagation()} style={{position:'absolute',bottom:40,right:m.from==='me'?0:'auto',left:m.from!=='me'?0:'auto',background:T.card,border:'1px solid '+T.border,borderRadius:12,padding:'8px 10px',display:'flex',gap:6,zIndex:50,boxShadow:'0 4px 20px rgba(30,24,16,0.15)'}}>
                {EMOJIS.map(e=>(
                  <button key={e} onClick={()=>{onReact(m.id,e);setShowReactFor(null);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,padding:2,borderRadius:6,transition:'background 0.1s'}}
                    onMouseEnter={ev=>ev.currentTarget.style.background=T.accentLight}
                    onMouseLeave={ev=>ev.currentTarget.style.background='none'}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef}/>
      </div>
      {replyTo&&(
        <div style={{padding:'6px 16px',background:T.accentLight,borderTop:'1px solid '+T.border,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <span style={{fontSize:12,color:T.accentDark,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>↩ {replyTo.text?.startsWith('__photo__')?'📷 Foto':replyTo.text}</span>
          <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:16,lineHeight:1}}>×</button>
        </div>
      )}
      <div style={{padding:'12px 20px',background:T.card,borderTop:'1px solid '+T.border,display:'flex',gap:8,flexShrink:0,position:'relative'}}>
        {showEmoji&&<EmojiPicker onPick={e=>setInput(i=>i+e)} onClose={()=>setShowEmoji(false)}/>}
        <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
        <button onClick={()=>photoRef.current?.click()} title="Foto" style={{background:'none',border:'1px solid '+T.border,borderRadius:8,padding:'0 10px',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',flexShrink:0}}>🖼</button>
        <button onClick={e=>{e.stopPropagation();setShowEmoji(p=>!p);}} style={{background:'none',border:'1px solid '+T.border,borderRadius:8,padding:'0 10px',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',flexShrink:0}}>😊</button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Escreve uma mensagem..."
          style={{flex:1,border:'1px solid '+T.border,borderRadius:8,padding:'9px 13px',fontSize:13,outline:'none',fontFamily:'inherit',background:T.bg,color:T.text}}/>
        <button onClick={send} style={{padding:'9px 16px',background:groupColor||T.accentDark,border:'none',borderRadius:8,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Enviar</button>
      </div>
    </div>
  );
}

// ── ACCOUNT SETTINGS MODAL ────────────────────────────────────────────────────
function AccountModal({profile,onSave,onClose}){
  const T = G;
  const [name,setName]=useState(profile.name||'');
  const [photo,setPhoto]=useState(profile.photo||null);
  const [email]=useState(profile.email||'tu@email.com');
  const [notif,setNotif]=useState(profile.notif!==false);
  const [notifEvents,setNotifEvents]=useState(profile.notifEvents!==false);
  const [notifTasks,setNotifTasks]=useState(profile.notifTasks!==false);
  const [notifChat,setNotifChat]=useState(profile.notifChat!==false);
  const [defaultAvail,setDefaultAvail]=useState(profile.defaultAvail||'disponivel');
  const fileRef=useRef(null);
  const handlePhoto=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>setPhoto(ev.target.result);reader.readAsDataURL(file);};
  const inp={width:'100%',boxSizing:'border-box',border:'1px solid '+T.border,borderRadius:7,padding:'9px 12px',fontSize:13,color:T.text,background:T.bg,outline:'none',fontFamily:'inherit'};
  function Section({title,children}){return(<div style={{marginBottom:22}}><div style={{fontSize:10,fontWeight:500,color:T.accentDark,textTransform:'uppercase',letterSpacing:1.5,marginBottom:12,paddingBottom:6,borderBottom:'1px solid '+T.border}}>{title}</div><div style={{display:'flex',flexDirection:'column',gap:12}}>{children}</div></div>);}
  function Toggle({label,sub,value,onChange}){return(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:13,color:T.text}}>{label}</div>{sub&&<div style={{fontSize:11,color:T.muted,marginTop:2}}>{sub}</div>}</div><button onClick={()=>onChange(!value)} style={{width:36,height:20,borderRadius:10,background:value?T.accentDark:T.border,border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}><div style={{position:'absolute',top:2,left:value?17:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.15)'}}/></button></div>);}
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:18,width:440,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 70px rgba(30,24,16,0.22)',fontFamily:'inherit',overflow:'hidden'}}>
        <div style={{padding:'20px 24px 16px',borderBottom:'1px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:400,color:T.text}}>Definições da conta</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><Icon name="close" size={16} color={T.muted}/></button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          <Section title="Perfil">
            <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px',background:T.bg,borderRadius:12,border:'1px solid '+T.border}}>
              <div style={{position:'relative',flexShrink:0}}>
                <div style={{width:60,height:60,borderRadius:'50%',background:T.accentLight,border:'2px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,overflow:'hidden'}}>
                  {photo?<img src={photo} alt="perfil" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:T.text,marginBottom:4}}>{name||'O teu nome'}</div>
                <div style={{fontSize:11,color:T.muted,marginBottom:8}}>{email}</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>fileRef.current?.click()} style={{fontSize:11,color:T.accentDark,background:T.accentLight,border:'1px solid '+T.border,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>{photo?'Alterar foto':'+ Foto de perfil'}</button>
                  {photo&&<button onClick={()=>setPhoto(null)} style={{fontSize:11,color:T.muted,background:'none',border:'1px solid '+T.border,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>Remover</button>}
                </div>
              </div>
            </div>
            <div><div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Nome de exibição</div><input value={name} onChange={e=>setName(e.target.value)} style={inp} placeholder="Como queres aparecer nos grupos"/></div>
            <div><div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Email</div><input value={email} readOnly style={{...inp,color:T.muted,background:T.bg+'80',cursor:'default'}}/><div style={{fontSize:11,color:T.muted,marginTop:4}}>O email não pode ser alterado aqui.</div></div>
          </Section>
          <Section title="Disponibilidade">
            <div><div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Estado padrão ao entrar</div>
              <div style={{display:'flex',gap:8}}>
                {[['disponivel','✅','Disponível'],['ocupado','🔴','Ocupado'],['talvez','🟡','Talvez']].map(([v,ic,l])=>(
                  <button key={v} onClick={()=>setDefaultAvail(v)} style={{flex:1,padding:'8px 4px',borderRadius:8,border:'1px solid '+(defaultAvail===v?T.accent:T.border),background:defaultAvail===v?T.accentLight:'transparent',color:defaultAvail===v?T.accentDark:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <span style={{fontSize:16}}>{ic}</span>{l}
                  </button>
                ))}
              </div>
            </div>
          </Section>
          <Section title="Notificações">
            <Toggle label="Ativar notificações" sub="Receber alertas neste dispositivo" value={notif} onChange={setNotif}/>
            {notif&&<div style={{paddingLeft:12,borderLeft:'2px solid '+T.border,display:'flex',flexDirection:'column',gap:10}}>
              <Toggle label="Eventos e datas" sub="Lembretes de eventos no calendário" value={notifEvents} onChange={setNotifEvents}/>
              <Toggle label="Tarefas" sub="Alertas de novas tarefas partilhadas" value={notifTasks} onChange={setNotifTasks}/>
              <Toggle label="Chat" sub="Novas mensagens nos grupos" value={notifChat} onChange={setNotifChat}/>
            </div>}
          </Section>
          <Section title="Privacidade e segurança">
            <div style={{padding:'12px',background:T.bg,borderRadius:10,border:'1px solid '+T.border}}>
              <div style={{fontSize:13,color:T.text,marginBottom:4}}>Dados encriptados</div>
              <div style={{fontSize:11,color:T.muted,lineHeight:1.6}}>As tuas mensagens, tarefas e eventos são armazenados de forma segura. Apenas os membros dos teus grupos têm acesso ao conteúdo.</div>
            </div>
            <button style={{padding:'9px 14px',background:'none',border:'1px solid '+T.danger,borderRadius:8,color:T.danger,fontSize:13,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>Eliminar conta permanentemente</button>
          </Section>
          <Section title="Aplicação">
            <div style={{padding:'12px',background:T.bg,borderRadius:10,border:'1px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><div style={{fontSize:13,color:T.text}}>Fuso horário</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>Europa/Lisboa</div></div>
              <div style={{fontSize:11,color:T.muted,background:T.accentLight,padding:'3px 8px',borderRadius:6}}>Auto</div>
            </div>
            <div style={{padding:'12px',background:T.bg,borderRadius:10,border:'1px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><div style={{fontSize:13,color:T.text}}>Versão</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>CasalApp v1.0 · Preview</div></div>
            </div>
          </Section>
        </div>
        <div style={{padding:'14px 24px',borderTop:'1px solid '+T.border,display:'flex',gap:10,flexShrink:0,background:T.card}}>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={()=>onSave({name,photo,email,notif,notifEvents,notifTasks,notifChat,defaultAvail})} style={{padding:'9px 20px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
// ── ENTER INVITE CODE ─────────────────────────────────────────────────────────
function EnterInviteCode({ T, onJoin }) {
  const [code,setCode]     = useState('');
  const [status,setStatus] = useState(''); // '' | 'loading' | 'found' | 'error'
  const [found,setFound]   = useState(null);

  const lookup = async () => {
    if(!code.trim()) return;
    setStatus('loading');
    // Extract code from full URL or use as-is
    let inviteCode = code.trim();
    if(inviteCode.includes('?invite=')) {
      inviteCode = inviteCode.split('?invite=')[1].split('&')[0];
    }
    try {
      const {data,error} = await supabase.from('invites').select('*').eq('id',inviteCode.toUpperCase()).single();
      if(data&&!error&&!data.used_by) {
        setFound({id:data.id,groupId:data.group_id,name:data.group_name,emoji:data.group_emoji,color:data.group_color,type:data.group_type,perms:data.group_perms});
        setStatus('found');
      } else {
        setStatus('error');
      }
    } catch(e) { setStatus('error'); }
  };

  const join = async () => {
    if(!found) return;
    setStatus('loading');
    try {
      const {data:{user}} = await supabase.auth.getUser();
      await supabase.from('user_groups').upsert({user_id:user.id,group_id:found.groupId,group_name:found.name,group_emoji:found.emoji,group_color:found.color,group_type:found.type,group_perms:JSON.stringify(found.perms||{})});
      await supabase.from('invites').update({used_by:user.id,used_at:new Date().toISOString()}).eq('id',found.id);
      if(onJoin) onJoin({id:found.groupId,name:found.name,emoji:found.emoji,color:found.color||'#7c6d52',type:found.type||'colaborativo',admins:[],members:['tu'],perms:found.perms||{}});
      setCode(''); setFound(null); setStatus('');
    } catch(e) { setStatus('error'); }
  };

  return (
    <div>
      <div style={{display:'flex',gap:8}}>
        <input value={code} onChange={e=>{setCode(e.target.value);setStatus('');setFound(null);}}
          onKeyDown={e=>e.key==='Enter'&&lookup()}
          placeholder="Cola o link ou codigo de convite..."
          style={{flex:1,border:'1px solid '+T.border,borderRadius:8,padding:'8px 12px',fontSize:12,outline:'none',fontFamily:'inherit',background:T.bg,color:T.text}}/>
        <button onClick={lookup} disabled={status==='loading'}
          style={{padding:'8px 14px',background:T.accentDark,border:'none',borderRadius:8,color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
          {status==='loading'?'...':'Verificar'}
        </button>
      </div>
      {status==='error'&&<div style={{fontSize:11,color:T.danger,marginTop:6}}>Codigo invalido, ja utilizado ou expirado.</div>}
      {status==='found'&&found&&(
        <div style={{marginTop:10,padding:'10px 14px',background:T.accentLight,border:'1px solid '+T.accent,borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:found.color||T.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{found.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:T.text,fontWeight:500}}>{found.name}</div>
            <div style={{fontSize:11,color:T.muted}}>{found.type==='casal'?'❤️ Grupo de Casal':'👥 Grupo Colaborativo'}</div>
          </div>
          <button onClick={join}
            style={{padding:'7px 16px',background:T.accentDark,border:'none',borderRadius:8,color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
            Entrar
          </button>
        </div>
      )}
    </div>
  );
}


function GroupModal({group,onClose,onUpdate,onJoinGroup}){
  const T = G;
  const [tab,setTab]     = useState('info');
  const [color,setColor] = useState(group.color||'#7c6d52');
  const [perms,setPerms] = useState({...(DEFAULT_PERMS[group.type||'colaborativo']||DEFAULT_PERMS.colaborativo),...(group.perms||{})});
  const colors  = ['#7c6d52','#5a8a5a','#4a7a8a','#7a5a8a','#8a5a5a','#5a6a8a','#8a7a4a','#4a8a7a'];
  const me      = 'tu';
  const isAdmin = (group.admins||[me]).includes(me);
  const gt      = GROUP_TYPES[group.type||'colaborativo']||GROUP_TYPES.colaborativo;
  const PLABELS = [{k:'addEvent',l:'Adicionar eventos'},{k:'editEvent',l:'Editar eventos'},{k:'deleteEvent',l:'Eliminar eventos'},{k:'addTask',l:'Criar tarefas'},{k:'editTask',l:'Editar tarefas'},{k:'deleteTask',l:'Eliminar tarefas'},{k:'addNote',l:'Criar notas'},{k:'chat',l:'Enviar mensagens'}];
  const [copied,setCopied]   = useState(false);
  const [inviteLink,setLink] = useState('');
  const [generating,setGen]  = useState(false);

  const generateInvite = async () => {
    setGen(true);
    try {
      const inviteId = Math.random().toString(36).slice(2,10).toUpperCase();
      // Save to Supabase invites table
      if(typeof supabase !== 'undefined') {
        await supabase.from('invites').insert({
          id: inviteId,
          group_id: group.id,
          group_name: group.name,
          group_emoji: group.emoji,
          group_color: group.color,
          group_type: group.type||'colaborativo',
          group_perms: group.perms,
          group_admins: group.admins||[],
          created_by_name: 'Admin',
        }).then(()=>{});
      }
      const link = window.location.origin + '?invite=' + inviteId;
      setLink(link);
    } catch(e) { console.error(e); }
    setGen(false);
  };

  const copy = () => {
    if(!inviteLink) { generateInvite(); return; }
    navigator.clipboard?.writeText(inviteLink).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };
  const tbtn = (id,lbl) => <button key={id} onClick={()=>setTab(id)} style={{padding:'6px 14px',borderRadius:7,border:'none',background:tab===id?T.accentLight:'transparent',color:tab===id?T.accentDark:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{lbl}</button>;
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:18,width:440,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 70px rgba(30,24,16,0.25)',overflow:'hidden',fontFamily:'inherit'}}>
        <div style={{padding:'16px 22px 12px',borderBottom:'1px solid '+T.border,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{group.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,color:T.text,fontWeight:500}}>{group.name}</div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                <span style={{fontSize:10,background:gt.color+'22',color:gt.color,borderRadius:20,padding:'1px 8px'}}>{gt.icon} {gt.label}</span>
                <span style={{fontSize:10,color:T.muted}}>{(group.members||[]).length} membros</span>
              </div>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:T.muted}}>×</button>
          </div>
          <div style={{display:'flex',gap:4}}>
            {tbtn('info','Informacao')}
            {isAdmin&&tbtn('membros','Membros')}
            {isAdmin&&group.type==='colaborativo'&&tbtn('perms','Permissoes')}
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
          {tab==='info'&&<>
            {isAdmin&&<div style={{marginBottom:16}}>
              <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>Cor do grupo</div>
              <div style={{display:'flex',gap:8}}>{colors.map(col=><button key={col} onClick={()=>{setColor(col);onUpdate&&onUpdate({...group,color:col});}} style={{width:26,height:26,borderRadius:'50%',background:col,border:'3px solid '+(color===col?T.text:'transparent'),cursor:'pointer',flexShrink:0}}/>)}</div>
            </div>}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>Link de convite</div>
              {!inviteLink?(
              <button onClick={generateInvite} disabled={generating}
                style={{width:'100%',padding:'10px',background:T.accentDark,border:'none',borderRadius:8,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {generating?'A gerar...':'🔗 Gerar link de convite'}
              </button>
            ):(
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',background:T.bg,border:'1px solid '+T.border,borderRadius:8,padding:'8px 12px',marginBottom:8}}>
                  <span style={{flex:1,fontSize:11,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inviteLink}</span>
                  <button onClick={copy} style={{background:copied?T.success:T.accentDark,border:'none',borderRadius:6,padding:'4px 12px',color:'#f5f0e8',fontSize:11,cursor:'pointer',fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap'}}>{copied?'✓ Copiado!':'Copiar'}</button>
                </div>
                <button onClick={()=>setLink('')} style={{fontSize:11,color:T.muted,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>↺ Gerar novo link</button>
              </div>
            )}
            </div>
            {group.type==='casal'&&<div style={{padding:'12px 14px',background:'#fef3c7',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',lineHeight:1.6}}>Grupo de casal - todas as alteracoes precisam de aprovacao dos dois membros.</div>}

          </>}
          {tab==='membros'&&<>
            <div style={{fontSize:11,color:T.muted,marginBottom:14,lineHeight:1.6}}>Clica em + Admin para promover um membro. Admins tem controlo total.</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {(group.members||[]).map(m=>{
                const isMAdmin=(group.admins||[]).includes(m);
                const mName=m==='tu'?'Tu':m==='ela'?'Ela':m==='mae'?'Mae':'Pedro';
                const mEmoji=m==='tu'?'🧔':m==='ela'?'👩':m==='mae'?'👵':'🧑';
                return(
                  <div key={m} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:T.bg,borderRadius:10,border:'1px solid '+(isMAdmin?color+'44':T.border)}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:isMAdmin?color+'22':T.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>{mEmoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:T.text}}>{mName}</div>
                      <div style={{fontSize:10,color:isMAdmin?color:T.muted}}>{isMAdmin?'⭐ Admin':'Membro'}</div>
                    </div>
                    {m!==me&&isAdmin&&(
                      <button onClick={()=>{ const na=isMAdmin?(group.admins||[]).filter(a=>a!==m):[...(group.admins||[]),m]; onUpdate&&onUpdate({...group,admins:na}); }} style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'1px solid '+(isMAdmin?T.danger:color),color:isMAdmin?T.danger:color,background:'none',cursor:'pointer',fontFamily:'inherit'}}>{isMAdmin?'Remover':'+ Admin'}</button>
                    )}
                  </div>
                );
              })}
            </div>
          </>}
          {tab==='perms'&&<>
            <div style={{fontSize:11,color:T.muted,marginBottom:14,lineHeight:1.6}}>Permissoes dos membros nao-admin neste grupo.</div>
            <div style={{background:T.bg,border:'1px solid '+T.border,borderRadius:10,overflow:'hidden'}}>
              {PLABELS.map(({k,l},i)=>(
                <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:i<PLABELS.length-1?'1px solid '+T.border:'none'}}>
                  <span style={{fontSize:13,color:T.text}}>{l}</span>
                  <button onClick={()=>{const np={...perms,[k]:!perms[k]};setPerms(np);onUpdate&&onUpdate({...group,perms:np});}} style={{width:34,height:18,borderRadius:9,background:perms[k]?T.accentDark:T.border,border:'none',cursor:'pointer',position:'relative',flexShrink:0}}>
                    <div style={{position:'absolute',top:2,left:perms[k]?15:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                  </button>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

// ── NEW GROUP MODAL ───────────────────────────────────────────────────────────
function NewGroupModal({onSave,onClose,onJoinGroup}){
  const T = G;
  const [step,setStep]   = useState(-1); // -1=choose action, 0=choose type, 1=configure
  const [type,setType]   = useState('');
  const [name,setName]   = useState('');
  const [emoji,setEmoji] = useState('💬');
  const [color,setColor] = useState('#7c6d52');
  const [perms,setPerms] = useState({addEvent:true,editEvent:true,deleteEvent:false,addTask:true,editTask:true,deleteTask:false,addNote:true,chat:true});
  const emojis = ['💬','🏠','🍳','🙏','💪','🎮','📚','🌿','🎵','✈️','💼','🎯'];
  const colors = ['#7c6d52','#5a8a5a','#4a7a8a','#7a5a8a','#8a5a5a','#5a6a8a','#8a7a4a','#4a8a7a'];
  const PLABELS = [{k:'addEvent',l:'Adicionar eventos'},{k:'editEvent',l:'Editar eventos'},{k:'deleteEvent',l:'Eliminar eventos'},{k:'addTask',l:'Criar tarefas'},{k:'editTask',l:'Editar tarefas'},{k:'deleteTask',l:'Eliminar tarefas'},{k:'addNote',l:'Criar notas'},{k:'chat',l:'Enviar mensagens'}];
  const inp = {width:'100%',boxSizing:'border-box',border:'1px solid '+T.border,borderRadius:7,padding:'9px 12px',fontSize:13,color:T.text,background:T.bg,outline:'none',fontFamily:'inherit'};
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:18,width:420,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 70px rgba(30,24,16,0.25)',overflow:'hidden',fontFamily:'inherit'}}>
        <div style={{padding:'18px 24px 14px',borderBottom:'1px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontSize:16,fontWeight:400,color:T.text}}>{step===-1?'Grupos':step===2?'Entrar num grupo':'Novo grupo'}</div>
            {step>=0&&step!==2&&<div style={{fontSize:11,color:T.muted,marginTop:2}}>Passo {step+1} de 2</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:T.muted}}>×</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
          {step===-1&&(
            <div>
              <div style={{fontSize:14,color:T.text,marginBottom:16}}>O que queres fazer?</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <button onClick={()=>setStep(0)}
                  style={{display:'flex',gap:14,alignItems:'center',padding:'16px',borderRadius:12,border:'2px solid '+T.border,background:T.bg,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.background=T.accentLight;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.bg;}}>
                  <div style={{width:44,height:44,borderRadius:10,background:T.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>✚</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:500,color:T.text,marginBottom:3}}>Criar novo grupo</div>
                    <div style={{fontSize:12,color:T.muted}}>Cria um grupo de casal ou colaborativo</div>
                  </div>
                </button>
                <button onClick={()=>setStep(2)}
                  style={{display:'flex',gap:14,alignItems:'center',padding:'16px',borderRadius:12,border:'2px solid '+T.border,background:T.bg,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#5a8a5a';e.currentTarget.style.background='#5a8a5a11';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.bg;}}>
                  <div style={{width:44,height:44,borderRadius:10,background:'#5a8a5a22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🔗</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:500,color:T.text,marginBottom:3}}>Entrar num grupo</div>
                    <div style={{fontSize:12,color:T.muted}}>Tens um link ou codigo de convite</div>
                  </div>
                </button>
              </div>
            </div>
          )}
          {step===0&&(
            <div>
              <div style={{fontSize:14,color:T.text,marginBottom:16}}>Que tipo de grupo queres criar?</div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {Object.entries(GROUP_TYPES).map(([key,gt])=>(
                  <button key={key} onClick={()=>{setType(key);setPerms({...DEFAULT_PERMS[key]});setStep(1);}}
                    style={{display:'flex',gap:14,alignItems:'flex-start',padding:'16px',borderRadius:12,border:'2px solid '+T.border,background:T.bg,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=gt.color;e.currentTarget.style.background=gt.color+'11';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.bg;}}>
                    <div style={{width:44,height:44,borderRadius:10,background:gt.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{gt.icon}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:500,color:T.text,marginBottom:4}}>{gt.label}</div>
                      <div style={{fontSize:12,color:T.muted,lineHeight:1.5}}>{gt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step===2&&(
            <div>
              <div style={{fontSize:14,color:T.text,marginBottom:16}}>Cola o link ou codigo de convite</div>
              <EnterInviteCode T={T} onJoin={(grp)=>{onJoinGroup&&onJoinGroup(grp);onClose();}}/>
            </div>
          )}
          {step===1&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:GROUP_TYPES[type]?GROUP_TYPES[type].color+'11':T.accentLight,border:'1px solid '+(GROUP_TYPES[type]?GROUP_TYPES[type].color+'33':T.border),borderRadius:10}}>
                <span style={{fontSize:18}}>{GROUP_TYPES[type]?GROUP_TYPES[type].icon:''}</span>
                <span style={{fontSize:13,color:T.text,flex:1}}>{GROUP_TYPES[type]?GROUP_TYPES[type].label:''}</span>
                <button onClick={()=>setStep(0)} style={{fontSize:11,color:T.muted,background:'none',border:'1px solid '+T.border,borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit'}}>Alterar</button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:T.bg,borderRadius:10,border:'1px solid '+T.border}}>
                <div style={{width:36,height:36,borderRadius:10,background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{emoji}</div>
                <span style={{fontSize:14,color:T.text}}>{name||'Nome do grupo'}</span>
              </div>
              <div>
                <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Icone</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:7}}>{emojis.map(e=><button key={e} onClick={()=>setEmoji(e)} style={{width:34,height:34,borderRadius:8,border:'2px solid '+(emoji===e?color:'transparent'),background:emoji===e?color+'22':'transparent',fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{e}</button>)}</div>
              </div>
              <div>
                <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Cor</div>
                <div style={{display:'flex',gap:8}}>{colors.map(col=><button key={col} onClick={()=>setColor(col)} style={{width:26,height:26,borderRadius:'50%',background:col,border:'3px solid '+(color===col?T.text:'transparent'),cursor:'pointer',flexShrink:0}}/>)}</div>
              </div>
              <div>
                <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Nome</div>
                <input value={name} onChange={e=>setName(e.target.value)} style={inp} placeholder="Ex: Cozinha, Oracao, Desporto..."/>
              </div>
              {type==='colaborativo'&&(
                <div>
                  <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Permissoes dos membros</div>
                  <div style={{background:T.bg,border:'1px solid '+T.border,borderRadius:10,overflow:'hidden'}}>
                    {PLABELS.map(({k,l},i)=>(
                      <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',borderBottom:i<PLABELS.length-1?'1px solid '+T.border:'none'}}>
                        <span style={{fontSize:13,color:T.text}}>{l}</span>
                        <button onClick={()=>setPerms(p=>({...p,[k]:!p[k]}))} style={{width:34,height:18,borderRadius:9,background:perms[k]?T.accentDark:T.border,border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                          <div style={{position:'absolute',top:2,left:perms[k]?15:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:11,color:T.muted,marginTop:6}}>Admins tem sempre todas as permissoes.</div>
                </div>
              )}
              {type==='casal'&&(
                <div style={{padding:'12px 14px',background:'#fef3c7',border:'1px solid #fde68a',borderRadius:10,fontSize:12,color:'#92400e',lineHeight:1.6}}>
                  Neste grupo, todas as alteracoes vao aparecer como proposta. O outro membro tera de aprovar.
                </div>
              )}
            </div>
          )}
        </div>
        {(step===0||step===1||step===2)&&(
          <div style={{padding:'14px 24px',borderTop:'1px solid '+T.border,display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0}}>
            <button onClick={()=>step===2?setStep(-1):step===1?setStep(0):setStep(-1)} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>← Voltar</button>
            {step===1&&<button onClick={()=>name&&onSave({id:genId()+'',name,emoji,color,type,admins:['tu'],members:['tu'],perms,isDefault:false})} style={{padding:'9px 20px',background:color,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Criar grupo</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── BOT — hover to reveal, click to open ─────────────────────────────────────
function Bot({onAddEvent,onAddTask}){
  const T = G;
  const [open,setOpen]=useState(false);
  const [hovered,setHovered]=useState(false);
  const [input,setInput]=useState('');
  const [msgs,setMsgs]=useState([{id:1,from:'bot',text:'Olá! Sou o teu assistente.\n\nPosso criar eventos e tarefas.\n\nExemplos:\n— "marca jantar amanhã"\n— "adiciona tarefa: comprar pão"\n— "ajuda"'}]);
  const endRef=useRef(null);
  const timerRef=useRef(null);
  useEffect(()=>{if(open)endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,open]);

  const addMsg=(from,text)=>setMsgs(m=>[...m,{id:genId(),from,text}]);
  const process=text=>{
    const t=text.toLowerCase();
    if(t.includes('marca')||(t.includes('adiciona')&&t.includes('evento'))){
      const title=cleanTitle(text)||'Novo evento';
      const date=parseDate(t);
      onAddEvent({id:genId(),title,date,type:detectEventType(t),desc:''});
      return '✅ Evento criado!\n"'+title+'"';
    }
    if(t.includes('adiciona')||t.includes('comprar')||t.includes('não esquecer')||t.includes('tarefa')){
      const taskText=text.replace(/adiciona(r)?\s*(tarefa:?)?|não esquecer:?/gi,'').trim()||text;
      onAddTask({id:genId(),text:taskText,col:'A fazer',priority:'média',done:false});
      return '✅ Tarefa criada!\n"'+taskText+'"';
    }
    if(t.includes('ajuda')) return '📋 Comandos:\n— "marca jantar amanhã"\n— "marca consulta dia 15 de maio"\n— "adiciona tarefa: comprar pão"';
    return 'Não percebi.\nTenta "ajuda" para ver os comandos.';
  };
  const send=()=>{if(!input.trim())return;const text=input.trim();setInput('');addMsg('me',text);setTimeout(()=>addMsg('bot',process(text)),400);};

  const showHint=hovered&&!open;

  return(
    <div style={{position:'fixed',bottom:80,right:20,zIndex:2000,fontFamily:"'Georgia',serif"}}
      onMouseEnter={()=>{clearTimeout(timerRef.current);setHovered(true);}}
      onMouseLeave={()=>{timerRef.current=setTimeout(()=>setHovered(false),300);}}>
      {/* Chat panel */}
      {open&&(
        <div style={{position:'absolute',bottom:54,right:0,width:300,background:T.card,border:'1px solid '+T.border,borderRadius:16,boxShadow:'0 10px 50px rgba(30,24,16,0.22)',overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{padding:'12px 15px',background:T.accentDark,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div style={{fontSize:13,color:'#f5f0e8'}}>✦ Assistente</div>
            <button onClick={()=>setOpen(false)} style={{background:'rgba(245,240,232,0.1)',border:'none',borderRadius:6,width:24,height:24,cursor:'pointer',color:'#f5f0e8',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
          <div style={{height:240,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:9}}>
            {msgs.map(m=>(
              <div key={m.id} style={{display:'flex',flexDirection:m.from==='me'?'row-reverse':'row',gap:7,alignItems:'flex-end'}}>
                {m.from==='bot'&&<div style={{width:20,height:20,borderRadius:'50%',background:T.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0}}>✦</div>}
                <div style={{maxWidth:'84%',padding:'7px 10px',borderRadius:m.from==='me'?'11px 11px 3px 11px':'11px 11px 11px 3px',background:m.from==='me'?T.accentDark:T.bg,color:m.from==='me'?'#f5f0e8':T.text,fontSize:12,lineHeight:1.55,border:m.from==='me'?'none':'1px solid '+T.border,whiteSpace:'pre-line'}}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef}/>
          </div>
          <div style={{padding:'9px 11px',borderTop:'1px solid '+T.border,display:'flex',gap:7,flexShrink:0}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder="Escreve um comando..."
              style={{flex:1,border:'1px solid '+T.border,borderRadius:7,padding:'7px 10px',fontSize:12,outline:'none',fontFamily:'inherit',background:T.bg,color:T.text}}/>
            <button onClick={send} style={{padding:'7px 12px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>→</button>
          </div>
        </div>
      )}
      {/* Tooltip hint on hover */}
      {showHint&&(
        <div style={{position:'absolute',bottom:54,right:0,background:T.accentDark,color:'#f5f0e8',fontSize:12,padding:'7px 14px',borderRadius:10,whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(30,24,16,0.2)',pointerEvents:'none'}}>
          ✦ Assistente — clica para abrir
        </div>
      )}
      {/* Button */}
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:40,height:40,borderRadius:'50%',background:open?T.accentDark:T.accentDark,border:'none',cursor:'pointer',boxShadow:'0 3px 16px rgba(30,24,16,0.25)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.25s',opacity:hovered||open?1:0,pointerEvents:hovered||open?'auto':'none'}}>
        <span style={{color:'#f5f0e8',fontSize:16,lineHeight:1}}>{open?'×':'✦'}</span>
      </button>
    </div>
  );
}

// ── RESIZABLE WINDOW ──────────────────────────────────────────────────────────
function Window({id,title,icon,children,state,onUpdate,onClose,onFocus,zIndex}){
  const T = G;
  const {pos,size,minimized}=state;
  const dragging=useRef(false),resizing=useRef(null),startData=useRef({});
  const startDrag=useCallback(e=>{
    if(e.target.closest('.no-drag'))return;e.preventDefault();
    dragging.current=true;startData.current={mx:e.clientX,my:e.clientY,ox:pos.x,oy:pos.y};onFocus(id);
    const move=e=>{if(!dragging.current)return;onUpdate(id,{pos:{x:Math.max(0,startData.current.ox+(e.clientX-startData.current.mx)),y:Math.max(0,startData.current.oy+(e.clientY-startData.current.my))}});};
    const up=()=>{dragging.current=false;window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
    window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
  },[pos,id,onFocus,onUpdate]);
  const startResize=useCallback((e,dir)=>{
    e.preventDefault();e.stopPropagation();resizing.current=dir;
    startData.current={mx:e.clientX,my:e.clientY,ox:pos.x,oy:pos.y,ow:size.w,oh:size.h};onFocus(id);
    const move=e=>{if(!resizing.current)return;const dx=e.clientX-startData.current.mx,dy=e.clientY-startData.current.my;const d=resizing.current;let nx=startData.current.ox,ny=startData.current.oy,nw=startData.current.ow,nh=startData.current.oh;if(d.includes('e'))nw=Math.max(260,startData.current.ow+dx);if(d.includes('s'))nh=Math.max(180,startData.current.oh+dy);if(d.includes('w')){nw=Math.max(260,startData.current.ow-dx);nx=startData.current.ox+startData.current.ow-nw;}if(d.includes('n')){nh=Math.max(180,startData.current.oh-dy);ny=startData.current.oy+startData.current.oh-nh;}onUpdate(id,{pos:{x:nx,y:ny},size:{w:nw,h:nh}});};
    const up=()=>{resizing.current=null;window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
    window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
  },[pos,size,id,onFocus,onUpdate]);
  const RH=({dir,style})=><div onMouseDown={e=>startResize(e,dir)} className="no-drag" style={{position:'absolute',zIndex:10,...style}}/>;
  return(
    <div onMouseDown={()=>onFocus(id)} style={{position:'fixed',left:pos.x,top:pos.y,width:size.w,height:size.h,zIndex,background:T.card,border:'1px solid '+T.border,borderRadius:14,boxShadow:'0 8px 36px rgba(30,24,16,0.15)',overflow:'hidden',userSelect:'none',display:'flex',flexDirection:'column'}}>
      <RH dir="n"  style={{top:0,left:8,right:8,height:4,cursor:'n-resize'}}/>
      <RH dir="s"  style={{bottom:0,left:8,right:8,height:4,cursor:'s-resize'}}/>
      <RH dir="w"  style={{left:0,top:8,bottom:8,width:4,cursor:'w-resize'}}/>
      <RH dir="e"  style={{right:0,top:8,bottom:8,width:4,cursor:'e-resize'}}/>
      <RH dir="nw" style={{top:0,left:0,width:12,height:12,cursor:'nw-resize'}}/>
      <RH dir="ne" style={{top:0,right:0,width:12,height:12,cursor:'ne-resize'}}/>
      <RH dir="sw" style={{bottom:0,left:0,width:12,height:12,cursor:'sw-resize'}}/>
      <RH dir="se" style={{bottom:0,right:0,width:12,height:12,cursor:'se-resize'}}/>
      <div onMouseDown={startDrag} style={{height:38,background:T.sidebar,borderBottom:'1px solid '+T.border,display:'flex',alignItems:'center',padding:'0 12px',gap:10,cursor:'move',flexShrink:0}}>
        <div className="no-drag" style={{display:'flex',gap:6}}>
          <div onClick={()=>onClose(id)}                        style={{width:11,height:11,borderRadius:'50%',background:'#e06060',cursor:'pointer'}}/>
          <div onClick={()=>onUpdate(id,{minimized:true})}      style={{width:11,height:11,borderRadius:'50%',background:'#e0b040',cursor:'pointer'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:7,flex:1,justifyContent:'center',pointerEvents:'none'}}>
          <Icon name={icon} size={12} color={T.muted}/>
          <span style={{fontSize:11,color:T.muted,fontFamily:'inherit'}}>{title}</span>
        </div>
        <div style={{width:28}}/>
      </div>
      <div style={{flex:1,overflow:'auto'}}>{children}</div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

// ── SECTION & TOGGLE (module-level to avoid remount bug) ──────────────────────
function SectionUI({ title, children, T }) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:10,fontWeight:500,color:T.accentDark,textTransform:'uppercase',letterSpacing:1.5,marginBottom:10,paddingBottom:6,borderBottom:'1px solid '+T.border}}>{title}</div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>{children}</div>
    </div>
  );
}
function ToggleUI({ label, sub, value, onChange, T }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div><div style={{fontSize:13,color:T.text}}>{label}</div>{sub&&<div style={{fontSize:11,color:T.muted,marginTop:1}}>{sub}</div>}</div>
      <button onClick={()=>onChange(!value)} style={{width:36,height:20,borderRadius:10,background:value?T.accentDark:T.border,border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
        <div style={{position:'absolute',top:2,left:value?17:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
      </button>
    </div>
  );
}

// Global theme - updated by App when darkMode changes
let G = {bg:"#f2ece0",sidebar:"#e8dfd0",sidebarBorder:"#d8cebb",card:"#faf6ef",border:"#ddd5c4",text:"#1e1810",muted:"#9a8e7e",accent:"#7c6d52",accentDark:"#5c4f3a",accentLight:"#f0ead8",accentMid:"#c8b99a",success:"#5a8a5a",danger:"#c05a5a",warning:"#c09040"};

// ── EMOJI PICKER ──────────────────────────────────────────────────────────────
const EMOJI_GROUPS = {
  '😊':['😊','😂','❤️','🥰','😍','🤩','😎','🥳','😇','🙏','👍','🔥','✨','💯','🎉','🫶','💪','🤝','👏','🌹'],
  '🍕':['🍕','🍷','☕','🎂','🍰','🥂','🍾','🌮','🍜','🥗','🍣','🍫','🍦','🥐','🍳'],
  '🌍':['🌍','🏠','🏖️','⛰️','🌊','🌸','🌿','☀️','🌙','⭐','🎄','🌺','🍀','🦋','🐕'],
};
function EmojiPicker({ onPick, onClose }) {
  const [tab,setTab] = useState('😊');
  return (
    <div style={{position:'absolute',bottom:64,left:0,background:G.card,border:'1px solid '+G.border,borderRadius:14,padding:12,zIndex:200,boxShadow:'0 8px 30px rgba(0,0,0,0.3)',width:280}}>
      <div style={{display:'flex',gap:6,marginBottom:10,borderBottom:'1px solid '+G.border,paddingBottom:8}}>
        {Object.keys(EMOJI_GROUPS).map(k=><button key={k} onClick={()=>setTab(k)} style={{fontSize:18,background:tab===k?G.accentLight:'none',border:'none',borderRadius:6,padding:'3px 6px',cursor:'pointer'}}>{k}</button>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:2}}>
        {EMOJI_GROUPS[tab].map(e=>(
          <button key={e} onClick={()=>{onPick(e);onClose();}} style={{fontSize:18,background:'none',border:'none',borderRadius:6,padding:'3px',cursor:'pointer',lineHeight:1}}
            onMouseEnter={ev=>ev.currentTarget.style.background=G.accentLight}
            onMouseLeave={ev=>ev.currentTarget.style.background='none'}>{e}</button>
        ))}
      </div>
    </div>
  );
}

// ── SHOPPING LIST ─────────────────────────────────────────────────────────────
function ShoppingList({ note, onEdit }) {
  const [newItem,setNewItem] = useState('');
  const items = note.items||[];
  const add    = () => { if(!newItem.trim())return; onEdit({...note,items:[...items,{id:genId(),text:newItem.trim(),done:false}]}); setNewItem(''); };
  const toggle = id => onEdit({...note,items:items.map(i=>i.id===id?{...i,done:!i.done}:i)});
  const remove = id => onEdit({...note,items:items.filter(i=>i.id!==id)});
  return (
    <div>
      <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="+ Adicionar item..." style={{width:'100%',border:'none',borderBottom:'1px solid '+G.border,padding:'3px 0',fontSize:12,outline:'none',fontFamily:'inherit',background:'transparent',color:G.text,marginBottom:8}}/>
      {items.map(item=>(
        <div key={item.id} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
          <button onClick={()=>toggle(item.id)} style={{width:14,height:14,borderRadius:3,border:'1px solid '+(item.done?'#5a8a5a':'#ddd5c4'),background:item.done?'#5a8a5a':'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff'}}>{item.done?'✓':''}</button>
          <span style={{fontSize:12,color:item.done?G.muted:G.text,textDecoration:item.done?'line-through':'none',flex:1}}>{item.text}</span>
          <button onClick={()=>remove(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:G.muted,fontSize:13,padding:0}}>×</button>
        </div>
      ))}
      {items.length===0&&<div style={{fontSize:11,color:G.muted}}>Nenhum item ainda</div>}
      {items.filter(i=>i.done).length>0&&<button onClick={()=>onEdit({...note,items:items.filter(i=>!i.done)})} style={{fontSize:10,color:G.muted,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Limpar concluídos</button>}
    </div>
  );
}

// ── NOTE FORMATTING TOOLBAR ──────────────────────────────────────────────────
function FormatBar({ value, onChange, T }) {
  const wrap = (before, after='') => {
    const ta = document.activeElement;
    if (!ta || ta.tagName !== 'TEXTAREA') { onChange(value + before); return; }
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.slice(s, e);
    const newVal = value.slice(0,s) + before + sel + after + value.slice(e);
    onChange(newVal);
    setTimeout(()=>{ ta.focus(); ta.setSelectionRange(s+before.length, e+before.length); }, 0);
  };
  const btn = (label, title, fn) => (
    <button key={label} onClick={fn} title={title}
      style={{background:'none',border:'1px solid '+T.border,borderRadius:5,padding:'2px 7px',cursor:'pointer',fontSize:11,color:T.muted,fontFamily:'monospace',lineHeight:1.6}}
      onMouseEnter={e=>e.currentTarget.style.background=T.accentLight}
      onMouseLeave={e=>e.currentTarget.style.background='none'}>
      {label}
    </button>
  );
  return (
    <div style={{display:'flex',gap:4,marginBottom:6,flexWrap:'wrap'}}>
      {btn('B','Negrito',()=>wrap('**','**'))}
      {btn('I','Itálico',()=>wrap('_','_'))}
      {btn('—','Separador',()=>onChange(value+'\n---\n'))}
      {btn('• Lista',  'Item de lista', ()=>wrap('— '))}
      {btn('☐ Tarefa','Checkbox',       ()=>wrap('☐ '))}
    </div>
  );
}

function renderNote(text) {
  // Simple markdown-like rendering
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #ddd5c4;margin:6px 0"/>')
    .replace(/^(— |— )(.*)/gm, '<span style="display:block">• $2</span>')
    .replace(/^☐ (.*)/gm, '<span style="display:flex;gap:6px;align-items:center"><span style="width:14px;height:14px;border:1px solid #9a8e7e;borderRadius:3px;display:inline-block;flexShrink:0"></span>$1</span>')
    .replace(/^☑ (.*)/gm, '<span style="display:flex;gap:6px;align-items:center;text-decoration:line-through;opacity:0.6"><span style="width:14px;height:14px;border:1px solid #5a8a5a;background:#5a8a5a;borderRadius:3px;display:inline-flex;alignItems:center;justifyContent:center;color:#fff;fontSize:9px">✓</span>$1</span>');
}

// ── NOTES VIEW ────────────────────────────────────────────────────────────────
function NotesView({ notes, onAdd, onEdit, onDelete }) {
  const T = G;
  const [editId,setEditId]   = useState(null);
  const [sortBy,setSortBy]   = useState("pinned");
  const [editTitle,setET]    = useState('');
  const [editText,setETx]    = useState('');
  const [editPriv,setEP]     = useState(false);
  const [showNew,setShowNew] = useState(false);
  const [nTitle,setNTitle]   = useState('');
  const [nText,setNText]     = useState('');
  const [nPriv,setNPriv]     = useState(false);

  const startEdit = n => { setEditId(n.id); setET(n.title); setETx(n.text); setEP(n.private||false); };
  const saveEdit  = () => { const n=notes.find(x=>x.id===editId); if(n)onEdit({...n,title:editTitle,text:editText,private:editPriv}); setEditId(null); };
  const create    = () => { if(!nTitle.trim())return; onAdd({id:genId(),title:nTitle,text:nText,private:nPriv,pinned:false,items:[]}); setNTitle('');setNText('');setNPriv(false);setShowNew(false); };

  const taS = {border:'none',fontSize:13,color:T.text,background:'transparent',outline:'none',resize:'none',height:72,fontFamily:'inherit',lineHeight:1.6,width:'100%',boxSizing:'border-box'};
  const lockBtn = (active, onClick) => (
    <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:4,background:active?T.accentLight:'none',border:'1px solid '+T.border,borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:11,color:active?T.accentDark:T.muted,fontFamily:'inherit'}}>
      🔒 Privada
    </button>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'10px 18px',borderBottom:'1px solid '+T.border,display:'flex',alignItems:'center',gap:8,background:T.card,flexShrink:0}}>
        <span style={{fontSize:11,color:T.muted}}>{notes.length} notas · {notes.filter(n=>n.private).length} privadas</span>
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          <button onClick={()=>onAdd({id:genId(),title:'🛒 Lista de compras',text:'__shopping__',items:[],private:false,pinned:false})}
            style={{padding:'5px 12px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>🛒 Lista</button>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{fontSize:11,color:T.muted,background:T.bg,border:'1px solid '+T.border,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit'}}>
            <option value="pinned">Fixadas primeiro</option>
            <option value="az">A a Z</option>
            <option value="new">Mais recentes</option>
          </select>
          <button onClick={()=>{ var txt=notes.map(function(n){return "# "+n.title+"\n"+(n.text==="__shopping__"?(n.items||[]).map(function(i){return (i.done?"x":"o")+" "+i.text;}).join("\n"):n.text);}).join("\n\n---\n\n"); var blob=new Blob([txt],{type:"text/plain"}); var url=URL.createObjectURL(blob); var a=document.createElement("a");a.href=url;a.download="notas.txt";a.click(); }} style={{padding:'5px 10px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>⬇️</button>
          <button onClick={()=>setShowNew(true)}
            style={{padding:'5px 12px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>+ Nova nota</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:12,alignContent:'start'}}>
        {showNew&&(
          <div style={{background:T.card,border:'1.5px solid '+T.accent,borderRadius:12,padding:14,display:'flex',flexDirection:'column',gap:8}}>
            <input value={nTitle} onChange={e=>setNTitle(e.target.value)} placeholder="Título" style={{border:'none',borderBottom:'1px solid '+T.border,padding:'4px 0',fontSize:14,color:T.text,background:'transparent',outline:'none',fontFamily:'inherit',fontWeight:500}}/>
            <FormatBar value={nText} onChange={setNText} T={T}/>
            <textarea value={nText} onChange={e=>setNText(e.target.value)} placeholder="Conteúdo..." style={taS}/>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {lockBtn(nPriv, ()=>setNPriv(p=>!p))}
              <div style={{flex:1}}/>
              <button onClick={()=>setShowNew(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:T.muted,fontFamily:'inherit'}}>✕</button>
              <button onClick={create} style={{background:T.accentDark,border:'none',borderRadius:6,padding:'4px 12px',color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Criar</button>
            </div>
          </div>
        )}
        {[...notes].sort((a,b)=>sortBy==="pinned"?(b.pinned?1:0)-(a.pinned?1:0):sortBy==="az"?a.title.localeCompare(b.title):b.id-a.id).map(note=>(
          <div key={note.id} style={{background:T.card,border:'1px solid '+(note.private?'#c8b99a':T.border),borderRadius:12,padding:14,display:'flex',flexDirection:'column',gap:8,transition:'box-shadow 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 14px rgba(30,24,16,0.1)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
            {editId===note.id ? (
              <>
                <input value={editTitle} onChange={e=>setET(e.target.value)} style={{border:'none',borderBottom:'1px solid '+T.border,padding:'4px 0',fontSize:14,color:T.text,background:'transparent',outline:'none',fontFamily:'inherit',fontWeight:500}}/>
                <FormatBar value={editText} onChange={setETx} T={T}/>
                <textarea value={editText} onChange={e=>setETx(e.target.value)} style={taS}/>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  {lockBtn(editPriv, ()=>setEP(p=>!p))}
                  <div style={{flex:1}}/>
                  <button onClick={saveEdit} style={{background:T.accentDark,border:'none',borderRadius:5,padding:'3px 10px',color:'#f5f0e8',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Guardar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:13,fontWeight:500,color:T.text,flex:1}}>{note.title}</span>
                  {note.pinned&&<span style={{fontSize:11}}>📌</span>}
                  {note.private&&<span style={{fontSize:11}}>🔒</span>}
                </div>
                {note.text==='__shopping__'
                  ? <ShoppingList note={note} onEdit={onEdit}/>
                  : <div style={{fontSize:12,color:T.muted,lineHeight:1.6,flex:1}} dangerouslySetInnerHTML={{__html:renderNote(note.text).replace(/\n/g,'<br/>')}}/>
                }
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>startEdit(note)} style={{background:'none',border:'none',cursor:'pointer',padding:3,fontSize:12}}>✏️</button>
                  <button onClick={()=>onEdit({...note,pinned:!note.pinned})} style={{background:'none',border:'none',cursor:'pointer',padding:3,opacity:note.pinned?1:0.4}}>📌</button>
                  <button onClick={()=>onDelete(note.id)} style={{background:'none',border:'none',cursor:'pointer',padding:3,fontSize:12}}>🗑️</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DASHBOARD VIEW ────────────────────────────────────────────────────────────
function DashboardView({ events, tasks, msgs, notes, profile, proposals, groups, onApprove, onReject }) {
  const [detailProposal,setDetailProposal] = useState(null);
  const today       = new Date().toISOString().split('T')[0];
  const todayEvs    = events.filter(e=>e.date===today);
  const upcoming    = events.filter(e=>e.date>today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
  const pending     = tasks.filter(t=>t.col!=='Concluído'&&!t.private);
  const pinnedMsgs  = msgs.filter(m=>m.pinned);
  const pinnedNotes = notes.filter(n=>n.pinned);
  const hour        = new Date().getHours();
  const greeting    = hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite';
  const reminders   = events.filter(e=>{
    if(!e.date||e.reminder===undefined) return false;
    const diff = Math.ceil((new Date(e.date+'T12:00:00')-new Date())/86400000);
    return diff>=0 && diff<=e.reminder;
  });
  const myProposals = (proposals||[]).filter(p=>p.status==='pending');
  const T = G;
  const card = {background:T.card,border:'1px solid '+T.border,borderRadius:14,padding:18};
  return (
    <div style={{padding:24,overflowY:'auto',height:'100%',boxSizing:'border-box'}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:22,fontWeight:400,color:T.text,marginBottom:4}}>{greeting}, {profile.name||'Tu'} 👋</div>
        <div style={{fontSize:13,color:T.muted}}>{new Date().toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      {reminders.length>0&&(
        <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',gap:12}}>
          <span style={{fontSize:18}}>🔔</span>
          <div>
            <div style={{fontSize:13,fontWeight:500,color:'#92400e',marginBottom:4}}>Lembretes</div>
            {reminders.map(e=>{ const diff=Math.ceil((new Date(e.date+'T12:00:00')-new Date())/86400000); return <div key={e.id} style={{fontSize:12,color:'#92400e',marginBottom:2}}>{diff===0?'Hoje':'Em '+diff+' dia(s)'}: <strong>{e.title}</strong></div>; })}
          </div>
        </div>
      )}
      {myProposals.length>0&&(
        <div style={{background:T.accentLight,border:'1px solid '+T.border,borderRadius:12,padding:'12px 16px',marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:500,color:T.accentDark,marginBottom:10}}>📤 Propostas pendentes ({myProposals.length})</div>
          {myProposals.map(p=>{
            const grpName=(groups||[]).find(g=>g.id===p.groupId)?.name||p.groupId;
            const actionLabel=p.action==='add'?'Adicionar':p.action==='edit'?'Editar':'Eliminar';
            const typeLabel=p.type==='event'?'evento':'tarefa';
            const itemTitle=p.item?.title||p.item?.text||'—';
            return(
              <div key={p.id} style={{marginBottom:8,background:T.card,borderRadius:10,border:'1px solid '+T.border,overflow:'hidden'}}>
                {/* Summary row - always visible */}
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',cursor:'pointer'}} onClick={()=>setDetailProposal(detailProposal===p.id?null:p.id)}>
                  <div style={{width:32,height:32,borderRadius:8,background:T.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>
                    {p.type==='event'?'📅':'☑'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{actionLabel} {typeLabel}: <strong>{itemTitle}</strong></div>
                    <div style={{fontSize:11,color:T.muted}}>por {p.from} · {grpName}</div>
                  </div>
                  <span style={{fontSize:12,color:T.muted,flexShrink:0}}>{detailProposal===p.id?'▲':'▼'}</span>
                </div>
                {/* Detail panel - expandable */}
                {detailProposal===p.id&&(
                  <div style={{padding:'0 12px 12px',borderTop:'1px solid '+T.border}}>
                    {/* Detail panel: show what changed */}
                    <div style={{marginTop:10,marginBottom:10}}>
                      {p.action==='delete'?(
                        <div style={{background:'#c05a5a18',border:'1px solid #c05a5a44',borderRadius:8,padding:'10px 14px'}}>
                          <div style={{fontSize:11,color:T.danger,fontWeight:500,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>⚠️ A eliminar</div>
                          {p.type==='event'&&<>
                            <div style={{fontSize:13,color:T.text,marginBottom:2}}>{p.item?.title}</div>
                            {p.item?.date&&<div style={{fontSize:11,color:T.muted}}>{new Date(p.item.date+'T12:00:00').toLocaleDateString('pt-PT',{weekday:'long',day:'numeric',month:'long'})}</div>}
                          </>}
                          {p.type==='task'&&<div style={{fontSize:13,color:T.text}}>{p.item?.text}</div>}
                        </div>
                      ):(
                        <div style={{background:T.bg,border:'1px solid '+T.border,borderRadius:8,padding:'10px 14px'}}>
                          <div style={{fontSize:11,color:p.action==='add'?T.success:T.accent,fontWeight:500,marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>
                            {p.action==='add'?'✚ A adicionar':'✎ A editar'}
                          </div>
                          {p.type==='event'&&(()=>{
                            const orig = p.original;
                            const rows=[
                              {label:'Título',val:p.item?.title,old:orig?.title},
                              {label:'Data',val:p.item?.date,old:orig?.date},
                              {label:'Tipo',val:p.item?.type,old:orig?.type},
                              {label:'Descrição',val:p.item?.desc,old:orig?.desc},
                              {label:'Repetição',val:p.item?.recur&&p.item.recur!=='none'?p.item.recur:null,old:null},
                            ].filter(r=>r.val);
                            return rows.map(r=>(
                              <div key={r.label} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:6}}>
                                <span style={{fontSize:11,color:T.muted,minWidth:64,flexShrink:0}}>{r.label}</span>
                                <div style={{flex:1}}>
                                  {r.old&&r.old!==r.val&&<div style={{fontSize:11,color:T.muted,textDecoration:'line-through',marginBottom:1}}>{r.old}</div>}
                                  <div style={{fontSize:13,color:r.old&&r.old!==r.val?T.success:T.text,fontWeight:r.old&&r.old!==r.val?500:400}}>{r.val}</div>
                                </div>
                              </div>
                            ));
                          })()}
                          {p.type==='task'&&(()=>{
                            const orig = p.original;
                            const rows=[
                              {label:'Texto',val:p.item?.text,old:orig?.text},
                              {label:'Prioridade',val:p.item?.priority,old:orig?.priority},
                              {label:'Categoria',val:p.item?.cat,old:orig?.cat},
                              {label:'Data limite',val:p.item?.dueDate,old:orig?.dueDate},
                              {label:'Repetição',val:p.item?.recur&&p.item.recur!=='none'?p.item.recur:null,old:null},
                            ].filter(r=>r.val);
                            return rows.map(r=>(
                              <div key={r.label} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:6}}>
                                <span style={{fontSize:11,color:T.muted,minWidth:64,flexShrink:0}}>{r.label}</span>
                                <div style={{flex:1}}>
                                  {r.old&&r.old!==r.val&&<div style={{fontSize:11,color:T.muted,textDecoration:'line-through',marginBottom:1}}>{r.old}</div>}
                                  <div style={{fontSize:13,color:r.old&&r.old!==r.val?T.success:T.text,fontWeight:r.old&&r.old!==r.val?500:400}}>{r.val}</div>
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                      <button onClick={()=>{onReject(p.id);setDetailProposal(null);}} style={{padding:'6px 16px',background:'none',border:'1px solid '+T.danger,borderRadius:7,color:T.danger,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>✗ Rejeitar</button>
                      <button onClick={()=>{onApprove(p.id);setDetailProposal(null);}} style={{padding:'6px 16px',background:T.success,border:'none',borderRadius:7,color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>✓ Aprovar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div style={card}>
          <div style={{fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:12}}>Hoje</div>
          {todayEvs.length===0?<div style={{fontSize:13,color:T.muted}}>Nenhum evento hoje ☀️</div>:todayEvs.map(ev=>(
            <div key={ev.id} style={{display:'flex',gap:10,alignItems:'center',marginBottom:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:{birthday:'#c05a5a',date:'#7c6d52',holiday:'#5a8a5a',medical:'#4a7a8a',work:'#7a6a9a',other:'#8a7a6a'}[ev.type]||'#8a7a6a',flexShrink:0}}/>
              <span style={{fontSize:13,color:T.text}}>{ev.title}</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5}}>Tarefas</div>
            {pending.length>0&&<span style={{background:T.accentLight,color:T.accent,borderRadius:10,padding:'1px 8px',fontSize:10}}>{pending.length}</span>}
          </div>
          {pending.length===0?<div style={{fontSize:13,color:T.muted}}>Tudo em dia! ✅</div>:pending.slice(0,4).map(t=>(
            <div key={t.id} style={{display:'flex',gap:8,alignItems:'center',marginBottom:7}}>
              <div style={{width:6,height:6,borderRadius:2,background:{alta:'#c05a5a',média:'#c09040',baixa:'#5a8a5a'}[t.priority]||T.muted,flexShrink:0}}/>
              <span style={{fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.text}</span>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:12}}>Próximos eventos</div>
          {upcoming.length===0?<div style={{fontSize:13,color:T.muted}}>Sem eventos próximos</div>:upcoming.map(ev=>{
            const diff=Math.ceil((new Date(ev.date+'T12:00:00')-new Date())/86400000);
            return (
              <div key={ev.id} style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:{birthday:'#c05a5a',date:'#7c6d52',holiday:'#5a8a5a',medical:'#4a7a8a',work:'#7a6a9a',other:'#8a7a6a'}[ev.type]||'#8a7a6a',flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                  <div style={{fontSize:10,color:T.muted}}>{new Date(ev.date+'T12:00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'short'})}</div>
                </div>
                <div style={{flexShrink:0,textAlign:'right'}}>
                  <div style={{fontSize:16,fontWeight:300,color:diff<=3?T.danger:T.accent,lineHeight:1}}>{diff}</div>
                  <div style={{fontSize:9,color:T.muted}}>dias</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={card}>
          <div style={{fontSize:11,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:12}}>Fixados 📌</div>
          {pinnedNotes.map(n=>(
            <div key={n.id} style={{marginBottom:8}}>
              <div style={{fontSize:12,color:T.text,fontWeight:500}}>{n.title}</div>
              <div style={{fontSize:11,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.text==='__shopping__'?'🛒 Lista de compras':n.text.split('\n')[0]}</div>
            </div>
          ))}
          {pinnedMsgs.map(m=>(
            <div key={m.id} style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
              <span>💬</span>
              <span style={{fontSize:12,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.text.startsWith('__photo__')?'📷 Foto':m.text}</span>
            </div>
          ))}
          {pinnedNotes.length===0&&pinnedMsgs.length===0&&<div style={{fontSize:13,color:T.muted}}>Sem itens fixados</div>}
        </div>
      </div>
    </div>
  );
}

// ── SEARCH MODAL ──────────────────────────────────────────────────────────────
function SearchModal({ events, tasks, msgs, notes, onClose, onNav }) {
  const [q,setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(()=>{
    inputRef.current?.focus();
    const h = e => { if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const T = G;
  const lq = q.toLowerCase().trim();
  const results = lq.length<2 ? [] : [
    ...events.map(e=>({icon:'📅',label:e.title,sub:e.date,nav:'calendar'})),
    ...tasks.filter(t=>!t.private).map(t=>({icon:'☑',label:t.text,sub:t.col,nav:'tasks'})),
    ...msgs.filter(m=>!m.text.startsWith('__')).map(m=>({icon:'💬',label:m.text,sub:m.from+' · '+m.time,nav:'chat'})),
    ...notes.filter(n=>!n.private&&n.text!=='__shopping__').map(n=>({icon:'📝',label:n.title,sub:n.text.split('\n')[0],nav:'notes'})),
  ].filter(r=>r.label.toLowerCase().includes(lq)||r.sub?.toLowerCase().includes(lq));
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.4)',zIndex:5000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:80}}>
      <div onClick={e=>e.stopPropagation()} style={{width:540,background:T.card,border:'1px solid '+T.border,borderRadius:16,boxShadow:'0 20px 60px rgba(30,24,16,0.25)',overflow:'hidden',fontFamily:'inherit'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderBottom:'1px solid '+T.border}}>
          <span style={{fontSize:16}}>🔍</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar eventos, tarefas, mensagens, notas..." style={{flex:1,border:'none',outline:'none',fontSize:14,color:T.text,background:'transparent',fontFamily:'inherit'}}/>
          <span style={{fontSize:11,color:T.muted,background:T.bg,padding:'2px 7px',borderRadius:5}}>Esc</span>
        </div>
        <div style={{maxHeight:360,overflowY:'auto'}}>
          {q.length<2?<div style={{padding:20,textAlign:'center',fontSize:13,color:T.muted}}>Escreve pelo menos 2 caracteres</div>
          :results.length===0?<div style={{padding:20,textAlign:'center',fontSize:13,color:T.muted}}>Sem resultados para "{q}"</div>
          :results.map((r,i)=>(
            <div key={i} onClick={()=>{onNav(r.nav);onClose();}} style={{display:'flex',gap:12,padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid '+T.border}}
              onMouseEnter={e=>e.currentTarget.style.background=T.accentLight}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{fontSize:18,flexShrink:0}}>{r.icon}</span>
              <div><div style={{fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.label}</div><div style={{fontSize:11,color:T.muted}}>{r.sub}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SHORTCUTS MODAL ───────────────────────────────────────────────────────────
const DEFAULT_SHORTCUTS = [
  { id:'search',   label:'Pesquisa global',    key:'k', mod:'ctrl' },
  { id:'dash',     label:'Ir para Início',     key:'h', mod:'ctrl' },
  { id:'chat',     label:'Ir para Chat',       key:'c', mod:'ctrl' },
  { id:'tasks',    label:'Ir para Tarefas',    key:'t', mod:'ctrl' },
  { id:'notes',    label:'Ir para Notas',      key:'n', mod:'ctrl' },
  { id:'calendar', label:'Ir para Calendário', key:'d', mod:'ctrl' },
];
function ShortcutsModal({ shortcuts, onSave, onClose }) {
  const [sh,setSh] = useState(shortcuts);
  const [rec,setRec] = useState(null);
  const T = G;
  useEffect(()=>{
    if(!rec) return;
    const h = e => {
      if(e.key==='Escape'){setRec(null);return;}
      if(['Control','Shift','Alt','Meta'].includes(e.key)) return;
      e.preventDefault();
      setSh(prev=>prev.map(s=>s.id===rec?{...s,key:e.key.toLowerCase(),mod:e.ctrlKey?'ctrl':e.altKey?'alt':''}:s));
      setRec(null);
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[rec]);
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.5)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:16,padding:28,width:440,boxShadow:'0 16px 60px rgba(30,24,16,0.25)',fontFamily:'inherit'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:400,color:T.text}}>Atalhos de teclado</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:T.muted}}>×</button>
        </div>
        <div style={{fontSize:11,color:T.muted,marginBottom:16}}>Clica num atalho e prime a combinação desejada.</div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {sh.map(s=>(
            <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:rec===s.id?T.accentLight:T.bg,border:'1px solid '+(rec===s.id?T.accent:T.border),borderRadius:9}}>
              <span style={{fontSize:13,color:T.text}}>{s.label}</span>
              <button onClick={()=>setRec(rec===s.id?null:s.id)} style={{background:rec===s.id?T.accent:T.card,border:'1px solid '+(rec===s.id?T.accent:T.border),borderRadius:7,padding:'4px 12px',cursor:'pointer',fontFamily:'monospace',fontSize:12,color:rec===s.id?'#fff':T.text,minWidth:90,textAlign:'center'}}>
                {rec===s.id?'Prima...':(s.mod?s.mod+' + ':'')+s.key.toUpperCase()}
              </button>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={()=>setSh(DEFAULT_SHORTCUTS)} style={{padding:'8px 14px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Repor padrão</button>
          <button onClick={onClose} style={{padding:'8px 14px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={()=>onSave(sh)} style={{padding:'8px 18px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── SEND TO GROUP MODAL ───────────────────────────────────────────────────────
function SendToGroupModal({ item, type, groups, onSend, onClose }) {
  const [target,setTarget] = useState(groups[0]?.id||'');
  const [msg,setMsg] = useState('');
  const T = G;
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.5)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:16,padding:28,width:380,boxShadow:'0 16px 60px rgba(30,24,16,0.25)',fontFamily:'inherit'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:400,color:T.text}}>Propor ao grupo</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:T.muted}}>×</button>
        </div>
        <div style={{background:T.accentLight,border:'1px solid '+T.border,borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:13,color:T.accentDark}}>{type==='task'?'☑':'📝'} {item.text||item.title}</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Enviar para</div>
          <div style={{display:'flex',gap:8}}>
            {groups.map(gr=>(
              <button key={gr.id} onClick={()=>setTarget(gr.id)} style={{flex:1,padding:'8px 4px',borderRadius:8,border:'1px solid '+(target===gr.id?T.accent:T.border),background:target===gr.id?T.accentLight:'transparent',fontSize:13,cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <span style={{fontSize:18}}>{gr.emoji}</span><span style={{fontSize:11,color:target===gr.id?T.accentDark:T.muted}}>{gr.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Mensagem (opcional)</div>
          <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Explica porquê..." style={{width:'100%',boxSizing:'border-box',border:'1px solid '+T.border,borderRadius:7,padding:'9px 12px',fontSize:13,color:T.text,background:T.bg,outline:'none',fontFamily:'inherit',resize:'none',height:70}}/>
        </div>
        <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:9,padding:'10px 14px',marginBottom:20,fontSize:12,color:'#92400e',lineHeight:1.5}}>
          💡 O parceiro irá receber e terá de aprovar antes de ficar visível no grupo.
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={()=>onSend(target,msg)} style={{padding:'9px 20px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Propor →</button>
        </div>
      </div>
    </div>
  );
}


// ── ONBOARDING ────────────────────────────────────────────────────────────────
function OnboardingModal({ onClose, T }) {
  const [step,setStep] = useState(0);
  const steps = [
    { icon:'❤️', title:'Bem-vindo ao CasalApp', desc:'O vosso espaço privado para se organizarem juntos. Só vocês têm acesso.' },
    { icon:'👥', title:'Grupos', desc:'Usem o rail à esquerda para navegar entre grupos. Cada grupo tem o seu chat, tarefas, notas e calendário separados.' },
    { icon:'📤', title:'Propor ao grupo', desc:'Nas tarefas e notas, usem o botão 📤 para propor algo ao parceiro. Ele precisa de aprovar antes de aparecer no grupo.' },
    { icon:'🔒', title:'Conteúdo privado', desc:'Podem criar tarefas e notas privadas (🔒) que só vocês vêem — o parceiro não tem acesso.' },
    { icon:'🔍', title:'Atalhos', desc:'Usem Ctrl+K para pesquisar, e ⌨️ no topo para personalizar todos os atalhos de teclado.' },
  ];
  const s = steps[step];
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:6000,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Georgia',serif"}}>
      <div style={{background:T.card,border:'1px solid '+T.border,borderRadius:20,padding:36,width:420,boxShadow:'0 24px 80px rgba(0,0,0,0.3)',textAlign:'center',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'none',border:'none',cursor:'pointer',fontSize:18,color:T.muted,lineHeight:1}}>×</button>
        <div style={{fontSize:52,marginBottom:16}}>{s.icon}</div>
        <div style={{fontSize:18,fontWeight:400,color:T.text,marginBottom:12}}>{s.title}</div>
        <div style={{fontSize:14,color:T.muted,lineHeight:1.7,marginBottom:28}}>{s.desc}</div>
        {/* Steps dots */}
        <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:24}}>
          {steps.map((_,i)=>(
            <div key={i} style={{width:i===step?20:8,height:8,borderRadius:4,background:i===step?T.accent:T.border,transition:'all 0.3s',cursor:'pointer'}} onClick={()=>setStep(i)}/>
          ))}
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{padding:'10px 20px',background:'none',border:'1px solid '+T.border,borderRadius:9,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>← Anterior</button>}
          {step<steps.length-1
            ?<button onClick={()=>setStep(s=>s+1)} style={{padding:'10px 24px',background:T.accentDark,border:'none',borderRadius:9,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Próximo →</button>
            :<button onClick={onClose} style={{padding:'10px 24px',background:T.accentDark,border:'none',borderRadius:9,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Começar ✓</button>
          }
        </div>
      </div>
    </div>
  );
}

export default function App({ user, onLogout }) {
  // ── STATE ────────────────────────────────────────────────────────────────────
  const [tab,setTab]            = useState('dashboard');
  const [mode,setMode]          = useState('tabs');
  const [openWins,setOpenWins]  = useState(['dashboard']);
  const [winStates,setWinStates]= useState(INIT_WINS);
  const [groups,setGroups]      = useState(INIT_GROUPS);
  const [activeGroup,setAG]     = useState('casal');
  const [events,setEvents]      = useState(INIT_EVENTS);
  const [tasks,setTasks]        = useState(INIT_TASKS);
  const [msgs,setMsgs]          = useState(INIT_MSGS);
  const [notes,setNotes]        = useState(INIT_NOTES);
  const [reactions,setReact]    = useState({});
  const [proposals,setProps]    = useState([]);
  const [taskCats,setTaskCats]  = useState({casal:['pessoal','casa','trabalho'],cozinha:['receitas','compras'],oracao:[]});
  const [profile,setProfile]    = useState({name:user?.email?.split('@')[0]||'Tu',photo:null,notif:true});
  const [darkMode,setDarkMode]  = useState(false);
  const [searchOpen,setSearch]  = useState(false);
  const [shortcutsModal,setSM]  = useState(false);
  const [shortcuts,setShortcuts]= useState(DEFAULT_SHORTCUTS);
  const [accountModal,setAM]    = useState(false);
  const [groupModal,setGM]      = useState(null);
  const [newGroupModal,setNGM]  = useState(false);
  const [sendModal,setSendM]    = useState(null);
  const [archiveOpen,setArch]   = useState(false);
  const [onboarding,setOnboard] = useState(false);
  const [dbReady,setDbReady]    = useState(false);
  const maxZ = useRef(12);

  // ── LOAD FROM SUPABASE ───────────────────────────────────────────────────────
  // ── LOCAL STORAGE HELPERS ─────────────────────────────────────────────────
  const lsKey  = (k) => 'casal_' + user.id + '_' + k;
  const lsSave = (k,v) => { try{ localStorage.setItem(lsKey(k), JSON.stringify(v)); }catch(e){} };
  const lsLoad = (k,d) => { try{ const v=localStorage.getItem(lsKey(k)); return v?JSON.parse(v):d; }catch(e){ return d; } };

  useEffect(()=>{
    if(!user) return;
    const uid = user.id;

    // ── STEP 1: load localStorage instantly so page never looks empty ─────────
    const lsEvents = lsLoad('events', null);
    const lsTasks  = lsLoad('tasks',  null);
    const lsNotes  = lsLoad('notes',  null);
    const lsMsgs   = lsLoad('msgs',   null);
    const lsGroups = lsLoad('groups', null);
    const lsCats   = lsLoad('cats',   null);
    if(lsEvents) setEvents(lsEvents);
    if(lsTasks)  setTasks(lsTasks);
    if(lsNotes)  setNotes(lsNotes);
    if(lsMsgs)   setMsgs(lsMsgs);
    if(lsGroups) setGroups(lsGroups);
    if(lsCats)   setTaskCats(lsCats);

    // ── STEP 2: sync everything from Supabase ─────────────────────────────────
    const sync = async () => {
      try {
        // Profile
        const { data: prof, error: profErr } = await supabase.from('profiles').select('*').eq('id',uid).single();
        if(profErr && profErr.code !== 'PGRST116') console.error('Profile load:', profErr);
        if(prof){ setProfile(p=>({...p,name:prof.name||p.name,photo:prof.photo||null})); }
        else {
          setOnboard(true);
          const {error:pe} = await supabase.from('profiles').insert({id:uid,email:user.email,name:user.email.split('@')[0]});
          if(pe) console.error('Profile create:', pe);
        }

        // Events
        const { data: evts, error: evtErr } = await supabase.from('events').select('id,group_id,data').eq('user_id',uid);
        if(evtErr) console.error('Events load:', evtErr);
        else if(evts?.length){
          const g={}; evts.forEach(e=>{ if(!g[e.group_id])g[e.group_id]=[]; g[e.group_id].push({...e.data,id:e.id}); });
          setEvents(g); lsSave('events',g);
        }

        // Tasks
        const { data: tks, error: tkErr } = await supabase.from('tasks').select('id,group_id,data').eq('user_id',uid);
        if(tkErr) console.error('Tasks load:', tkErr);
        else if(tks?.length){
          const g={}; tks.forEach(t=>{ if(!g[t.group_id])g[t.group_id]=[]; g[t.group_id].push({...t.data,id:t.id}); });
          setTasks(g); lsSave('tasks',g);
        }

        // Notes
        const { data: ns, error: nsErr } = await supabase.from('notes').select('id,group_id,data').eq('user_id',uid);
        if(nsErr) console.error('Notes load:', nsErr);
        else if(ns?.length){
          const g={}; ns.forEach(n=>{ if(!g[n.group_id])g[n.group_id]=[]; g[n.group_id].push({...n.data,id:n.id}); });
          setNotes(g); lsSave('notes',g);
        }

        // Messages (real-time chat between users)
        const { data: ms, error: msErr } = await supabase.from('messages').select('*').order('created_at',{ascending:true}).limit(200);
        if(msErr) console.error('Messages load:', msErr);
        else if(ms?.length){
          const g={}; ms.forEach(m=>{
            if(!g[m.group_id])g[m.group_id]=[];
            const d=m.data||{};
            g[m.group_id].push({...d,id:m.id,from:m.user_id===uid?'me':m.sender_name||'outro',time:new Date(m.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}),_date:m.created_at.split('T')[0]});
          });
          setMsgs(g); lsSave('msgs',g);
        }

        // Proposals (shared between group members)
        const { data: props, error: prErr } = await supabase.from('proposals').select('*').order('created_at',{ascending:false}).limit(100);
        if(prErr) console.error('Proposals load:', prErr);
        else if(props?.length){
          const mapped = props.map(p=>({id:p.id,type:p.type,action:p.action_type,item:p.item,original:p.original,groupId:p.group_id,from:p.from_name||'Parceiro',status:p.status,createdAt:p.created_at}));
          setProps(mapped);
          lsSave('proposals', mapped);
        }

        // Group members from user_groups - update groups with real member lists
        const { data: allMembers } = await supabase.from('user_groups').select('user_id,group_id,group_name,group_emoji,group_color,group_type,group_admins,group_perms');
        if(allMembers?.length){
          setGroups(prevGroups => {
            const updated = [...prevGroups];
            allMembers.forEach(m => {
              const idx = updated.findIndex(g => g.id === m.group_id);
              if(idx >= 0){
                const existing = updated[idx];
                const members = existing.members||[];
                if(!members.includes(m.user_id)){
                  updated[idx] = {...existing, members:[...members, m.user_id]};
                }
              } else {
                // Group exists for another member but not locally - add it
                const admins = m.group_admins||[];
                updated.push({
                  id: m.group_id,
                  name: m.group_name||'Grupo',
                  emoji: m.group_emoji||'👥',
                  color: m.group_color||'#7c6d52',
                  type: m.group_type||'colaborativo',
                  admins: Array.isArray(admins)?admins:[],
                  members: [m.user_id],
                  perms: m.group_perms||{},
                });
              }
            });
            lsSave('groups', updated);
            return updated;
          });
        }

      } catch(e){ console.error('Supabase sync failed:', e); }
      setDbReady(true);
    };
    sync();
  },[user]);

  // ── REAL-TIME MESSAGES ────────────────────────────────────────────────────
  useEffect(()=>{
    if(!user||!dbReady) return;
    const ch = supabase.channel('messages')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{
        const m=payload.new;
        if(m.user_id===user.id) return; // already added optimistically
        const d=m.data||m; const msg={...d,id:m.id,from:m.sender_name||'outro',time:new Date(m.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}),_date:m.created_at.split('T')[0],pinned:false};
        setMsgs(ms=>({...ms,[m.group_id]:[...(ms[m.group_id]||[]),msg]}));
      }).subscribe();
    return ()=>supabase.removeChannel(ch);
  },[user,dbReady]);

  // ── REALTIME PROPOSALS ───────────────────────────────────────────────────
  useEffect(()=>{
    if(!user||!dbReady) return;
    const ch = supabase.channel('proposals_rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'proposals'},p=>{
        if(p.new.from_user_id===user.id) return;
        const pr={id:p.new.id,type:p.new.type,action:p.new.action_type,item:p.new.item,original:p.new.original,groupId:p.new.group_id,from:p.new.from_name||'Parceiro',status:p.new.status,createdAt:p.new.created_at};
        setProps(prev=>{const u=[...prev.filter(x=>x.id!==p.new.id),pr];lsSave('proposals',u);return u;});
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'proposals'},p=>{
        setProps(prev=>{const u=prev.map(x=>x.id===p.new.id?{...x,status:p.new.status}:x);lsSave('proposals',u);return u;});
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[user,dbReady]);

  // ── PERSIST TO LOCALSTORAGE ──────────────────────────────────────────────
  useEffect(()=>{ if(dbReady) lsSave('events',events); },[events,dbReady]);
  useEffect(()=>{ if(dbReady) lsSave('tasks',tasks); },[tasks,dbReady]);
  useEffect(()=>{ if(dbReady) lsSave('notes',notes); },[notes,dbReady]);
  useEffect(()=>{ if(dbReady) lsSave('groups',groups); },[groups,dbReady]);
  useEffect(()=>{ if(dbReady) lsSave('cats',taskCats); },[taskCats,dbReady]);

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────
  useEffect(()=>{
    const h=e=>{
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      const pressed=(e.ctrlKey?'ctrl+':e.altKey?'alt+':'')+e.key.toLowerCase();
      const match=shortcuts.find(s=>(s.mod?s.mod+'+':'')+s.key===pressed);
      if(!match) return;
      e.preventDefault();
      if(match.id==='search')        setSearch(o=>!o);
      else if(match.id==='dash')     setTab('dashboard');
      else if(match.id==='chat')     setTab('chat');
      else if(match.id==='tasks')    setTab('tasks');
      else if(match.id==='notes')    setTab('notes');
      else if(match.id==='calendar') setTab('calendar');
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[shortcuts]);

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const focusWin  = useCallback(id=>{maxZ.current++;setWinStates(ws=>({...ws,[id]:{...ws[id],z:maxZ.current}}));},[]);
  const updateWin = useCallback((id,p)=>setWinStates(ws=>({...ws,[id]:{...ws[id],...p}})),[]);
  const closeWin  = useCallback(id=>setOpenWins(o=>o.filter(x=>x!==id)),[]);
  const openWin   = id=>{if(!openWins.includes(id))setOpenWins(o=>[...o,id]);setWinStates(ws=>({...ws,[id]:{...ws[id],minimized:false}}));focusWin(id);};
  const switchMode= m=>{if(m==='windows'&&mode==='tabs'){setOpenWins([tab]);setWinStates(ws=>({...ws,[tab]:{...ws[tab],minimized:false}}));}setMode(m);};

  const g          = activeGroup;
  const isAdmin    = (grp)=>(grp?.admins||['tu']).includes('tu');
  const hasPerm    = (perm)=>{ const grp=groups.find(x=>x.id===g); if(!grp||isAdmin(grp)) return true; return grp.perms?.[perm]!==false; };
  const isCasalGrp = ()=>groups.find(x=>x.id===g)?.type==='casal';
  const proposeAction = (type,item,action)=>{
    const original = action==='edit'?(type==='event'?(events[g]||[]).find(x=>x.id===item.id):(tasks[g]||[]).find(x=>x.id===item.id)):null;
    const pid = genId();
    const proposal = {id:pid,type,item,action,original,groupId:g,from:profile.name||'Tu',status:'pending',createdAt:new Date().toISOString()};
    setProps(p=>{const u=[...p,proposal];lsSave('proposals',u);return u;});
    // Save to Supabase so other user sees it
    supabase.from('proposals').insert({
      id:pid, group_id:g, type, action_type:action,
      item, original, from_name:profile.name||'Tu',
      from_user_id:user.id, status:'pending'
    }).then(r=>r.error&&console.error('save proposal:',r.error));
  };

  // ── MUTATIONS (with Supabase sync) ────────────────────────────────────────
  const saveEventsLS = (upd) => lsSave('events', upd);
  const saveTasksLS  = (upd) => lsSave('tasks',  upd);
  const saveNotesLS  = (upd) => lsSave('notes',  upd);

  const addEvent    = ev=>{ if(!hasPerm('addEvent')) return; if(isCasalGrp()){proposeAction('event',ev,'add');return;} setEvents(e=>{const u={...e,[g]:[...(e[g]||[]).filter(x=>x.id!==ev.id),ev]};saveEventsLS(u);return u;}); supabase.from('events').upsert({id:ev.id,user_id:user.id,group_id:g,data:ev}).then(r=>r.error&&console.error('save event:',r.error)); };
  const editEvent   = ev=>{ if(!hasPerm('editEvent')) return; if(isCasalGrp()){proposeAction('event',ev,'edit');return;} setEvents(e=>{const u={...e,[g]:(e[g]||[]).map(x=>x.id===ev.id?ev:x)};saveEventsLS(u);return u;}); supabase.from('events').update({data:ev}).eq('id',ev.id).then(r=>r.error&&console.error('edit event:',r.error)); };
  const deleteEvent = id=>{ if(!hasPerm('deleteEvent')) return; if(isCasalGrp()){proposeAction('event',{id},'delete');return;} setEvents(e=>{const u={...e,[g]:(e[g]||[]).filter(x=>x.id!==id)};saveEventsLS(u);return u;}); supabase.from('events').delete().eq('id',id).then(r=>r.error&&console.error('del event:',r.error)); };
  const addTask     = t =>{ if(!hasPerm('addTask')) return; if(isCasalGrp()&&!t.priv){proposeAction('task',t,'add');return;} setTasks(e=>{const u={...e,[g]:[...(e[g]||[]),t]};saveTasksLS(u);return u;}); supabase.from('tasks').insert({id:t.id,user_id:user.id,group_id:g,data:t}).then(r=>r.error&&console.error('save task:',r.error)); };
  const editTask    = t =>{ setTasks(e=>{const u={...e,[g]:(e[g]||[]).map(x=>x.id===t.id?t:x)};saveTasksLS(u);return u;}); supabase.from('tasks').update({data:t}).eq('id',t.id).then(r=>r.error&&console.error('edit task:',r.error)); };
  const deleteTask  = id=>{ setTasks(e=>{const u={...e,[g]:(e[g]||[]).filter(x=>x.id!==id)};saveTasksLS(u);return u;}); supabase.from('tasks').delete().eq('id',id).then(r=>r.error&&console.error('del task:',r.error)); };
  const moveTask    = (id,col)=>setTasks(e=>{ /* ls save handled by editTask equiv */
    const task=(e[g]||[]).find(t=>t.id===id);
    const updated=(e[g]||[]).map(t=>t.id===id?{...t,col,done:col==='Concluído'}:t);
    supabase.from('tasks').update({col,done:col==='Concluído'}).eq('id',id).then(()=>{});
    if(col==='Concluído'&&task?.recur&&task.recur!=='none'){
      const d=task.dueDate?new Date(task.dueDate+'T12:00:00'):null;
      if(d){if(task.recur==='daily')d.setDate(d.getDate()+1);else if(task.recur==='weekly')d.setDate(d.getDate()+7);else d.setMonth(d.getMonth()+1);}
      const nt={...task,id:genId(),done:false,col:'A fazer',dueDate:d?d.toISOString().split('T')[0]:task.dueDate};
      supabase.from('tasks').insert({...nt,user_id:user.id,group_id:g}).then(()=>{});
      return {...e,[g]:[...updated,nt]};
    }
    return {...e,[g]:updated};
  });
  const sendMsg     = async (text,replyTo=null)=>{
    const now=new Date();
    const time=now.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
    const _date=now.toISOString().split('T')[0];
    const msg={id:genId(),from:'me',text,time,_date,pinned:false,replyTo:replyTo?{id:replyTo.id,text:replyTo.text}:null};
    setMsgs(m=>({...m,[g]:[...(m[g]||[]),msg]}));
    await supabase.from('messages').insert({user_id:user.id,group_id:g,sender_name:profile.name||'Tu',data:{...msg,from:undefined}});
  };
  const pinMsg      = id=>setMsgs(m=>({...m,[g]:(m[g]||[]).map(x=>x.id===id?{...x,pinned:!x.pinned}:x)}));
  const addReaction = (mid,emoji)=>setReact(r=>({...r,[mid]:{...(r[mid]||{}),[emoji]:(r[mid]?.[emoji]||0)+1}}));
  const addNote     = n =>{ setNotes(ns=>{const u={...ns,[g]:[...(ns[g]||[]),n]};saveNotesLS(u);return u;}); supabase.from('notes').insert({id:n.id,user_id:user.id,group_id:g,data:n}).then(r=>r.error&&console.error('save note:',r.error)); };
  const editNote    = n =>{ setNotes(ns=>{const u={...ns,[g]:(ns[g]||[]).map(x=>x.id===n.id?n:x)};saveNotesLS(u);return u;}); supabase.from('notes').update({data:n}).eq('id',n.id).then(r=>r.error&&console.error('edit note:',r.error)); };
  const deleteNote  = id=>{ setNotes(ns=>{const u={...ns,[g]:(ns[g]||[]).filter(x=>x.id!==id)};saveNotesLS(u);return u;}); supabase.from('notes').delete().eq('id',id).then(r=>r.error&&console.error('del note:',r.error)); };
  const joinGroup   = grp=>{ setGroups(gs=>{if(gs.find(x=>x.id===grp.id))return gs;const u=[...gs,grp];lsSave('groups',u);return u;}); setEvents(e=>({...e,[grp.id]:e[grp.id]||[]})); setTasks(t=>({...t,[grp.id]:t[grp.id]||[]})); setMsgs(m=>({...m,[grp.id]:m[grp.id]||[]})); setNotes(n=>({...n,[grp.id]:n[grp.id]||[]})); setTaskCats(tc=>({...tc,[grp.id]:tc[grp.id]||[]})); setAG(grp.id); };
  const addGroup    = grp=>{setGroups(gs=>{const u=[...gs,grp];lsSave('groups',u);return u;});setEvents(e=>({...e,[grp.id]:[]}));setTasks(t=>({...t,[grp.id]:[]}));setMsgs(m=>({...m,[grp.id]:[]}));setNotes(n=>({...n,[grp.id]:[]}));setTaskCats(tc=>({...tc,[grp.id]:[]}));setNGM(false);setAG(grp.id);};
  const approveProposal = id=>{
    const p=proposals.find(x=>x.id===id);
    if(p){
      if(p.type==='task'&&p.action==='add'){const nt={...p.item,id:genId()};setTasks(e=>{const u={...e,[p.groupId]:[...(e[p.groupId]||[]),nt]};lsSave('tasks',u);return u;});supabase.from('tasks').insert({id:nt.id,user_id:user.id,group_id:p.groupId,data:nt}).then(r=>r.error&&console.error('approve task:',r.error));}
      if(p.type==='event'&&p.action==='add'){setEvents(e=>{const u={...e,[p.groupId]:[...(e[p.groupId]||[]).filter(x=>x.id!==p.item.id),p.item]};lsSave('events',u);return u;});supabase.from('events').upsert({id:p.item.id,user_id:user.id,group_id:p.groupId,data:p.item}).then(r=>r.error&&console.error('approve event:',r.error));}
      if(p.type==='event'&&p.action==='edit'){setEvents(e=>{const u={...e,[p.groupId]:(e[p.groupId]||[]).map(x=>x.id===p.item.id?p.item:x)};lsSave('events',u);return u;});supabase.from('events').update({data:p.item}).eq('id',p.item.id).then(r=>r.error&&console.error('approve edit:',r.error));}
      if(p.type==='event'&&p.action==='delete'){setEvents(e=>{const u={...e,[p.groupId]:(e[p.groupId]||[]).filter(x=>x.id!==p.item.id)};lsSave('events',u);return u;});supabase.from('events').delete().eq('id',p.item.id).then(r=>r.error&&console.error('approve del:',r.error));}
    }
    setProps(ps=>{const u=ps.map(x=>x.id===id?{...x,status:'approved'}:x);lsSave('proposals',u);return u;});
    supabase.from('proposals').update({status:'approved'}).eq('id',id).then(r=>r.error&&console.error('approve:',r.error));
  };
  const rejectProposal = id=>{
    setProps(ps=>{const u=ps.map(x=>x.id===id?{...x,status:'rejected'}:x);lsSave('proposals',u);return u;});
    supabase.from('proposals').update({status:'rejected'}).eq('id',id).then(r=>r.error&&console.error('reject:',r.error));
  };
  const saveProfile    = async p=>{ setProfile(p); await supabase.from('profiles').update({name:p.name,photo:p.photo}).eq('id',user.id); setAM(false); };
  const handleLogout   = async ()=>{ await supabase.auth.signOut(); onLogout(); };

  // ── COMPUTED ──────────────────────────────────────────────────────────────
  const pending    = (tasks[g]||[]).filter(t=>t.col!=='Concluído').length;
  const minWins    = openWins.filter(id=>winStates[id]?.minimized);
  const visWins    = openWins.filter(id=>!winStates[id]?.minimized);
  const curGroup   = groups.find(gr=>gr.id===g)||groups[0];
  const LIGHT      = {bg:"#f2ece0",sidebar:"#e8dfd0",sidebarBorder:"#d8cebb",card:"#faf6ef",border:"#ddd5c4",text:"#1e1810",muted:"#9a8e7e",accent:"#7c6d52",accentDark:"#5c4f3a",accentLight:"#f0ead8",accentMid:"#c8b99a",success:"#5a8a5a",danger:"#c05a5a",warning:"#c09040"};
  const T          = darkMode ? DK : LIGHT;
  G = T;

  const renderTab = id => {
    if(id==='dashboard') return <DashboardView events={events[g]||[]} tasks={tasks[g]||[]} msgs={msgs[g]||[]} notes={notes[g]||[]} profile={profile} proposals={proposals} groups={groups} onNav={setTab} onApprove={approveProposal} onReject={rejectProposal}/>;
    if(id==='chat')      return <ChatView messages={msgs[g]||[]} onSend={sendMsg} groupColor={curGroup?.color} onReact={addReaction} reactions={reactions} onPin={pinMsg}/>;
    if(id==='tasks')     return <KanbanView tasks={tasks[g]||[]} onAddTask={addTask} onEditTask={editTask} onDeleteTask={deleteTask} onMoveTask={moveTask} onSendToGroup={item=>setSendM({item,type:'task'})} cats={taskCats[g]||[]} onAddCat={name=>setTaskCats(prev=>{const u={...prev,[g]:[...(prev[g]||[]),name]};lsSave('cats',u);return u;})} onRemoveCat={name=>setTaskCats(prev=>{const u={...prev,[g]:(prev[g]||[]).filter(c=>c!==name)};lsSave('cats',u);return u;})}/>;
    if(id==='notes')     return <NotesView notes={notes[g]||[]} onAdd={addNote} onEdit={editNote} onDelete={deleteNote}/>;
    if(id==='calendar')  return <CalendarView events={events[g]||[]} onAddEvent={addEvent} onEditEvent={editEvent} onDeleteEvent={deleteEvent}/>;
    return null;
  };

  const exportData = ()=>{
    const data=JSON.stringify({events:events[g],tasks:tasks[g],notes:notes[g]},null,2);
    const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='casalapp-export.json';a.click();
  };

  return(
    <div style={{display:'flex',height:'100vh',fontFamily:"'Georgia','Times New Roman',serif",background:T.bg,overflow:'hidden'}}>

      {/* GROUP RAIL */}
      <div style={{width:58,background:'#1e1810',display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0',gap:5,flexShrink:0,zIndex:2}}>
        {/* Group rail - casal then colaborativo, each with a section label */}
        {['casal','colaborativo'].map(type=>{
          const grpsOfType = groups.filter(gr=>gr.type===type);
          if(!grpsOfType.length) return null;
          const typeColor = type==='casal'?'#e07070':'#70a870';
          const typeLabel = type==='casal'?'❤️':'👥';
          return (
            <React.Fragment key={type}>
              {/* Section divider + label */}
              {type==='colaborativo'&&<div style={{width:36,height:1,background:'rgba(255,255,255,0.12)',margin:'4px 0'}}/>}
              <div style={{fontSize:8,color:type==='casal'?'rgba(224,112,112,0.7)':'rgba(112,168,112,0.7)',letterSpacing:0.5,textAlign:'center',paddingBottom:2}}>{typeLabel}</div>
              {grpsOfType.map(gr=>{
                const isActive = activeGroup===gr.id;
                const hasPending = type==='casal'&&proposals.filter(p=>p.status==='pending'&&p.groupId===gr.id).length>0;
                return(
                  <div key={gr.id} style={{position:'relative',width:'100%',display:'flex',justifyContent:'center',alignItems:'center',marginBottom:2}}>
                    {isActive&&<div style={{position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',width:3,height:36,background:'#f5f0e8',borderRadius:'0 3px 3px 0'}}/>}
                    <button onClick={()=>setAG(gr.id)} title={gr.name+' · '+(type==='casal'?'Casal':'Colaborativo')}
                      style={{width:40,height:40,borderRadius:isActive?12:20,background:isActive?gr.color:'rgba(255,255,255,0.22)',border:'2px solid '+(isActive?'rgba(255,255,255,0.35)':typeColor+'55'),cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',position:'relative',flexShrink:0}}
                      onMouseEnter={e=>{e.currentTarget.style.borderRadius='12px';if(!isActive){e.currentTarget.style.background='rgba(255,255,255,0.32)';e.currentTarget.style.borderColor=typeColor+'99';}}}
                      onMouseLeave={e=>{e.currentTarget.style.borderRadius=isActive?'12px':'20px';if(!isActive){e.currentTarget.style.background='rgba(255,255,255,0.22)';e.currentTarget.style.borderColor=typeColor+'55';}}}>
                      {gr.emoji}
                      {/* Type badge */}
                      <div style={{position:'absolute',bottom:-3,right:-3,width:14,height:14,borderRadius:'50%',background:typeColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,border:'2px solid #1e1810',lineHeight:1,fontStyle:'normal'}}>
                        {type==='casal'?'♥':'G'}
                      </div>
                      {/* Pending proposals indicator */}
                      {hasPending&&<div style={{position:'absolute',top:-3,right:-3,width:10,height:10,borderRadius:'50%',background:'#e05050',border:'1.5px solid #1e1810'}}/>}
                    </button>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
        <div style={{width:30,height:1,background:'rgba(255,255,255,0.1)',margin:'3px 0'}}/>
        <button onClick={()=>setNGM(true)} title="Novo grupo"
          style={{width:38,height:38,borderRadius:19,background:'rgba(255,255,255,0.06)',border:'none',cursor:'pointer',fontSize:20,color:'rgba(255,255,255,0.35)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderRadius='11px';e.currentTarget.style.color='#86efac';e.currentTarget.style.background='rgba(90,138,90,0.3)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderRadius='19px';e.currentTarget.style.color='rgba(255,255,255,0.35)';e.currentTarget.style.background='rgba(255,255,255,0.06)';}}>
          +
        </button>
      </div>

      {/* SIDEBAR */}
      <div style={{width:198,background:T.sidebar,borderRight:'1px solid '+T.sidebarBorder,display:'flex',flexDirection:'column',flexShrink:0,zIndex:1}}>
        <div style={{padding:'13px 14px',borderBottom:'1px solid '+T.sidebarBorder,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:(curGroup?.color||T.accent)+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{curGroup?.emoji}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{curGroup?.name}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1}}>
              {curGroup?.type==='casal'&&<span style={{fontSize:9,color:'#c05a5a',background:'#c05a5a22',borderRadius:8,padding:'1px 6px'}}>❤️ Casal</span>}
              {curGroup?.type==='colaborativo'&&<span style={{fontSize:9,color:'#5a8a5a',background:'#5a8a5a22',borderRadius:8,padding:'1px 6px'}}>👥 Colab.</span>}
              <span style={{fontSize:9,color:T.muted}}>{(curGroup?.members||[]).length} membros</span>
            </div>
          </div>
          <button onClick={()=>setGM(curGroup)} style={{background:'none',border:'none',cursor:'pointer',padding:2,flexShrink:0}}><Icon name="settings" size={13} color={T.muted}/></button>
        </div>
        <div style={{padding:'11px 13px',borderBottom:'1px solid '+T.sidebarBorder}}>
          <div style={{fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:7}}>Vista</div>
          <div style={{display:'flex',gap:5}}>
            {[['tabs','layout','Padrão'],['windows','grid','Janelas']].map(([m,ic,l])=>(
              <button key={m} onClick={()=>switchMode(m)} style={{flex:1,padding:'5px 0',borderRadius:6,border:'1px solid '+(mode===m?T.accent:T.border),background:mode===m?T.accentLight:'transparent',color:mode===m?T.accentDark:T.muted,fontSize:10,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                <Icon name={ic} size={11} color={mode===m?T.accentDark:T.muted}/>{l}
              </button>
            ))}
          </div>
        </div>
        <nav style={{flex:1,padding:'8px 8px'}}>
          {TABS.map(t=>{
            const isActive = mode==='tabs'?tab===t.id:openWins.includes(t.id);
            return(
              <button key={t.id} onClick={()=>mode==='tabs'?setTab(t.id):openWin(t.id)}
                style={{display:'flex',alignItems:'center',gap:9,padding:'9px 10px',borderRadius:7,background:isActive?T.accentLight:'transparent',border:'none',borderLeft:isActive?'2px solid '+(curGroup?.color||T.accent):'2px solid transparent',cursor:'pointer',width:'100%',textAlign:'left',fontSize:12,color:isActive?T.accentDark:T.muted,fontFamily:'inherit',transition:'all 0.15s',marginBottom:2,boxSizing:'border-box'}}>
                <Icon name={t.icon} size={14} color={isActive?curGroup?.color||T.accentDark:T.muted}/>
                {t.label}
                {t.id==='tasks'&&pending>0&&<span style={{marginLeft:'auto',background:curGroup?.color||T.accent,color:'#f5f0e8',borderRadius:10,padding:'1px 6px',fontSize:9}}>{pending}</span>}
                {t.id==='dashboard'&&proposals.filter(p=>p.status==='pending').length>0&&<span style={{marginLeft:'auto',background:'#c05a5a',color:'#f5f0e8',borderRadius:10,padding:'1px 6px',fontSize:9}}>{proposals.filter(p=>p.status==='pending').length}</span>}
              </button>
            );
          })}
        </nav>
        <div style={{padding:'10px 12px',borderTop:'1px solid '+T.sidebarBorder,display:'flex',alignItems:'center',gap:9}}>
          <button onClick={()=>setAM(true)} style={{display:'flex',alignItems:'center',gap:9,background:'none',border:'none',cursor:'pointer',flex:1,padding:'4px',borderRadius:7}}
            onMouseEnter={e=>e.currentTarget.style.background=T.accentLight}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <div style={{width:28,height:28,borderRadius:'50%',background:T.accentLight,border:'1px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0,overflow:'hidden'}}>
              {profile.photo?<img src={profile.photo} alt="perfil" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
            </div>
            <div style={{textAlign:'left',minWidth:0}}>
              <div style={{fontSize:12,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile.name||'Tu'}</div>
              <div style={{fontSize:9,color:T.muted}}>Ver perfil</div>
            </div>
          </button>
          <button title="Sair" onClick={handleLogout} style={{background:'none',border:'none',cursor:'pointer',padding:3,flexShrink:0}}><Icon name="logout" size={13} color={T.muted}/></button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',position:'relative',background:T.bg}}>
        {mode==='tabs'&&<>
          <div style={{background:T.card,borderBottom:'1px solid '+T.border,padding:'11px 22px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <div style={{fontSize:14,color:T.text}}>{curGroup?.emoji} {curGroup?.name} · {TAB_LABEL[tab]}</div>
            <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
              <button onClick={()=>setArch(true)} title="Arquivo" style={{background:T.bg,border:'1px solid '+T.border,borderRadius:8,padding:'5px 9px',cursor:'pointer',fontSize:13,color:T.muted}}>📦</button>
              <button onClick={exportData} title="Exportar" style={{background:T.bg,border:'1px solid '+T.border,borderRadius:8,padding:'5px 9px',cursor:'pointer',fontSize:13,color:T.muted}}>⬇️</button>
              <button onClick={()=>setDarkMode(d=>!d)} title="Modo noturno" style={{background:darkMode?T.accentLight:T.bg,border:'1px solid '+T.border,borderRadius:8,padding:'5px 9px',cursor:'pointer',fontSize:13}}>{darkMode?'☀️':'🌙'}</button>
              <button onClick={()=>setSearch(true)} style={{display:'flex',alignItems:'center',gap:6,background:T.bg,border:'1px solid '+T.border,borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:12,color:T.muted,fontFamily:'inherit'}}>
                🔍 <span style={{fontSize:10,background:T.accentLight,padding:'1px 5px',borderRadius:4,color:T.accentDark}}>Ctrl+K</span>
              </button>
              <button onClick={()=>setSM(true)} title="Atalhos" style={{background:T.bg,border:'1px solid '+T.border,borderRadius:8,padding:'5px 9px',cursor:'pointer',fontSize:13}}>⌨️</button>
            </div>
          </div>
          <div style={{flex:1,overflow:'auto',position:'relative'}}>{renderTab(tab)}</div>
        </>}

        {mode==='windows'&&(
          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            {minWins.length>0&&(
              <div style={{display:'flex',gap:5,padding:'5px 10px',background:T.sidebar,borderBottom:'1px solid '+T.sidebarBorder,flexShrink:0,alignItems:'center'}}>
                <span style={{fontSize:9,color:T.muted,letterSpacing:1,textTransform:'uppercase',marginRight:4}}>Min:</span>
                {minWins.map(id=>{const t=TABS.find(t=>t.id===id);return(
                  <button key={id} onClick={()=>updateWin(id,{minimized:false})}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:T.card,border:'1px solid '+T.border,borderRadius:7,cursor:'pointer',fontFamily:'inherit',fontSize:11,color:T.text}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.accentLight}
                    onMouseLeave={e=>e.currentTarget.style.background=T.card}>
                    <Icon name={t?.icon||'chat'} size={11} color={T.accent}/>{TAB_LABEL[id]}
                    <span onClick={e=>{e.stopPropagation();closeWin(id);}} style={{marginLeft:3,color:T.muted,fontSize:14,lineHeight:1,cursor:'pointer'}}>×</span>
                  </button>
                );})}
              </div>
            )}
            <div style={{flex:1,position:'relative',overflow:'hidden',background:T.bg}}>
              {openWins.length===0&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:13,color:T.muted,opacity:0.4}}>Seleciona uma secção na sidebar</div></div>}
              {TABS.filter(t=>visWins.includes(t.id)).map(t=>{const ws=winStates[t.id];if(!ws)return null;return(
                <Window key={t.id} id={t.id} title={curGroup?.name+' · '+TAB_LABEL[t.id]} icon={t.icon} state={ws} zIndex={ws.z} onUpdate={updateWin} onClose={closeWin} onFocus={focusWin}>
                  {renderTab(t.id)}
                </Window>
              );})}
            </div>
          </div>
        )}
      </div>

      {/* BOT */}
      <Bot onAddEvent={addEvent} onAddTask={addTask}/>

      {/* ARCHIVE MODAL */}
      {archiveOpen&&(
        <div onClick={()=>setArch(false)} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:18,width:520,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 70px rgba(30,24,16,0.22)',overflow:'hidden',fontFamily:'inherit'}}>
            <div style={{padding:'18px 24px',borderBottom:'1px solid '+T.border,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <h3 style={{margin:0,fontSize:16,fontWeight:400,color:T.text}}>📦 Arquivo</h3>
              <button onClick={()=>setArch(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:T.muted}}>×</button>
            </div>
            <ArchiveInner events={events[g]||[]} tasks={tasks[g]||[]} T={T}/>
          </div>
        </div>
      )}

      {/* MODALS */}
      {onboarding&&<OnboardingModal T={T} onClose={()=>{setOnboard(false);}}/>}
      {searchOpen&&<SearchModal events={events[g]||[]} tasks={tasks[g]||[]} msgs={msgs[g]||[]} notes={notes[g]||[]} onClose={()=>setSearch(false)} onNav={id=>{setTab(id);setSearch(false);}}/>}
      {shortcutsModal&&<ShortcutsModal shortcuts={shortcuts} onSave={sh=>{setShortcuts(sh);setSM(false);}} onClose={()=>setSM(false)}/>}
      {accountModal&&<AccountModal profile={profile} onSave={p=>{setProfile(p);setAM(false);}} onClose={()=>setAM(false)}/>}
      {groupModal&&<GroupModal group={groupModal} onClose={()=>setGM(null)} onUpdate={gr=>{setGroups(gs=>gs.map(g=>g.id===gr.id?gr:g));setGM(gr);}} onJoinGroup={grp=>{joinGroup(grp);setGM(null);}}/>}
      {newGroupModal&&<NewGroupModal onSave={addGroup} onClose={()=>setNGM(false)} onJoinGroup={grp=>{joinGroup(grp);setNGM(false);}}/>}
      {sendModal&&<SendToGroupModal item={sendModal.item} type={sendModal.type} groups={groups} onClose={()=>setSendM(null)} onSend={(gid,msg)=>{setProps(p=>[...p,{id:genId(),type:sendModal.type,item:sendModal.item,groupId:gid,msg,from:profile.name||'Tu',status:'pending'}]);setSendM(null);}}/>}
    </div>
  );
}

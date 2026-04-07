import { useState, useRef, useCallback, useEffect } from "react";
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

function genId() { return Date.now() + Math.random(); }
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
  { id:'casal',   name:'Nós dois',   emoji:'❤️', color:'#7c6d52', members:['tu','ela'],        isDefault:true  },
  { id:'cozinha', name:'Cozinha',    emoji:'🍳', color:'#5a8a5a', members:['tu','ela','mae'],   isDefault:false },
  { id:'oracao',  name:'Oração',     emoji:'🙏', color:'#4a7a8a', members:['tu','ela','pedro'], isDefault:false },
];
const INIT_EVENTS = {
  casal:[
    {id:1,title:'Aniversário dela',   date:'2026-04-06',type:'birthday',desc:'Não esquecer o presente!'},
    {id:2,title:'Jantar romântico',   date:'2026-04-14',type:'date',    desc:'Restaurante às 20h'},
    {id:3,title:'Consulta médica',    date:'2026-04-20',type:'medical', desc:'Clínica central, 10h'},
    {id:4,title:'Fim de semana fora', date:'2026-04-25',type:'holiday', desc:''},
    {id:5,title:'Aniversário casamento',date:'2026-06-15',type:'birthday',desc:''},
    {id:6,title:'Férias de verão',    date:'2026-07-10',type:'holiday', desc:'Algarve'},
  ],
  cozinha:[{id:10,title:'Jantar de família',date:'2026-04-12',type:'date',desc:''}],
  oracao: [{id:20,title:'Encontro semanal',date:'2026-04-10',type:'other',desc:''}],
};
const INIT_TASKS = {
  casal:[
    {id:1,text:'Comprar mantimentos',col:'A fazer',priority:'alta',done:false},
    {id:2,text:'Pagar renda',col:'A fazer',priority:'alta',done:false},
    {id:3,text:'Comprar presente aniversário',col:'A fazer',priority:'média',done:false},
    {id:4,text:'Marcar consulta médica',col:'Em progresso',priority:'média',done:false},
    {id:5,text:'Planear férias',col:'Em progresso',priority:'baixa',done:false},
    {id:6,text:'Reservar jantar aniversário',col:'Concluído',priority:'alta',done:true},
  ],
  cozinha:[{id:10,text:'Comprar ingredientes',col:'A fazer',priority:'média',done:false}],
  oracao:[{id:20,text:'Preparar leitura da semana',col:'A fazer',priority:'baixa',done:false}],
};
const INIT_MSGS = {
  casal:[
    {id:1,from:'her',text:'Amor, não te esqueças do jantar hoje! 🥰',time:'14:32'},
    {id:2,from:'me',text:'Claro! Chego às 20h. Queres que traga algo?',time:'14:45'},
    {id:3,from:'her',text:'Traz vinho 🍷',time:'14:47'},
    {id:4,from:'me',text:'Perfeito ❤️',time:'14:48'},
  ],
  cozinha:[{id:10,from:'mae',text:'Quem traz a sobremesa?',time:'10:00'}],
  oracao:[{id:20,from:'pedro',text:'Amanhã às 19h?',time:'09:30'}],
};
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

const INIT_NOTES = {
  casal:[
    {id:1,title:'Lista de compras',text:'__shopping__',items:[{id:11,text:'Leite',done:false},{id:12,text:'Pão',done:false},{id:13,text:'Fruta',done:true}],private:false,pinned:true},
    {id:2,title:'Ideias férias',   text:'Algarve em julho\nMadeira em outubro',items:[],private:false,pinned:false},
    {id:3,title:'Nota pessoal',    text:'Surpresa do aniversário',items:[],private:true,pinned:false},
  ],
  cozinha:[{id:10,title:'Receita favorita',text:'Bacalhau à brás',items:[],private:false,pinned:false}],
  oracao: [],
};

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
  const [title,setTitle]=useState(event?.title||'');
  const [date,setDate]=useState(event?.date||defaultDate||'');
  const [type,setType]=useState(event?.type||'other');
  const [desc,setDesc]=useState(event?.desc||'');
  const inp={width:'100%',boxSizing:'border-box',border:'1px solid '+T.border,borderRadius:7,padding:'9px 12px',fontSize:13,color:T.text,background:T.bg,outline:'none',fontFamily:'inherit'};
  const lbl={display:'block',fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:5};
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:16,padding:28,width:400,boxShadow:'0 16px 60px rgba(30,24,16,0.2)',fontFamily:'inherit'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:400,color:T.text}}>{event?'Editar evento':'Novo evento'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><Icon name="close" size={16} color={T.muted}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div><label style={lbl}>Título</label><input value={title} onChange={e=>setTitle(e.target.value)} style={inp} placeholder="Nome do evento"/></div>
          <div><label style={lbl}>Data</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></div>
          <div><label style={lbl}>Tipo</label><select value={type} onChange={e=>setType(e.target.value)} style={{...inp,cursor:'pointer'}}>{Object.entries(EVENT_TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
          <div><label style={lbl}>Descrição</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} style={{...inp,resize:'vertical',minHeight:60}} placeholder="Notas..."/></div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:22}}>
          {event&&<button onClick={()=>onDelete(event.id)} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.danger,borderRadius:7,color:T.danger,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Eliminar</button>}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={()=>title&&date&&onSave({id:event?.id||genId(),title,date,type,desc})} style={{padding:'9px 20px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{event?'Guardar':'Criar'}</button>
        </div>
      </div>
    </div>
  );
}

// ── DAY PANEL ─────────────────────────────────────────────────────────────────
function DayPanel({date,events,onClose,onEdit,onDelete,onAdd}){
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
  const handleDelete=id=>{onDeleteEvent(id);setModal(null);setSel(null);};

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
function TaskModal({task,onSave,onDelete,onClose}){
  const [text,setText]=useState(task?.text||'');
  const [priority,setPriority]=useState(task?.priority||'média');
  const [col,setCol]=useState(task?.col||'A fazer');
  const inp={width:'100%',boxSizing:'border-box',border:'1px solid '+T.border,borderRadius:7,padding:'9px 12px',fontSize:13,color:T.text,background:T.bg,outline:'none',fontFamily:'inherit'};
  const lbl={display:'block',fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:5};
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:16,padding:28,width:380,boxShadow:'0 16px 60px rgba(30,24,16,0.2)',fontFamily:'inherit'}}>
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
        </div>
        <div style={{display:'flex',gap:10,marginTop:22}}>
          {task&&<button onClick={()=>onDelete(task.id)} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.danger,borderRadius:7,color:T.danger,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Eliminar</button>}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={()=>text&&onSave({id:task?.id||genId(),text,col,priority,done:col==='Concluído'})} style={{padding:'9px 20px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>{task?'Guardar':'Criar'}</button>
        </div>
      </div>
    </div>
  );
}

// ── KANBAN ────────────────────────────────────────────────────────────────────
function KanbanView({tasks,onAddTask,onEditTask,onDeleteTask,onMoveTask}){
  const [modal,setModal]=useState(null);
  const [adding,setAdding]=useState({});
  const [newText,setNewText]=useState({});
  const [dragId,setDragId]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const handleSave=t=>{if(modal?.task)onEditTask(t);else onAddTask(t);setModal(null);};
  const handleDelete=id=>{onDeleteTask(id);setModal(null);};
  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{padding:'10px 18px',borderBottom:'1px solid '+T.border,display:'flex',alignItems:'center',gap:10,flexShrink:0,background:T.card}}>
        <span style={{fontSize:11,color:T.muted}}>Total: {tasks.length} · A fazer: {tasks.filter(t=>t.col==='A fazer').length} · Em progresso: {tasks.filter(t=>t.col==='Em progresso').length} · Concluídas: {tasks.filter(t=>t.col==='Concluído').length}</span>
        <button onClick={()=>setModal({task:null})} style={{marginLeft:'auto',padding:'5px 12px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
          <Icon name="plus" size={11} color="#f5f0e8"/>Nova
        </button>
      </div>
      <div style={{display:'flex',gap:12,padding:16,flex:1,overflowX:'auto',alignItems:'flex-start'}}>
        {COLS.map(col=>{
          const colTasks=tasks.filter(t=>t.col===col);
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
      {modal&&<TaskModal task={modal.task} onSave={handleSave} onDelete={handleDelete} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function ChatView({messages,onSend,groupColor,onReact,reactions,onPin}){
  const [input,setInput]=useState('');
  const [showReactFor,setShowReactFor]=useState(null);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);
  const send=()=>{if(!input.trim())return;onSend(input.trim());setInput('');};
  const pinnedMsgs=messages.filter(m=>m.pinned);
  const EMOJIS=['❤️','😂','👍','🔥','😢','🙏'];
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
                <div style={{fontSize:10,color:m.from==='me'?'rgba(245,240,232,0.4)':T.muted,marginTop:3,textAlign:m.from==='me'?'right':'left'}}>{m.time}</div>
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
      <div style={{padding:'12px 20px',paddingRight:70,background:T.card,borderTop:'1px solid '+T.border,display:'flex',gap:8,flexShrink:0}}>
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
function GroupModal({group,onClose}){
  const [copied,setCopied]=useState(false);
  const inviteLink='https://casalapp.vercel.app/invite/'+group.id+'-xyz123';
  const copy=()=>{navigator.clipboard?.writeText(inviteLink).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);};
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:16,padding:28,width:420,boxShadow:'0 16px 60px rgba(30,24,16,0.2)',fontFamily:'inherit'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22}}>
          <div style={{width:40,height:40,borderRadius:10,background:group.color+'22',border:'1px solid '+group.color+'44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{group.emoji}</div>
          <div>
            <div style={{fontSize:16,fontWeight:400,color:T.text}}>{group.name}</div>
            <div style={{fontSize:11,color:T.muted}}>Grupo privado</div>
          </div>
          <button onClick={onClose} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer'}}><Icon name="close" size={16} color={T.muted}/></button>
        </div>

        {/* Members */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:10}}>Membros ({group.members.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {group.members.map(m=>(
              <div key={m} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:T.bg,borderRadius:9,border:'1px solid '+T.border}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:T.accentLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>
                  {m==='tu'?'🧔':m==='ela'?'👩':m==='mae'?'👵':'🧑'}
                </div>
                <div>
                  <div style={{fontSize:13,color:T.text}}>{m==='tu'?'Tu (admin)':m==='ela'?'Ela':m==='mae'?'Mãe':m==='pedro'?'Pedro':m}</div>
                  <div style={{fontSize:10,color:T.muted}}>{m==='tu'?'Administrador':'Membro'}</div>
                </div>
                {m!=='tu'&&<button style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',fontSize:12,color:T.muted}}>×</button>}
              </div>
            ))}
          </div>
        </div>

        {/* Invite link */}
        <div>
          <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>Convite por link</div>
          <div style={{background:T.bg,border:'1px solid '+T.border,borderRadius:9,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
            <Icon name="link" size={14} color={T.muted}/>
            <span style={{flex:1,fontSize:12,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inviteLink}</span>
            <button onClick={copy} style={{background:copied?T.success:T.accentDark,border:'none',borderRadius:6,padding:'5px 12px',color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
              <Icon name="copy" size={12} color="#f5f0e8"/>{copied?'Copiado!':'Copiar'}
            </button>
          </div>
          <div style={{fontSize:11,color:T.muted,marginTop:6,lineHeight:1.5}}>
            Quem tiver este link pode pedir para entrar no grupo. Só membros aprovados têm acesso ao conteúdo.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NEW GROUP MODAL ───────────────────────────────────────────────────────────
function NewGroupModal({onSave,onClose}){
  const [name,setName]=useState('');
  const [emoji,setEmoji]=useState('💬');
  const emojis=['💬','🏠','🍳','🙏','💪','🎮','📚','🌿','🎵','✈️','💼','🎯'];
  const inp={width:'100%',boxSizing:'border-box',border:'1px solid '+T.border,borderRadius:7,padding:'9px 12px',fontSize:13,color:T.text,background:T.bg,outline:'none',fontFamily:'inherit'};
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(30,24,16,0.45)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:'1px solid '+T.border,borderRadius:16,padding:28,width:360,boxShadow:'0 16px 60px rgba(30,24,16,0.2)',fontFamily:'inherit'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:400,color:T.text}}>Novo grupo</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer'}}><Icon name="close" size={16} color={T.muted}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Ícone</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {emojis.map(e=>(
                <button key={e} onClick={()=>setEmoji(e)} style={{width:36,height:36,borderRadius:8,border:'1px solid '+(emoji===e?T.accent:T.border),background:emoji===e?T.accentLight:'transparent',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,color:T.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Nome</div>
            <input value={name} onChange={e=>setName(e.target.value)} style={inp} placeholder="Ex: Cozinha, Oração, Desporto..."/>
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:22}}>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'9px 16px',background:'none',border:'1px solid '+T.border,borderRadius:7,color:T.muted,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
          <button onClick={()=>name&&onSave({id:genId()+'',name,emoji,color:T.accent,members:['tu'],isDefault:false})} style={{padding:'9px 20px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Criar</button>
        </div>
      </div>
    </div>
  );
}

// ── BOT — hover to reveal, click to open ─────────────────────────────────────
function Bot({onAddEvent,onAddTask}){
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

// ── EMOJI PICKER ──────────────────────────────────────────────────────────────
const EMOJI_GROUPS = {
  '😊':['😊','😂','❤️','🥰','😍','🤩','😎','🥳','😇','🙏','👍','🔥','✨','💯','🎉','🫶','💪','🤝','👏','🌹'],
  '🍕':['🍕','🍷','☕','🎂','🍰','🥂','🍾','🌮','🍜','🥗','🍣','🍫','🍦','🥐','🍳'],
  '🌍':['🌍','🏠','🏖️','⛰️','🌊','🌸','🌿','☀️','🌙','⭐','🎄','🌺','🍀','🦋','🐕'],
};
function EmojiPicker({ onPick, onClose }) {
  const [tab,setTab] = useState('😊');
  return (
    <div style={{position:'absolute',bottom:64,left:0,background:'#faf6ef',border:'1px solid #ddd5c4',borderRadius:14,padding:12,zIndex:200,boxShadow:'0 8px 30px rgba(30,24,16,0.18)',width:280}}>
      <div style={{display:'flex',gap:6,marginBottom:10,borderBottom:'1px solid #ddd5c4',paddingBottom:8}}>
        {Object.keys(EMOJI_GROUPS).map(k=><button key={k} onClick={()=>setTab(k)} style={{fontSize:18,background:tab===k?'#f0ead8':'none',border:'none',borderRadius:6,padding:'3px 6px',cursor:'pointer'}}>{k}</button>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:2}}>
        {EMOJI_GROUPS[tab].map(e=>(
          <button key={e} onClick={()=>{onPick(e);onClose();}} style={{fontSize:18,background:'none',border:'none',borderRadius:6,padding:'3px',cursor:'pointer',lineHeight:1}}
            onMouseEnter={ev=>ev.currentTarget.style.background='#f0ead8'}
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
      <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="+ Adicionar item..." style={{width:'100%',border:'none',borderBottom:'1px solid #ddd5c4',padding:'3px 0',fontSize:12,outline:'none',fontFamily:'inherit',background:'transparent',color:'#1e1810',marginBottom:8}}/>
      {items.map(item=>(
        <div key={item.id} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
          <button onClick={()=>toggle(item.id)} style={{width:14,height:14,borderRadius:3,border:'1px solid '+(item.done?'#5a8a5a':'#ddd5c4'),background:item.done?'#5a8a5a':'transparent',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff'}}>{item.done?'✓':''}</button>
          <span style={{fontSize:12,color:item.done?'#9a8e7e':'#1e1810',textDecoration:item.done?'line-through':'none',flex:1}}>{item.text}</span>
          <button onClick={()=>remove(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#9a8e7e',fontSize:13,padding:0}}>×</button>
        </div>
      ))}
      {items.length===0&&<div style={{fontSize:11,color:'#9a8e7e'}}>Nenhum item ainda</div>}
      {items.filter(i=>i.done).length>0&&<button onClick={()=>onEdit({...note,items:items.filter(i=>!i.done)})} style={{fontSize:10,color:'#9a8e7e',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',marginTop:4}}>Limpar concluídos</button>}
    </div>
  );
}

// ── NOTES VIEW ────────────────────────────────────────────────────────────────
function NotesView({ notes, onAdd, onEdit, onDelete }) {
  const T = {bg:"#f2ece0",card:"#faf6ef",border:"#ddd5c4",text:"#1e1810",muted:"#9a8e7e",accent:"#7c6d52",accentDark:"#5c4f3a",accentLight:"#f0ead8",success:"#5a8a5a",danger:"#c05a5a"};
  const [editId,setEditId]   = useState(null);
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
          <button onClick={()=>setShowNew(true)}
            style={{padding:'5px 12px',background:T.accentDark,border:'none',borderRadius:7,color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>+ Nova nota</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:12,alignContent:'start'}}>
        {showNew&&(
          <div style={{background:T.card,border:'1.5px solid '+T.accent,borderRadius:12,padding:14,display:'flex',flexDirection:'column',gap:8}}>
            <input value={nTitle} onChange={e=>setNTitle(e.target.value)} placeholder="Título" style={{border:'none',borderBottom:'1px solid '+T.border,padding:'4px 0',fontSize:14,color:T.text,background:'transparent',outline:'none',fontFamily:'inherit',fontWeight:500}}/>
            <textarea value={nText} onChange={e=>setNText(e.target.value)} placeholder="Conteúdo..." style={taS}/>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {lockBtn(nPriv, ()=>setNPriv(p=>!p))}
              <div style={{flex:1}}/>
              <button onClick={()=>setShowNew(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:T.muted,fontFamily:'inherit'}}>✕</button>
              <button onClick={create} style={{background:T.accentDark,border:'none',borderRadius:6,padding:'4px 12px',color:'#f5f0e8',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Criar</button>
            </div>
          </div>
        )}
        {notes.map(note=>(
          <div key={note.id} style={{background:T.card,border:'1px solid '+(note.private?'#c8b99a':T.border),borderRadius:12,padding:14,display:'flex',flexDirection:'column',gap:8,transition:'box-shadow 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 14px rgba(30,24,16,0.1)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
            {editId===note.id ? (
              <>
                <input value={editTitle} onChange={e=>setET(e.target.value)} style={{border:'none',borderBottom:'1px solid '+T.border,padding:'4px 0',fontSize:14,color:T.text,background:'transparent',outline:'none',fontFamily:'inherit',fontWeight:500}}/>
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
                  : <div style={{fontSize:12,color:T.muted,lineHeight:1.6,flex:1,whiteSpace:'pre-line'}}>{note.text}</div>
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
  const T = {bg:"#f2ece0",card:"#faf6ef",border:"#ddd5c4",text:"#1e1810",muted:"#9a8e7e",accent:"#7c6d52",accentDark:"#5c4f3a",accentLight:"#f0ead8",success:"#5a8a5a",danger:"#c05a5a",warning:"#c09040"};
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
          {myProposals.map(p=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'8px 12px',background:T.card,borderRadius:8,border:'1px solid '+T.border}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:T.text}}>{p.item?.text||p.item?.title}</div>
                <div style={{fontSize:11,color:T.muted}}>por {p.from} → {(groups||[]).find(g=>g.id===p.groupId)?.name}</div>
              </div>
              <button onClick={()=>onApprove(p.id)} style={{padding:'4px 10px',background:T.success,border:'none',borderRadius:6,color:'#fff',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>✓</button>
              <button onClick={()=>onReject(p.id)} style={{padding:'4px 10px',background:'none',border:'1px solid '+T.danger,borderRadius:6,color:T.danger,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>✗</button>
            </div>
          ))}
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
  const T = {bg:"#f2ece0",card:"#faf6ef",border:"#ddd5c4",text:"#1e1810",muted:"#9a8e7e",accent:"#7c6d52",accentLight:"#f0ead8"};
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
  const T = {bg:"#f2ece0",card:"#faf6ef",border:"#ddd5c4",text:"#1e1810",muted:"#9a8e7e",accent:"#7c6d52",accentDark:"#5c4f3a",accentLight:"#f0ead8",danger:"#c05a5a"};
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
  const T = {bg:"#f2ece0",card:"#faf6ef",border:"#ddd5c4",text:"#1e1810",muted:"#9a8e7e",accent:"#7c6d52",accentDark:"#5c4f3a",accentLight:"#f0ead8",danger:"#c05a5a"};
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

export default function App({ user, onLogout }) {
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
  const [profile,setProfile]    = useState({ name: user?.email?.split('@')[0]||'Tu', photo:null, notif:true, notifEvents:true, notifTasks:true, notifChat:true });
  const [darkMode,setDarkMode]  = useState(false);
  const [searchOpen,setSearch]  = useState(false);
  const [shortcutsModal,setSM]  = useState(false);
  const [shortcuts,setShortcuts]= useState(DEFAULT_SHORTCUTS);
  const [accountModal,setAM]    = useState(false);
  const [groupModal,setGM]      = useState(null);
  const [newGroupModal,setNGM]  = useState(false);
  const [sendModal,setSendM]    = useState(null);
  const [archiveOpen,setArch]   = useState(false);
  const [dbReady,setDbReady]    = useState(false);
  const maxZ = useRef(12);

  // ── LOAD FROM SUPABASE ───────────────────────────────────────────────────────
  useEffect(()=>{
    if(!user) return;
    const load = async () => {
      // Load profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (prof) setProfile(p=>({...p, name: prof.name||p.name, photo: prof.photo||null }));

      // Load events
      const { data: evts } = await supabase.from('events').select('*').eq('user_id', user.id);
      if (evts?.length) {
        const grouped = {};
        evts.forEach(e=>{ if(!grouped[e.group_id]) grouped[e.group_id]=[]; grouped[e.group_id].push(e); });
        setEvents(ev=>({...ev,...grouped}));
      }

      // Load tasks
      const { data: tks } = await supabase.from('tasks').select('*').eq('user_id', user.id);
      if (tks?.length) {
        const grouped = {};
        tks.forEach(t=>{ if(!grouped[t.group_id]) grouped[t.group_id]=[]; grouped[t.group_id].push(t); });
        setTasks(tk=>({...tk,...grouped}));
      }

      // Load messages (last 100)
      const { data: ms } = await supabase.from('messages').select('*').order('created_at',{ascending:true}).limit(100);
      if (ms?.length) {
        const grouped = {};
        ms.forEach(m=>{ if(!grouped[m.group_id]) grouped[m.group_id]=[]; grouped[m.group_id].push({...m, from: m.user_id===user.id?'me':m.sender_name||'outro', time: new Date(m.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}), pinned: m.pinned||false }); });
        setMsgs(mg=>({...mg,...grouped}));
      }

      setDbReady(true);
    };
    load();
  }, [user]);

  // ── REAL-TIME MESSAGES ────────────────────────────────────────────────────
  useEffect(()=>{
    if(!user||!dbReady) return;
    const channel = supabase.channel('messages')
      .on('postgres_changes',{ event:'INSERT', schema:'public', table:'messages' }, payload => {
        const m = payload.new;
        const msg = { id:m.id, from: m.user_id===user.id?'me':m.sender_name||'outro', text:m.text, time: new Date(m.created_at).toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'}), pinned:false };
        if (m.user_id !== user.id) {
          setMsgs(ms=>({...ms,[m.group_id]:[...(ms[m.group_id]||[]),msg]}));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, dbReady]);

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────
  useEffect(()=>{
    const h = e => {
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      const pressed = (e.ctrlKey?'ctrl+':e.altKey?'alt+':'')+e.key.toLowerCase();
      const match = shortcuts.find(s=>(s.mod?s.mod+'+':'')+s.key===pressed);
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

  const focusWin  = useCallback(id=>{maxZ.current++;setWinStates(ws=>({...ws,[id]:{...ws[id],z:maxZ.current}}));},[]);
  const updateWin = useCallback((id,p)=>setWinStates(ws=>({...ws,[id]:{...ws[id],...p}})),[]);
  const closeWin  = useCallback(id=>setOpenWins(o=>o.filter(x=>x!==id)),[]);
  const openWin   = id=>{if(!openWins.includes(id))setOpenWins(o=>[...o,id]);setWinStates(ws=>({...ws,[id]:{...ws[id],minimized:false}}));focusWin(id);};
  const switchMode= m=>{if(m==='windows'&&mode==='tabs'){setOpenWins([tab]);setWinStates(ws=>({...ws,[tab]:{...ws[tab],minimized:false}}));}setMode(m);};

  const g = activeGroup;
  const addEvent    = ev => { setEvents(e=>({...e,[g]:[...(e[g]||[]).filter(x=>x.id!==ev.id),ev]})); supabase.from('events').upsert({...ev,user_id:user.id,group_id:g}).then(()=>{}); };
  const editEvent   = ev => { setEvents(e=>({...e,[g]:(e[g]||[]).map(x=>x.id===ev.id?ev:x)})); supabase.from('events').update(ev).eq('id',ev.id).then(()=>{}); };
  const deleteEvent = id => { setEvents(e=>({...e,[g]:(e[g]||[]).filter(x=>x.id!==id)})); supabase.from('events').delete().eq('id',id).then(()=>{}); };
  const addTask     = t  => { setTasks(e=>({...e,[g]:[...(e[g]||[]),t]})); supabase.from('tasks').insert({...t,user_id:user.id,group_id:g}).then(()=>{}); };
  const editTask    = t  => { setTasks(e=>({...e,[g]:(e[g]||[]).map(x=>x.id===t.id?t:x)})); supabase.from('tasks').update(t).eq('id',t.id).then(()=>{}); };
  const deleteTask  = id => { setTasks(e=>({...e,[g]:(e[g]||[]).filter(x=>x.id!==id)})); supabase.from('tasks').delete().eq('id',id).then(()=>{}); };
  const moveTask    = (id,col)=>{ setTasks(e=>({...e,[g]:(e[g]||[]).map(t=>t.id===id?{...t,col,done:col==='Concluído'}:t)})); supabase.from('tasks').update({col,done:col==='Concluído'}).eq('id',id).then(()=>{}); };
  const sendMsg     = async text => {
    const time = new Date().toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
    const msg  = {id:genId(),from:'me',text,time,pinned:false};
    setMsgs(m=>({...m,[g]:[...(m[g]||[]),msg]}));
    await supabase.from('messages').insert({ text, user_id:user.id, group_id:g, sender_name: profile.name||'Tu', pinned:false });
  };
  const pinMsg      = id => setMsgs(m=>({...m,[g]:(m[g]||[]).map(x=>x.id===id?{...x,pinned:!x.pinned}:x)}));
  const addReaction = (mid,emoji)=>setReact(r=>({...r,[mid]:{...(r[mid]||{}),[emoji]:(r[mid]?.[emoji]||0)+1}}));
  const addNote     = n  => { setNotes(ns=>({...ns,[g]:[...(ns[g]||[]),n]})); supabase.from('notes').insert({...n,user_id:user.id,group_id:g}).then(()=>{}); };
  const editNote    = n  => { setNotes(ns=>({...ns,[g]:(ns[g]||[]).map(x=>x.id===n.id?n:x)})); supabase.from('notes').update(n).eq('id',n.id).then(()=>{}); };
  const deleteNote  = id => { setNotes(ns=>({...ns,[g]:(ns[g]||[]).filter(x=>x.id!==id)})); supabase.from('notes').delete().eq('id',id).then(()=>{}); };
  const addGroup    = grp=>{setGroups(gs=>[...gs,grp]);setEvents(e=>({...e,[grp.id]:[]}));setTasks(t=>({...t,[grp.id]:[]}));setMsgs(m=>({...m,[grp.id]:[]}));setNotes(n=>({...n,[grp.id]:[]}));setNGM(false);setAG(grp.id);};
  const approveProposal = id=>{const p=proposals.find(x=>x.id===id);if(p&&p.type==='task')addTask({...p.item,id:genId()});setProps(ps=>ps.map(x=>x.id===id?{...x,status:'approved'}:x));};
  const rejectProposal  = id=>setProps(ps=>ps.map(x=>x.id===id?{...x,status:'rejected'}:x));

  const saveProfile = async (p) => {
    setProfile(p);
    await supabase.from('profiles').update({ name:p.name, photo:p.photo }).eq('id', user.id);
    setAM(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const pending  = (tasks[g]||[]).filter(t=>t.col!=='Concluído').length;
  const minWins  = openWins.filter(id=>winStates[id]?.minimized);
  const visWins  = openWins.filter(id=>!winStates[id]?.minimized);
  const curGroup = groups.find(gr=>gr.id===g)||groups[0];
  const T        = darkMode ? DK : { bg:"#f2ece0",sidebar:"#e8dfd0",sidebarBorder:"#d8cebb",card:"#faf6ef",border:"#ddd5c4",text:"#1e1810",muted:"#9a8e7e",accent:"#7c6d52",accentDark:"#5c4f3a",accentLight:"#f0ead8",accentMid:"#c8b99a",success:"#5a8a5a",danger:"#c05a5a",warning:"#c09040" };

  const renderTab = id => {
    if(id==='dashboard') return <DashboardView events={events[g]||[]} tasks={tasks[g]||[]} msgs={msgs[g]||[]} notes={notes[g]||[]} profile={profile} proposals={proposals} groups={groups} onNav={setTab} onApprove={approveProposal} onReject={rejectProposal}/>;
    if(id==='chat')      return <ChatView messages={msgs[g]||[]} onSend={sendMsg} groupColor={curGroup?.color} onReact={addReaction} reactions={reactions} onPin={pinMsg}/>;
    if(id==='tasks')     return <KanbanView tasks={tasks[g]||[]} onAddTask={addTask} onEditTask={editTask} onDeleteTask={deleteTask} onMoveTask={moveTask} onSendToGroup={item=>setSendM({item,type:'task'})}/>;
    if(id==='notes')     return <NotesView notes={notes[g]||[]} onAdd={addNote} onEdit={editNote} onDelete={deleteNote}/>;
    if(id==='calendar')  return <CalendarView events={events[g]||[]} onAddEvent={addEvent} onEditEvent={editEvent} onDeleteEvent={deleteEvent}/>;
    return null;
  };

  const exportData = () => {
    const data = JSON.stringify({events:events[g],tasks:tasks[g],notes:notes[g]},null,2);
    const url = URL.createObjectURL(new Blob([data],{type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download='casalapp-export.json'; a.click();
  };

  return (
    <div style={{display:'flex',height:'100vh',fontFamily:"'Georgia','Times New Roman',serif",background:T.bg,overflow:'hidden'}}>

      {/* GROUP RAIL */}
      <div style={{width:58,background:'#1e1810',display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 0',gap:5,flexShrink:0,zIndex:2}}>
        {groups.map(gr=>(
          <div key={gr.id} style={{position:'relative',width:'100%',display:'flex',justifyContent:'center'}}>
            {activeGroup===gr.id&&<div style={{position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',width:3,height:28,background:'#f5f0e8',borderRadius:'0 3px 3px 0'}}/>}
            <button onClick={()=>setAG(gr.id)} title={gr.name}
              style={{width:38,height:38,borderRadius:activeGroup===gr.id?11:19,background:activeGroup===gr.id?gr.color:'rgba(255,255,255,0.08)',border:'none',cursor:'pointer',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderRadius='11px';if(activeGroup!==gr.id)e.currentTarget.style.background='rgba(255,255,255,0.15)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderRadius=activeGroup===gr.id?'11px':'19px';if(activeGroup!==gr.id)e.currentTarget.style.background='rgba(255,255,255,0.08)';}}>
              {gr.emoji}
            </button>
          </div>
        ))}
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
            <div style={{fontSize:10,color:T.muted}}>{(curGroup?.members||[]).length} membros</div>
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
          <button onClick={handleLogout} title="Sair" style={{background:'none',border:'none',cursor:'pointer',padding:3,flexShrink:0}}><Icon name="logout" size={13} color={T.muted}/></button>
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

      <Bot onAddEvent={addEvent} onAddTask={addTask}/>

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

      {searchOpen&&<SearchModal events={events[g]||[]} tasks={tasks[g]||[]} msgs={msgs[g]||[]} notes={notes[g]||[]} onClose={()=>setSearch(false)} onNav={id=>{setTab(id);setSearch(false);}}/>}
      {shortcutsModal&&<ShortcutsModal shortcuts={shortcuts} onSave={sh=>{setShortcuts(sh);setSM(false);}} onClose={()=>setSM(false)}/>}
      {accountModal&&<AccountModal profile={profile} onSave={saveProfile} onClose={()=>setAM(false)}/>}
      {groupModal&&<GroupModal group={groupModal} onClose={()=>setGM(null)}/>}
      {newGroupModal&&<NewGroupModal onSave={addGroup} onClose={()=>setNGM(false)}/>}
      {sendModal&&<SendToGroupModal item={sendModal.item} type={sendModal.type} groups={groups} onClose={()=>setSendM(null)} onSend={(gid,msg)=>{setProps(p=>[...p,{id:genId(),type:sendModal.type,item:sendModal.item,groupId:gid,msg,from:profile.name||'Tu',status:'pending'}]);setSendM(null);}}/>}
    </div>
  );
}

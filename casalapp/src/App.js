import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { processCommand } from './bot'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const availColors = { disponivel: '#22c55e', ocupado: '#ef4444', talvez: '#f59e0b' }
const availLabels = { disponivel: 'Disponível', ocupado: 'Ocupado', talvez: 'Talvez' }
const priorityColor = { alta: '#ef4444', media: '#f59e0b', baixa: '#22c55e' }
const typeEmoji = { birthday: '🎂', date: '🍷', holiday: '🌿', medical: '🏥', other: '📌' }

export default function App({ user }) {
  const [tab, setTab] = useState('chat')
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState({})
  const [messages, setMessages] = useState([])
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [input, setInput] = useState('')
  const [taskInput, setTaskInput] = useState('')
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState(null)
  const [botNotif, setBotNotif] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEnd = useRef(null)

  useEffect(() => {
    const init = async () => {
      let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) {
        const name = user.email.split('@')[0]
        await supabase.from('profiles').insert({ id: user.id, name, avatar: '👤' })
        prof = { id: user.id, name, avatar: '👤', availability: 'disponivel' }
      }
      setProfile(prof)
      const [{ data: msgs }, { data: tks }, { data: evs }, { data: profs }] = await Promise.all([
        supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(100),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('profiles').select('*'),
      ])
      setMessages(msgs || []); setTasks(tks || []); setEvents(evs || [])
      const pm = {}; (profs || []).forEach(p => { pm[p.id] = p }); setProfiles(pm)
      setLoading(false)
    }
    init()
  }, [user])

  useEffect(() => {
    const msgSub = supabase.channel('messages-rt').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => setMessages(m => [...m, p.new])).subscribe()
    const taskSub = supabase.channel('tasks-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => { const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }); setTasks(data || []) }).subscribe()
    const eventSub = supabase.channel('events-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => { const { data } = await supabase.from('events').select('*').order('date', { ascending: true }); setEvents(data || []) }).subscribe()
    const profSub = supabase.channel('profiles-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => { const { data } = await supabase.from('profiles').select('*'); const pm = {}; (data || []).forEach(p => { pm[p.id] = p }); setProfiles(pm) }).subscribe()
    return () => { supabase.removeChannel(msgSub); supabase.removeChannel(taskSub); supabase.removeChannel(eventSub); supabase.removeChannel(profSub) }
  }, [])

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const notif = (msg) => { setBotNotif(msg); setTimeout(() => setBotNotif(''), 4000) }

  const sendMessage = async () => {
    if (!input.trim()) return
    const text = input.trim(); setInput('')
    const result = processCommand(text)
    if (result.action !== 'message') {
      if (result.action === 'create_event') { await supabase.from('events').insert({ title: result.title, date: result.date, type: result.type }); setTab('calendar') }
      else if (result.action === 'create_task') { await supabase.from('tasks').insert({ text: result.text, priority: result.priority, author_id: user.id }); setTab('tasks') }
      else if (result.action === 'set_availability') { await supabase.from('profiles').update({ availability: result.status }).eq('id', user.id); setProfile(p => ({ ...p, availability: result.status })) }
      if (result.message) { await supabase.from('messages').insert({ user_id: null, text: `🤖 ${result.message}` }); notif(result.message) }
    }
    await supabase.from('messages').insert({ user_id: user.id, text })
  }

  const addTask = async () => { if (!taskInput.trim()) return; await supabase.from('tasks').insert({ text: taskInput.trim(), author_id: user.id, priority: 'media' }); setTaskInput('') }
  const toggleTask = async (id, done) => { await supabase.from('tasks').update({ done: !done }).eq('id', id) }
  const deleteTask = async (id) => { await supabase.from('tasks').delete().eq('id', id) }
  const updateAvail = async (status) => { await supabase.from('profiles').update({ availability: status }).eq('id', user.id); setProfile(p => ({ ...p, availability: status })) }

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const calDays = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const getEventsForDay = (day) => { if (!day) return []; const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return events.filter(e => e.date?.startsWith(ds)) }
  const today = new Date()
  const isToday = (day) => day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
  const otherProfiles = Object.values(profiles).filter(p => p.id !== user.id)

  const s = {
    sidebar: { width: 220, minWidth: 220, background: '#fff', borderRight: '1px solid #ebebeb', display: 'flex', flexDirection: 'column', padding: '0', height: '100vh', position: 'sticky', top: 0 },
    navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', background: active ? '#f5f5f3' : 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 14, color: active ? '#1a1a1a' : '#888', fontFamily: 'Georgia, serif', borderLeft: active ? '2px solid #1a1a1a' : '2px solid transparent', transition: 'all 0.15s' }),
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontFamily: 'Georgia, serif', fontSize: 16 }}>A carregar...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7f5', fontFamily: 'Georgia, serif' }}>

      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid #ebebeb' }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>♥ CasalApp</div>
          <div style={{ fontSize: 12, color: '#aaa' }}>O vosso espaço</div>
        </div>

        {/* Availability */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb' }}>
          {profile && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: availColors[profile.availability || 'disponivel'] }} />
                <span style={{ fontSize: 13, color: '#1a1a1a' }}>{profile.name} (tu)</span>
              </div>
              <select value={profile.availability || 'disponivel'} onChange={e => updateAvail(e.target.value)}
                style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 5, padding: '5px 8px', fontSize: 12, color: '#555', background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="disponivel">✅ Disponível</option>
                <option value="ocupado">🔴 Ocupado</option>
                <option value="talvez">🟡 Talvez</option>
              </select>
            </div>
          )}
          {otherProfiles.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: availColors[p.availability || 'disponivel'] }} />
              <span style={{ fontSize: 13, color: '#555' }}>{p.name}</span>
              <span style={{ fontSize: 11, color: availColors[p.availability || 'disponivel'], marginLeft: 'auto' }}>{availLabels[p.availability || 'disponivel']}</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {[['chat', '💬', 'Chat'], ['tasks', '✅', 'Tarefas'], ['calendar', '📅', 'Calendário']].map(([id, icon, label]) => (
            <button key={id} onClick={() => setTab(id)} style={s.navBtn(tab === id)}>
              <span>{icon}</span> {label}
              {id === 'tasks' && tasks.filter(t => !t.done).length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#1a1a1a', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{tasks.filter(t => !t.done).length}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #ebebeb' }}>
          <div style={{ fontSize: 12, color: '#bbb', marginBottom: 8 }}>{user.email}</div>
          <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 5, padding: '6px 12px', fontSize: 12, color: '#888', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
            Sair
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '100vh', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #ebebeb', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 400, color: '#1a1a1a' }}>
              {tab === 'chat' ? '💬 Chat' : tab === 'tasks' ? '✅ Tarefas' : '📅 Calendário'}
            </h2>
          </div>
          {botNotif && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 16px', fontSize: 13, color: '#16a34a' }}>{botNotif}</div>}
        </div>

        {/* CHAT */}
        {tab === 'chat' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 32px', background: '#fafaf9', borderBottom: '1px solid #ebebeb', fontSize: 12, color: '#bbb' }}>
              🤖 Bot: "marca jantar amanhã" · "adiciona tarefa: comprar pão" · "estou ocupado" · "ajuda"
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map(msg => {
                const isMe = msg.user_id === user.id
                const isBot = msg.user_id === null
                const sender = profiles[msg.user_id]
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: isBot ? '#f3f4f6' : isMe ? '#1a1a1a' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {isBot ? '🤖' : sender?.avatar || '👤'}
                    </div>
                    <div style={{ maxWidth: '60%' }}>
                      {!isMe && !isBot && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{sender?.name || 'Parceiro'}</div>}
                      <div style={{
                        padding: '10px 14px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isBot ? '#f9fafb' : isMe ? '#1a1a1a' : '#fff',
                        border: isBot ? '1px solid #e5e7eb' : isMe ? 'none' : '1px solid #e5e7eb',
                        fontSize: 14, lineHeight: 1.6, color: isMe ? '#fff' : '#1a1a1a',
                        whiteSpace: 'pre-line',
                      }}>
                        {msg.text}
                      </div>
                      <div style={{ fontSize: 11, color: '#ccc', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEnd} />
            </div>
            <div style={{ padding: '16px 32px', background: '#fff', borderTop: '1px solid #ebebeb', display: 'flex', gap: 10 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Escreve uma mensagem ou comando do bot..."
                style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: 8, padding: '11px 16px', fontSize: 14, color: '#1a1a1a', background: '#fafaf9', outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={sendMessage} style={{ padding: '11px 20px', background: '#1a1a1a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Enviar</button>
            </div>
          </div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                <input value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                  placeholder="Adicionar nova tarefa..."
                  style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: 8, padding: '11px 16px', fontSize: 14, color: '#1a1a1a', background: '#fff', outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={addTask} style={{ padding: '11px 20px', background: '#1a1a1a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Adicionar</button>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {[{ l: 'Total', v: tasks.length, c: '#1a1a1a' }, { l: 'Por fazer', v: tasks.filter(t => !t.done).length, c: '#ef4444' }, { l: 'Concluídas', v: tasks.filter(t => t.done).length, c: '#22c55e' }].map(s => (
                  <div key={s.l} style={{ flex: 1, background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ fontSize: 28, fontWeight: 300, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tasks.map(task => {
                  const author = profiles[task.author_id]
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderRadius: 10, border: '1px solid #ebebeb', opacity: task.done ? 0.5 : 1 }}>
                      <button onClick={() => toggleTask(task.id, task.done)} style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${task.done ? '#22c55e' : '#d1d5db'}`, background: task.done ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: '#fff' }}>
                        {task.done ? '✓' : ''}
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, textDecoration: task.done ? 'line-through' : 'none', color: '#1a1a1a' }}>{task.text}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          {author && <span style={{ fontSize: 11, color: '#aaa' }}>{author.avatar} {author.name}</span>}
                          <span style={{ fontSize: 11, color: priorityColor[task.priority] }}>● {task.priority}</span>
                        </div>
                      </div>
                      {task.author_id === user.id && (
                        <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>×</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {tab === 'calendar' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 24 }}>
              {/* Calendar grid */}
              <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #ebebeb', padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                    style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 16, color: '#555' }}>‹</button>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 400, color: '#1a1a1a' }}>{MONTHS[calMonth]} {calYear}</h3>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                    style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 16, color: '#555' }}>›</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                  {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#bbb', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {calDays.map((day, i) => {
                    const dayEvs = getEventsForDay(day)
                    const isTod = isToday(day)
                    const isSel = selectedDay === day
                    return (
                      <div key={i} onClick={() => day && setSelectedDay(isSel ? null : day)} style={{ minHeight: 52, padding: 6, borderRadius: 8, textAlign: 'center', background: isSel ? '#1a1a1a' : isTod ? '#f5f5f3' : 'transparent', border: isTod && !isSel ? '1px solid #e0e0e0' : '1px solid transparent', cursor: day ? 'pointer' : 'default', transition: 'all 0.1s' }}>
                        {day && <>
                          <div style={{ fontSize: 13, color: isSel ? '#fff' : isTod ? '#1a1a1a' : '#555', fontWeight: isTod ? 600 : 400 }}>{day}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', marginTop: 3 }}>
                            {dayEvs.slice(0, 2).map(ev => <div key={ev.id} style={{ width: 5, height: 5, borderRadius: '50%', background: isSel ? '#fff' : ev.type === 'birthday' ? '#ef4444' : ev.type === 'date' ? '#8b5cf6' : ev.type === 'holiday' ? '#22c55e' : '#f59e0b' }} />)}
                          </div>
                        </>}
                      </div>
                    )
                  })}
                </div>

                {selectedDay && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #ebebeb' }}>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{selectedDay} de {MONTHS[calMonth]}</div>
                    {getEventsForDay(selectedDay).length === 0
                      ? <div style={{ fontSize: 13, color: '#ccc' }}>Nenhum evento neste dia</div>
                      : getEventsForDay(selectedDay).map(ev => (
                        <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f3' }}>
                          <span>{typeEmoji[ev.type] || '📌'}</span>
                          <span style={{ fontSize: 14, color: '#1a1a1a' }}>{ev.title}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Upcoming events */}
              <div style={{ width: 280 }}>
                <h3 style={{ fontSize: 14, fontWeight: 400, color: '#888', marginTop: 0, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Próximos eventos</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {events.filter(e => e.date >= new Date().toISOString().split('T')[0]).slice(0, 8).map(ev => (
                    <div key={ev.id} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 20 }}>{typeEmoji[ev.type] || '📌'}</span>
                      <div>
                        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 400 }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                          {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {events.filter(e => e.date >= new Date().toISOString().split('T')[0]).length === 0 && (
                    <div style={{ fontSize: 13, color: '#ccc' }}>Nenhum evento próximo</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

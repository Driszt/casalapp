import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { processCommand } from './bot'

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const availColors = { disponivel: '#27ae60', ocupado: '#e74c3c', talvez: '#f39c12' }
const availLabels = { disponivel: 'Disponível', ocupado: 'Ocupado', talvez: 'Talvez' }
const priorityColor = { alta: '#e74c3c', media: '#f39c12', baixa: '#27ae60' }
const typeEmoji = { birthday: '🎂', date: '🍷', holiday: '🌿', medical: '🏥', other: '📌' }

function getTime() {
  return new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

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

  // Load profile
  useEffect(() => {
    const init = async () => {
      // Get or create profile
      let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) {
        const name = user.email.split('@')[0]
        await supabase.from('profiles').insert({ id: user.id, name, avatar: '👤' })
        prof = { id: user.id, name, avatar: '👤', availability: 'disponivel' }
      }
      setProfile(prof)

      // Load all data
      const [{ data: msgs }, { data: tks }, { data: evs }, { data: profs }] = await Promise.all([
        supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(100),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('date', { ascending: true }),
        supabase.from('profiles').select('*'),
      ])

      setMessages(msgs || [])
      setTasks(tks || [])
      setEvents(evs || [])
      const profMap = {}
      ;(profs || []).forEach(p => { profMap[p.id] = p })
      setProfiles(profMap)
      setLoading(false)
    }
    init()
  }, [user])

  // Real-time subscriptions
  useEffect(() => {
    const msgSub = supabase.channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        setMessages(m => [...m, payload.new])
      }).subscribe()

    const taskSub = supabase.channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
        setTasks(data || [])
      }).subscribe()

    const eventSub = supabase.channel('events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => {
        const { data } = await supabase.from('events').select('*').order('date', { ascending: true })
        setEvents(data || [])
      }).subscribe()

    const profSub = supabase.channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
        const { data } = await supabase.from('profiles').select('*')
        const profMap = {}
        ;(data || []).forEach(p => { profMap[p.id] = p })
        setProfiles(profMap)
      }).subscribe()

    return () => {
      supabase.removeChannel(msgSub)
      supabase.removeChannel(taskSub)
      supabase.removeChannel(eventSub)
      supabase.removeChannel(profSub)
    }
  }, [])

  // Auto scroll chat
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showNotif = (msg) => {
    setBotNotif(msg)
    setTimeout(() => setBotNotif(''), 4000)
  }

  const sendMessage = async () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')

    // Check for bot command
    const result = processCommand(text)

    if (result.action !== 'message') {
      // Handle bot actions
      if (result.action === 'create_event') {
        await supabase.from('events').insert({ title: result.title, date: result.date, type: result.type })
        setTab('calendar')
      } else if (result.action === 'create_task') {
        await supabase.from('tasks').insert({ text: result.text, priority: result.priority, author_id: user.id })
        setTab('tasks')
      } else if (result.action === 'set_availability') {
        await supabase.from('profiles').update({ availability: result.status }).eq('id', user.id)
        setProfile(p => ({ ...p, availability: result.status }))
      } else if (result.action === 'show_tasks') {
        setTab('tasks')
      } else if (result.action === 'show_calendar') {
        setTab('calendar')
      }

      // Send bot reply as message
      if (result.message) {
        await supabase.from('messages').insert({ user_id: null, text: `🤖 ${result.message}` })
        showNotif(result.message)
      }
    }

    // Always send the original message
    await supabase.from('messages').insert({ user_id: user.id, text })
  }

  const addTask = async () => {
    if (!taskInput.trim()) return
    await supabase.from('tasks').insert({ text: taskInput.trim(), author_id: user.id, priority: 'media' })
    setTaskInput('')
  }

  const toggleTask = async (id, done) => {
    await supabase.from('tasks').update({ done: !done }).eq('id', id)
  }

  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
  }

  const updateAvailability = async (status) => {
    await supabase.from('profiles').update({ availability: status }).eq('id', user.id)
    setProfile(p => ({ ...p, availability: status }))
  }

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const calDays = []
  for (let i = 0; i < firstDay; i++) calDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i)

  const getEventsForDay = (day) => {
    if (!day) return []
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr || e.date?.startsWith(dateStr))
  }

  const today = new Date()
  const isToday = (day) => day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()

  const otherProfiles = Object.values(profiles).filter(p => p.id !== user.id)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a0a, #2d1b2e, #0d1a2d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0a882', fontFamily: 'Georgia, serif', fontSize: 18 }}>
      ❤️ A carregar...
    </div>
  )

  return (
    <div style={{
      fontFamily: 'Georgia, serif',
      background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1b2e 50%, #0d1a2d 100%)',
      minHeight: '100vh', color: '#f0e6d3',
      display: 'flex', flexDirection: 'column',
      maxWidth: 480, margin: '0 auto', position: 'relative',
    }}>
      <div style={{ position: 'fixed', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,57,43,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -50, left: -80, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(142,68,173,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <header style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(240,230,211,0.1)', position: 'sticky', top: 0, background: 'rgba(26,10,10,0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#c0a882', textTransform: 'uppercase' }}>Nós dois</div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 'normal', color: '#f0e6d3' }}>❤️ CasalApp</h1>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px', color: '#7a6a5a', fontSize: 11, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            Sair
          </button>
        </div>

        {/* Availability */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          {profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>{profile.avatar}</span>
              <div>
                <div style={{ fontSize: 11, color: '#f0e6d3' }}>{profile.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: availColors[profile.availability || 'disponivel'] }} />
                  <span style={{ fontSize: 10, color: availColors[profile.availability || 'disponivel'] }}>{availLabels[profile.availability || 'disponivel']}</span>
                </div>
              </div>
            </div>
          )}
          {otherProfiles.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>{p.avatar}</span>
              <div>
                <div style={{ fontSize: 11, color: '#f0e6d3' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: availColors[p.availability || 'disponivel'] }} />
                  <span style={{ fontSize: 10, color: availColors[p.availability || 'disponivel'] }}>{availLabels[p.availability || 'disponivel']}</span>
                </div>
              </div>
            </div>
          ))}
          <select value={profile?.availability || 'disponivel'} onChange={e => updateAvailability(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#f0e6d3', fontSize: 11, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Georgia, serif', marginLeft: 'auto' }}>
            <option value="disponivel">✅ Disponível</option>
            <option value="ocupado">🔴 Ocupado</option>
            <option value="talvez">🟡 Talvez</option>
          </select>
        </div>
      </header>

      {/* Bot notif */}
      {botNotif && (
        <div style={{ background: 'rgba(39,174,96,0.15)', border: '1px solid rgba(39,174,96,0.3)', padding: '8px 16px', fontSize: 12, textAlign: 'center', color: '#2ecc71', zIndex: 9 }}>
          {botNotif}
        </div>
      )}

      {/* Tabs */}
      <nav style={{ display: 'flex', borderBottom: '1px solid rgba(240,230,211,0.1)', position: 'sticky', top: 120, background: 'rgba(26,10,10,0.95)', backdropFilter: 'blur(10px)', zIndex: 9 }}>
        {[{ id: 'chat', icon: '💬', label: 'Chat' }, { id: 'tasks', icon: '✅', label: 'Tarefas' }, { id: 'calendar', icon: '📅', label: 'Calendário' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === t.id ? '2px solid #c0392b' : '2px solid transparent',
            color: tab === t.id ? '#f0e6d3' : '#7a6a5a',
            fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Georgia, serif', transition: 'all 0.2s',
          }}>
            <div style={{ fontSize: 16 }}>{t.icon}</div>{t.label}
          </button>
        ))}
      </nav>

      {/* CHAT TAB */}
      {tab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
          <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: '#5a4a3a' }}>
            🤖 Bot: "marca jantar amanhã" · "adiciona tarefa: comprar pão" · "estou ocupado" · "ajuda"
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(msg => {
              const isMe = msg.user_id === user.id
              const isBot = msg.user_id === null
              const sender = profiles[msg.user_id]
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{isBot ? '🤖' : (sender?.avatar || '👤')}</span>
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isBot ? 'rgba(142,68,173,0.25)' : isMe ? 'linear-gradient(135deg, #8e1a1a, #c0392b)' : 'rgba(255,255,255,0.08)',
                    border: isBot ? '1px solid rgba(142,68,173,0.35)' : 'none',
                    fontSize: 14, lineHeight: 1.5, color: '#f0e6d3',
                    whiteSpace: 'pre-line',
                  }}>
                    {!isMe && !isBot && <div style={{ fontSize: 10, color: '#c0a882', marginBottom: 4 }}>{sender?.name || 'Parceiro'}</div>}
                    {msg.text}
                    <div style={{ fontSize: 10, color: 'rgba(240,230,211,0.35)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                      {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEnd} />
          </div>
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, background: 'rgba(26,10,10,0.9)' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Mensagem ou comando do bot..."
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '10px 16px', color: '#f0e6d3', fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none' }} />
            <button onClick={sendMessage} style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #8e1a1a, #c0392b)', border: 'none', cursor: 'pointer', fontSize: 16, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {tab === 'tasks' && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={taskInput} onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Nova tarefa..."
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '10px 16px', color: '#f0e6d3', fontSize: 14, fontFamily: 'Georgia, serif', outline: 'none' }} />
            <button onClick={addTask} style={{ padding: '10px 16px', borderRadius: 24, background: 'linear-gradient(135deg, #5b1a7a, #8e44ad)', border: 'none', cursor: 'pointer', color: 'white', fontSize: 13, fontFamily: 'Georgia, serif' }}>+ Adicionar</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ l: 'Total', v: tasks.length, c: '#c0a882' }, { l: 'Feitas', v: tasks.filter(t => t.done).length, c: '#27ae60' }, { l: 'Por fazer', v: tasks.filter(t => !t.done).length, c: '#e74c3c' }].map(s => (
              <div key={s.l} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize: 22, fontWeight: 'bold', color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: '#7a6a5a', textTransform: 'uppercase', letterSpacing: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
          {tasks.map(task => {
            const author = profiles[task.author_id]
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: task.done ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', opacity: task.done ? 0.6 : 1 }}>
                <button onClick={() => toggleTask(task.id, task.done)} style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${task.done ? '#27ae60' : 'rgba(255,255,255,0.25)'}`, background: task.done ? '#27ae60' : 'transparent', cursor: 'pointer', fontSize: 12, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {task.done ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, textDecoration: task.done ? 'line-through' : 'none', color: '#f0e6d3' }}>{task.text}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {author && <span style={{ fontSize: 10, color: '#c0a882' }}>{author.avatar} {author.name}</span>}
                    <span style={{ fontSize: 10, color: priorityColor[task.priority], background: `${priorityColor[task.priority]}20`, padding: '1px 6px', borderRadius: 8 }}>{task.priority}</span>
                  </div>
                </div>
                {task.author_id === user.id && (
                  <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 18 }}>×</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div style={{ padding: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0a882', fontSize: 22 }}>‹</button>
            <div style={{ fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: '#f0e6d3' }}>{MONTH_NAMES[calMonth]} {calYear}</div>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0a882', fontSize: 22 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAY_NAMES.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#5a4a3a', padding: '4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {calDays.map((day, i) => {
              const dayEvents = getEventsForDay(day)
              const isTod = isToday(day)
              const isSel = selectedDay === day
              return (
                <div key={i} onClick={() => day && setSelectedDay(isSel ? null : day)} style={{ minHeight: 46, padding: '4px 2px', borderRadius: 10, textAlign: 'center', background: isSel ? 'rgba(192,57,43,0.25)' : isTod ? 'rgba(192,57,43,0.12)' : day ? 'rgba(255,255,255,0.03)' : 'transparent', border: isTod ? '1px solid rgba(192,57,43,0.4)' : isSel ? '1px solid rgba(192,57,43,0.6)' : '1px solid transparent', cursor: day ? 'pointer' : 'default' }}>
                  {day && <>
                    <div style={{ fontSize: 13, color: isTod ? '#e74c3c' : '#f0e6d3', fontWeight: isTod ? 'bold' : 'normal' }}>{day}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', marginTop: 2 }}>
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} style={{ width: 5, height: 5, borderRadius: '50%', background: ev.type === 'birthday' ? '#e74c3c' : ev.type === 'date' ? '#8e44ad' : ev.type === 'holiday' ? '#27ae60' : ev.type === 'medical' ? '#3498db' : '#f39c12' }} />
                      ))}
                    </div>
                  </>}
                </div>
              )
            })}
          </div>

          {selectedDay && (
            <div style={{ marginTop: 14, padding: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.09)' }}>
              <div style={{ fontSize: 12, color: '#c0a882', marginBottom: 10, letterSpacing: 2, textTransform: 'uppercase' }}>{selectedDay} de {MONTH_NAMES[calMonth]}</div>
              {getEventsForDay(selectedDay).length === 0
                ? <div style={{ fontSize: 13, color: '#5a4a3a' }}>Nenhum evento neste dia</div>
                : getEventsForDay(selectedDay).map(ev => (
                  <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 18 }}>{typeEmoji[ev.type] || '📌'}</span>
                    <span style={{ fontSize: 14, color: '#f0e6d3' }}>{ev.title}</span>
                  </div>
                ))
              }
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 10, color: '#5a4a3a', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Próximos eventos</div>
            {events.filter(e => e.date >= new Date().toISOString().split('T')[0]).slice(0, 6).map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', marginBottom: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 20 }}>{typeEmoji[ev.type] || '📌'}</span>
                <div>
                  <div style={{ fontSize: 14, color: '#f0e6d3' }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: '#5a4a3a', marginTop: 2 }}>
                    {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

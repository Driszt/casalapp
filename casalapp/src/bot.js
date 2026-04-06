const hoje = () => new Date()

function parseDate(text) {
  const t = text.toLowerCase()
  const now = hoje()
  if (t.includes('amanhã') || t.includes('amanha')) { const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] }
  if (t.includes('hoje')) return now.toISOString().split('T')[0]
  if (t.includes('depois de amanhã') || t.includes('depois de amanha')) { const d = new Date(now); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0] }
  if (t.includes('próxima semana') || t.includes('proxima semana') || t.includes('semana que vem')) { const d = new Date(now); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] }
  if (t.includes('fim de semana')) { const d = new Date(now); const day = d.getDay(); d.setDate(d.getDate() + (day === 6 ? 7 : 6 - day)); return d.toISOString().split('T')[0] }
  const dias = { 'segunda': 1, 'terça': 2, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6, 'domingo': 0 }
  for (const [nome, num] of Object.entries(dias)) {
    if (t.includes(nome)) { const d = new Date(now); let diff = num - d.getDay(); if (diff <= 0) diff += 7; d.setDate(d.getDate() + diff); return d.toISOString().split('T')[0] }
  }
  const meses = { 'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4, 'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12 }
  for (const [nome, num] of Object.entries(meses)) {
    if (t.includes(nome)) {
      const dayMatch = t.match(/dia\s+(\d{1,2})|(\d{1,2})\s+de\s+/i)
      const day = dayMatch ? parseInt(dayMatch[1] || dayMatch[2]) : 1
      const year = now.getMonth() + 1 > num ? now.getFullYear() + 1 : now.getFullYear()
      return `${year}-${String(num).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }
  const dayMatch = t.match(/dia\s+(\d{1,2})/i)
  if (dayMatch) return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(dayMatch[1]).padStart(2, '0')}`
  const dateMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})/)
  if (dateMatch) return `${now.getFullYear()}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[1]).padStart(2, '0')}`
  return null
}

function detectType(t) {
  if (t.includes('aniversário') || t.includes('aniversario')) return 'birthday'
  if (t.includes('jantar') || t.includes('almoço') || t.includes('almoco') || t.includes('romantico') || t.includes('romântico')) return 'date'
  if (t.includes('feriado') || t.includes('férias') || t.includes('ferias')) return 'holiday'
  if (t.includes('consulta') || t.includes('médico') || t.includes('medico')) return 'medical'
  return 'other'
}

function detectPriority(t) {
  if (t.includes('urgente') || t.includes('importante') || t.includes('hoje')) return 'alta'
  if (t.includes('quando puder') || t.includes('sem pressa')) return 'baixa'
  return 'media'
}

function cleanTitle(text, words) {
  let t = text
  ;[...words, 'no dia', 'às', 'as', 'para', 'amanhã', 'hoje', 'dia', 'semana'].forEach(w => { t = t.replace(new RegExp(w, 'gi'), '') })
  t = t.replace(/\d{1,2}[\/\-]\d{1,2}/g, '').replace(/\d{1,2}h(\d{2})?/g, '').replace(/\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi, '').replace(/\s+/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1) || 'Evento'
}

export function processCommand(text) {
  const t = text.toLowerCase().trim()
  const eventKw = ['marca', 'marcar', 'reserva', 'reservar', 'agenda', 'agendar', 'evento', 'jantar', 'almoço', 'almoco', 'consulta', 'aniversário', 'aniversario']
  const taskKw = ['tarefa', 'adiciona', 'adicionar', 'não esquecer', 'nao esquecer', 'preciso', 'comprar', 'tratar', 'fazer', 'falta', 'anota']
  if (eventKw.some(k => t.includes(k))) {
    const date = parseDate(t)
    const title = cleanTitle(text, eventKw)
    if (date) return { action: 'create_event', title, date, type: detectType(t), message: `📅 "${title}" marcado para ${new Date(date + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}!` }
    return { action: 'error', message: '📅 Não encontrei data. Tenta: "marca jantar amanhã" ou "marca consulta dia 15"' }
  }
  if (taskKw.some(k => t.includes(k))) {
    const taskText = cleanTitle(text, taskKw)
    return { action: 'create_task', text: taskText || text, priority: detectPriority(t), message: `✅ Tarefa adicionada: "${taskText}"!` }
  }
  if (t.includes('estou disponível') || t.includes('estou livre') || t.includes('estou disponivel')) return { action: 'set_availability', status: 'disponivel', message: '🟢 Estado: Disponível!' }
  if (t.includes('estou ocupado') || t.includes('não posso') || t.includes('nao posso')) return { action: 'set_availability', status: 'ocupado', message: '🔴 Estado: Ocupado!' }
  if (t.includes('talvez') || t.includes('não sei') || t.includes('depende')) return { action: 'set_availability', status: 'talvez', message: '🟡 Estado: Talvez!' }
  if (t.includes('ajuda') || t.includes('comandos')) return { action: 'help', message: `🤖 Comandos disponíveis:\n\n📅 Eventos: "marca jantar amanhã", "reserva consulta dia 15 de maio"\n✅ Tarefas: "adiciona tarefa: comprar pão", "não esquecer: ligar ao médico"\n👤 Disponibilidade: "estou ocupado", "estou livre"` }
  return { action: 'message' }
}

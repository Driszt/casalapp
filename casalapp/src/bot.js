// Bot inteligente 100% offline - sem internet necessária

const hoje = () => new Date()

function parseDate(text) {
  const t = text.toLowerCase()
  const now = hoje()

  // Amanhã
  if (t.includes('amanhã')) {
    const d = new Date(now); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  // Hoje
  if (t.includes('hoje')) {
    return now.toISOString().split('T')[0]
  }

  // Depois de amanhã
  if (t.includes('depois de amanhã') || t.includes('depois de amanha')) {
    const d = new Date(now); d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  }

  // Próxima semana
  if (t.includes('próxima semana') || t.includes('proxima semana') || t.includes('semana que vem')) {
    const d = new Date(now); d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }

  // Próximo fim de semana
  if (t.includes('fim de semana')) {
    const d = new Date(now)
    const day = d.getDay()
    const daysUntilSat = day === 6 ? 7 : 6 - day
    d.setDate(d.getDate() + daysUntilSat)
    return d.toISOString().split('T')[0]
  }

  // Dias da semana
  const dias = { 'segunda': 1, 'terça': 2, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6, 'domingo': 0 }
  for (const [nome, num] of Object.entries(dias)) {
    if (t.includes(nome)) {
      const d = new Date(now)
      const current = d.getDay()
      let diff = num - current
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() + diff)
      return d.toISOString().split('T')[0]
    }
  }

  // Meses por nome
  const meses = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4,
    'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
    'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
  }

  for (const [nome, num] of Object.entries(meses)) {
    if (t.includes(nome)) {
      const dayMatch = t.match(/dia\s+(\d{1,2})|(\d{1,2})\s+de\s+/i)
      const day = dayMatch ? parseInt(dayMatch[1] || dayMatch[2]) : 1
      const year = now.getMonth() + 1 > num ? now.getFullYear() + 1 : now.getFullYear()
      return `${year}-${String(num).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  // Dia X do mês atual
  const dayMatch = t.match(/dia\s+(\d{1,2})/i)
  if (dayMatch) {
    const day = parseInt(dayMatch[1])
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `${year}-${month}-${String(day).padStart(2, '0')}`
  }

  // Data no formato DD/MM ou DD-MM
  const dateMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})/)
  if (dateMatch) {
    const day = String(dateMatch[1]).padStart(2, '0')
    const month = String(dateMatch[2]).padStart(2, '0')
    return `${now.getFullYear()}-${month}-${day}`
  }

  return null
}

function detectType(text) {
  const t = text.toLowerCase()
  if (t.includes('aniversário') || t.includes('aniversario') || t.includes('anos')) return 'birthday'
  if (t.includes('jantar') || t.includes('almoço') || t.includes('almoco') || t.includes('romantico') || t.includes('romântico')) return 'date'
  if (t.includes('feriado') || t.includes('férias') || t.includes('ferias') || t.includes('folga')) return 'holiday'
  if (t.includes('consulta') || t.includes('médico') || t.includes('medico') || t.includes('hospital')) return 'medical'
  return 'other'
}

function detectPriority(text) {
  const t = text.toLowerCase()
  if (t.includes('urgente') || t.includes('importante') || t.includes('já') || t.includes('hoje')) return 'alta'
  if (t.includes('quando puder') || t.includes('sem pressa') || t.includes('eventualmente')) return 'baixa'
  return 'media'
}

function extractTitle(text, removeWords = []) {
  let title = text
  const toRemove = [
    'marca', 'marcar', 'adiciona', 'adicionar', 'cria', 'criar',
    'não esquecer', 'nao esquecer', 'lembra', 'lembrar', 'lembra-me',
    'preciso', 'preciso de', 'tarefa', 'evento', 'nota', 'anota',
    'avisa-me', 'avisa', 'no dia', 'às', 'as', 'para', 'um', 'uma',
    ...removeWords
  ]
  toRemove.forEach(w => {
    title = title.replace(new RegExp(w, 'gi'), '')
  })
  // Remove datas e horas
  title = title.replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/g, '')
  title = title.replace(/\d{1,2}h(\d{2})?/g, '')
  title = title.replace(/dia\s+\d{1,2}/gi, '')
  title = title.replace(/\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi, '')
  title = title.replace(/\b(amanhã|hoje|amanha|semana)\b/gi, '')
  title = title.replace(/\s+/g, ' ').trim()
  return title.charAt(0).toUpperCase() + title.slice(1) || 'Evento'
}

export function processCommand(text) {
  const t = text.toLowerCase().trim()

  // ── CRIAR EVENTO ──────────────────────────────────────────────
  const eventKeywords = ['marca', 'marcar', 'reserva', 'reservar', 'agenda', 'agendar', 'evento', 'jantar', 'almoço', 'almoco', 'consulta', 'aniversário', 'aniversario']
  const isEvent = eventKeywords.some(k => t.includes(k))

  if (isEvent) {
    const date = parseDate(t)
    const title = extractTitle(text, eventKeywords)
    const type = detectType(t)
    if (date) {
      return {
        action: 'create_event',
        title: title || 'Evento',
        date,
        type,
        message: `📅 Evento "${title}" marcado para ${new Date(date + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}!`
      }
    }
    return {
      action: 'error',
      message: '📅 Percebo que queres marcar um evento, mas não encontrei uma data. Tenta: "marca jantar amanhã" ou "marca consulta dia 15"'
    }
  }

  // ── CRIAR TAREFA ──────────────────────────────────────────────
  const taskKeywords = ['tarefa', 'adiciona', 'adicionar', 'não esquecer', 'nao esquecer', 'preciso', 'comprar', 'tratar', 'fazer', 'falta', 'anota', 'nota']
  const isTask = taskKeywords.some(k => t.includes(k))

  if (isTask) {
    const priority = detectPriority(t)
    const taskText = extractTitle(text, taskKeywords)
    return {
      action: 'create_task',
      text: taskText || text,
      priority,
      message: `✅ Tarefa adicionada: "${taskText}"!`
    }
  }

  // ── DISPONIBILIDADE ───────────────────────────────────────────
  if (t.includes('estou disponível') || t.includes('estou livre') || t.includes('estou disponivel')) {
    return { action: 'set_availability', status: 'disponivel', message: '🟢 Estás agora como Disponível!' }
  }
  if (t.includes('estou ocupado') || t.includes('não posso') || t.includes('nao posso') || t.includes('estou a trabalhar')) {
    return { action: 'set_availability', status: 'ocupado', message: '🔴 Estás agora como Ocupado!' }
  }
  if (t.includes('talvez') || t.includes('não sei') || t.includes('nao sei') || t.includes('depende')) {
    return { action: 'set_availability', status: 'talvez', message: '🟡 Estás agora como Talvez!' }
  }

  // ── VER TAREFAS ───────────────────────────────────────────────
  if (t.includes('tarefas') && (t.includes('ver') || t.includes('mostra') || t.includes('lista') || t.includes('quais'))) {
    return { action: 'show_tasks', message: '📋 A abrir a lista de tarefas...' }
  }

  // ── VER CALENDÁRIO ────────────────────────────────────────────
  if ((t.includes('semana') || t.includes('mês') || t.includes('mes') || t.includes('calendário') || t.includes('calendario')) && (t.includes('o que') || t.includes('ver') || t.includes('mostra') || t.includes('temos'))) {
    return { action: 'show_calendar', message: '📅 A abrir o calendário...' }
  }

  // ── AJUDA ─────────────────────────────────────────────────────
  if (t.includes('ajuda') || t.includes('help') || t.includes('o que sabes') || t.includes('comandos')) {
    return {
      action: 'help',
      message: `🤖 Aqui está o que sei fazer:

📅 **Eventos:** "marca jantar amanhã", "reserva consulta dia 15 de maio"
✅ **Tarefas:** "adiciona tarefa: comprar pão", "não esquecer: ligar ao médico"
👤 **Disponibilidade:** "estou ocupado", "estou livre", "talvez"
📋 **Ver tarefas:** "mostra as tarefas"
📆 **Ver calendário:** "o que temos esta semana"

Datas que percebo: hoje, amanhã, depois de amanhã, próxima semana, fim de semana, segunda a domingo, dia 15, 15/05, janeiro a dezembro`
    }
  }

  // ── MENSAGEM NORMAL ───────────────────────────────────────────
  return { action: 'message' }
}

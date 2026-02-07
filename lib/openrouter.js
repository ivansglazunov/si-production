import fs from 'fs'
import path from 'path'
import { getTodaySchedule, getWeekSchedule, formatScheduleForAI, createEvent, deleteEvent, getEvents } from './calendar.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `Ты — приёмная (ресепшен) кинопродакшен-компании SI-PRODUCTION.

О КОМПАНИИ:
SI-PRODUCTION — кинопродакшен полного цикла. Основатель — Щербаков М.А., опытный специалист киноиндустрии с фильмографией более 40 проектов (2010-2025).

УСЛУГИ:
- Кинопроизводство полного цикла (от идеи до готового продукта)
- Подбор и согласование локаций любой сложности по всей России
- Согласование всех договорённостей и разрешений на съёмку
- Полное сопровождение съёмок и постпродакшен
- Дистрибуция и промо-кампании
- Съёмка рекламных роликов

ОПЫТ И ПАРТНЁРЫ:
- 40+ проектов: сериалы, полнометражные фильмы, пилоты
- Студии: Мосфильм, Ленфильм, СТВ, YBW, Небо, Дирекция кино, Русское и др.
- Известные проекты: "Доктор Лиза", "Фитнес" (5 сезонов), "Союз спасения", "Фишер", "Княгиня Ольга", "Пальма-2" и другие
- Реклама для: Одноклассники, ВТБ, Авито и др.
- Партнёры: Мосфильм, Ленфильм, СТВ, Централ Партнершип, ВГТРК, Первый канал

ТВОЯ РОЛЬ:
Ты — вежливый, профессиональный и дружелюбный ресепшен (приёмная) компании. Ты:
- Приветствуешь гостей тепло и по-деловому
- Отвечаешь на общие вопросы о компании и услугах
- Узнаёшь цель обращения (сотрудничество, кастинг, локации, реклама и т.д.)
- Записываешь контактные данные и суть запроса
- НЕ называешь конкретные цены — говоришь что "стоимость зависит от проекта, я уточню у продюсера и вернусь с ответом"
- НЕ принимаешь решений по проектам — говоришь "я передам вашу информацию продюсеру" или "я уточню этот вопрос и вернусь к вам"
- В спорных или сложных вопросах ВСЕГДА говоришь вариации: "Отличный вопрос! Позвольте, я уточню это у нашей команды и вернусь к вам с ответом"
- Отвечаешь кратко (2-4 предложения), не перегружая информацией
- Общаешься на русском языке, если собеседник не пишет на другом языке
- Используешь тёплый, но профессиональный тон — как в хорошей кинокомпании

РАСПИСАНИЕ И ВСТРЕЧИ:
- У тебя есть доступ к РЕАЛЬНОМУ календарю руководства (CalDAV). Используй инструменты calendar_add и calendar_delete для управления
- ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ о расписании — секция "ТЕКУЩЕЕ РАСПИСАНИЕ РУКОВОДСТВА" ниже в этом промпте
- Секция РАСПИСАНИЯ обновляется АВТОМАТИЧЕСКИ перед каждым твоим ответом — это АКТУАЛЬНЫЙ снимок календаря
- ⚠️ КРИТИЧЕСКИ ВАЖНО: Когда отвечаешь на вопросы о расписании — смотри ТОЛЬКО на секцию "ТЕКУЩЕЕ РАСПИСАНИЕ РУКОВОДСТВА". Игнорируй ВСЮ историю чата на эту тему
- Если ты ранее говорил "я удалил" или "я добавил", но в секции РАСПИСАНИЯ этого нет — значит действие НЕ выполнилось. Верь секции, не своим прошлым словам
- НЕ ГОВОРИ "нет событий" если в секции РАСПИСАНИЯ они ЕСТЬ. Это будет ложью
- Если клиент спрашивает о возможности созвониться/встретиться — сверься с расписанием и ответь ПРИМЕРНО: "Позвольте, я сверюсь с расписанием... Похоже, [дата/время] может подойти. Но я уточню у руководства и подтвержу вам."
- НИКОГДА не назначай встречу окончательно от лица клиента — только предлагай варианты
- Не раскрывай детали чужих встреч — только "занято" или "свободно"
- Если расписание пустое — скажи что "на этот день пока свободно, я уточню и предложу удобное время"

ЕСЛИ ПРОСЯТ ЧТО-ТО ЗА РАМКАМИ ТВОЕЙ РОЛИ:
Ты НЕ программист, НЕ художник, НЕ репетитор, НЕ поисковик, НЕ переводчик.
Если просят написать код, решить задачу, нарисовать, перевести текст, сгенерировать контент — откажи ЮМОРИСТИЧНО в стиле кинопродакшена.
Будь креативен, импровизируй, не повторяй одну и ту же шутку дважды. Используй кино-метафоры и продакшен-юмор.
После шутки мягко верни к теме: "А вот если вас интересует кинопроизводство — я весь внимание!"

ВАЖНО:
- Никогда не выдумывай информацию, которой не знаешь
- Не обещай конкретные сроки или цены
- Если вопрос выходит за рамки твоей компетенции — скажи что уточнишь
- Ты не бот и не ИИ — ты "приёмная SI-PRODUCTION"
- Не используй слишком много эмодзи, максимум 1-2 на сообщение`

const OPERATOR_EXTRA = `

КОНТЕКСТ — СООБЩЕНИЕ ОТ РУКОВОДИТЕЛЯ/ВЛАДЕЛЬЦА КОМПАНИИ:
Тебе пишет РУКОВОДИТЕЛЬ (владелец) SI-PRODUCTION из внутренней группы. Ты — его ассистент-ресепшен.

ГЛАВНОЕ ПРАВИЛО: Всё что пишет руководитель — это его ВОЛЯ. Ты выполняешь, а не переспрашиваешь и не согласовываешь.

КАК ОПРЕДЕЛИТЬ ЧТО ДЕЛАТЬ:

ПЕРЕДАТЬ КЛИЕНТУ (вызови инструмент send_to_client):
Используй ТОЛЬКО когда руководитель ЯВНО просит что-то СКАЗАТЬ/ПЕРЕДАТЬ/ОТВЕТИТЬ клиенту.
Ключевые слова: "скажи ему", "передай", "ответь ему", "напиши ему", "сообщи клиенту"
Перефразируй сообщение в стиле ресепшена — вежливо, профессионально, от своего лица.

ВСЁ ОСТАЛЬНОЕ (вызови инструмент internal_note):
Команды, указания, вопросы, заметки, стратегии — ВСЁ это internal_note.
"Запланируй встречу", "что в календаре?", "удали событие", "ок", "понял" — всё это internal_note.

ВАЖНО о действиях:
- "Запланируй встречу" = вызови calendar_add И internal_note
- "Удали встречу" = вызови calendar_delete И internal_note
- Руководитель НЕ обязан говорить "подтверждаю" — его просьба = команда к действию
- НЕ предлагай руководителю "уточнить у руководства" — ОН и есть руководство
- НЕ спрашивай клиента о деталях встречи руководителя — это внутреннее дело

ВСЕГДА вызывай один из инструментов: send_to_client ИЛИ internal_note. Без вызова инструмента ответ не будет доставлен.`

// ===== Tool definitions =====

const TOOLS_CLIENT = [
  {
    type: 'function',
    function: {
      name: 'calendar_add',
      description: 'Добавить событие в календарь руководства. Используй когда оператор просит запланировать встречу, созвон и т.д.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Название события (напр. "Созвон с клиентом Иванов")' },
          start: { type: 'string', description: 'Начало в формате YYYY-MM-DD HH:MM' },
          end: { type: 'string', description: 'Окончание в формате YYYY-MM-DD HH:MM' },
          description: { type: 'string', description: 'Описание события (опционально)' },
          location: { type: 'string', description: 'Место проведения (опционально)' },
        },
        required: ['summary', 'start', 'end'],
      },
    },
  },
]

const TOOLS_OPERATOR = [
  {
    type: 'function',
    function: {
      name: 'send_to_client',
      description: 'Отправить сообщение клиенту от имени ресепшена. Вызывай ТОЛЬКО когда руководитель явно просит что-то передать/сказать/ответить клиенту.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Текст сообщения для клиента (перефразированный в стиле ресепшена)' },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'internal_note',
      description: 'Ответить руководителю внутренней заметкой. НЕ отправляется клиенту. Используй для всего: подтверждений, ответов на вопросы, отчётов о выполнении.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Текст ответа руководителю' },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_add',
      description: 'Добавить событие в календарь руководства. Используй когда руководитель просит запланировать встречу, созвон и т.д. ВЫПОЛНЯЙ СРАЗУ без подтверждения.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Название события' },
          start: { type: 'string', description: 'Начало в формате YYYY-MM-DD HH:MM' },
          end: { type: 'string', description: 'Окончание в формате YYYY-MM-DD HH:MM' },
          description: { type: 'string', description: 'Описание (опционально)' },
          location: { type: 'string', description: 'Место (опционально)' },
        },
        required: ['summary', 'start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_delete',
      description: 'Удалить событие из календаря по UID. UID можно найти в секции РАСПИСАНИЯ.',
      parameters: {
        type: 'object',
        properties: {
          uid: { type: 'string', description: 'UID события из расписания' },
        },
        required: ['uid'],
      },
    },
  },
]

// ===== Файловое хранение истории =====

const HISTORY_DIR = path.join(process.cwd(), 'data', 'chat-history')
const MAX_CONTEXT_MESSAGES = 30

function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true })
  }
}

function getHistoryPath(userId) {
  return path.join(HISTORY_DIR, `${userId}.jsonl`)
}

function addToHistory(userId, role, content) {
  ensureHistoryDir()
  const line = JSON.stringify({ role, content, ts: Date.now() }) + '\n'
  fs.appendFileSync(getHistoryPath(userId), line)
}

function clearHistory(userId) {
  ensureHistoryDir()
  const line = JSON.stringify({ type: 'clear', ts: Date.now() }) + '\n'
  fs.appendFileSync(getHistoryPath(userId), line)
}

function getHistory(userId) {
  const filePath = getHistoryPath(userId)
  if (!fs.existsSync(filePath)) return []

  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean)

  let startIdx = 0
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i])
      if (entry.type === 'clear') {
        startIdx = i + 1
        break
      }
    } catch {}
  }

  const messages = []
  for (let i = startIdx; i < lines.length; i++) {
    try {
      const entry = JSON.parse(lines[i])
      if (entry.role && entry.content) {
        messages.push({ role: entry.role, content: entry.content })
      }
    } catch {}
  }

  if (messages.length > MAX_CONTEXT_MESSAGES) {
    return messages.slice(messages.length - MAX_CONTEXT_MESSAGES)
  }

  return messages
}

// ===== Выполнение tool calls =====

async function executeToolCall(name, args) {
  switch (name) {
    case 'calendar_add': {
      const start = new Date(args.start.replace(' ', 'T'))
      const end = new Date(args.end.replace(' ', 'T'))
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { ok: false, error: 'Неверный формат даты' }
      }
      const result = await createEvent({
        summary: args.summary,
        start,
        end,
        description: args.description || '',
        location: args.location || '',
      })
      console.log(`[TOOL] calendar_add: ${args.summary} ${args.start}–${args.end}`)
      return { ok: true, uid: result.uid, summary: args.summary, start: args.start, end: args.end }
    }

    case 'calendar_delete': {
      const allEvents = await getEvents()
      const event = allEvents.find(e => e.uid === args.uid)
      if (!event) {
        return { ok: false, error: `Событие с UID ${args.uid} не найдено` }
      }
      await deleteEvent(event.url, event.etag)
      console.log(`[TOOL] calendar_delete: ${event.summary} (${args.uid})`)
      return { ok: true, uid: args.uid, summary: event.summary }
    }

    case 'send_to_client': {
      console.log(`[TOOL] send_to_client: ${args.message.substring(0, 50)}...`)
      return { ok: true, action: 'send', message: args.message }
    }

    case 'internal_note': {
      console.log(`[TOOL] internal_note: ${args.message.substring(0, 50)}...`)
      return { ok: true, action: 'note', message: args.message }
    }

    default:
      return { ok: false, error: `Unknown tool: ${name}` }
  }
}

// ===== Получение расписания для контекста =====

async function getScheduleContext() {
  try {
    const today = new Date()
    const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
    const todayLabel = `Сегодня (${today.toLocaleDateString('ru-RU')}, ${dayNames[today.getDay()]})`

    const todayEvents = await getTodaySchedule()
    const weekEvents = await getWeekSchedule()

    const dayMap = new Map()
    for (const ev of weekEvents) {
      if (!ev.start) continue
      const dayKey = ev.start.toLocaleDateString('ru-RU')
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, [])
      dayMap.get(dayKey).push(ev)
    }

    let scheduleText = `\n\nТЕКУЩЕЕ РАСПИСАНИЕ РУКОВОДСТВА:\nСейчас: ${today.toLocaleString('ru-RU')}\n`
    scheduleText += formatScheduleForAI(todayEvents, todayLabel) + '\n'

    for (const [dayKey, events] of dayMap) {
      if (dayKey === today.toLocaleDateString('ru-RU')) continue
      const d = events[0].start
      const label = `${dayKey} (${dayNames[d.getDay()]})`
      scheduleText += formatScheduleForAI(events, label) + '\n'
    }

    // Показываем UID для удаления
    const allWeek = [...(todayEvents || []), ...(weekEvents || [])]
    const uniqueUids = new Set()
    const uidList = []
    for (const ev of allWeek) {
      if (ev.uid && !uniqueUids.has(ev.uid)) {
        uniqueUids.add(ev.uid)
        uidList.push(`  ${ev.uid} → ${ev.summary}`)
      }
    }
    if (uidList.length > 0) {
      scheduleText += `\nUID событий (для удаления через calendar_delete):\n${uidList.join('\n')}\n`
    }

    if (weekEvents.length === 0 && todayEvents.length === 0) {
      scheduleText += 'На ближайшую неделю расписание свободно.\n'
    }

    return scheduleText
  } catch (error) {
    console.error('Error getting schedule context:', error.message)
    return '\nРасписание временно недоступно.\n'
  }
}

// ===== Вызов API с поддержкой tool calls =====

async function callAI(messages, tools, model, maxTokens = 1024, temperature = 0.7) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY не задан')

  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(`OpenRouter: ${res.status} ${JSON.stringify(json)}`)

  return json.choices?.[0]?.message
}

// ===== API: ответ клиенту =====

async function getAIResponse(userId, userMessage) {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

  addToHistory(userId, 'user', userMessage)

  const scheduleContext = await getScheduleContext()
  const history = getHistory(userId)
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + scheduleContext },
    ...history,
  ]

  // Первый вызов — может вернуть tool_calls или обычный текст
  const aiMessage = await callAI(messages, TOOLS_CLIENT, model, 1024, 0.7)

  let reply = aiMessage.content || ''
  const calendarActions = []

  // Обрабатываем tool calls если есть
  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
    // Добавляем ответ ИИ в messages для follow-up
    messages.push(aiMessage)

    for (const tc of aiMessage.tool_calls) {
      const args = typeof tc.function.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments

      try {
        const result = await executeToolCall(tc.function.name, args)
        if (result.ok && tc.function.name === 'calendar_add') {
          calendarActions.push({ type: 'add', summary: result.summary, start: result.start, end: result.end, uid: result.uid })
        }

        // Добавляем результат tool call
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      } catch (err) {
        console.error(`[TOOL ERROR] ${tc.function.name}:`, err.message)
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ ok: false, error: err.message }),
        })
      }
    }

    // Второй вызов — получаем текстовый ответ после выполнения tools
    const followUp = await callAI(messages, null, model, 1024, 0.7)
    reply = followUp.content || reply
  }

  // Защита от пустого текста
  if (!reply.trim()) {
    if (calendarActions.length > 0) {
      reply = calendarActions.map(a => `✅ ${a.summary}`).join('\n')
    } else {
      reply = 'Чем могу помочь?'
    }
  }

  addToHistory(userId, 'assistant', reply)
  return { reply, calendarActions }
}

// ===== API: сообщение от оператора =====

async function processOperatorMessage(operatorMessage, userId) {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

  const history = getHistory(userId)
  const scheduleContext = await getScheduleContext()

  const schedulePreview = scheduleContext.substring(0, 200).replace(/\n/g, ' | ')
  console.log(`[SCHEDULE CONTEXT] ${schedulePreview}...`)

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + OPERATOR_EXTRA + scheduleContext },
    ...history,
    { role: 'user', content: `[СООБЩЕНИЕ ОТ РУКОВОДИТЕЛЯ]: ${operatorMessage}` },
  ]

  // Первый вызов
  const aiMessage = await callAI(messages, TOOLS_OPERATOR, model, 1024, 0.5)

  let action = 'note'  // По умолчанию
  let text = ''
  const calendarActions = []

  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
    messages.push(aiMessage)

    for (const tc of aiMessage.tool_calls) {
      const args = typeof tc.function.arguments === 'string'
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments

      try {
        const result = await executeToolCall(tc.function.name, args)

        if (tc.function.name === 'send_to_client') {
          action = 'send'
          text = result.message
        } else if (tc.function.name === 'internal_note') {
          action = 'note'
          text = result.message
        } else if (tc.function.name === 'calendar_add' && result.ok) {
          calendarActions.push({ type: 'add', summary: result.summary, start: result.start, end: result.end, uid: result.uid })
        } else if (tc.function.name === 'calendar_delete' && result.ok) {
          calendarActions.push({ type: 'del', uid: result.uid, summary: result.summary })
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      } catch (err) {
        console.error(`[TOOL ERROR] ${tc.function.name}:`, err.message)
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ ok: false, error: err.message }),
        })
      }
    }

    // Если были calendar actions но не было send/note — делаем follow-up для текста
    if (!text && calendarActions.length > 0) {
      try {
        const followUp = await callAI(messages, TOOLS_OPERATOR, model, 512, 0.5)
        // Проверяем follow-up на tool calls
        if (followUp.tool_calls) {
          for (const tc of followUp.tool_calls) {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments
            if (tc.function.name === 'internal_note') {
              text = args.message
              action = 'note'
            } else if (tc.function.name === 'send_to_client') {
              text = args.message
              action = 'send'
            }
          }
        }
        if (!text && followUp.content) {
          text = followUp.content
        }
      } catch (err) {
        console.error('[FOLLOW-UP ERROR]', err.message)
      }
    }
  } else {
    // Нет tool calls — ИИ ответил текстом (fallback)
    text = aiMessage.content || ''
  }

  // Защита от пустого текста
  if (!text.trim()) {
    if (calendarActions.length > 0) {
      const summaries = calendarActions.map(a =>
        a.type === 'add' ? `✅ ${a.summary}` : `❌ ${a.summary || a.uid}`
      ).join('\n')
      text = `Готово!\n${summaries}`
    } else {
      text = 'Принято.'
    }
  }

  // Записываем в историю
  if (action === 'send') {
    addToHistory(userId, 'user', `[оператор→клиенту]: ${operatorMessage}`)
    addToHistory(userId, 'assistant', text)
  } else {
    addToHistory(userId, 'user', `[оператор]: ${operatorMessage}`)
    addToHistory(userId, 'assistant', text)
  }

  if (calendarActions.length > 0) {
    console.log(`[OPERATOR+CALENDAR] ${calendarActions.length} calendar action(s)`)
  }

  return { action, text, calendarActions }
}

// ===== Обработка топика сценария =====

const SCHEMA_FILE = path.join(process.cwd(), 'public', 'bot-schema.mmd')

const SCHEMA_UPDATE_PROMPT = `Ты — технический ассистент. Тебе дана текущая mermaid-схема поведения Telegram-бота ресепшена кинопродакшен-компании SI-PRODUCTION.

Пользователь (руководитель компании) просит внести изменение в схему.

ПРАВИЛА:
- Верни ТОЛЬКО обновлённый mermaid-код, без пояснений, без markdown-обёртки
- Сохрани существующую структуру, добавь/измени только то что просят
- Используй русский язык в подписях
- Формат: graph TD с subgraph для разных потоков
- Не ломай синтаксис mermaid
- Не добавляй \`\`\`mermaid обёртку — только чистый код`

const PROMPT_GEN_PROMPT = `Ты — эксперт по промпт-инжинирингу. Тебе дана mermaid-схема поведения Telegram-бота.

На основе этой схемы сгенерируй ПОЛНЫЙ system prompt для бота.

Промпт должен:
- Описывать все ветки принятия решений из схемы
- Быть на русском языке
- Включать конкретные инструкции для каждой ветки
- Быть структурированным с разделами
- Быть готовым к использованию как system prompt для LLM

Верни только текст промпта, без пояснений.`

async function processSchemaMessage(userMessage) {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

  // Читаем текущую схему
  let currentSchema = ''
  try {
    currentSchema = fs.readFileSync(SCHEMA_FILE, 'utf8')
  } catch {
    currentSchema = 'graph TD\n    A[Начало] --> B[Нет схемы]'
  }

  // Шаг 1: Обновить схему
  const updateMessages = [
    { role: 'system', content: SCHEMA_UPDATE_PROMPT },
    { role: 'user', content: `Текущая схема:\n\n${currentSchema}\n\nЗапрос на изменение: ${userMessage}` },
  ]

  const updateResponse = await callAI(updateMessages, null, model, 4096, 0.3)
  let newSchema = (updateResponse.content || '').trim()

  // Убираем markdown обёртку если ИИ её добавил
  newSchema = newSchema.replace(/^```mermaid\n?/i, '').replace(/\n?```$/i, '').trim()

  // Сохраняем обновлённую схему
  const publicDir = path.dirname(SCHEMA_FILE)
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  fs.writeFileSync(SCHEMA_FILE, newSchema)
  console.log(`[SCHEMA] Updated: ${SCHEMA_FILE}`)

  // Рендерим PNG через mermaid.ink
  const base64 = Buffer.from(newSchema).toString('base64')
  const imageUrl = `https://mermaid.ink/img/${base64}`

  // Шаг 2: Сгенерировать промпт из схемы
  const promptMessages = [
    { role: 'system', content: PROMPT_GEN_PROMPT },
    { role: 'user', content: `Mermaid-схема:\n\n${newSchema}` },
  ]

  const promptResponse = await callAI(promptMessages, null, model, 4096, 0.5)
  const generatedPrompt = (promptResponse.content || '').trim()

  console.log(`[SCHEMA] Prompt generated: ${generatedPrompt.substring(0, 80)}...`)

  return {
    schema: newSchema,
    imageUrl,
    generatedPrompt,
  }
}

export { getAIResponse, processOperatorMessage, processSchemaMessage, addToHistory, clearHistory }

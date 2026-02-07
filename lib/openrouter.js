import fs from 'fs'
import path from 'path'

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

ВАЖНО:
- Никогда не выдумывай информацию, которой не знаешь
- Не обещай конкретные сроки или цены
- Если вопрос выходит за рамки твоей компетенции — скажи что уточнишь
- Ты не бот и не ИИ — ты "приёмная SI-PRODUCTION"
- Не используй слишком много эмодзи, максимум 1-2 на сообщение`

// ===== Файловое хранение истории =====
// Каждый юзер — файл data/chat-history/{userId}.jsonl
// Каждая строка — JSON: { role, content, ts }
// /clear записывает маркер { type: "clear", ts }
// При сборке контекста — читаем от конца до маркера clear

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

/**
 * Добавляет запись в историю (файл)
 */
function addToHistory(userId, role, content) {
  ensureHistoryDir()
  const line = JSON.stringify({ role, content, ts: Date.now() }) + '\n'
  fs.appendFileSync(getHistoryPath(userId), line)
}

/**
 * Записывает маркер /clear
 */
function clearHistory(userId) {
  ensureHistoryDir()
  const line = JSON.stringify({ type: 'clear', ts: Date.now() }) + '\n'
  fs.appendFileSync(getHistoryPath(userId), line)
}

/**
 * Читает историю от конца до последнего /clear (или до начала файла).
 * Возвращает массив { role, content } для контекста ИИ.
 */
function getHistory(userId) {
  const filePath = getHistoryPath(userId)
  if (!fs.existsSync(filePath)) return []

  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean)

  // Ищем последний маркер clear с конца
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

  // Берём сообщения после последнего clear
  const messages = []
  for (let i = startIdx; i < lines.length; i++) {
    try {
      const entry = JSON.parse(lines[i])
      if (entry.role && entry.content) {
        messages.push({ role: entry.role, content: entry.content })
      }
    } catch {}
  }

  // Ограничиваем количество сообщений в контексте
  if (messages.length > MAX_CONTEXT_MESSAGES) {
    return messages.slice(messages.length - MAX_CONTEXT_MESSAGES)
  }

  return messages
}

// ===== API вызовы =====

async function getAIResponse(userId, userMessage) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY не задан')

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

  // Записываем сообщение пользователя в файл
  addToHistory(userId, 'user', userMessage)

  // Собираем контекст: системный промпт + история от последнего /clear
  const history = getHistory(userId)
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
  ]

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(`OpenRouter: ${res.status} ${JSON.stringify(json)}`)

  const reply = json.choices?.[0]?.message?.content ?? ''

  // Записываем ответ бота в файл
  addToHistory(userId, 'assistant', reply)

  return reply
}

async function reformulateOperatorMessage(operatorMessage, userId) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY не задан')

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'

  const history = getHistory(userId)

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + `\n\nДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ:\nСейчас тебе пишет оператор/продюсер компании. Он отвечает клиенту через тебя.\nТвоя задача — передать суть сообщения оператора клиенту, но в СВОЁМ стиле (стиль ресепшена).\nНЕ копируй сообщение дословно — перефразируй его вежливо и профессионально.\nЕсли оператор написал коротко или грубовато — сделай это мягче и приятнее.\nЕсли оператор дал конкретную информацию (цена, сроки) — передай её точно, но в красивой обёртке.` },
    ...history,
    { role: 'user', content: `[СООБЩЕНИЕ ОТ ОПЕРАТОРА ДЛЯ ПЕРЕДАЧИ КЛИЕНТУ]: ${operatorMessage}` }
  ]

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  const json = await res.json()
  if (!res.ok) throw new Error(`OpenRouter: ${res.status} ${JSON.stringify(json)}`)

  const reply = json.choices?.[0]?.message?.content ?? ''

  // Записываем ответ бота
  addToHistory(userId, 'assistant', reply)

  return reply
}

export { getAIResponse, reformulateOperatorMessage, addToHistory, clearHistory }

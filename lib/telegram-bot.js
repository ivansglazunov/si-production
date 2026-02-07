import { Telegraf } from 'telegraf'
import fs from 'fs'
import path from 'path'
import { getAIResponse, reformulateOperatorMessage, addToHistory, clearHistory } from './openrouter.js'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

const RECEPTION_GROUP_ID = process.env.TELEGRAM_RECEPTION_GROUP_ID

const TOPICS_CACHE_FILE = path.join(process.cwd(), 'data', 'telegram-topics.json')

function loadTopicsCache() {
  try {
    if (fs.existsSync(TOPICS_CACHE_FILE)) {
      const data = fs.readFileSync(TOPICS_CACHE_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading topics cache:', error)
  }
  return {}
}

function saveTopicsCache(cache) {
  try {
    const dir = path.dirname(TOPICS_CACHE_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(TOPICS_CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch (error) {
    console.error('Error saving topics cache:', error)
  }
}

async function getOrCreateTopicForUser(userId, username, firstName, lastName) {
  const cache = loadTopicsCache()
  const cacheKey = `user_${userId}`

  if (cache[cacheKey]) {
    return cache[cacheKey]
  }

  try {
    const displayName = firstName
      ? (lastName ? `${firstName} ${lastName}` : firstName)
      : (username ? `@${username}` : `user_${userId}`)
    const topicName = username ? `${displayName} (@${username})` : displayName

    const topic = await bot.telegram.createForumTopic(
      RECEPTION_GROUP_ID,
      topicName
    )

    const topicId = topic.message_thread_id

    cache[cacheKey] = topicId
    saveTopicsCache(cache)

    return topicId
  } catch (error) {
    console.error('Error creating topic:', error)
    throw error
  }
}

function getUserIdByTopicId(topicId) {
  const cache = loadTopicsCache()
  for (const [key, cachedTopicId] of Object.entries(cache)) {
    if (cachedTopicId === topicId && key.startsWith('user_')) {
      const userId = parseInt(key.replace('user_', ''))
      return userId
    }
  }
  return null
}

/**
 * Форматирует имя пользователя для отображения в группе
 */
function formatUserName(from) {
  if (!from) return 'Неизвестный'
  const name = from.first_name || ''
  const lastName = from.last_name || ''
  const fullName = lastName ? `${name} ${lastName}` : name
  if (from.username) {
    return `${fullName} (@${from.username})`
  }
  return fullName || `user_${from.id}`
}

/**
 * Получает имя бота для отображения
 */
let botInfo = null
async function getBotName() {
  if (!botInfo) {
    botInfo = await bot.telegram.getMe()
  }
  return botInfo.first_name || botInfo.username || 'SI-Production'
}

/**
 * Отправляет сообщение пользователю в личный чат
 */
async function sendMessageToUser(userId, text) {
  try {
    await bot.telegram.sendMessage(userId, text)
  } catch (error) {
    console.error('Error sending message to user:', error)
    throw error
  }
}

/**
 * Отправляет сообщение в топик группы с указанием автора
 */
async function sendToTopic(topicId, text, authorLabel) {
  try {
    const formattedText = `<b>${authorLabel}:</b>\n${text}`
    await bot.telegram.sendMessage(
      RECEPTION_GROUP_ID,
      formattedText,
      {
        message_thread_id: topicId,
        parse_mode: 'HTML'
      }
    )
  } catch (error) {
    console.error('Error sending to topic:', error)
    throw error
  }
}

/**
 * Пересылает медиа-сообщение в топик
 */
async function forwardMediaToTopic(topicId, message, authorLabel) {
  try {
    const text = message.text || message.caption || ''
    const caption = `<b>${authorLabel}:</b>\n${text}`
    const options = {
      message_thread_id: topicId,
      parse_mode: 'HTML'
    }

    if (message.photo) {
      const photo = message.photo[message.photo.length - 1]
      await bot.telegram.sendPhoto(RECEPTION_GROUP_ID, photo.file_id, { ...options, caption })
    } else if (message.video) {
      await bot.telegram.sendVideo(RECEPTION_GROUP_ID, message.video.file_id, { ...options, caption })
    } else if (message.document) {
      await bot.telegram.sendDocument(RECEPTION_GROUP_ID, message.document.file_id, { ...options, caption })
    } else if (message.audio) {
      await bot.telegram.sendAudio(RECEPTION_GROUP_ID, message.audio.file_id, { ...options, caption })
    } else if (message.voice) {
      await bot.telegram.sendVoice(RECEPTION_GROUP_ID, message.voice.file_id, { ...options, caption })
    } else if (message.sticker) {
      // Стикер отправляем без подписи, но перед ним — кто отправил
      await sendToTopic(topicId, '[стикер]', authorLabel)
      await bot.telegram.sendSticker(RECEPTION_GROUP_ID, message.sticker.file_id, { message_thread_id: topicId })
    }
  } catch (error) {
    console.error('Error forwarding media to topic:', error)
    throw error
  }
}

// Получаем ID бота
let botId = null
async function initBotId() {
  try {
    const me = await bot.telegram.getMe()
    botId = me.id
    botInfo = me
    console.log('Bot initialized:', me.username, '(ID:', botId, ')')
  } catch (err) {
    console.error('Error getting bot info:', err)
  }
}
initBotId()

// Обработчик команды /start
bot.command('start', async (ctx) => {
  try {
    if (ctx.chat.type !== 'private') return

    const userId = ctx.from.id
    const username = ctx.from.username
    const firstName = ctx.from.first_name
    const lastName = ctx.from.last_name
    const userName = formatUserName(ctx.from)

    // Создаём топик для пользователя
    const topicId = await getOrCreateTopicForUser(userId, username, firstName, lastName)

    // Уведомляем в группу
    await sendToTopic(topicId, '/start — новый диалог начат', `👤 ${userName}`)

    // Генерируем приветствие через ИИ
    const aiReply = await getAIResponse(userId, '/start — пользователь начал диалог с ботом')

    // Отправляем приветствие пользователю
    await ctx.reply(aiReply)

    // Отправляем ответ бота в группу
    const botName = await getBotName()
    await sendToTopic(topicId, aiReply, `🤖 ${botName}`)

    console.log(`[START] ${userName} -> AI reply sent`)
  } catch (error) {
    console.error('Error processing /start:', error)
    if (ctx.chat.type === 'private') {
      await ctx.reply('Добро пожаловать в SI-Production! Чем могу помочь?')
    }
  }
})

// Обработчик команды /clear — очищает контекст ИИ для этого пользователя
bot.command('clear', async (ctx) => {
  try {
    if (ctx.chat.type !== 'private') return

    const userId = ctx.from.id
    const userName = formatUserName(ctx.from)

    // Очищаем историю в памяти ИИ
    clearHistory(userId)

    await ctx.reply('Контекст очищен. Я начинаю разговор с чистого листа. Чем могу помочь?')

    // Уведомляем в группу
    const username = ctx.from.username
    const firstName = ctx.from.first_name
    const lastName = ctx.from.last_name
    const topicId = await getOrCreateTopicForUser(userId, username, firstName, lastName)
    await sendToTopic(topicId, '/clear — контекст ИИ очищен', `👤 ${userName}`)

    console.log(`[CLEAR] ${userName} — history cleared`)
  } catch (error) {
    console.error('Error processing /clear:', error)
  }
})

// Основной обработчик сообщений
bot.on('message', async (ctx) => {
  try {
    const chatId = ctx.chat.id
    const message = ctx.message
    const chatType = ctx.chat.type

    // Игнорируем сообщения от ботов
    if (ctx.from && (ctx.from.is_bot || (botId && ctx.from.id === botId))) {
      return
    }

    // === СООБЩЕНИЕ ИЗ ГРУППЫ (из топика) ===
    if (chatType === 'supergroup' || chatType === 'group') {
      if (chatId.toString() === RECEPTION_GROUP_ID?.toString() && message.message_thread_id) {
        const topicId = message.message_thread_id
        const userId = getUserIdByTopicId(topicId)

        if (!userId) {
          console.log(`No user found for topic ${topicId}`)
          return
        }

        // Пропускаем пересланные ботом сообщения
        if (message.forward_from || message.forward_from_chat) return

        const operatorName = formatUserName(ctx.from)
        const text = message.text || message.caption || ''

        if (!text) {
          console.log(`Skipping non-text message from operator in topic ${topicId}`)
          return
        }

        console.log(`[GROUP] ${operatorName} in topic ${topicId}: ${text.substring(0, 50)}...`)

        try {
          // ИИ перефразирует сообщение оператора
          const aiReply = await reformulateOperatorMessage(text, userId)

          // Отправляем перефразированный ответ пользователю
          await sendMessageToUser(userId, aiReply)

          // Показываем в группе что бот отправил
          const botName = await getBotName()
          await sendToTopic(topicId, aiReply, `🤖 ${botName}`)

          console.log(`[GROUP->USER] Operator message reformulated and sent to user ${userId}`)
        } catch (aiError) {
          console.error('AI reformulation error, sending original:', aiError)
          // Если ИИ упал — отправляем как есть
          await sendMessageToUser(userId, text)
          await sendToTopic(topicId, `[без обработки ИИ] ${text}`, `🤖 Бот`)
        }
      }
      return
    }

    // === СООБЩЕНИЕ ИЗ ЛИЧНОГО ЧАТА ===
    if (chatType === 'private') {
      const userId = ctx.from.id
      const username = ctx.from.username
      const firstName = ctx.from.first_name
      const lastName = ctx.from.last_name
      const userName = formatUserName(ctx.from)
      const text = message.text || message.caption || ''

      console.log(`[PRIVATE] ${userName}: ${text.substring(0, 50)}...`)

      // Получаем или создаём топик
      const topicId = await getOrCreateTopicForUser(userId, username, firstName, lastName)

      // 1. Пересылаем сообщение пользователя в группу (с ником)
      if (message.photo || message.video || message.document || message.audio || message.voice || message.sticker) {
        await forwardMediaToTopic(topicId, message, `👤 ${userName}`)
      } else if (text) {
        await sendToTopic(topicId, text, `👤 ${userName}`)
      }

      // 2. Если есть текст — генерируем AI ответ
      if (text) {
        try {
          const aiReply = await getAIResponse(userId, text)

          // Отправляем ответ пользователю
          await ctx.reply(aiReply)

          // Отправляем ответ бота в группу
          const botName = await getBotName()
          await sendToTopic(topicId, aiReply, `🤖 ${botName}`)

          console.log(`[AI] Reply sent to ${userName}`)
        } catch (aiError) {
          console.error('AI error:', aiError)
          await ctx.reply('Спасибо за сообщение! Я передам его нашей команде, и мы свяжемся с вами в ближайшее время.')

          const botName = await getBotName()
          await sendToTopic(topicId, '[Ошибка ИИ] Отправлен стандартный ответ клиенту', `⚠️ ${botName}`)
        }
      } else {
        // Медиа без текста — подтверждение
        await ctx.reply('Спасибо, получили! Если нужно что-то уточнить — напишите.')

        const botName = await getBotName()
        await sendToTopic(topicId, 'Спасибо, получили! Если нужно что-то уточнить — напишите.', `🤖 ${botName}`)
      }
    }
  } catch (error) {
    console.error('Error processing message:', error)
    if (ctx.chat.type === 'private') {
      try {
        await ctx.reply('Произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.')
      } catch (e) {
        console.error('Error sending error message:', e)
      }
    }
  }
})

export {
  bot,
  getOrCreateTopicForUser,
  getUserIdByTopicId,
  sendMessageToUser,
  sendToTopic
}

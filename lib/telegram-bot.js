import { Telegraf } from 'telegraf'
import fs from 'fs'
import path from 'path'

// Инициализация бота с токеном из переменных окружения
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)

// ID группы для пересылки сообщений
const RECEPTION_GROUP_ID = process.env.TELEGRAM_RECEPTION_GROUP_ID

// Путь к файлу для хранения маппинга userId -> topicId
const TOPICS_CACHE_FILE = path.join(process.cwd(), 'data', 'telegram-topics.json')

// Загружаем кеш топиков
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

// Сохраняем кеш топиков
function saveTopicsCache(cache) {
  try {
    // Создаем директорию, если её нет
    const dir = path.dirname(TOPICS_CACHE_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(TOPICS_CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch (error) {
    console.error('Error saving topics cache:', error)
  }
}

/**
 * Получает или создает топик для пользователя в группе
 * @param {number} userId - ID пользователя
 * @param {string} username - Username пользователя (может быть null)
 * @returns {Promise<number>} - ID топика
 */
async function getOrCreateTopicForUser(userId, username) {
  const cache = loadTopicsCache()
  const cacheKey = `user_${userId}`
  
  // Проверяем, есть ли уже топик для этого пользователя
  if (cache[cacheKey]) {
    return cache[cacheKey]
  }
  
  try {
    // Формируем название топика на основе username или user ID
    const topicName = username ? `@${username}` : `user_${userId}`
    
    // Создаем форум-топик (группа должна быть форумом)
    const topic = await bot.telegram.createForumTopic(
      RECEPTION_GROUP_ID,
      topicName
    )
    
    const topicId = topic.message_thread_id
    
    // Сохраняем в кеш
    cache[cacheKey] = topicId
    saveTopicsCache(cache)
    
    return topicId
  } catch (error) {
    console.error('Error creating topic:', error)
    // Если ошибка "топик уже существует", пытаемся найти его через кеш других пользователей
    // или возвращаем ошибку
    throw error
  }
}

/**
 * Пересылает сообщение в топик группы
 * @param {number} topicId - ID топика
 * @param {Object} message - Объект сообщения от пользователя
 */
async function forwardMessageToTopic(topicId, message) {
  try {
    // Копируем текст сообщения
    const text = message.text || message.caption || ''
    
    const options = {
      message_thread_id: topicId
    }
    
    // Если есть медиа (фото, видео и т.д.), пересылаем его
    if (message.photo) {
      const photo = message.photo[message.photo.length - 1] // Берем самое большое фото
      await bot.telegram.sendPhoto(
        RECEPTION_GROUP_ID,
        photo.file_id,
        {
          ...options,
          caption: text
        }
      )
    } else if (message.video) {
      await bot.telegram.sendVideo(
        RECEPTION_GROUP_ID,
        message.video.file_id,
        {
          ...options,
          caption: text
        }
      )
    } else if (message.document) {
      await bot.telegram.sendDocument(
        RECEPTION_GROUP_ID,
        message.document.file_id,
        {
          ...options,
          caption: text
        }
      )
    } else if (message.audio) {
      await bot.telegram.sendAudio(
        RECEPTION_GROUP_ID,
        message.audio.file_id,
        {
          ...options,
          caption: text
        }
      )
    } else if (message.voice) {
      await bot.telegram.sendVoice(
        RECEPTION_GROUP_ID,
        message.voice.file_id,
        {
          ...options,
          caption: text
        }
      )
    } else if (text) {
      // Обычное текстовое сообщение
      await bot.telegram.sendMessage(
        RECEPTION_GROUP_ID,
        text,
        options
      )
    }
  } catch (error) {
    console.error('Error forwarding message:', error)
    throw error
  }
}

// Обработчик всех сообщений от пользователей
bot.on('message', async (ctx) => {
  try {
    const userId = ctx.from.id
    const username = ctx.from.username
    const message = ctx.message
    
    // Получаем или создаем топик для пользователя
    const topicId = await getOrCreateTopicForUser(userId, username)
    
    // Пересылаем сообщение в топик
    await forwardMessageToTopic(topicId, message)
    
    // Отправляем подтверждение пользователю (опционально)
    // await ctx.reply('Сообщение получено и переслано в группу')
  } catch (error) {
    console.error('Error processing message:', error)
    // Отправляем пользователю сообщение об ошибке
    try {
      await ctx.reply('Произошла ошибка при обработке сообщения. Попробуйте позже.')
    } catch (e) {
      console.error('Error sending error message:', e)
    }
  }
})

// Обработчик команды /start
bot.command('start', async (ctx) => {
  try {
    const userId = ctx.from.id
    const username = ctx.from.username
    const message = ctx.message
    
    // Обрабатываем /start как обычное сообщение
    const topicId = await getOrCreateTopicForUser(userId, username)
    await forwardMessageToTopic(topicId, message)
    
    await ctx.reply('Бот запущен! Все ваши сообщения будут пересылаться в группу.')
  } catch (error) {
    console.error('Error processing /start:', error)
    await ctx.reply('Произошла ошибка при запуске бота.')
  }
})

export {
  bot,
  getOrCreateTopicForUser,
  forwardMessageToTopic
}

#!/usr/bin/env node
/**
 * Запуск бота в режиме long polling
 * Используется как основной режим работы
 */

import 'dotenv/config'
import { bot } from '../lib/telegram-bot.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const GROUP_ID = process.env.TELEGRAM_RECEPTION_GROUP_ID

if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env')
  process.exit(1)
}

if (!GROUP_ID) {
  console.error('❌ Ошибка: TELEGRAM_RECEPTION_GROUP_ID не найден в .env')
  process.exit(1)
}

if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ Ошибка: OPENROUTER_API_KEY не найден в .env')
  process.exit(1)
}

console.log('🤖 Запуск бота SI-Production в режиме polling...')

const me = await bot.telegram.getMe()
console.log(`   Бот: @${me.username}`)
console.log(`   Группа: ${GROUP_ID}`)
console.log(`   AI модель: ${process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001'}`)
console.log('')

// Запускаем бота в режиме long polling
bot.launch({
  polling: {
    timeout: 10,
    limit: 100,
    allowedUpdates: ['message', 'edited_message']
  }
}).then(() => {
  console.log('✅ Бот запущен и готов к работе!')
  console.log('   Отправьте боту сообщение для тестирования\n')
}).catch((error) => {
  console.error('❌ Ошибка при запуске бота:', error.message)
  process.exit(1)
})

// Graceful stop
process.once('SIGINT', () => {
  console.log('\n🛑 Остановка бота...')
  bot.stop('SIGINT')
  process.exit(0)
})
process.once('SIGTERM', () => {
  console.log('\n🛑 Остановка бота...')
  bot.stop('SIGTERM')
  process.exit(0)
})

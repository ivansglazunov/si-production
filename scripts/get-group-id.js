#!/usr/bin/env node
/**
 * Вспомогательный скрипт для получения ID группы Telegram
 * 
 * Использование:
 * 1. Убедитесь, что бот добавлен в группу
 * 2. Установите переменную окружения: export TELEGRAM_BOT_TOKEN="ваш_токен"
 *    Или создайте .env с TELEGRAM_BOT_TOKEN
 * 3. Запустите: node scripts/get-group-id.js
 * 4. Отправьте любое сообщение в группу
 * 5. Скопируйте ID группы из вывода
 * 
 * Альтернатива: передайте токен как аргумент:
 * TELEGRAM_BOT_TOKEN="ваш_токен" node scripts/get-group-id.js
 */

import { Telegraf } from 'telegraf'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.argv[2]

if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден')
  console.error('   Установите переменную окружения:')
  console.error('   export TELEGRAM_BOT_TOKEN="ваш_токен"')
  console.error('   Или передайте токен как аргумент:')
  console.error('   TELEGRAM_BOT_TOKEN="ваш_токен" node scripts/get-group-id.js')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

console.log('🤖 Бот запущен. Отправьте любое сообщение в группу, чтобы получить её ID...\n')

bot.on('message', async (ctx) => {
  const chat = ctx.chat
  
  if (chat.type === 'supergroup' || chat.type === 'group') {
    console.log('✅ Группа найдена!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Название: ${chat.title}`)
    console.log(`ID группы: ${chat.id}`)
    console.log(`Тип: ${chat.type}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`\n📋 Добавьте это значение в .env:`)
    console.log(`TELEGRAM_RECEPTION_GROUP_ID=${chat.id}\n`)
    
    // Останавливаем бота после получения ID
    bot.stop()
    process.exit(0)
  } else {
    console.log(`ℹ️  Получено сообщение из ${chat.type}, но нужна группа или супергруппа`)
  }
})

bot.launch().then(() => {
  console.log('⏳ Ожидание сообщений...\n')
}).catch((error) => {
  console.error('❌ Ошибка при запуске бота:', error.message)
  process.exit(1)
})

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

#!/usr/bin/env node
/**
 * Тестовый скрипт для проверки подключения бота к Telegram API
 * и проверки доступа к группе
 * 
 * Использование:
 * TELEGRAM_BOT_TOKEN="токен" TELEGRAM_RECEPTION_GROUP_ID="id" node scripts/test-bot-connection.js
 * 
 * Или создайте .env с этими переменными
 */

import { Telegraf } from 'telegraf'

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

const bot = new Telegraf(BOT_TOKEN)

console.log('🔍 Проверка подключения бота...\n')

async function testConnection() {
  try {
    // 1. Проверяем информацию о боте
    console.log('1️⃣ Проверка информации о боте...')
    const botInfo = await bot.telegram.getMe()
    console.log(`   ✅ Бот подключен: @${botInfo.username} (${botInfo.first_name})`)
    console.log(`   ID бота: ${botInfo.id}\n`)

    // 2. Проверяем доступ к группе
    console.log('2️⃣ Проверка доступа к группе...')
    try {
      const chat = await bot.telegram.getChat(GROUP_ID)
      console.log(`   ✅ Группа найдена: ${chat.title}`)
      console.log(`   ID группы: ${chat.id}`)
      console.log(`   Тип: ${chat.type}`)
      
      if (chat.type !== 'supergroup') {
        console.log(`   ⚠️  Внимание: Группа должна быть супергруппой (supergroup)`)
      }
      
      // Проверяем, включены ли топики
      if (chat.is_forum) {
        console.log(`   ✅ Топики включены (Forum mode)`)
      } else {
        console.log(`   ⚠️  Внимание: Топики не включены. Включите Forum mode в настройках группы`)
      }
      console.log()
    } catch (error) {
      console.log(`   ❌ Ошибка доступа к группе: ${error.message}`)
      console.log(`   Убедитесь, что:`)
      console.log(`   - Бот добавлен в группу`)
      console.log(`   - ID группы правильный`)
      console.log(`   - Бот является администратором группы\n`)
      throw error
    }

    // 3. Проверяем права бота в группе
    console.log('3️⃣ Проверка прав бота в группе...')
    try {
      const member = await bot.telegram.getChatMember(GROUP_ID, botInfo.id)
      console.log(`   Статус бота: ${member.status}`)
      
      if (member.status === 'administrator') {
        console.log(`   ✅ Бот является администратором`)
        
        // Проверяем права
        if (member.can_post_messages !== false) {
          console.log(`   ✅ Бот может отправлять сообщения`)
        } else {
          console.log(`   ⚠️  Бот не может отправлять сообщения`)
        }
        
        if (member.can_manage_topics !== false) {
          console.log(`   ✅ Бот может управлять топиками`)
        } else {
          console.log(`   ⚠️  Бот не может управлять топиками (нужно дать это право)`)
        }
      } else {
        console.log(`   ⚠️  Бот не является администратором. Сделайте бота администратором группы`)
      }
      console.log()
    } catch (error) {
      console.log(`   ⚠️  Не удалось проверить права: ${error.message}\n`)
    }

    // 4. Тест создания топика (опционально)
    console.log('4️⃣ Тест создания топика...')
    try {
      const testTopicName = `test_topic_${Date.now()}`
      const topic = await bot.telegram.createForumTopic(GROUP_ID, testTopicName)
      console.log(`   ✅ Топик создан успешно!`)
      console.log(`   ID топика: ${topic.message_thread_id}`)
      console.log(`   Название: ${testTopicName}`)
      console.log(`   ⚠️  Не забудьте удалить тестовый топик вручную\n`)
    } catch (error) {
      console.log(`   ❌ Ошибка создания топика: ${error.message}`)
      console.log(`   Убедитесь, что:`)
      console.log(`   - Группа является форумом (топики включены)`)
      console.log(`   - Бот имеет права на создание топиков\n`)
    }

    console.log('✅ Все проверки завершены!')
    console.log('\n📝 Следующие шаги:')
    console.log('   1. Убедитесь, что все проверки прошли успешно')
    console.log('   2. Запустите сервер: npm run dev')
    console.log('   3. Настройте веб-хук (см. TELEGRAM_BOT_SETUP.md)')
    console.log('   4. Протестируйте бота, отправив ему сообщение\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Ошибка при проверке:', error.message)
    if (error.response) {
      console.error('   Детали:', error.response.description)
    }
    process.exit(1)
  }
}

testConnection()

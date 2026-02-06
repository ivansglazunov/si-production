import { bot } from '../../../lib/telegram-bot'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Обрабатываем веб-хук от Telegram
    // Next.js автоматически парсит body в JSON, так что передаем его напрямую
    await bot.handleUpdate(req.body)
    res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Error handling webhook:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Настройка body parser для обработки JSON от Telegram
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

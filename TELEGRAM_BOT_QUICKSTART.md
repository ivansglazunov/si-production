# 🚀 Быстрый старт Telegram бота

## Что нужно предоставить:

### 1. Токен бота от @BotFather
- Откройте [@BotFather](https://t.me/BotFather) в Telegram
- Отправьте `/newbot` и создайте бота `si_production_bot`
- Скопируйте токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. ID группы si_production_reception
- Группа должна быть **супергруппой с включенными топиками**
- Добавьте бота в группу и сделайте его **администратором**
- Получите ID группы одним из способов:
  - Через бота @userinfobot (добавьте в группу и отправьте сообщение)
  - Через скрипт: `TELEGRAM_BOT_TOKEN="токен" node scripts/get-group-id.js`

## Установка:

```bash
# 1. Установите зависимости
npm install

# 2. Создайте .env
cp .env.example .env

# 3. Откройте .env и заполните:
# TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
# TELEGRAM_RECEPTION_GROUP_ID=-1001234567890
```

## Запуск:

### Для разработки:
```bash
npm run dev
# Затем настройте веб-хук через ngrok (см. полную инструкцию)
```

### Для production:
```bash
npm run build
npm start
# Настройте веб-хук на ваш домен
```

## Настройка веб-хука:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

## Тестирование:

1. Откройте бота `@si_production_bot` в Telegram
2. Отправьте `/start`
3. Проверьте, что в группе создался топик с вашим username
4. Отправьте любое сообщение боту
5. Проверьте, что оно появилось в топике группы

---

📖 **Полная инструкция:** см. `TELEGRAM_BOT_SETUP.md`

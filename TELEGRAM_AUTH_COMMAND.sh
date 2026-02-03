#!/bin/bash
# Команда для авторизации в Telegram MCP
# Выполните эту команду в терминале и введите код, который придет в Telegram

npx -y @chaindead/telegram-mcp auth \
  --app-id 23272168 \
  --api-hash c0fa7dafab64621622c08e0af2e1ef15 \
  --phone +79854271256

# Если у вас включена двухэтапная аутентификация, добавьте:
# --password ВАШ_ПАРОЛЬ_2FA

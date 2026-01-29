#!/bin/bash
# Скрипт-обертка для создания tmux сессии вручную (если нужно)
# Этот скрипт используется для ручного создания tmux сессии
# Systemd сервис запускает npm run dev напрямую

cd /home/ae/si-production || exit 1

# Убиваем старую сессию, если существует
tmux kill-session -t si-production 2>/dev/null
sleep 1

# Создаем новую tmux сессию
tmux new-session -d -s si-production bash -c "cd /home/ae/si-production && npm run dev"

echo "Tmux сессия si-production создана"
echo "Для подключения: tmux attach -t si-production"

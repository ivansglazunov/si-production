#!/bin/bash

# Скрипт для запуска проекта в tmux с npm run dev

SESSION_NAME="si-production"
PROJECT_DIR="/home/ae/si-production"

# Переходим в директорию проекта
cd "$PROJECT_DIR" || exit 1

# Проверяем, существует ли уже сессия
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Сессия $SESSION_NAME уже существует. Подключаемся..."
    tmux attach-session -t "$SESSION_NAME"
else
    echo "Создаем новую сессию $SESSION_NAME..."
    # Создаем новую сессию и запускаем npm run dev
    tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_DIR" "npm run dev"
    
    # Подключаемся к сессии
    tmux attach-session -t "$SESSION_NAME"
fi

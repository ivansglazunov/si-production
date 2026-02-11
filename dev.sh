#\!/bin/bash
cd "$(dirname "$0")" || exit 1

SESSION="si-production"

# Kill existing tmux session if it exists
if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Killing existing tmux session: $SESSION"
    tmux kill-session -t "$SESSION"
    sleep 1
fi

NVM_INIT="export NVM_DIR=\$HOME/.nvm && . \$NVM_DIR/nvm.sh"

# Window 1: next dev
tmux new-session -d -s "$SESSION" -n site
tmux send-keys -t "$SESSION:site" \
    "cd /home/ae/si-production && $NVM_INIT && npx next dev" Enter

# Window 2: bot
tmux new-window -t "$SESSION" -n bot
tmux send-keys -t "$SESSION:bot" \
    "cd /home/ae/si-production && $NVM_INIT && node scripts/start-bot-polling.js" Enter

# Select site window
tmux select-window -t "$SESSION:site"

echo "Tmux session created: $SESSION (next dev + bot)"
echo "Attach: tmux attach -t $SESSION"

#!/bin/bash

# Скрипт для удаления пустых папок и перенумеровки без пропусков

PHOTOS_DIR="public/photos"
TEMP_DIR="public/photos_temp"

cd "$(dirname "$0")" || exit 1

echo "Удаление пустых папок и перенумеровка..."

# Создаем временную директорию
mkdir -p "$TEMP_DIR"

# Получаем список папок с файлами, сортируем по номеру
folders=($(find "$PHOTOS_DIR" -mindepth 1 -maxdepth 1 -type d | sort -V))

counter=1
for folder in "${folders[@]}"; do
    # Проверяем есть ли файлы в папке
    file_count=$(find "$folder" -name "*.webp" | wc -l)
    
    if [ "$file_count" -gt 0 ]; then
        old_name=$(basename "$folder")
        new_name="$counter"
        
        echo "[$counter] $old_name -> $new_name ($file_count файлов)"
        
        # Копируем папку с новым именем
        cp -r "$folder" "$TEMP_DIR/$new_name"
        
        counter=$((counter + 1))
    else
        echo "Пропуск пустой папки: $(basename "$folder")"
    fi
done

# Удаляем старую папку и переименовываем новую
echo ""
echo "Замена папок..."
rm -rf "$PHOTOS_DIR"
mv "$TEMP_DIR" "$PHOTOS_DIR"

echo ""
echo "Готово! Осталось папок: $((counter - 1))"

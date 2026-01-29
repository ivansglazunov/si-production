#!/bin/bash

# Скрипт для переименования файлов в формат [число].webp

PHOTOS_DIR="public/photos"

cd "$(dirname "$0")" || exit 1

echo "Переименование файлов в формат [число].webp..."

for folder in "$PHOTOS_DIR"/*/; do
    if [ -d "$folder" ]; then
        folder_name=$(basename "$folder")
        echo "Папка $folder_name:"
        
        counter=1
        # Сортируем файлы по имени перед переименованием
        for file in "$folder"*.webp; do
            if [ -f "$file" ]; then
                new_name="$folder${counter}.webp"
                if [ "$file" != "$new_name" ]; then
                    echo "  $(basename "$file") -> ${counter}.webp"
                    mv "$file" "$new_name"
                fi
                counter=$((counter + 1))
            fi
        done
        echo "  Переименовано $((counter - 1)) файлов"
        echo ""
    fi
done

echo "Готово!"

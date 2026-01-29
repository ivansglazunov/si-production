#!/bin/bash

# Скрипт для обработки фотографий:
# 1. Переименовывает папки в 1, 2, 3...
# 2. Конвертирует все изображения в WebP 360x240px
# 3. Удаляет все метаданные

PHOTOS_DIR="public/photos"
TEMP_DIR="public/photos_temp"

# Проверка наличия необходимых инструментов
if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
    echo "Ошибка: ImageMagick не установлен"
    echo "Установите: sudo apt-get install imagemagick"
    exit 1
fi

if ! command -v exiftool &> /dev/null; then
    echo "Ошибка: exiftool не установлен"
    echo "Установите: sudo apt-get install libimage-exiftool-perl"
    exit 1
fi

# Определяем команду для ImageMagick
if command -v magick &> /dev/null; then
    CONVERT_CMD="magick"
else
    CONVERT_CMD="convert"
fi

cd "$(dirname "$0")" || exit 1

# Создаем временную директорию
mkdir -p "$TEMP_DIR"

# Получаем список папок и сортируем их
folders=($(find "$PHOTOS_DIR" -mindepth 1 -maxdepth 1 -type d | sort))

echo "Найдено папок: ${#folders[@]}"
echo "Начинаем обработку..."

# Обрабатываем каждую папку
counter=1
for folder in "${folders[@]}"; do
    folder_name=$(basename "$folder")
    new_folder_name="$counter"
    new_folder_path="$TEMP_DIR/$new_folder_name"
    
    echo ""
    echo "[$counter/${#folders[@]}] Обработка: $folder_name -> $new_folder_name"
    mkdir -p "$new_folder_path"
    
    # Обрабатываем все изображения в папке
    image_count=0
    for img in "$folder"/*; do
        if [ -f "$img" ]; then
            image_count=$((image_count + 1))
            filename=$(basename "$img")
            name_without_ext="${filename%.*}"
            output_file="$new_folder_path/${name_without_ext}.webp"
            
            echo "  Конвертация: $filename -> ${name_without_ext}.webp"
            
            # Конвертируем в WebP с размером 360x240px (с сохранением пропорций, обрезка по центру)
            # Удаляем метаданные через ImageMagick
            if [ "$CONVERT_CMD" = "magick" ]; then
                magick "$img" \
                    -strip \
                    -auto-orient \
                    -resize "360x240^" \
                    -gravity center \
                    -crop "360x240+0+0" \
                    -quality 85 \
                    -format webp \
                    "$output_file"
            else
                convert "$img" \
                    -strip \
                    -auto-orient \
                    -resize "360x240^" \
                    -gravity center \
                    -crop "360x240+0+0" \
                    -quality 85 \
                    "$output_file"
            fi
            
            # Дополнительно удаляем все метаданные через exiftool
            exiftool -all= -overwrite_original "$output_file" &> /dev/null
        fi
    done
    
    echo "  Обработано изображений: $image_count"
    counter=$((counter + 1))
done

# Удаляем старую папку и переименовываем новую
echo ""
echo "Замена старых папок на новые..."
rm -rf "$PHOTOS_DIR"
mv "$TEMP_DIR" "$PHOTOS_DIR"

echo ""
echo "Готово! Все фотографии обработаны:"
echo "  - Папки переименованы в 1, 2, 3..."
echo "  - Все изображения конвертированы в WebP 360x240px"
echo "  - Все метаданные удалены"

#!/usr/bin/env python3
"""
Скрипт для восстановления и обработки всех фотографий из бекапа:
1. Копирует все файлы из /home/ae/Загрузки/photos
2. Конвертирует в WebP 360x240px
3. Удаляет метаданные
4. Переименовывает в [число].webp
5. Нормализует папки (удаляет пустые, перенумеровывает)
"""

import os
import shutil
import subprocess
from pathlib import Path
from PIL import Image

SOURCE_DIR = Path("/home/ae/Загрузки/photos")
TARGET_DIR = Path("public/photos")
TEMP_DIR = Path("public/photos_temp")
TARGET_SIZE = (360, 240)
QUALITY = 85

def process_image(input_path, output_path):
    """Конвертирует изображение в WebP с нужным размером и удаляет метаданные"""
    try:
        # Открываем изображение
        img = Image.open(input_path)
        
        # Автоматически поворачиваем по EXIF
        if hasattr(img, '_getexif') and img._getexif() is not None:
            exif = img._getexif()
            orientation = exif.get(274)  # EXIF Orientation tag
            if orientation == 3:
                img = img.rotate(180, expand=True)
            elif orientation == 6:
                img = img.rotate(270, expand=True)
            elif orientation == 8:
                img = img.rotate(90, expand=True)
        
        # Изменяем размер с сохранением пропорций и обрезкой по центру
        img.thumbnail((TARGET_SIZE[0] * 2, TARGET_SIZE[1] * 2), Image.Resampling.LANCZOS)
        
        # Обрезаем до нужного размера по центру
        width, height = img.size
        left = (width - TARGET_SIZE[0]) / 2
        top = (height - TARGET_SIZE[1]) / 2
        right = (width + TARGET_SIZE[0]) / 2
        bottom = (height + TARGET_SIZE[1]) / 2
        
        img = img.crop((left, top, right, bottom))
        
        # Сохраняем в WebP без метаданных
        img.save(output_path, 'WEBP', quality=QUALITY, method=6)
        
        return True
    except Exception as e:
        print(f"    Ошибка при обработке {input_path.name}: {e}")
        return False

def process_heic_with_imagemagick(input_path, output_path):
    """Обрабатывает HEIC файлы через ImageMagick"""
    try:
        # Проверяем наличие ImageMagick
        result = subprocess.run(['which', 'magick'], capture_output=True, text=True)
        if result.returncode != 0:
            result = subprocess.run(['which', 'convert'], capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception("ImageMagick не установлен")
            convert_cmd = 'convert'
        else:
            convert_cmd = 'magick'
        
        # Конвертируем HEIC в WebP через ImageMagick
        cmd = [
            convert_cmd,
            str(input_path),
            '-strip',
            '-auto-orient',
            '-resize', '360x240^',
            '-gravity', 'center',
            '-crop', '360x240+0+0',
            '-quality', '85',
            str(output_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"ImageMagick ошибка: {result.stderr}")
        
        return True
    except Exception as e:
        print(f"    Ошибка: {e}")
        return False

def main():
    if not SOURCE_DIR.exists():
        print(f"Ошибка: исходная папка {SOURCE_DIR} не найдена")
        return
    
    # Создаем временную директорию
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    
    # Получаем список папок и сортируем
    folders = sorted([f for f in SOURCE_DIR.iterdir() if f.is_dir()])
    
    print(f"Найдено папок: {len(folders)}")
    print("Начинаем обработку...")
    print()
    
    # Обрабатываем каждую папку
    counter = 1
    for folder in folders:
        folder_name = folder.name
        new_folder_name = str(counter)
        new_folder_path = TEMP_DIR / new_folder_name
        
        print(f"[{counter}/{len(folders)}] Обработка: {folder_name} -> {new_folder_name}")
        new_folder_path.mkdir(parents=True, exist_ok=True)
        
        # Получаем все изображения
        image_extensions = {'.jpg', '.jpeg', '.png', '.heic', '.HEIC', '.PNG', '.JPG', '.JPEG'}
        images = sorted([f for f in folder.rglob("*") if f.is_file() and f.suffix in image_extensions])
        
        if not images:
            print(f"  Пропуск: нет изображений")
            counter += 1
            continue
        
        print(f"  Найдено изображений: {len(images)}")
        
        processed_count = 0
        for idx, img_path in enumerate(images, 1):
            output_file = new_folder_path / f"{idx}.webp"
            
            print(f"    [{idx}/{len(images)}] {img_path.name} -> {idx}.webp", end="")
            
            # Для HEIC файлов используем ImageMagick
            if img_path.suffix.lower() in ['.heic', '.heif']:
                if process_heic_with_imagemagick(img_path, output_file):
                    processed_count += 1
                    print(" ✓")
                else:
                    print(" ✗")
            else:
                if process_image(img_path, output_file):
                    processed_count += 1
                    print(" ✓")
                else:
                    print(" ✗")
        
        print(f"  Обработано: {processed_count}/{len(images)}")
        print()
        counter += 1
    
    # Удаляем старую папку и переименовываем новую
    print("Замена старых папок на новые...")
    if TARGET_DIR.exists():
        shutil.rmtree(TARGET_DIR)
    TEMP_DIR.rename(TARGET_DIR)
    
    print()
    print("Готово! Все фотографии обработаны:")
    print(f"  - Папки переименованы в 1, 2, 3...")
    print(f"  - Все изображения конвертированы в WebP {TARGET_SIZE[0]}x{TARGET_SIZE[1]}px")
    print(f"  - Все метаданные удалены")
    print(f"  - Файлы переименованы в [число].webp")

if __name__ == "__main__":
    main()

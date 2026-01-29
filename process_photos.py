#!/usr/bin/env python3
"""
Скрипт для обработки фотографий:
1. Переименовывает папки в 1, 2, 3...
2. Конвертирует все изображения в WebP 360x240px
3. Удаляет все метаданные
"""

import os
import shutil
import subprocess
from pathlib import Path
from PIL import Image
from PIL.ExifTags import TAGS

PHOTOS_DIR = Path("public/photos")
TEMP_DIR = Path("public/photos_temp")
TARGET_SIZE = (360, 240)  # Ширина x Высота
QUALITY = 85

def process_image(input_path, output_path):
    """Конвертирует изображение в WebP с нужным размером и удаляет метаданные"""
    try:
        # Для HEIC файлов пытаемся использовать ImageMagick
        if input_path.suffix.lower() in ['.heic', '.heif']:
            return process_heic_with_imagemagick(input_path, output_path)
        
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
        print(f"    Ошибка при обработке HEIC {input_path.name}: {e}")
        return False

def main():
    # Проверяем наличие папки
    if not PHOTOS_DIR.exists():
        print(f"Ошибка: папка {PHOTOS_DIR} не найдена")
        return
    
    # Создаем временную директорию
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    
    # Получаем список папок и сортируем
    folders = sorted([f for f in PHOTOS_DIR.iterdir() if f.is_dir()])
    
    print(f"Найдено папок: {len(folders)}")
    print("Начинаем обработку...")
    print()
    
    # Обрабатываем каждую папку
    for counter, folder in enumerate(folders, 1):
        folder_name = folder.name
        new_folder_name = str(counter)
        new_folder_path = TEMP_DIR / new_folder_name
        
        print(f"[{counter}/{len(folders)}] Обработка: {folder_name} -> {new_folder_name}")
        new_folder_path.mkdir(parents=True, exist_ok=True)
        
        # Получаем все изображения
        image_extensions = {'.jpg', '.jpeg', '.png', '.heic', '.HEIC', '.PNG', '.JPG', '.JPEG'}
        images = [f for f in folder.iterdir() if f.is_file() and f.suffix in image_extensions]
        
        image_count = 0
        for img_path in images:
            image_count += 1
            name_without_ext = img_path.stem
            output_file = new_folder_path / f"{name_without_ext}.webp"
            
            print(f"  Конвертация: {img_path.name} -> {name_without_ext}.webp")
            
            process_image(img_path, output_file)
        
        print(f"  Обработано изображений: {len(images)}")
        print()
    
    # Удаляем старую папку и переименовываем новую
    print("Замена старых папок на новые...")
    if PHOTOS_DIR.exists():
        shutil.rmtree(PHOTOS_DIR)
    TEMP_DIR.rename(PHOTOS_DIR)
    
    print()
    print("Готово! Все фотографии обработаны:")
    print(f"  - Папки переименованы в 1, 2, 3...")
    print(f"  - Все изображения конвертированы в WebP {TARGET_SIZE[0]}x{TARGET_SIZE[1]}px")
    print(f"  - Все метаданные удалены")

if __name__ == "__main__":
    main()

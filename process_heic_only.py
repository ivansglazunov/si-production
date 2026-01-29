#!/usr/bin/env python3
"""
Скрипт для обработки только HEIC файлов из исходной папки
и добавления их в пронумерованные папки
"""

import subprocess
from pathlib import Path

SOURCE_DIR = Path("/home/ae/Загрузки/si_production_files")
TARGET_DIR = Path("public/photos")

# Маппинг старых имен на новые номера
MAPPING = {
    'АТОМ': '1',
    'Анниково': '2', 
    'Большая баня': '3',
    'Гаврилов_Иваново': '4',
    'Гостевой': '5',
    'Жуковского': '6',
    'Каменостровский': '7',
    'Квартира музей Клизарова': '8',
    'Кедр': '9',
    'Лиговский': '10',
    'Миллениум_парк': '11',
    'Оренбург': '12',
    'Паравозы': '13',
    'Солодово': '14',
    'Черняховского': '15'
}

TARGET_SIZE = (360, 240)
QUALITY = 85

def process_heic_with_imagemagick(input_path, output_path):
    """Обрабатывает HEIC файлы через ImageMagick"""
    try:
        # Проверяем наличие ImageMagick
        result = subprocess.run(['which', 'magick'], capture_output=True, text=True)
        if result.returncode != 0:
            result = subprocess.run(['which', 'convert'], capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception("ImageMagick не установлен. Установите: sudo apt-get install imagemagick")
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
    
    if not TARGET_DIR.exists():
        print(f"Ошибка: целевая папка {TARGET_DIR} не найдена")
        return
    
    print("Обработка HEIC файлов из исходной папки...")
    print()
    
    total_processed = 0
    
    # Обрабатываем каждую папку из маппинга
    for old_name, new_num in MAPPING.items():
        source_folder = SOURCE_DIR / old_name
        target_folder = TARGET_DIR / new_num
        
        if not source_folder.exists():
            continue
        
        # Ищем HEIC файлы
        heic_files = list(source_folder.rglob("*.HEIC")) + list(source_folder.rglob("*.heic"))
        
        if not heic_files:
            continue
        
        print(f"Папка {new_num} ({old_name}): найдено {len(heic_files)} HEIC файлов")
        
        target_folder.mkdir(parents=True, exist_ok=True)
        
        for heic_file in heic_files:
            name_without_ext = heic_file.stem
            output_file = target_folder / f"{name_without_ext}.webp"
            
            # Пропускаем если уже существует
            if output_file.exists():
                print(f"  Пропуск (уже существует): {heic_file.name}")
                continue
            
            print(f"  Конвертация: {heic_file.name} -> {name_without_ext}.webp")
            
            if process_heic_with_imagemagick(heic_file, output_file):
                total_processed += 1
        
        print()
    
    print(f"Готово! Обработано {total_processed} HEIC файлов")

if __name__ == "__main__":
    main()

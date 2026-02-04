const fs = require('fs')
const path = require('path')

// Проверяем наличие sharp, если нет - используем простую конвертацию
let sharp = null
try {
  sharp = require('sharp')
} catch (e) {
  console.warn('sharp not found, using basic base64 conversion (install sharp for better optimization)')
}

/**
 * Конвертирует изображение в base64 с оптимизацией для лент
 * Размер для лент: ~120x80px (масштабируется)
 */
async function convertImageToBase64(imagePath, maxWidth = 120, maxHeight = 80, quality = 80) {
  try {
    if (sharp) {
      // Используем sharp для оптимизации
      const buffer = await sharp(imagePath)
        .resize(maxWidth, maxHeight, {
          fit: 'cover',
          withoutEnlargement: true
        })
        .webp({ quality })
        .toBuffer()
      
      return `data:image/webp;base64,${buffer.toString('base64')}`
    } else {
      // Простая конвертация без оптимизации (только для dev)
      const buffer = fs.readFileSync(imagePath)
      const ext = path.extname(imagePath).toLowerCase()
      const mimeType = ext === '.webp' ? 'image/webp' : 
                      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.png' ? 'image/png' : 'image/webp'
      
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    }
  } catch (error) {
    console.error(`Error converting ${imagePath}:`, error.message)
    return null
  }
}

/**
 * Сканирует папку с фотографиями и создает JSON с base64 изображениями
 */
async function embedLentaImages() {
  const photosDir = path.join(process.cwd(), 'public', 'photos')
  const outputFile = path.join(process.cwd(), 'data', 'lenta_images.js')
  
  // Создаем папку data если её нет
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  const result = {}
  const folders = fs.readdirSync(photosDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort((a, b) => parseInt(a) - parseInt(b))
  
  console.log(`Found ${folders.length} folders`)
  
  for (const folderId of folders) {
    const folderPath = path.join(photosDir, folderId)
    const files = fs.readdirSync(folderPath)
      .filter(file => /\.(webp|jpg|jpeg|png)$/i.test(file))
      .sort((a, b) => {
        // Сортируем по числу в имени файла
        const numA = parseInt(a.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.match(/\d+/)?.[0] || '0')
        return numA - numB
      })
    
    if (files.length === 0) continue
    
    console.log(`Processing folder ${folderId} (${files.length} files)...`)
    
    const images = []
    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const fileNum = parseInt(file.match(/\d+/)?.[0] || '0')
      
      if (fileNum > 0) {
        const base64 = await convertImageToBase64(filePath)
        if (base64) {
          images.push({
            fileNum,
            data: base64
          })
        }
      }
    }
    
    if (images.length > 0) {
      result[folderId] = images.sort((a, b) => a.fileNum - b.fileNum)
      console.log(`  ✓ Embedded ${images.length} images`)
    }
  }
  
  // Сохраняем результат как JavaScript модуль для прямого импорта
  const jsContent = `// Автоматически сгенерированный файл с встроенными изображениями для лент
// Не редактировать вручную! Используйте: npm run embed:lenta-images

export const lentaImages = ${JSON.stringify(result, null, 2)};
`
  
  fs.writeFileSync(outputFile, jsContent)
  console.log(`\n✓ Saved embedded images to ${outputFile}`)
  
  // Подсчитываем размер
  const stats = fs.statSync(outputFile)
  const sizeKB = (stats.size / 1024).toFixed(2)
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
  console.log(`  File size: ${sizeKB} KB (${sizeMB} MB)`)
  
  return result
}

// Запускаем если вызван напрямую
if (require.main === module) {
  embedLentaImages()
    .then(() => {
      console.log('\n✓ Done!')
      process.exit(0)
    })
    .catch(error => {
      console.error('Error:', error)
      process.exit(1)
    })
}

module.exports = { embedLentaImages, convertImageToBase64 }

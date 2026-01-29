const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// Читаем posters.json
const postersPath = path.join(__dirname, '..', 'data', 'posters.json')
const postersData = JSON.parse(fs.readFileSync(postersPath, 'utf8'))

// Создаём папку public/projects, если её нет
const projectsDir = path.join(__dirname, '..', 'public', 'projects')
if (!fs.existsSync(projectsDir)) {
  fs.mkdirSync(projectsDir, { recursive: true })
}

// Функция для скачивания файла
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(filepath)
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Редирект
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject)
      }
      
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(filepath)
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      file.close()
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }
      reject(err)
    })
  })
}

// Функция для создания безопасного имени файла
function sanitizeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100) // Ограничиваем длину
}

// Обновлённый объект постеров с локальными путями
const updatedPosters = {}

// Скачиваем постеры
async function downloadPosters() {
  const entries = Object.entries(postersData)
  let downloaded = 0
  let failed = 0
  
  console.log(`Найдено ${entries.length} постеров для скачивания\n`)
  
  for (const [title, data] of entries) {
    if (!data.posterUrl) {
      console.log(`⚠️  Пропущен "${title}": нет URL постера`)
      updatedPosters[title] = data
      continue
    }
    
    const safeTitle = sanitizeFilename(title)
    const ext = path.extname(data.posterUrl) || '.jpg'
    const filename = `${safeTitle}${ext}`
    const filepath = path.join(projectsDir, filename)
    const localPath = `/projects/${filename}`
    
    // Проверяем, существует ли файл
    if (fs.existsSync(filepath)) {
      console.log(`✓  Пропущен "${title}": уже существует`)
      updatedPosters[title] = {
        ...data,
        posterUrl: localPath,
        localPath: localPath
      }
      continue
    }
    
    try {
      console.log(`⬇️  Скачиваю "${title}"...`)
      await downloadFile(data.posterUrl, filepath)
      console.log(`✓  Скачан "${title}" -> ${filename}`)
      downloaded++
      
      updatedPosters[title] = {
        ...data,
        posterUrl: localPath,
        localPath: localPath
      }
    } catch (error) {
      console.error(`✗  Ошибка при скачивании "${title}":`, error.message)
      failed++
      // Сохраняем оригинальный URL на случай, если локальный не скачался
      updatedPosters[title] = data
    }
    
    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log(`\n✅ Готово! Скачано: ${downloaded}, Ошибок: ${failed}, Всего: ${entries.length}`)
  
  // Сохраняем обновлённый posters.json
  const updatedPostersPath = path.join(__dirname, '..', 'data', 'posters.json')
  fs.writeFileSync(updatedPostersPath, JSON.stringify(updatedPosters, null, 2), 'utf8')
  console.log(`\n📝 Обновлён ${updatedPostersPath}`)
  
  // Копируем в public/data/posters.json
  const publicPostersPath = path.join(__dirname, '..', 'public', 'data', 'posters.json')
  fs.writeFileSync(publicPostersPath, JSON.stringify(updatedPosters, null, 2), 'utf8')
  console.log(`📝 Обновлён ${publicPostersPath}`)
}

// Запускаем скачивание
downloadPosters().catch(console.error)

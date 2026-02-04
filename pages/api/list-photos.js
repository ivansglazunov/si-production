import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { folderId, maxCheck = 20 } = req.query

  if (!folderId) {
    return res.status(400).json({ error: 'Missing folderId' })
  }

  try {
    const folderPath = path.join(process.cwd(), 'public', 'photos', folderId)
    
    // Проверяем существование папки
    if (!fs.existsSync(folderPath)) {
      return res.status(200).json({ files: [] })
    }

    // Читаем все файлы в папке
    const files = fs.readdirSync(folderPath)
    
    // Фильтруем только .webp файлы и извлекаем номера
    const existingFiles = files
      .filter(file => file.endsWith('.webp'))
      .map(file => {
        // Извлекаем число из имени файла (например, "1.webp" -> 1)
        const match = file.match(/^(\d+)\.webp$/)
        return match ? parseInt(match[1], 10) : null
      })
      .filter(num => num !== null && num <= parseInt(maxCheck, 10))
      .sort((a, b) => a - b) // Сортируем по возрастанию
    
    return res.status(200).json({ files: existingFiles })
  } catch (error) {
    console.error(`Error listing photos for folder ${folderId}:`, error)
    return res.status(500).json({ error: 'Internal server error', files: [] })
  }
}

import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { folderId, fileNum } = req.query

  if (!folderId || !fileNum) {
    return res.status(400).json({ error: 'Missing folderId or fileNum' })
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'photos', folderId, `${fileNum}.webp`)
    const exists = fs.existsSync(filePath)
    
    return res.status(200).json({ exists })
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', exists: false })
  }
}

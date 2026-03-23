const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadsDir = path.join(__dirname, '../public/uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    cb(null, name)
  }
})

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('Format non supporté. JPG, PNG ou WebP uniquement.'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
})

module.exports = upload

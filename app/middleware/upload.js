const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXTS = /\.(jpe?g|png|webp)$/i

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    return cb(new Error('Type de fichier non autorisé.'))
  }
  if (!ALLOWED_EXTS.test(file.originalname || '')) {
    return cb(new Error('Extension de fichier non autorisée.'))
  }
  cb(null, true)
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nata-bar',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }]
  }
})

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,    // 5 Mo / fichier
    files: 10,                     // 10 fichiers max par requête
    fields: 20,
    parts: 30,
    headerPairs: 50
  }
})

module.exports = upload
module.exports.cloudinary = cloudinary

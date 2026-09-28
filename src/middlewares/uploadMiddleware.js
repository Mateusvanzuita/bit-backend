// src/middlewares/uploadMiddleware.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
  },
});

const upload = multer({ storage });

// Áudio do SOS (transcrição): fica só em memória, nunca é persistido em
// disco/Cloudinary — passa direto pro Whisper e é descartado depois.
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB — folga confortável p/ até uns 10min de voz
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) return cb(null, true);
    cb(new Error('Arquivo precisa ser um áudio.'));
  },
});

module.exports = {
  uploadSingle: upload.single('foto'),
  uploadAudioSingle: uploadAudio.single('audio'),
};
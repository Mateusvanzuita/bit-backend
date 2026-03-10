// src/middlewares/upload.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

/**
 * Cria um middleware de upload para uma pasta específica no Cloudinary.
 * @param {string} folder - Pasta no Cloudinary (ex: 'pets', 'usuarios')
 */
function createUploadMiddleware(folder) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `bitzy/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // Limita tamanho máximo
        { quality: 'auto' },                         // Compressão automática
        { fetch_format: 'auto' },                    // Formato otimizado (webp se suportado)
      ],
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Formato de imagem inválido. Use JPG, PNG ou WebP.'));
      }
    },
  });
}

// Middlewares prontos para usar nas rotas
const uploadPetPhoto    = createUploadMiddleware('pets').single('foto');
const uploadUserPhoto   = createUploadMiddleware('usuarios').single('foto');

/**
 * Wrapper para tratar erros do multer de forma elegante
 */
function handleUpload(uploadFn) {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'fail',
            message: 'Imagem muito grande. Tamanho máximo: 5MB.',
          });
        }
        return res.status(400).json({ status: 'fail', message: err.message });
      }
      if (err) {
        return res.status(400).json({ status: 'fail', message: err.message });
      }
      next();
    });
  };
}

module.exports = {
  uploadPetPhoto:  handleUpload(uploadPetPhoto),
  uploadUserPhoto: handleUpload(uploadUserPhoto),
};
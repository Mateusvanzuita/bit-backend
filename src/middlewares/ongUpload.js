// src/middlewares/ongUpload.js
// Upload de imagens do portal: multipart (campo `foto`), 5 MB, JPG/PNG/WebP. A pasta no Cloudinary inclui o ongId.
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { TIPOS } = require('../utils/ongImagens');
const { OngError } = require('../utils/ongErrors');

const TRANSFORMACOES = {
  'animal-foto': [{ width: 1200, height: 1200, crop: 'limit' }, { quality: 'auto' }, { fetch_format: 'auto' }],
  'ong-logo': [{ width: 600, height: 600, crop: 'limit' }, { quality: 'auto' }, { fetch_format: 'auto' }],
  'ong-banner': [{ width: 1600, height: 900, crop: 'limit' }, { quality: 'auto' }, { fetch_format: 'auto' }],
};
const PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

function construir(tipo, ongId) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `bitzy/ong/${ongId}/${TIPOS[tipo]}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: TRANSFORMACOES[tipo],
    },
  });
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) =>
      PERMITIDOS.includes(file.mimetype) ? cb(null, true) : cb(new OngError('Formato inválido. Use JPG, PNG ou WebP.', 400, 'ARQUIVO_INVALIDO')),
  }).single('foto');
}

module.exports = function ongUpload(req, res, next) {
  const tipo = req.params.tipo;
  if (!TIPOS[tipo]) return next(new OngError('Tipo de upload inválido.', 400, 'VALIDACAO'));
  construir(tipo, req.ong.ongId)(req, res, (err) => {
    if (!err) {
      if (!req.file?.path) return next(new OngError('Envie uma imagem.', 400, 'ARQUIVO_INVALIDO'));
      return next();
    }
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Imagem muito grande. Máximo: 5 MB.' : 'Arquivo inválido.';
      return next(new OngError(msg, 400, 'ARQUIVO_INVALIDO'));
    }
    return next(err instanceof OngError ? err : new OngError('Não foi possível enviar a imagem.', 400, 'ARQUIVO_INVALIDO'));
  });
};

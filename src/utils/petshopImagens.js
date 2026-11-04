// src/utils/petshopImagens.js
// Só aceitamos URLs de imagens que o PRÓPRIO backend subiu no Cloudinary para ESTE pet shop
// (pasta bitzy/petshop/<petShopId>/<tipo>/). Evita apontar para sites de terceiros e usar imagem de outra loja.
// Exceção: o valor que JÁ está gravado (`atual`) continua válido (ex.: logo enviada antes pelo admin).
const { invalido } = require('./ongPortalCommon');

const TIPOS = {
  'oferta-foto': 'ofertas',
  'cupom-banner': 'cupons',
  'petshop-logo': 'logos',
  'petshop-banner': 'banners',
};

function validarUrlImagem(url, petShopId, tipo, rotulo = 'Imagem', atual = null) {
  if (typeof url !== 'string') throw invalido(`${rotulo} inválida.`);
  if (atual && url === atual) return url;

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) throw new Error('CLOUDINARY_CLOUD_NAME não configurado');

  let u;
  try { u = new URL(url); } catch { throw invalido(`${rotulo} inválida.`); }
  const okHost =
    u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && !u.username && !u.password && !u.search && !u.hash;
  const pasta = `/bitzy/petshop/${petShopId}/${TIPOS[tipo]}/`;
  if (!okHost || !u.pathname.startsWith(`/${cloud}/image/upload/`) || !u.pathname.includes(pasta)) {
    throw invalido(`${rotulo} inválida. Envie o arquivo pelo portal.`);
  }
  return u.toString();
}

module.exports = { validarUrlImagem, TIPOS };

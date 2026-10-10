// src/utils/ongImagens.js
// Só aceitamos URLs de imagens que o PRÓPRIO backend subiu no Cloudinary para ESTA ONG
// (pasta bitzy/ong/<ongId>/<tipo>/). Evita apontar para sites de terceiros (rastreamento, conteúdo malicioso)
// e usar imagem enviada por outra ONG.
const { invalido } = require('./ongPortalCommon');

const TIPOS = { 'animal-foto': 'animais', 'ong-logo': 'logos', 'ong-banner': 'banners' };

function prefixo(ongId, pasta) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) throw new Error('CLOUDINARY_CLOUD_NAME não configurado');
  return { host: 'res.cloudinary.com', caminho: `/${cloud}/image/upload/`, pasta: `/bitzy/ong/${ongId}/${pasta}/` };
}

function validarUrlImagem(url, ongId, tipo, rotulo = 'Imagem') {
  const pasta = TIPOS[tipo];
  let u;
  try { u = new URL(url); } catch { throw invalido(`${rotulo} inválida.`); }
  const p = prefixo(ongId, pasta);
  const okHost = u.protocol === 'https:' && u.hostname === p.host && !u.username && !u.password && !u.search && !u.hash;
  if (!okHost || !u.pathname.startsWith(p.caminho) || !u.pathname.includes(p.pasta)) {
    throw invalido(`${rotulo} inválida. Envie o arquivo pelo portal.`);
  }
  return u.toString();
}

module.exports = { validarUrlImagem, TIPOS };

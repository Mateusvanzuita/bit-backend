// src/services/ongPortalPerfilService.js
// Perfil da ONG e "Como ajudar" (PIX, necessidades, voluntariado). Sempre pela ONG do token.
const crypto = require('crypto');
const prisma = require('../config/database');
const C = require('../utils/ongPortalCommon');
const { validarUrlImagem } = require('../utils/ongImagens');

const TIPOS_PIX = ['CPF_CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'];
const PRIORIDADES = ['URGENTE', 'NORMAL'];

// ── PIX: mesma normalização do portal (src/features/ajuda/pix.ts) ───────────
const soDigitos = (s) => s.replace(/\D/g, '');
function cpfValido(d) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
function cnpjValido(d) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (n) => {
    const p = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = p.reduce((a, x, i) => a + Number(d[i]) * x, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}
function normalizarPix(tipo, bruta) {
  const v = String(bruta).trim();
  switch (tipo) {
    case 'CPF_CNPJ': {
      const d = soDigitos(v);
      if (d.length === 11 && cpfValido(d)) return d;
      if (d.length === 14 && cnpjValido(d)) return d;
      throw C.invalido('Chave PIX (CPF/CNPJ) inválida.');
    }
    case 'EMAIL':
      if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 150) return v.toLowerCase();
      throw C.invalido('Chave PIX (e-mail) inválida.');
    case 'TELEFONE': {
      let d = soDigitos(v);
      if (/^55\d{10,11}$/.test(d)) d = d.slice(2);
      if (/^\d{2}9?\d{8}$/.test(d)) return `+55${d}`;
      throw C.invalido('Chave PIX (celular) inválida.');
    }
    case 'ALEATORIA':
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return v.toLowerCase();
      throw C.invalido('Chave PIX (aleatória) inválida.');
    default:
      throw C.invalido('Tipo da chave PIX inválido.');
  }
}

const PERFIL_SELECT = {
  id: true, nome: true, tipo: true, verificada: true, cidade: true, estado: true, bairro: true,
  logoUrl: true, bannerUrl: true, descricao: true, whatsapp: true, instagramUrl: true, siteUrl: true,
  cidadesAtendidas: true, processoAdocao: true, taxaAdocao: true,
};

const CAMPOS_PERFIL = ['descricao', 'whatsapp', 'instagramUrl', 'siteUrl', 'cidadesAtendidas', 'processoAdocao', 'taxaAdocao', 'logoUrl', 'bannerUrl'];

class OngPortalPerfilService {
  async obterPerfil(ongId) {
    const ong = await prisma.ong.findUnique({ where: { id: ongId }, select: PERFIL_SELECT });
    if (!ong) throw C.naoEncontrado('ONG não encontrada.');
    return ong;
  }

  // PATCH parcial: só as chaves enviadas mudam. Nada de id/ongId/verificada/ativa/tipo/nome/localização.
  async atualizarPerfil(ongId, body) {
    C.soCamposPermitidos(body, CAMPOS_PERFIL);
    const d = {};
    if ('descricao' in body) d.descricao = C.texto(body.descricao, 'Descrição', { min: 10, max: 2000 });
    if ('whatsapp' in body) {
      const w = C.texto(body.whatsapp, 'WhatsApp', { max: 20, nulavel: true });
      if (w !== null && !/^[\d\s()+-]{8,20}$/.test(w)) throw C.invalido('WhatsApp inválido.');
      d.whatsapp = w;
    }
    if ('instagramUrl' in body) d.instagramUrl = C.urlHttp(body.instagramUrl, 'Instagram');
    if ('siteUrl' in body) d.siteUrl = C.urlHttp(body.siteUrl, 'Site');
    if ('cidadesAtendidas' in body) d.cidadesAtendidas = C.listaTexto(body.cidadesAtendidas, 'Cidades atendidas', { max: 30, tamanho: 80 });
    if ('processoAdocao' in body) d.processoAdocao = C.listaTexto(body.processoAdocao, 'Processo de adoção', { max: 15, tamanho: 300 });
    if ('taxaAdocao' in body) d.taxaAdocao = C.texto(body.taxaAdocao, 'Taxa de adoção', { max: 300, nulavel: true });
    if ('logoUrl' in body) d.logoUrl = body.logoUrl === null ? null : validarUrlImagem(body.logoUrl, ongId, 'ong-logo', 'Logo');
    if ('bannerUrl' in body) d.bannerUrl = body.bannerUrl === null ? null : validarUrlImagem(body.bannerUrl, ongId, 'ong-banner', 'Banner');
    if (!Object.keys(d).length) throw C.invalido('Nada para alterar.');

    return prisma.ong.update({ where: { id: ongId }, data: d, select: PERFIL_SELECT });
  }

  // ── Como ajudar ───────────────────────────────────────────────────────────
  async obterAjuda(ongId) {
    const o = await prisma.ong.findUnique({
      where: { id: ongId },
      select: { pixTipoChave: true, pixChave: true, pixTitular: true, entregaDoacoes: true, necessidades: true, voluntariado: true },
    });
    if (!o) throw C.naoEncontrado('ONG não encontrada.');
    return {
      ...o,
      necessidades: Array.isArray(o.necessidades) ? o.necessidades : [],
      voluntariado: Array.isArray(o.voluntariado) ? o.voluntariado : [],
    };
  }

  // PUT = estado completo. Ids só são mantidos se já existiam nesta ONG; os demais são gerados aqui.
  async salvarAjuda(ongId, body) {
    C.soCamposPermitidos(body, ['pixTipoChave', 'pixChave', 'pixTitular', 'entregaDoacoes', 'necessidades', 'voluntariado']);
    const atual = await this.obterAjuda(ongId);

    const tipo = body.pixTipoChave ?? null;
    const chaveBruta = body.pixChave ?? null;
    const titularBruto = body.pixTitular ?? null;
    const algum = [tipo, chaveBruta, titularBruto].some((x) => x !== null && String(x).trim() !== '');
    let pix = { pixTipoChave: null, pixChave: null, pixTitular: null };
    if (algum) {
      if (!tipo || !chaveBruta || !titularBruto) throw C.invalido('Para usar o PIX, informe o tipo, a chave e o titular.');
      C.enumerado(tipo, TIPOS_PIX, 'Tipo da chave PIX');
      pix = {
        pixTipoChave: tipo,
        pixChave: normalizarPix(tipo, chaveBruta),
        pixTitular: C.texto(titularBruto, 'Titular', { min: 3, max: 150 }),
      };
    }

    const idsNec = new Set(atual.necessidades.map((n) => n.id));
    const idsVol = new Set(atual.voluntariado.map((n) => n.id));
    const idDe = (conhecidos, id) => (typeof id === 'string' && conhecidos.has(id) ? id : crypto.randomUUID());

    if (!Array.isArray(body.necessidades) || body.necessidades.length > 50) throw C.invalido('Necessidades: no máximo 50 itens.');
    if (!Array.isArray(body.voluntariado) || body.voluntariado.length > 50) throw C.invalido('Voluntariado: no máximo 50 itens.');

    const necessidades = body.necessidades.map((n, i) => {
      if (!n || typeof n !== 'object') throw C.invalido(`Necessidade ${i + 1} inválida.`);
      return {
        id: idDe(idsNec, n.id),
        titulo: C.texto(n.titulo, 'Necessidade', { min: 1, max: 150 }),
        quantidade: C.texto(n.quantidade, 'Quantidade', { max: 60, nulavel: true }),
        prioridade: C.enumerado(n.prioridade ?? 'NORMAL', PRIORIDADES, 'Prioridade'),
      };
    });
    const voluntariado = body.voluntariado.map((v, i) => {
      if (!v || typeof v !== 'object') throw C.invalido(`Atividade ${i + 1} inválida.`);
      return {
        id: idDe(idsVol, v.id),
        titulo: C.texto(v.titulo, 'Atividade', { min: 1, max: 150 }),
        frequencia: C.texto(v.frequencia, 'Frequência', { max: 100, nulavel: true }),
      };
    });

    const o = await prisma.ong.update({
      where: { id: ongId },
      data: {
        ...pix,
        entregaDoacoes: C.texto(body.entregaDoacoes, 'Entrega das doações', { max: 300, nulavel: true }),
        necessidades,
        voluntariado,
      },
      select: { pixTipoChave: true, pixChave: true, pixTitular: true, entregaDoacoes: true, necessidades: true, voluntariado: true },
    });
    return o;
  }
}

module.exports = new OngPortalPerfilService();
module.exports.normalizarPix = normalizarPix;

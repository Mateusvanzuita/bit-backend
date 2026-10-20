// src/utils/novidadeUtils.js
const CATEGORIAS = ['NOTICIAS', 'SAUDE', 'CURIOSIDADES', 'EVENTOS'];
const ESPECIES = ['CACHORRO', 'GATO'];
const STATUS = ['RASCUNHO', 'PUBLICADA', 'ARQUIVADA'];
const TIPOS_BLOCO = ['paragrafo', 'subtitulo', 'lista', 'aviso'];
const ACOES_DICA = ['CHECKUP', 'CHAT', 'DICAS', 'ADOCAO', 'PETS'];

const normalizarTexto = (s = '') =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const gerarSlug = (titulo = '') => {
  const slug = normalizarTexto(titulo)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return slug || 'novidade';
};

const textoDosBlocos = (blocos = []) =>
  blocos
    .map((b) => {
      if (b.tipo === 'lista') return (b.itens || []).join(' ');
      if (b.tipo === 'aviso') return `${b.titulo || ''} ${b.texto || ''}`;
      return b.texto || '';
    })
    .join(' ');

// ~200 palavras por minuto, mínimo 1
const calcularTempoLeituraMin = (blocos = []) => {
  const palavras = textoDosBlocos(blocos).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(palavras / 200));
};

const montarBuscaTexto = ({ titulo, resumo }) => normalizarTexto(`${titulo} ${resumo}`);

const textoValido = (v) => typeof v === 'string' && v.trim().length > 0;

/** Retorna uma mensagem de erro, ou null se os blocos estão válidos. */
function validarBlocos(blocos) {
  if (!Array.isArray(blocos) || blocos.length === 0) {
    return 'blocos deve ser uma lista com pelo menos 1 item';
  }
  if (blocos.length > 80) return 'blocos aceita no máximo 80 itens';

  for (let i = 0; i < blocos.length; i += 1) {
    const b = blocos[i];
    const pos = `blocos[${i}]`;
    if (!b || typeof b !== 'object') return `${pos} é inválido`;
    if (!TIPOS_BLOCO.includes(b.tipo)) {
      return `${pos}.tipo deve ser um de: ${TIPOS_BLOCO.join(', ')}`;
    }
    if (b.tipo === 'lista') {
      if (!Array.isArray(b.itens) || b.itens.length === 0 || !b.itens.every(textoValido)) {
        return `${pos}.itens deve ser uma lista de textos não vazios`;
      }
    } else {
      if (!textoValido(b.texto)) return `${pos}.texto é obrigatório`;
      if (b.tipo === 'aviso' && b.titulo != null && typeof b.titulo !== 'string') {
        return `${pos}.titulo deve ser texto`;
      }
    }
  }
  return null;
}

/** Mantém só os campos conhecidos de cada bloco (o que vai para o banco é sempre limpo). */
function sanitizarBlocos(blocos) {
  return blocos.map((b) => {
    if (b.tipo === 'lista') return { tipo: 'lista', itens: b.itens.map((i) => i.trim()) };
    if (b.tipo === 'aviso') {
      const aviso = { tipo: 'aviso' };
      if (textoValido(b.titulo)) aviso.titulo = b.titulo.trim();
      aviso.texto = b.texto.trim();
      return aviso;
    }
    return { tipo: b.tipo, texto: b.texto.trim() };
  });
}

/** null/undefined são aceitos (dica é opcional). */
function validarDica(dica) {
  if (dica == null) return null;
  if (typeof dica !== 'object' || Array.isArray(dica)) return 'dica deve ser um objeto';
  if (!textoValido(dica.titulo)) return 'dica.titulo é obrigatório';
  if (!textoValido(dica.texto)) return 'dica.texto é obrigatório';
  if (!ACOES_DICA.includes(dica.acao)) return `dica.acao deve ser um de: ${ACOES_DICA.join(', ')}`;
  return null;
}

const sanitizarDica = (d) => ({ titulo: d.titulo.trim(), texto: d.texto.trim(), acao: d.acao });

// ── Serializadores ────────────────────────────────────────────
// Formato idêntico ao tipo `Novidade` do app (id = slug; capa = { uri }).

/** Item de lista (sem blocos/dica/resumoRapido para a resposta ficar leve). */
const paraAppResumo = (n) => ({
  id: n.slug,
  titulo: n.titulo,
  resumo: n.resumo,
  categoria: n.categoria,
  capa: n.capaUrl ? { uri: n.capaUrl } : null,
  tempoLeituraMin: n.tempoLeituraMin,
  publicadoEm: n.publicadoEm ? new Date(n.publicadoEm).toISOString() : null,
  especies: n.especies || [],
  destaque: n.destaque,
  patrocinado: n.patrocinado,
  parceiroNome: n.parceiroNome ?? null,
});

const paraAppCompleta = (n) => ({
  ...paraAppResumo(n),
  resumoRapido: n.resumoRapido || [],
  blocos: n.blocos,
  dica: n.dica ?? undefined,
  relacionados: n.relacionados || [],
});

/** Admin enxerga o id real (uuid), o status e as datas; o campo de busca fica interno. */
const paraAdmin = ({ buscaTexto, ...resto }) => resto;

module.exports = {
  CATEGORIAS,
  ESPECIES,
  STATUS,
  TIPOS_BLOCO,
  ACOES_DICA,
  normalizarTexto,
  gerarSlug,
  calcularTempoLeituraMin,
  montarBuscaTexto,
  validarBlocos,
  sanitizarBlocos,
  validarDica,
  sanitizarDica,
  paraAppResumo,
  paraAppCompleta,
  paraAdmin,
};

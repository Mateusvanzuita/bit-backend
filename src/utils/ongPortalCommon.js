// src/utils/ongPortalCommon.js
// Peças compartilhadas pelos serviços /ong-portal: paginação por cursor, datas (fuso de São Paulo), validação.
const { OngError } = require('./ongErrors');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const invalido = (msg) => new OngError(msg, 400, 'VALIDACAO');
const conflito = (msg) => new OngError(msg, 409, 'CONFLITO');
const naoEncontrado = (msg) => new OngError(msg, 404, 'NAO_ENCONTRADO');

// ── Cursor (keyset: createdAt desc, id desc) ────────────────────────────────
const ORDEM = [{ createdAt: 'desc' }, { id: 'desc' }];
const LIMITE_PADRAO = 20;

function limiteDe(v) {
  if (v === undefined || v === '') return LIMITE_PADRAO;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 50) throw invalido('Limite inválido (1 a 50).');
  return n;
}

const codificarCursor = (r) => Buffer.from(`${r.createdAt.toISOString()}|${r.id}`).toString('base64url');

function decodificarCursor(c) {
  if (c === undefined || c === '') return null;
  try {
    const [d, id] = Buffer.from(String(c), 'base64url').toString().split('|');
    const data = new Date(d);
    if (Number.isNaN(data.getTime()) || !UUID.test(id)) throw new Error('x');
    return { data, id };
  } catch {
    throw invalido('Cursor inválido.');
  }
}

function filtroCursor(cur) {
  if (!cur) return {};
  return { OR: [{ createdAt: { lt: cur.data } }, { createdAt: cur.data, id: { lt: cur.id } }] };
}

/** Roda uma consulta paginada. `consulta({ where, orderBy, take })` deve devolver linhas com createdAt e id. */
async function paginar({ where, cursor, limite, consulta }) {
  const lim = limiteDe(limite);
  const cur = decodificarCursor(cursor);
  const linhas = await consulta({ where: { AND: [where, filtroCursor(cur)] }, orderBy: ORDEM, take: lim + 1 });
  const temMais = linhas.length > lim;
  const pagina = temMais ? linhas.slice(0, lim) : linhas;
  return { pagina, proximoCursor: temMais ? codificarCursor(pagina[pagina.length - 1]) : null };
}

// ── Datas no fuso de São Paulo (UTC-3 o ano todo desde 2019) ────────────────
const FUSO = 'America/Sao_Paulo';
const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });

const diaSP = (d) => fmtDia.format(d); // YYYY-MM-DD
const inicioDoDiaSP = (ymd) => new Date(`${ymd}T00:00:00-03:00`);
function somarDias(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Validação ────────────────────────────────────────────────────────────────
function exigirUuid(v, rotulo = 'id') {
  if (typeof v !== 'string' || !UUID.test(v)) throw naoEncontrado('Não encontrado.');
  return v;
}

/** Recusa campos fora da lista (ex.: ongId, verificada, status): nada de "mass assignment". */
function soCamposPermitidos(body, permitidos) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalido('Corpo da requisição inválido.');
  const extra = Object.keys(body).filter((k) => !permitidos.includes(k));
  if (extra.length) throw invalido(`Campo não permitido: ${extra[0]}.`);
}

function texto(v, rotulo, { min = 0, max, nulavel = false } = {}) {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
    if (min > 0) throw invalido(`${rotulo} é obrigatório.`);
    if (nulavel) return null;
    throw invalido(`${rotulo} é obrigatório.`);
  }
  if (typeof v !== 'string') throw invalido(`${rotulo} inválido.`);
  const t = v.trim();
  if (t.length < min) throw invalido(`${rotulo} precisa ter ao menos ${min} caracteres.`);
  if (t.length > max) throw invalido(`${rotulo} pode ter no máximo ${max} caracteres.`);
  return t;
}

function numero(v, rotulo, { min, max, inteiro = false } = {}) {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw invalido(`${rotulo} inválido.`);
  if (inteiro && !Number.isInteger(v)) throw invalido(`${rotulo} deve ser um número inteiro.`);
  if (v < min || v > max) throw invalido(`${rotulo} deve estar entre ${min} e ${max}.`);
  return v;
}

function booleano(v, rotulo, { nulavel = false } = {}) {
  if (v === null || v === undefined) {
    if (nulavel) return null;
    throw invalido(`${rotulo} é obrigatório.`);
  }
  if (typeof v !== 'boolean') throw invalido(`${rotulo} inválido.`);
  return v;
}

function enumerado(v, lista, rotulo, { nulavel = false } = {}) {
  if ((v === null || v === undefined) && nulavel) return null;
  if (!lista.includes(v)) throw invalido(`${rotulo} inválido.`);
  return v;
}

function listaEnum(v, lista, rotulo, max = 10) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max) throw invalido(`${rotulo} inválido.`);
  const u = [...new Set(v)];
  for (const x of u) if (!lista.includes(x)) throw invalido(`${rotulo} inválido.`);
  return u;
}

function listaTexto(v, rotulo, { max, tamanho }) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max) throw invalido(`${rotulo}: no máximo ${max} itens.`);
  return v.map((x, i) => texto(x, `${rotulo} (${i + 1})`, { min: 1, max: tamanho }));
}

function urlHttp(v, rotulo) {
  const t = texto(v, rotulo, { max: 300, nulavel: true });
  if (t === null) return null;
  let u;
  try { u = new URL(t); } catch { throw invalido(`${rotulo} inválido.`); }
  if (!['http:', 'https:'].includes(u.protocol)) throw invalido(`${rotulo} deve começar com http:// ou https://.`);
  return u.toString();
}

const dataISO = (v, rotulo) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
    throw invalido(`${rotulo} inválida (use AAAA-MM-DD).`);
  }
  return v;
};

module.exports = {
  UUID, invalido, conflito, naoEncontrado,
  limiteDe, paginar, ORDEM,
  FUSO, diaSP, inicioDoDiaSP, somarDias,
  exigirUuid, soCamposPermitidos, texto, numero, booleano, enumerado, listaEnum, listaTexto, urlHttp, dataISO,
};

// src/validators/novidadeValidator.js
const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../middlewares/errorHandler');
const U = require('../utils/novidadeUtils');

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Roda depois das regras: junta as mensagens e repassa para o errorHandler. */
const validar = (req, res, next) => {
  const erros = validationResult(req);
  if (erros.isEmpty()) return next();
  return next(new AppError(erros.array().map((e) => e.msg).join('; '), 400));
};

// ── Params ────────────────────────────────────────────────────
const slugParam = [
  param('slug').matches(SLUG_REGEX).isLength({ max: 100 }).withMessage('slug inválido'),
];
const idParam = [param('id').isUUID().withMessage('id inválido (esperado UUID)')];

// ── Query ─────────────────────────────────────────────────────
const paginacaoQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page deve ser um inteiro >= 1'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit deve ser entre 1 e 50'),
  query('categoria').optional().isIn(U.CATEGORIAS).withMessage(`categoria deve ser: ${U.CATEGORIAS.join(', ')}`),
  query('busca').optional().isString().isLength({ max: 100 }).withMessage('busca aceita até 100 caracteres'),
];

const listarPublicasQuery = [
  ...paginacaoQuery,
  query('especie').optional().isIn(U.ESPECIES).withMessage(`especie deve ser: ${U.ESPECIES.join(', ')}`),
  query('destaque').optional().isBoolean().withMessage('destaque deve ser true ou false'),
];

const listarAdminQuery = [
  ...paginacaoQuery,
  query('status').optional().isIn(U.STATUS).withMessage(`status deve ser: ${U.STATUS.join(', ')}`),
];

// ── Body ──────────────────────────────────────────────────────
// criacao=true: campos obrigatórios; criacao=false (PUT): tudo opcional.
const regrasCorpo = (criacao) => {
  const campo = (nome) => (criacao ? body(nome) : body(nome).optional());
  const opcional = (nome) => body(nome).optional({ nullable: true });

  const regras = [
    campo('titulo')
      .isString().withMessage('titulo é obrigatório').bail()
      .trim().isLength({ min: 5, max: 150 }).withMessage('titulo deve ter entre 5 e 150 caracteres'),
    campo('resumo')
      .isString().withMessage('resumo é obrigatório').bail()
      .trim().isLength({ min: 10, max: 400 }).withMessage('resumo deve ter entre 10 e 400 caracteres'),
    campo('categoria').isIn(U.CATEGORIAS).withMessage(`categoria deve ser: ${U.CATEGORIAS.join(', ')}`),
    campo('blocos').custom((v) => {
      const erro = U.validarBlocos(v);
      if (erro) throw new Error(erro);
      return true;
    }),

    body('slug').optional().matches(SLUG_REGEX).isLength({ max: 100 })
      .withMessage('slug deve ter só letras minúsculas, números e hífens'),
    opcional('capaUrl').optional({ checkFalsy: true })
      .isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('capaUrl deve ser uma URL http(s)'),
    body('tempoLeituraMin').optional().isInt({ min: 1, max: 120 }).withMessage('tempoLeituraMin deve ser entre 1 e 120'),
    body('status').optional().isIn(U.STATUS).withMessage(`status deve ser: ${U.STATUS.join(', ')}`),
    opcional('publicadoEm').isISO8601().withMessage('publicadoEm deve ser uma data ISO 8601'),
    body('especies').optional().isArray({ max: 2 }).withMessage('especies deve ser uma lista'),
    body('especies.*').isIn(U.ESPECIES).withMessage(`especies aceita: ${U.ESPECIES.join(', ')}`),
    body('destaque').optional().isBoolean().withMessage('destaque deve ser true ou false'),
    body('patrocinado').optional().isBoolean().withMessage('patrocinado deve ser true ou false'),
    opcional('parceiroNome').isString().isLength({ max: 80 }).withMessage('parceiroNome aceita até 80 caracteres'),
    body('resumoRapido').optional().isArray({ max: 4 }).withMessage('resumoRapido aceita até 4 frases'),
    body('resumoRapido.*').isString().trim().isLength({ min: 1, max: 200 })
      .withMessage('cada item de resumoRapido deve ter até 200 caracteres'),
    body('dica').optional({ nullable: true }).custom((v) => {
      const erro = U.validarDica(v);
      if (erro) throw new Error(erro);
      return true;
    }),
    body('relacionados').optional().isArray({ max: 6 }).withMessage('relacionados aceita até 6 slugs'),
    body('relacionados.*').matches(SLUG_REGEX).withMessage('relacionados deve conter slugs válidos'),
  ];

  // Na criação, conteúdo patrocinado precisa de parceiro (na edição o service confere com o valor atual).
  if (criacao) {
    regras.push(
      body('parceiroNome').custom((v, { req }) => {
        const patro = req.body.patrocinado === true || req.body.patrocinado === 'true';
        if (patro && !(typeof v === 'string' && v.trim())) {
          throw new Error('parceiroNome é obrigatório em conteúdo patrocinado');
        }
        return true;
      }),
    );
  }
  return regras;
};

const criarValidator = regrasCorpo(true);
const atualizarValidator = regrasCorpo(false);

const statusValidator = [
  body('status').isIn(U.STATUS).withMessage(`status deve ser: ${U.STATUS.join(', ')}`),
  body('publicadoEm').optional({ nullable: true }).isISO8601().withMessage('publicadoEm deve ser uma data ISO 8601'),
];

module.exports = {
  validar,
  slugParam,
  idParam,
  listarPublicasQuery,
  listarAdminQuery,
  criarValidator,
  atualizarValidator,
  statusValidator,
};

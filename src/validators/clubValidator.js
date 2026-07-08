// src/validators/clubValidator.js
const { body, query, param } = require('express-validator');

// ── PET SHOPS ──────────────────────────────────────────────────────────────

const listarPetShopsValidator = [
  query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude inválida'),
  query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude inválida'),
  query('raioKm').optional().isFloat({ min: 1, max: 200 }).withMessage('Raio deve ser entre 1 e 200 km'),
  query('cidade').optional().isString().trim().isLength({ min: 2, max: 100 }),
  query('estado').optional().isString().trim().isLength({ min: 2, max: 2 }),
];

const petShopIdValidator = [
  param('petShopId')
    .isUUID()
    .withMessage('ID do pet shop inválido'),
];

// ── CUPONS ────────────────────────────────────────────────────────────────

const listarCuponsValidator = [
  query('latitude').optional().isFloat({ min: -90, max: 90 }),
  query('longitude').optional().isFloat({ min: -180, max: 180 }),
  query('cidade').optional().isString().trim().isLength({ min: 2, max: 100 }),
  query('estado').optional().isString().trim().isLength({ min: 2, max: 2 }),
  query('categoria')
    .optional()
    .isIn(['SERVICOS', 'ALIMENTACAO', 'SAUDE', 'ACESSORIOS', 'GATO', 'OUTROS'])
    .withMessage('Categoria inválida'),
];

const resgatarCupomValidator = [
  param('cupomId').isUUID().withMessage('ID do cupom inválido'),
];

const utilizarCupomValidator = [
  param('resgateId').isUUID().withMessage('ID do resgate inválido'),
];

const criarCupomValidator = [
  param('petShopId').isUUID().withMessage('ID do pet shop inválido'),

  body('titulo')
    .notEmpty().withMessage('Título é obrigatório')
    .isString().trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Título deve ter entre 3 e 100 caracteres'),

  body('descricao')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
    .isLength({ max: 500 }),

  body('categoria')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['SERVICOS', 'ALIMENTACAO', 'SAUDE', 'ACESSORIOS', 'GATO', 'OUTROS'])
    .withMessage('Categoria inválida'),

  body('subcategoria')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
    .isLength({ max: 80 })
    .withMessage('Subcategoria deve ter no máximo 80 caracteres'),

  body('tipoBeneficio')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['DESCONTO_PERCENTUAL', 'DESCONTO_FIXO', 'BRINDE', 'COMBO'])
    .withMessage('Tipo de benefício inválido'),

  body('valorDesconto')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0.01 })
    .withMessage('Valor do desconto deve ser maior que 0'),

  body('tipo')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['FIXO', 'SAZONAL', 'FAVORITO'])
    .withMessage('Tipo deve ser FIXO, SAZONAL ou FAVORITO'),

  body('objetivo')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'FIDELIZACAO', 'RECUPERACAO', 'AUMENTO_TICKET',
      'GIRO_ESTOQUE', 'SAZONAL', 'LANCAMENTO', 'AQUISICAO',
    ])
    .withMessage('Objetivo inválido'),

  body('iconeTipo')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'DESCONTO', 'BANHO_TOSA', 'PRODUTO', 'VIP',
      'SAZONAL', 'SAUDE', 'ALIMENTACAO', 'BRINDE', 'COMBO',
    ])
    .withMessage('Ícone inválido'),

  body('duracaoTipo')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['PERMANENTE', 'MENSAL', 'SEMANAL', 'FLASH', 'HAPPY_HOUR', 'SAZONAL',
           'ILIMITADO', 'HORAS_24', 'SEMANA_1'])
    .withMessage('Duração inválida'),

  // Aceita null e string vazia (campos condicionais no frontend)
  body('dataFim')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('dataFim deve ser uma data ISO válida'),

  body('happyHourInicio')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('happyHourInicio deve estar no formato HH:MM'),

  body('happyHourFim')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('happyHourFim deve estar no formato HH:MM'),

  body('limiteUsoTotal')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 }),

  body('limiteUsoPorUser')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 }),

  body('codigoDisplay')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
    .isLength({ max: 30 }),

  body('bannerUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('bannerUrl deve ser uma URL válida'),

  body('destaque')
    .optional({ nullable: true })
    .isBoolean().withMessage('destaque deve ser true ou false'),
];

const atualizarCupomValidator = [
  param('petShopId').isUUID().withMessage('ID do pet shop inválido'),
  param('cupomId').isUUID().withMessage('ID do cupom inválido'),

  body('titulo')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim().isLength({ min: 3, max: 100 }),
  body('descricao')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim().isLength({ max: 500 }),
  body('categoria')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['SERVICOS', 'ALIMENTACAO', 'SAUDE', 'ACESSORIOS', 'GATO', 'OUTROS']),
  body('subcategoria')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim().isLength({ max: 80 }),
  body('tipoBeneficio')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['DESCONTO_PERCENTUAL', 'DESCONTO_FIXO', 'BRINDE', 'COMBO']),
  body('valorDesconto')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0.01 }),
  body('objetivo')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'FIDELIZACAO', 'RECUPERACAO', 'AUMENTO_TICKET',
      'GIRO_ESTOQUE', 'SAZONAL', 'LANCAMENTO', 'AQUISICAO',
    ]),
  body('iconeTipo')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'DESCONTO', 'BANHO_TOSA', 'PRODUTO', 'VIP',
      'SAZONAL', 'SAUDE', 'ALIMENTACAO', 'BRINDE', 'COMBO',
    ]),
  body('ativo')
    .optional({ nullable: true })
    .isBoolean(),
  body('destaque')
    .optional({ nullable: true })
    .isBoolean(),
  body('dataFim')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601(),
  body('happyHourInicio')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('happyHourFim')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('bannerUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL(),
];

const criarPetShopValidator = [
  body('nome')
    .notEmpty().withMessage('Nome é obrigatório')
    .isString().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),

  body('descricao')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim()
    .isLength({ max: 1000 }).withMessage('Descrição deve ter no máximo 1000 caracteres'),

  body('endereco')
    .notEmpty().withMessage('Endereço é obrigatório')
    .isString().trim()
    .isLength({ min: 5, max: 200 }),

  body('cidade')
    .notEmpty().withMessage('Cidade é obrigatória')
    .isString().trim()
    .isLength({ min: 2, max: 100 }),

  body('estado')
    .notEmpty().withMessage('Estado é obrigatório')
    .isString().trim()
    .isLength({ min: 2, max: 2 }).withMessage('Estado deve ser a sigla de 2 letras (ex: SC)'),

  body('latitude')
    .notEmpty().withMessage('Latitude é obrigatória')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude inválida'),

  body('longitude')
    .notEmpty().withMessage('Longitude é obrigatória')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude inválida'),

  body('telefone')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim().isLength({ max: 20 }),

  body('whatsapp')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim().isLength({ max: 20 }),

  body('instagram')
    .optional({ nullable: true, checkFalsy: true })
    .isString().trim().isLength({ max: 100 }),

  body('website')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('Website deve ser uma URL válida'),

  body('descontoFavorito')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 5, max: 100 }).withMessage('Desconto favorito deve ser entre 5% e 100%'),

  body('planoAtivo')
    .optional({ nullable: true })
    .isBoolean().withMessage('planoAtivo deve ser true ou false'),

  body('logoUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('logoUrl deve ser uma URL válida'),

  body('bannerUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('bannerUrl deve ser uma URL válida'),
];

module.exports = {
  listarPetShopsValidator,
  petShopIdValidator,
  listarCuponsValidator,
  resgatarCupomValidator,
  utilizarCupomValidator,
  criarCupomValidator,
  atualizarCupomValidator,
  criarPetShopValidator,
};
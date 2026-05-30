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
    .optional().isString().trim()
    .isLength({ max: 500 }),
 
  body('categoria')
    .optional()
    .isIn(['SERVICOS', 'ALIMENTACAO', 'SAUDE', 'ACESSORIOS', 'GATO', 'OUTROS'])
    .withMessage('Categoria inválida'),
 
  body('subcategoria')
    .optional().isString().trim()
    .isLength({ max: 80 })
    .withMessage('Subcategoria deve ter no máximo 80 caracteres'),
 
  body('tipoBeneficio')
    .optional()
    .isIn(['DESCONTO_PERCENTUAL', 'DESCONTO_FIXO', 'BRINDE', 'COMBO'])
    .withMessage('Tipo de benefício inválido'),
 
  body('valorDesconto')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Valor do desconto deve ser maior que 0'),
 
  body('tipo')
    .optional()
    .isIn(['FIXO', 'SAZONAL', 'FAVORITO'])
    .withMessage('Tipo deve ser FIXO, SAZONAL ou FAVORITO'),
 
  body('objetivo')
    .optional()
    .isIn([
      'FIDELIZACAO', 'RECUPERACAO', 'AUMENTO_TICKET',
      'GIRO_ESTOQUE', 'SAZONAL', 'LANCAMENTO', 'AQUISICAO',
    ])
    .withMessage('Objetivo inválido'),
 
  body('iconeTipo')
    .optional()
    .isIn([
      'DESCONTO', 'BANHO_TOSA', 'PRODUTO', 'VIP',
      'SAZONAL', 'SAUDE', 'ALIMENTACAO', 'BRINDE', 'COMBO',
    ])
    .withMessage('Ícone inválido'),
 
  body('duracaoTipo')
    .optional()
    .isIn(['PERMANENTE', 'MENSAL', 'SEMANAL', 'FLASH', 'HAPPY_HOUR', 'SAZONAL',
           'ILIMITADO', 'HORAS_24', 'SEMANA_1']) // mantém compatibilidade v1
    .withMessage('Duração inválida'),
 
  // SAZONAL: exige dataFim
  body('dataFim')
    .optional()
    .isISO8601()
    .withMessage('dataFim deve ser uma data ISO válida'),
 
  // HAPPY_HOUR: exige horários no formato HH:MM
  body('happyHourInicio')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('happyHourInicio deve estar no formato HH:MM'),
 
  body('happyHourFim')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('happyHourFim deve estar no formato HH:MM'),
 
  body('limiteUsoTotal')
    .optional().isInt({ min: 1 }),
 
  body('limiteUsoPorUser')
    .optional().isInt({ min: 1 }),
 
  body('codigoDisplay')
    .optional().isString().trim()
    .isLength({ max: 30 }),
 
  body('bannerUrl')
    .optional().isURL().withMessage('bannerUrl deve ser uma URL válida'),
 
  body('destaque')
    .optional().isBoolean().withMessage('destaque deve ser true ou false'),
];
 
const atualizarCupomValidator = [
  param('petShopId').isUUID().withMessage('ID do pet shop inválido'),
  param('cupomId').isUUID().withMessage('ID do cupom inválido'),
 
  body('titulo').optional().isString().trim().isLength({ min: 3, max: 100 }),
  body('descricao').optional().isString().trim().isLength({ max: 500 }),
  body('categoria')
    .optional()
    .isIn(['SERVICOS', 'ALIMENTACAO', 'SAUDE', 'ACESSORIOS', 'GATO', 'OUTROS']),
  body('subcategoria').optional().isString().trim().isLength({ max: 80 }),
  body('tipoBeneficio')
    .optional()
    .isIn(['DESCONTO_PERCENTUAL', 'DESCONTO_FIXO', 'BRINDE', 'COMBO']),
  body('valorDesconto').optional().isFloat({ min: 0.01 }),
  body('objetivo')
    .optional()
    .isIn([
      'FIDELIZACAO', 'RECUPERACAO', 'AUMENTO_TICKET',
      'GIRO_ESTOQUE', 'SAZONAL', 'LANCAMENTO', 'AQUISICAO',
    ]),
  body('iconeTipo')
    .optional()
    .isIn([
      'DESCONTO', 'BANHO_TOSA', 'PRODUTO', 'VIP',
      'SAZONAL', 'SAUDE', 'ALIMENTACAO', 'BRINDE', 'COMBO',
    ]),
  body('ativo').optional().isBoolean(),
  body('destaque').optional().isBoolean(),
  body('dataFim').optional().isISO8601(),
  body('happyHourInicio').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('happyHourFim').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('bannerUrl').optional().isURL(),
];

const criarPetShopValidator = [
  body('nome')
    .notEmpty().withMessage('Nome é obrigatório')
    .isString().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
 
  body('descricao')
    .optional()
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
    .optional().isString().trim().isLength({ max: 20 }),
 
  body('whatsapp')
    .optional().isString().trim().isLength({ max: 20 }),
 
  body('instagram')
    .optional().isString().trim().isLength({ max: 100 }),
 
  body('website')
    .optional().isURL().withMessage('Website deve ser uma URL válida'),
 
  body('descontoFavorito')
    .optional()
    .isFloat({ min: 5, max: 100 }).withMessage('Desconto favorito deve ser entre 5% e 100%'),
 
  body('planoAtivo')
    .optional().isBoolean().withMessage('planoAtivo deve ser true ou false'),
 
  body('logoUrl')
    .optional().isURL().withMessage('logoUrl deve ser uma URL válida'),
 
  body('bannerUrl')
    .optional().isURL().withMessage('bannerUrl deve ser uma URL válida'),
];

module.exports = {
  listarPetShopsValidator,
  petShopIdValidator,
  listarCuponsValidator,
  resgatarCupomValidator,
  utilizarCupomValidator,
  criarCupomValidator,
  atualizarCupomValidator,
  criarPetShopValidator
};
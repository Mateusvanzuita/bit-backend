// src/validators/clubValidator.js
const { body, query, param } = require('express-validator');

// ── PET SHOPS ──────────────────────────────────────────────────────────────

const listarPetShopsValidator = [
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude inválida'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude inválida'),
  query('raioKm')
    .optional()
    .isFloat({ min: 1, max: 200 })
    .withMessage('Raio deve ser entre 1 e 200 km'),
  query('cidade')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome de cidade inválido'),
  query('estado')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ser a sigla de 2 letras (ex: SC)'),
];

const petShopIdValidator = [
  param('petShopId')
    .isUUID()
    .withMessage('ID do pet shop inválido'),
];

// ── CUPONS ────────────────────────────────────────────────────────────────

const listarCuponsValidator = [
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude inválida'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude inválida'),
  query('cidade')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 }),
  query('estado')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 }),
];

const resgatarCupomValidator = [
  param('cupomId')
    .isUUID()
    .withMessage('ID do cupom inválido'),
];

const utilizarCupomValidator = [
  param('resgateId')
    .isUUID()
    .withMessage('ID do resgate inválido'),
];

const criarCupomValidator = [
  param('petShopId')
    .isUUID()
    .withMessage('ID do pet shop inválido'),

  body('titulo')
    .notEmpty().withMessage('Título é obrigatório')
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Título deve ter entre 3 e 100 caracteres'),

  body('descricao')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),

  body('tipo')
    .notEmpty().withMessage('Tipo é obrigatório')
    .isIn(['FIXO', 'SAZONAL', 'FAVORITO'])
    .withMessage('Tipo deve ser FIXO, SAZONAL ou FAVORITO'),

  body('valorDesconto')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Valor do desconto deve ser maior que 0'),

  body('tipoDesconto')
    .optional()
    .isIn(['PERCENTUAL', 'FIXO_REAIS'])
    .withMessage('Tipo de desconto deve ser PERCENTUAL ou FIXO_REAIS'),

  body('duracaoTipo')
    .optional()
    .isIn(['ILIMITADO', 'HORAS_24', 'SEMANA_1'])
    .withMessage('Duração deve ser ILIMITADO, HORAS_24 ou SEMANA_1'),

  body('iconeTipo')
    .optional()
    .isIn(['DESCONTO', 'BANHO_TOSA', 'PRODUTO', 'VIP', 'SAZONAL'])
    .withMessage('Ícone inválido'),

  body('limiteUsoTotal')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Limite de uso total deve ser um inteiro positivo'),

  body('limiteUsoPorUser')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Limite de uso por usuário deve ser um inteiro positivo'),

  body('codigoDisplay')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Código de exibição deve ter no máximo 30 caracteres'),
];

const atualizarCupomValidator = [
  param('petShopId').isUUID().withMessage('ID do pet shop inválido'),
  param('cupomId').isUUID().withMessage('ID do cupom inválido'),

  body('titulo')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 }),

  body('descricao')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 }),

  body('ativo')
    .optional()
    .isBoolean()
    .withMessage('ativo deve ser true ou false'),

  body('valorDesconto')
    .optional()
    .isFloat({ min: 0.01 }),

  body('tipoDesconto')
    .optional()
    .isIn(['PERCENTUAL', 'FIXO_REAIS']),

  body('iconeTipo')
    .optional()
    .isIn(['DESCONTO', 'BANHO_TOSA', 'PRODUTO', 'VIP', 'SAZONAL']),

  body('limiteUsoTotal')
    .optional()
    .isInt({ min: 1 }),
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
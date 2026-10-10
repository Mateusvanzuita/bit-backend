// src/validators/adocaoValidator.js
const { body, query, param } = require('express-validator');

const ESPECIES = ['CACHORRO', 'GATO'];
const SEXOS = ['MACHO', 'FEMEA'];
const PORTES = ['PEQUENO', 'MEDIO', 'GRANDE'];
const FASES = ['FILHOTE', 'ADULTO', 'IDOSO'];
const STATUS_ANIMAL = ['DISPONIVEL', 'EM_PROCESSO', 'ADOTADO', 'INDISPONIVEL'];
const COMPORTAMENTOS = ['CALMO', 'AGITADO', 'SOCIAVEL', 'TIMIDO', 'AGRESSIVO', 'BRINCALHAO'];
const CONVIVENCIAS = ['CRIANCAS', 'OUTROS_CAES', 'GATOS', 'ESTRANHOS', 'IDOSOS'];
const MORADIAS = ['CASA_COM_QUINTAL', 'CASA_SEM_QUINTAL', 'APARTAMENTO'];
const EXPERIENCIAS = ['PRIMEIRO_PET', 'JA_TIVE', 'TENHO_PETS'];
const MOTIVOS = ['JA_ADOTADO', 'INFO_FALSA', 'COBRANCA_INDEVIDA', 'MAUS_TRATOS', 'OUTRO'];
const TIPOS_AJUDA = ['APADRINHAR', 'ITENS', 'VOLUNTARIADO', 'DOACAO_FINANCEIRA'];
const STATUS_AJUDA = ['ENVIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
const STATUS_INTERESSE = ['ENVIADO', 'EM_CONTATO', 'CANCELADO', 'RECUSADO', 'ADOCAO_CONFIRMADA'];
const TIPOS_PIX = ['CPF_CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'];

const idParam = (nome = 'id') => param(nome).isUUID().withMessage(`${nome} inválido`);

const localizacao = [
  query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude inválida'),
  query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude inválida'),
  query('raioKm').optional().isFloat({ min: 1, max: 500 }).withMessage('Raio deve ser entre 1 e 500 km'),
  query('cidade').optional().isString().trim().isLength({ min: 2, max: 100 }),
  query('estado').optional().isString().trim().isLength({ min: 2, max: 2 }),
];

// Lista de strings (itens/atividades/fotos...)
const listaTexto = (campo, { max = 20, tamanho = 200 } = {}) => [
  body(campo).optional().isArray({ max }).withMessage(`${campo} deve ser uma lista (máx. ${max})`),
  body(`${campo}.*`).optional().isString().trim().isLength({ min: 1, max: tamanho }),
];

// ── USUÁRIO ──────────────────────────────────────────────────────────────────

const listarAnimaisValidator = [
  ...localizacao,
  query('especie').optional().isIn(ESPECIES),
  query('porte').optional().isIn(PORTES),
  query('faseVida').optional().isIn(FASES),
  query('sexo').optional().isIn(SEXOS),
  query('ongId').optional().isUUID(),
  query('apadrinhaveis').optional().isBoolean(),
  query('cursor').optional().isInt({ min: 0 }),
  query('limite').optional().isInt({ min: 1, max: 50 }),
];

const listarOngsValidator = [...localizacao];

const idValidator = [idParam('id')];
const animalIdValidator = [idParam('animalId')];

const criarInteresseValidator = [
  body('animalId').isUUID().withMessage('animalId inválido'),
  body('respostas').isObject().withMessage('respostas é obrigatório'),
  body('respostas.moradia').isIn(MORADIAS).withMessage('Moradia inválida'),
  body('respostas.temCriancas').isBoolean().withMessage('Informe se há crianças em casa'),
  body('respostas.temOutrosPets').isBoolean().withMessage('Informe se há outros pets'),
  body('respostas.experiencia').isIn(EXPERIENCIAS).withMessage('Experiência inválida'),
  body('respostas.mensagem').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 500 }),
  body('consentimento')
    .custom((v) => v === true)
    .withMessage('É necessário autorizar o compartilhamento dos dados com a ONG'),
];

const vincularPetValidator = [idParam('id'), body('petId').isUUID().withMessage('petId inválido')];

const criarAlertaValidator = [
  body('especie').optional({ nullable: true }).isIn(ESPECIES),
  body('porte').optional({ nullable: true }).isIn(PORTES),
  body('faseVida').optional({ nullable: true }).isIn(FASES),
  body('sexo').optional({ nullable: true }).isIn(SEXOS),
  body('cidade').optional({ nullable: true }).isString().trim().isLength({ min: 2, max: 100 }),
  body('estado').optional({ nullable: true }).isString().trim().isLength({ min: 2, max: 2 }),
];

const denunciaValidator = [
  idParam('id'),
  body('motivo').isIn(MOTIVOS).withMessage('Motivo inválido'),
  body('detalhe').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 500 }),
];

const criarAjudaValidator = [
  body('tipo').isIn(TIPOS_AJUDA).withMessage('Tipo de ajuda inválido'),
  body('ongId').isUUID().withMessage('ongId inválido'),
  body('animalId').optional({ nullable: true }).isUUID(),
  ...listaTexto('itens'),
  ...listaTexto('atividades'),
  body('valorMensal').optional({ nullable: true }).isFloat({ min: 1, max: 100000 }),
  body('valorDoado').optional({ nullable: true }).isFloat({ min: 1, max: 1000000 }),
  body('disponibilidade').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 200 }),
  body('mensagem').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 500 }),
  body('consentimento')
    .custom((v) => v === true)
    .withMessage('É necessário autorizar o compartilhamento dos dados com a ONG'),
];

// ── ADMIN ────────────────────────────────────────────────────────────────────

const itensJson = (campo, camposTexto) =>
  body(campo)
    .optional()
    .isArray({ max: 50 })
    .withMessage(`${campo} deve ser uma lista`)
    .bail()
    .custom((lista) =>
      lista.every(
        (item) =>
          item &&
          typeof item.titulo === 'string' &&
          item.titulo.trim().length > 0 &&
          item.titulo.length <= 150 &&
          camposTexto.every((c) => item[c] == null || (typeof item[c] === 'string' && item[c].length <= 150)),
      ),
    )
    .withMessage(`${campo}: cada item precisa de "titulo" (texto de até 150 caracteres)`);

const camposOng = (obrigatorios) => {
  const req = (v) => (obrigatorios ? v.notEmpty().withMessage('Campo obrigatório') : v.optional());
  return [
    req(body('nome').isString().trim().isLength({ min: 2, max: 100 })),
    req(body('descricao').isString().trim().isLength({ min: 10, max: 2000 })),
    req(body('cidade').isString().trim().isLength({ min: 2, max: 100 })),
    req(body('estado').isString().trim().isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 letras (ex: SC)')),
    body('tipo').optional().isIn(['ONG', 'PROTETOR']),
    body('bairro').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 100 }),
    body('logoUrl').optional({ nullable: true, checkFalsy: true }).isURL(),
    body('bannerUrl').optional({ nullable: true, checkFalsy: true }).isURL(),
    body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
    body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
    body('whatsapp').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 20 }),
    body('instagramUrl').optional({ nullable: true, checkFalsy: true }).isURL(),
    body('siteUrl').optional({ nullable: true, checkFalsy: true }).isURL(),
    body('verificada').optional().isBoolean(),
    body('ativa').optional().isBoolean(),
    ...listaTexto('cidadesAtendidas', { max: 100, tamanho: 100 }),
    ...listaTexto('processoAdocao', { max: 15, tamanho: 200 }),
    body('taxaAdocao').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 300 }),
    body('pixChave').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 150 }),
    body('pixTipoChave').optional({ nullable: true, checkFalsy: true }).isIn(TIPOS_PIX),
    body('pixTitular').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 150 }),
    body('entregaDoacoes').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 300 }),
    itensJson('necessidades', ['quantidade']),
    itensJson('voluntariado', ['frequencia']),
  ];
};

const criarOngValidator = camposOng(true);
const atualizarOngValidator = [idParam('id'), ...camposOng(false)];
const statusOngValidator = [idParam('id'), body('ativa').isBoolean().withMessage('ativa deve ser true ou false')];

const camposAnimal = (obrigatorios) => {
  const req = (v) => (obrigatorios ? v.notEmpty().withMessage('Campo obrigatório') : v.optional());
  const listaEnum = (campo, valores) => [
    body(campo).optional().isArray({ max: 10 }),
    body(`${campo}.*`).optional().isIn(valores),
  ];
  return [
    req(body('ongId').isUUID().withMessage('ongId inválido')),
    req(body('nome').isString().trim().isLength({ min: 1, max: 60 })),
    req(body('especie').isIn(ESPECIES)),
    req(body('sexo').isIn(SEXOS)),
    req(body('porte').isIn(PORTES)),
    req(body('historia').isString().trim().isLength({ min: 10, max: 4000 })),
    body('faseVida').optional({ nullable: true }).isIn(FASES),
    body('idadeMeses').optional({ nullable: true }).isInt({ min: 0, max: 400 }),
    body('raca').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 80 }),
    body('cor').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 60 }),
    body('pesoKg').optional({ nullable: true }).isFloat({ min: 0.1, max: 120 }),
    ...listaTexto('fotos', { max: 10, tamanho: 500 }),
    body('fotos.*').optional().isURL().withMessage('Cada foto deve ser uma URL válida'),
    ...listaEnum('temperamento', COMPORTAMENTOS),
    ...listaEnum('convivencia', CONVIVENCIAS),
    ...listaEnum('convivenciaNaoRecomendada', CONVIVENCIAS),
    body('castrado').optional({ nullable: true }).isBoolean(),
    body('vacinado').optional({ nullable: true }).isBoolean(),
    body('vermifugado').optional({ nullable: true }).isBoolean(),
    body('necessidadesEspeciais').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 1000 }),
    body('larTemporario').optional().isBoolean(),
    body('vacinas')
      .optional()
      .isArray({ max: 30 })
      .bail()
      .custom((lista) =>
        lista.every(
          (v) =>
            v &&
            typeof v.nome === 'string' &&
            ['vaccine', 'dewormer', 'other'].includes(v.categoria) &&
            !Number.isNaN(Date.parse(v.dataAplicacao)) &&
            (v.proximaDose == null || !Number.isNaN(Date.parse(v.proximaDose))),
        ),
      )
      .withMessage('vacinas: cada item precisa de nome, categoria (vaccine|dewormer|other) e dataAplicacao (ISO)'),
    body('apadrinhamentoAtivo').optional().isBoolean(),
    body('apadrinhamentoValorSugerido').optional({ nullable: true }).isFloat({ min: 1, max: 100000 }),
    body('apadrinhamentoCobre').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 200 }),
    body('status').optional().isIn(STATUS_ANIMAL),
    body('publicado').optional().isBoolean(),
  ];
};

const criarAnimalValidator = camposAnimal(true);
const atualizarAnimalValidator = [idParam('id'), ...camposAnimal(false)];
const statusAnimalValidator = [idParam('id'), body('status').isIn(STATUS_ANIMAL).withMessage('Status inválido')];

const listarAnimaisAdminValidator = [
  query('ongId').optional().isUUID(),
  query('status').optional().isIn(STATUS_ANIMAL),
  query('publicado').optional().isBoolean(),
];

const listarInteressesAdminValidator = [
  query('status').optional().isIn(STATUS_INTERESSE),
  query('ongId').optional().isUUID(),
  query('animalId').optional().isUUID(),
];

// O admin só move interesses entre EM_CONTATO e RECUSADO; ADOCAO_CONFIRMADA tem endpoint próprio.
const statusInteresseValidator = [
  idParam('id'),
  body('status').isIn(['EM_CONTATO', 'RECUSADO']).withMessage('Status deve ser EM_CONTATO ou RECUSADO'),
];

const listarAjudasAdminValidator = [
  query('status').optional().isIn(STATUS_AJUDA),
  query('tipo').optional().isIn(TIPOS_AJUDA),
  query('ongId').optional().isUUID(),
];

const statusAjudaValidator = [idParam('id'), body('status').isIn(STATUS_AJUDA).withMessage('Status inválido')];

const listarDenunciasValidator = [query('resolvida').optional().isBoolean()];
const resolverDenunciaValidator = [idParam('id'), body('ocultarAnimal').optional().isBoolean()];

module.exports = {
  // usuário
  listarAnimaisValidator,
  listarOngsValidator,
  idValidator,
  animalIdValidator,
  criarInteresseValidator,
  vincularPetValidator,
  criarAlertaValidator,
  denunciaValidator,
  criarAjudaValidator,
  // admin
  criarOngValidator,
  atualizarOngValidator,
  statusOngValidator,
  criarAnimalValidator,
  atualizarAnimalValidator,
  statusAnimalValidator,
  listarAnimaisAdminValidator,
  listarInteressesAdminValidator,
  statusInteresseValidator,
  listarAjudasAdminValidator,
  statusAjudaValidator,
  listarDenunciasValidator,
  resolverDenunciaValidator,
};
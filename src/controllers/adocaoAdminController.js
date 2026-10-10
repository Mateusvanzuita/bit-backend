// src/controllers/adocaoAdminController.js
const adocaoAdminService = require('../services/adocaoAdminService');
const asyncHandler = require('../utils/asyncHandler');

// Só repassa campos conhecidos ao Prisma (campo desconhecido viraria erro 500).
const pick = (obj, campos) =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([k]) => campos.includes(k)));

const ONG_CAMPOS = [
  'nome', 'tipo', 'descricao', 'logoUrl', 'bannerUrl', 'cidade', 'estado', 'bairro',
  'latitude', 'longitude', 'whatsapp', 'instagramUrl', 'siteUrl', 'verificada', 'ativa',
  'cidadesAtendidas', 'processoAdocao', 'taxaAdocao', 'pixChave', 'pixTipoChave',
  'pixTitular', 'entregaDoacoes', 'necessidades', 'voluntariado',
];

const ANIMAL_CAMPOS = [
  'ongId', 'nome', 'especie', 'sexo', 'porte', 'faseVida', 'idadeMeses', 'raca', 'cor',
  'pesoKg', 'fotos', 'historia', 'temperamento', 'convivencia', 'convivenciaNaoRecomendada',
  'castrado', 'vacinado', 'vermifugado', 'necessidadesEspeciais', 'larTemporario', 'vacinas',
  'apadrinhamentoAtivo', 'apadrinhamentoValorSugerido', 'apadrinhamentoCobre', 'status', 'publicado',
];

const bool = (v) => (v === 'true' ? true : v === 'false' ? false : undefined);

class AdocaoAdminController {
  // ── ONGs ───────────────────────────────────────────────────────────────────
  listarOngs = asyncHandler(async (req, res) => {
    const ongs = await adocaoAdminService.listarOngs();
    res.status(200).json({ status: 'success', data: { ongs } });
  });

  buscarOng = asyncHandler(async (req, res) => {
    const ong = await adocaoAdminService.buscarOng(req.params.id);
    res.status(200).json({ status: 'success', data: { ong } });
  });

  criarOng = asyncHandler(async (req, res) => {
    const ong = await adocaoAdminService.criarOng(pick(req.body, ONG_CAMPOS));
    res.status(201).json({ status: 'success', data: { ong } });
  });

  atualizarOng = asyncHandler(async (req, res) => {
    const ong = await adocaoAdminService.atualizarOng(req.params.id, pick(req.body, ONG_CAMPOS));
    res.status(200).json({ status: 'success', data: { ong } });
  });

  alterarStatusOng = asyncHandler(async (req, res) => {
    const ong = await adocaoAdminService.alterarStatusOng(req.params.id, req.body.ativa);
    res.status(200).json({ status: 'success', data: { ong } });
  });

  // ── ANIMAIS ────────────────────────────────────────────────────────────────
  listarAnimais = asyncHandler(async (req, res) => {
    const { ongId, status, publicado } = req.query;
    const animais = await adocaoAdminService.listarAnimais({ ongId, status, publicado: bool(publicado) });
    res.status(200).json({ status: 'success', data: { animais } });
  });

  buscarAnimal = asyncHandler(async (req, res) => {
    const animal = await adocaoAdminService.buscarAnimal(req.params.id);
    res.status(200).json({ status: 'success', data: { animal } });
  });

  criarAnimal = asyncHandler(async (req, res) => {
    const animal = await adocaoAdminService.criarAnimal(pick(req.body, ANIMAL_CAMPOS));
    res.status(201).json({ status: 'success', data: { animal } });
  });

  atualizarAnimal = asyncHandler(async (req, res) => {
    const animal = await adocaoAdminService.atualizarAnimal(req.params.id, pick(req.body, ANIMAL_CAMPOS));
    res.status(200).json({ status: 'success', data: { animal } });
  });

  alterarStatusAnimal = asyncHandler(async (req, res) => {
    const animal = await adocaoAdminService.alterarStatusAnimal(req.params.id, req.body.status);
    res.status(200).json({ status: 'success', data: { animal } });
  });

  // ── INTERESSES ─────────────────────────────────────────────────────────────
  listarInteresses = asyncHandler(async (req, res) => {
    const { status, ongId, animalId } = req.query;
    const interesses = await adocaoAdminService.listarInteresses({ status, ongId, animalId });
    res.status(200).json({ status: 'success', data: { interesses } });
  });

  alterarStatusInteresse = asyncHandler(async (req, res) => {
    const interesse = await adocaoAdminService.alterarStatusInteresse(req.params.id, req.body.status);
    res.status(200).json({ status: 'success', data: { interesse } });
  });

  confirmarAdocao = asyncHandler(async (req, res) => {
    const interesse = await adocaoAdminService.confirmarAdocao(req.params.id);
    res.status(200).json({ status: 'success', data: { interesse } });
  });

  // ── AJUDAS ─────────────────────────────────────────────────────────────────
  listarAjudas = asyncHandler(async (req, res) => {
    const { status, tipo, ongId } = req.query;
    const ajudas = await adocaoAdminService.listarAjudas({ status, tipo, ongId });
    res.status(200).json({ status: 'success', data: { ajudas } });
  });

  alterarStatusAjuda = asyncHandler(async (req, res) => {
    const ajuda = await adocaoAdminService.alterarStatusAjuda(req.params.id, req.body.status);
    res.status(200).json({ status: 'success', data: { ajuda } });
  });

  // ── DENÚNCIAS ──────────────────────────────────────────────────────────────
  listarDenuncias = asyncHandler(async (req, res) => {
    const denuncias = await adocaoAdminService.listarDenuncias({ resolvida: bool(req.query.resolvida) });
    res.status(200).json({ status: 'success', data: { denuncias } });
  });

  resolverDenuncia = asyncHandler(async (req, res) => {
    const denuncia = await adocaoAdminService.resolverDenuncia(req.params.id, {
      ocultarAnimal: req.body.ocultarAnimal === true,
    });
    res.status(200).json({ status: 'success', data: { denuncia } });
  });
}

module.exports = new AdocaoAdminController();
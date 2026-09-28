const clubService = require('../services/clubService');
const ofertaService = require('../services/ofertaService');
const vinculoClinicaService = require('../services/vinculoClinicaService');
const petShopRepository = require('../repositories/petShopRepository');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');
const prisma = require('../config/database');

async function buscarPetShopPorCrmId(crmPetshopId) {
  const petShop = await prisma.petShop.findUnique({
    where: { crmPetshopId },
    select: { id: true },
  });
  if (!petShop) {
    throw new AppError('Nenhum PetShop do Bitzy Club vinculado a este CRM.', 404);
  }
  return petShop;
}

class InternalController {
  // GET /internal/petshops/by-crm/:crmPetshopId/metricas
  metricasPorCrmPetshopId = asyncHandler(async (req, res) => {
    const petShop = await buscarPetShopPorCrmId(req.params.crmPetshopId);
    const metricas = await clubService.metricasPetShop(petShop.id);
    res.status(200).json({ status: 'success', data: metricas });
  });

  // POST /internal/vinculo-clinica/gerar-codigo
  gerarCodigoVinculo = asyncHandler(async (req, res) => {
    const resultado = await vinculoClinicaService.gerarCodigo(req.body);
    res.status(201).json({ status: 'success', data: resultado });
  });

  // POST /internal/vinculo-clinica/sincronizar-registro
  sincronizarRegistroClinico = asyncHandler(async (req, res) => {
    const { crmPetId, ...dados } = req.body;
    const registro = await vinculoClinicaService.sincronizarRegistroClinico(crmPetId, dados);
    res.status(200).json({ status: 'success', data: { registro, sincronizado: !!registro } });
  });

  // POST /internal/vinculo-clinica/sincronizar-anexo
  sincronizarAnexo = asyncHandler(async (req, res) => {
    const anexo = await vinculoClinicaService.sincronizarAnexo(req.body);
    res.status(200).json({ status: 'success', data: { anexo, sincronizado: !!anexo } });
  });

  // POST /internal/vinculo-clinica/sincronizar-vacina
  sincronizarVacina = asyncHandler(async (req, res) => {
    const { crmPetId, ...dadosVacina } = req.body;
    const vacina = await vinculoClinicaService.sincronizarVacina(crmPetId, dadosVacina);
    res.status(200).json({ status: 'success', data: { vacina, sincronizado: !!vacina } });
  });

  // POST /internal/petshops/by-crm/:crmPetshopId/cupons
  publicarCupom = asyncHandler(async (req, res) => {
    const petShop = await buscarPetShopPorCrmId(req.params.crmPetshopId);
    const { origemCrmCupomId, ...dados } = req.body;

    if (!origemCrmCupomId) {
      throw new AppError('origemCrmCupomId é obrigatório.', 400);
    }

    const cupom = await clubService.publicarCupomDoCrm(petShop.id, origemCrmCupomId, dados);
    res.status(201).json({ status: 'success', data: { cupom } });
  });

  // ── GESTÃO DE PARCEIROS PELO ADMIN DO CRM ────────────────────────────────

  // POST /internal/petshops/from-crm
  vincularPetShopDoCrm = asyncHandler(async (req, res) => {
    const petShop = await clubService.vincularPetShopDoCrm(req.body);
    res.status(201).json({ status: 'success', data: { petShop } });
  });

  // POST /internal/petshops/direto
  criarPetShopDireto = asyncHandler(async (req, res) => {
    const petShop = await clubService.criarPetShopDireto(req.body);
    res.status(201).json({ status: 'success', data: { petShop } });
  });

  // GET /internal/petshops/direto
  listarPetShopsDiretos = asyncHandler(async (req, res) => {
    const petShops = await clubService.listarPetShopsDiretos();
    res.status(200).json({ status: 'success', data: { petShops } });
  });

  // GET /internal/petshops/:id
  buscarPetShop = asyncHandler(async (req, res) => {
    const petShop = await clubService.buscarPetShopAdmin(req.params.id);
    res.status(200).json({ status: 'success', data: { petShop } });
  });

  // PATCH /internal/petshops/:id
  atualizarPetShop = asyncHandler(async (req, res) => {
    const petShop = await clubService.atualizarPetShopAdmin(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { petShop } });
  });

  // PATCH /internal/petshops/:id/status
  alterarStatusPetShop = asyncHandler(async (req, res) => {
    const { ativo } = req.body;
    if (typeof ativo !== 'boolean') {
      throw new AppError('ativo (boolean) é obrigatório.', 400);
    }
    const petShop = await clubService.alterarStatusPetShop(req.params.id, ativo);
    res.status(200).json({ status: 'success', data: { petShop } });
  });

  // GET /internal/petshops/:id/cupons
  listarCuponsDoPetShop = asyncHandler(async (req, res) => {
    const cupons = await clubService.listarCuponsAdmin(req.params.id);
    res.status(200).json({ status: 'success', data: { cupons } });
  });

  // POST /internal/petshops/:id/cupons/admin
  criarCupomAdmin = asyncHandler(async (req, res) => {
    const cupom = await clubService.criarCupomAdmin(req.params.id, req.body);
    res.status(201).json({ status: 'success', data: { cupom } });
  });

  // PATCH /internal/cupons/:cupomId
  atualizarCupomAdmin = asyncHandler(async (req, res) => {
    const cupom = await clubService.atualizarCupomAdmin(req.params.cupomId, req.body);
    res.status(200).json({ status: 'success', data: { cupom } });
  });

  // GET /internal/petshops/:id/ofertas
  listarOfertasDoPetShop = asyncHandler(async (req, res) => {
    const ofertas = await ofertaService.listarDoPetShop(req.params.id);
    res.status(200).json({ status: 'success', data: { ofertas } });
  });

  // POST /internal/petshops/:id/ofertas
  criarOferta = asyncHandler(async (req, res) => {
    const oferta = await ofertaService.criar(req.params.id, req.body);
    res.status(201).json({ status: 'success', data: { oferta } });
  });

  // PATCH /internal/ofertas/:ofertaId
  atualizarOferta = asyncHandler(async (req, res) => {
    const oferta = await ofertaService.atualizar(req.params.ofertaId, req.body);
    res.status(200).json({ status: 'success', data: { oferta } });
  });

  // DELETE /internal/ofertas/:ofertaId
  removerOferta = asyncHandler(async (req, res) => {
    await ofertaService.remover(req.params.ofertaId);
    res.status(204).send();
  });

  // GET /internal/ofertas/cliques
  listarCliques = asyncHandler(async (req, res) => {
    const resultado = await ofertaService.listarCliques(req.query);
    res.status(200).json({ status: 'success', data: resultado });
  });

  // POST /internal/ofertas/upload-foto
  uploadFotoOferta = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status: 'fail', message: 'Nenhuma imagem enviada.' });
    }
    res.status(200).json({ status: 'success', data: { fotoUrl: req.file.path } });
  });
}

module.exports = new InternalController();
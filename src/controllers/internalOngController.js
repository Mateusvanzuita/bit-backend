// src/controllers/internalOngController.js
// Chamado só pelo CRM (x-internal-api-key). Não é o portal da ONG.
const ongAcessoService = require('../services/ongAcessoService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');

const pick = (obj, campos) =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([k]) => campos.includes(k)));

// Cadastro inicial: o resto (logo, PIX, processo...) a própria ONG preenche no portal.
const ONG_CRIAR_CAMPOS = ['nome', 'tipo', 'descricao', 'cidade', 'estado', 'bairro', 'latitude', 'longitude', 'whatsapp'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class InternalOngController {
  listarOngs = asyncHandler(async (req, res) => {
    const ongs = await ongAcessoService.listar();
    res.status(200).json({ status: 'success', data: { ongs } });
  });

  detalharOng = asyncHandler(async (req, res) => {
    const data = await ongAcessoService.detalhar(req.params.id);
    res.status(200).json({ status: 'success', data });
  });

  criarOng = asyncHandler(async (req, res) => {
    const dados = pick(req.body, ONG_CRIAR_CAMPOS);
    if (!dados.nome || !dados.descricao || !dados.cidade || !dados.estado) {
      throw new AppError('Informe nome, descrição, cidade e estado.', 400);
    }
    if (!['ONG', 'PROTETOR'].includes(dados.tipo ?? 'ONG')) throw new AppError('Tipo inválido.', 400);
    const ong = await ongAcessoService.criarOng(dados);
    res.status(201).json({ status: 'success', data: { ong: { id: ong.id, nome: ong.nome } } });
  });

  alterarSituacao = asyncHandler(async (req, res) => {
    const data = await ongAcessoService.alterarSituacao(req.params.id, pick(req.body, ['ativa', 'verificada']));
    res.status(200).json({ status: 'success', data });
  });

  gerarConvite = asyncHandler(async (req, res) => {
    const { nome, email, criadoPor } = req.body ?? {};
    if (!nome || String(nome).trim().length < 2) throw new AppError('Informe o nome do responsável.', 400);
    if (!email || !EMAIL_RE.test(String(email).trim())) throw new AppError('E-mail inválido.', 400);
    const data = await ongAcessoService.gerarConvite(req.params.id, { nome, email }, criadoPor);
    res.status(201).json({ status: 'success', data });
  });

  revogarConvite = asyncHandler(async (req, res) => {
    const data = await ongAcessoService.revogarConvite(req.params.id);
    res.status(200).json({ status: 'success', data });
  });

  alterarStatusAcesso = asyncHandler(async (req, res) => {
    if (typeof req.body?.bloqueado !== 'boolean') throw new AppError('Informe "bloqueado" (true/false).', 400);
    const acesso = await ongAcessoService.alterarStatusAcesso(req.params.id, req.body.bloqueado);
    res.status(200).json({ status: 'success', data: { acesso } });
  });
}

module.exports = new InternalOngController();

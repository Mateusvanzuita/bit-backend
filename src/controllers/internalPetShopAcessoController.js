// src/controllers/internalPetShopAcessoController.js
// Chamado só pelo CRM (x-internal-api-key). Não é o portal do pet shop.
const acesso = require('../services/petshopAcessoService');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middlewares/errorHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class InternalPetShopAcessoController {
  detalhar = asyncHandler(async (req, res) => {
    res.status(200).json({ status: 'success', data: await acesso.detalhar(req.params.id) });
  });

  gerarConvite = asyncHandler(async (req, res) => {
    const { nome, email, criadoPor } = req.body ?? {};
    if (!nome || String(nome).trim().length < 2) throw new AppError('Informe o nome do responsável.', 400);
    if (!email || !EMAIL_RE.test(String(email).trim())) throw new AppError('E-mail inválido.', 400);
    res.status(201).json({ status: 'success', data: await acesso.gerarConvite(req.params.id, { nome, email }, criadoPor) });
  });

  revogarConvite = asyncHandler(async (req, res) => {
    res.status(200).json({ status: 'success', data: await acesso.revogarConvite(req.params.id) });
  });

  alterarStatusAcesso = asyncHandler(async (req, res) => {
    if (typeof req.body?.bloqueado !== 'boolean') throw new AppError('Informe "bloqueado" (true/false).', 400);
    const dados = await acesso.alterarStatusAcesso(req.params.id, req.body.bloqueado);
    res.status(200).json({ status: 'success', data: { acesso: dados } });
  });
}

module.exports = new InternalPetShopAcessoController();

// src/services/versaoAppService.js
const prisma = require('../config/database');
const { AppError } = require('../middlewares/errorHandler');

const PLATAFORMAS = ['ios', 'android'];
const REGEX_VERSAO = /^\d+\.\d+\.\d+$/;
const PADRAO = { versaoMinima: '0.0.0', ultimaVersao: '0.0.0', urlLoja: null, mensagem: null };

const comparar = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
};

const validarPlataforma = (p) => {
  if (!PLATAFORMAS.includes(p)) throw new AppError('Plataforma inválida.', 400);
};

class VersaoAppService {
  async obter(plataforma) {
    validarPlataforma(plataforma);
    const linha = await prisma.configVersaoApp.findUnique({
      where: { plataforma },
      select: { versaoMinima: true, ultimaVersao: true, urlLoja: true, mensagem: true, updatedAt: true },
    });
    return { plataforma, ...(linha ?? PADRAO) };
  }

  async listar() {
    return await Promise.all(PLATAFORMAS.map((p) => this.obter(p)));
  }

  async salvar(plataforma, body = {}) {
    validarPlataforma(plataforma);
    const { versaoMinima, ultimaVersao } = body;
    if (!REGEX_VERSAO.test(versaoMinima || '') || !REGEX_VERSAO.test(ultimaVersao || '')) {
      throw new AppError('Use o formato 1.4.0 para as versões.', 400);
    }
    if (comparar(versaoMinima, ultimaVersao) > 0) {
      throw new AppError('A versão mínima não pode ser maior que a última versão.', 400);
    }
    const urlLoja = typeof body.urlLoja === 'string' && body.urlLoja.trim() ? body.urlLoja.trim() : null;
    if (urlLoja && !/^https:\/\//.test(urlLoja)) {
      throw new AppError('A URL da loja deve começar com https://', 400);
    }
    const mensagem =
      typeof body.mensagem === 'string' && body.mensagem.trim() ? body.mensagem.trim().slice(0, 300) : null;

    await prisma.configVersaoApp.upsert({
      where: { plataforma },
      create: { plataforma, versaoMinima, ultimaVersao, urlLoja, mensagem },
      update: { versaoMinima, ultimaVersao, urlLoja, mensagem },
    });
    return await this.obter(plataforma);
  }
}

module.exports = new VersaoAppService();
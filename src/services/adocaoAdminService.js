// src/services/adocaoAdminService.js
// Gestão de ONGs, animais, interesses, ajudas e denúncias pelo ADMIN.
// (Por enquanto não existe painel para as ONGs: a equipe do Bitzy opera tudo daqui.)
const { randomUUID } = require('crypto');
const prisma = require('../config/database');
const ongRepository = require('../repositories/ongRepository');
const animalAdocaoRepository = require('../repositories/animalAdocaoRepository');
const notificationService = require('./notificationService');
const { AppError } = require('../middlewares/errorHandler');

const INTERESSE_ATIVO = ['ENVIADO', 'EM_CONTATO'];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Garante id em cada item das listas JSON (necessidades / voluntariado).
function comIds(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((item) => ({ ...item, id: item.id || randomUUID() }));
}

function tratarOng(dados) {
  const d = { ...dados };
  if (d.estado) d.estado = d.estado.toUpperCase();
  if (d.necessidades !== undefined) d.necessidades = comIds(d.necessidades);
  if (d.voluntariado !== undefined) d.voluntariado = comIds(d.voluntariado);
  return d;
}

// Protetor / lar temporário: arredonda a localização para ~1 km. A API pública mostra a
// distância até a ONG; com coordenadas exatas, várias consultas de pontos diferentes
// permitiriam descobrir a casa da pessoa.
const arredondar = (n) => Math.round(n * 100) / 100;

function protegerLocalizacao(dados, ongAtual = null) {
  const tipo = dados.tipo ?? ongAtual?.tipo;
  if (tipo !== 'PROTETOR') return dados;

  const d = { ...dados };
  const lat = d.latitude !== undefined ? d.latitude : ongAtual?.latitude;
  const lon = d.longitude !== undefined ? d.longitude : ongAtual?.longitude;
  if (typeof lat === 'number') d.latitude = arredondar(lat);
  if (typeof lon === 'number') d.longitude = arredondar(lon);
  return d;
}

// Quem tinha interesse ativo num animal é avisado quando ele encontra um lar.
async function avisarInteressadosAdotado(animal, ignorarUserId = null) {
  const interessados = await prisma.interesseAdocao.findMany({
    where: { animalId: animal.id, status: { in: INTERESSE_ATIVO } },
    select: { userId: true },
  });

  await Promise.allSettled(
    interessados
      .filter((i) => i.userId !== ignorarUserId)
      .map((i) =>
        notificationService.notificar(i.userId, {
          titulo: `${animal.nome} encontrou um lar 💛`,
          mensagem: 'Outros amigos esperam por uma família. Que tal conhecer?',
          tipo: 'SISTEMA',
          pathKey: '/adocao',
        }),
      ),
  );
}

// ── Serviço ───────────────────────────────────────────────────────────────────

class AdocaoAdminService {
  // ── ONGs ───────────────────────────────────────────────────────────────────

  async listarOngs() {
    return await prisma.ong.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { animais: true, interesses: true, ajudas: true },
        },
      },
    });
  }

  async buscarOng(id) {
    const ong = await prisma.ong.findUnique({ where: { id } });
    if (!ong) throw new AppError('ONG não encontrada.', 404);
    return ong;
  }

  async criarOng(dados) {
    const d = protegerLocalizacao(tratarOng(dados));
    const existente = await ongRepository.buscarPorNomeECidade(d.nome, d.cidade, d.estado);
    if (existente) throw new AppError('Já existe uma ONG com este nome nesta cidade.', 409);
    return await ongRepository.create(d);
  }

  async atualizarOng(id, dados) {
    const atual = await this.buscarOng(id);
    return await ongRepository.update(id, protegerLocalizacao(tratarOng(dados), atual));
  }

  // Nunca deleta: desativar preserva animais, interesses e histórico.
  async alterarStatusOng(id, ativa) {
    await this.buscarOng(id);
    return await ongRepository.update(id, { ativa });
  }

  // ── ANIMAIS ────────────────────────────────────────────────────────────────

  async listarAnimais({ ongId, status, publicado }) {
    const where = {};
    if (ongId) where.ongId = ongId;
    if (status) where.status = status;
    if (publicado !== undefined) where.publicado = publicado;

    return await prisma.animalAdocao.findMany({
      where,
      include: {
        ong: { select: { id: true, nome: true, cidade: true, estado: true } },
        _count: { select: { interesses: true, denuncias: true, favoritos: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async buscarAnimal(id) {
    const animal = await prisma.animalAdocao.findUnique({
      where: { id },
      include: {
        ong: { select: { id: true, nome: true } },
        _count: { select: { interesses: true, denuncias: true, favoritos: true } },
      },
    });
    if (!animal) throw new AppError('Animal não encontrado.', 404);
    return animal;
  }

  async criarAnimal(dados) {
    const ong = await prisma.ong.findUnique({ where: { id: dados.ongId }, select: { id: true } });
    if (!ong) throw new AppError('ONG não encontrada.', 404);

    const publicado = dados.publicado !== false;
    return await animalAdocaoRepository.create({
      ...dados,
      publicado,
      publicadoEm: publicado ? new Date() : null,
      adotadoEm: dados.status === 'ADOTADO' ? new Date() : null,
    });
  }

  async atualizarAnimal(id, dados) {
    const atual = await this.buscarAnimal(id);
    const data = { ...dados };
    delete data.ongId; // animal não muda de ONG por aqui

    // Primeira publicação: marca a data (usada pelo job de alertas).
    if (data.publicado === true && !atual.publicadoEm) data.publicadoEm = new Date();

    // Mudança de status passa pelas mesmas regras do endpoint de status.
    if (data.status && data.status !== atual.status) {
      return await this.alterarStatusAnimal(id, data.status, data);
    }
    return await animalAdocaoRepository.update(id, data);
  }

  async alterarStatusAnimal(id, status, extras = {}) {
    const atual = await this.buscarAnimal(id);
    const data = { ...extras, status };

    if (status === 'ADOTADO') {
      if (atual.status === 'ADOTADO') throw new AppError('Este animal já está marcado como adotado.', 409);
      data.adotadoEm = new Date();
    } else if (atual.status === 'ADOTADO') {
      // Reabrir um animal adotado (ex: devolução) limpa a data.
      data.adotadoEm = null;
    }

    const atualizado = await animalAdocaoRepository.update(id, data);

    // Adoção feita fora do Bitzy: avisa quem tinha interesse ativo.
    if (status === 'ADOTADO') await avisarInteressadosAdotado(atual);

    return atualizado;
  }

  // ── INTERESSES ─────────────────────────────────────────────────────────────

  async listarInteresses({ status, ongId, animalId }) {
    const where = {};
    if (status) where.status = status;
    if (ongId) where.ongId = ongId;
    if (animalId) where.animalId = animalId;

    return await prisma.interesseAdocao.findMany({
      where,
      include: {
        user: { select: { id: true, nome: true, email: true, cidade: true, estado: true } },
        animal: { select: { id: true, nome: true, status: true } },
        ong: { select: { id: true, nome: true, whatsapp: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async alterarStatusInteresse(id, status) {
    const interesse = await prisma.interesseAdocao.findUnique({ where: { id } });
    if (!interesse) throw new AppError('Interesse não encontrado.', 404);
    if (!INTERESSE_ATIVO.includes(interesse.status)) {
      throw new AppError('Só é possível alterar interesses em andamento.', 409);
    }
    return await prisma.interesseAdocao.update({ where: { id }, data: { status } });
  }

  /**
   * ONG aceitou a adoção. Marca o interesse e o animal, avisa o adotante com o
   * deep link do app (/adocao/boas-vindas/<id>) e avisa os demais interessados.
   */
  async confirmarAdocao(interesseId) {
    const interesse = await prisma.interesseAdocao.findUnique({
      where: { id: interesseId },
      include: { animal: true },
    });
    if (!interesse) throw new AppError('Interesse não encontrado.', 404);
    if (!INTERESSE_ATIVO.includes(interesse.status)) {
      throw new AppError('Só é possível confirmar interesses em andamento.', 409);
    }
    if (interesse.animal.status === 'ADOTADO') {
      throw new AppError('Este animal já foi adotado.', 409);
    }

    const [confirmado] = await prisma.$transaction([
      prisma.interesseAdocao.update({
        where: { id: interesseId },
        data: { status: 'ADOCAO_CONFIRMADA' },
      }),
      prisma.animalAdocao.update({
        where: { id: interesse.animalId },
        data: { status: 'ADOTADO', adotadoEm: new Date() },
      }),
    ]);

    // Best-effort: notificações nunca derrubam a confirmação.
    await notificationService.notificar(interesse.userId, {
      titulo: `🎉 ${interesse.animal.nome} encontrou uma família!`,
      mensagem: `Adicione ${interesse.animal.nome} aos seus pets em poucos toques.`,
      tipo: 'SISTEMA',
      pathKey: `/adocao/boas-vindas/${interesseId}`,
    });
    await avisarInteressadosAdotado(interesse.animal, interesse.userId);

    return confirmado;
  }

  // ── AJUDAS ─────────────────────────────────────────────────────────────────

  async listarAjudas({ status, tipo, ongId }) {
    const where = {};
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (ongId) where.ongId = ongId;

    return await prisma.ajudaOng.findMany({
      where,
      include: {
        user: { select: { id: true, nome: true, email: true } },
        ong: { select: { id: true, nome: true, whatsapp: true } },
        animal: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async alterarStatusAjuda(id, status) {
    const ajuda = await prisma.ajudaOng.findUnique({ where: { id } });
    if (!ajuda) throw new AppError('Pedido de ajuda não encontrado.', 404);
    return await prisma.ajudaOng.update({ where: { id }, data: { status } });
  }

  // ── DENÚNCIAS ──────────────────────────────────────────────────────────────

  async listarDenuncias({ resolvida }) {
    const where = {};
    if (resolvida !== undefined) where.resolvida = resolvida;

    return await prisma.denunciaAnimal.findMany({
      where,
      include: {
        animal: {
          select: { id: true, nome: true, status: true, publicado: true, ong: { select: { id: true, nome: true } } },
        },
        user: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  // `ocultarAnimal`: tira o anúncio do ar (volta para rascunho) enquanto a equipe apura.
  async resolverDenuncia(id, { ocultarAnimal = false } = {}) {
    const denuncia = await prisma.denunciaAnimal.findUnique({ where: { id } });
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404);

    const operacoes = [
      prisma.denunciaAnimal.update({ where: { id }, data: { resolvida: true } }),
    ];
    if (ocultarAnimal) {
      operacoes.push(
        prisma.animalAdocao.update({ where: { id: denuncia.animalId }, data: { publicado: false } }),
      );
    }
    const [atualizada] = await prisma.$transaction(operacoes);
    return atualizada;
  }
}

module.exports = new AdocaoAdminService();
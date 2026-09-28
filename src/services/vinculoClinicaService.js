const vinculoClinicaRepository = require('../repositories/vinculoClinicaRepository');
const petRepository = require('../repositories/petRepository');
const prisma = require('../config/database');
const { AppError } = require('../middlewares/errorHandler');
const { notificarVinculoConfirmado, notificarDesvinculo } = require('../lib/crmClient');

function gerarCodigo6Digitos() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

class VinculoClinicaService {
  async gerarCodigo({ crmPetId, crmPetshopId, crmPetshopNome, crmPetNome }) {
    const codigo = gerarCodigo6Digitos();
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

    await vinculoClinicaRepository.criarCodigo({
      codigo,
      crmPetId,
      crmPetshopId,
      crmPetshopNome,
      crmPetNome,
      expiraEm,
    });

    return { codigo, expiraEm };
  }

  async consultarCodigo(codigo) {
    const registro = await vinculoClinicaRepository.buscarCodigoValido(codigo);
    if (!registro) throw new AppError('Código inválido ou expirado.', 404);

    return {
      crmPetshopNome: registro.crmPetshopNome,
      crmPetNome: registro.crmPetNome,
    };
  }

  async confirmarVinculo(codigo, petId, userId) {
    const registro = await vinculoClinicaRepository.buscarCodigoValido(codigo);
    if (!registro) throw new AppError('Código inválido ou expirado.', 404);

    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado.', 404);

    const vinculo = await vinculoClinicaRepository.criarVinculo({
      petId,
      crmPetId: registro.crmPetId,
      crmPetshopId: registro.crmPetshopId,
      crmPetshopNome: registro.crmPetshopNome,
    });

    await vinculoClinicaRepository.marcarCodigoUsado(registro.id, userId);

    void notificarVinculoConfirmado({
      crmPetId: registro.crmPetId,
      crmPetshopId: registro.crmPetshopId,
    });

    return vinculo;
  }

  async obterVinculoDoPet(petId, userId) {
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado.', 404);

    const vinculo = await vinculoClinicaRepository.buscarVinculoAtivoPorPetId(petId);
    if (!vinculo) return null;

    return { clinicaNome: vinculo.crmPetshopNome };
  }

  async desvincular(petId, userId) {
    const pet = await petRepository.findByIdAndUser(petId, userId);
    if (!pet) throw new AppError('Pet não encontrado.', 404);

    const vinculo = await vinculoClinicaRepository.buscarVinculoAtivoPorPetId(petId);
    if (!vinculo) throw new AppError('Este pet não tem vínculo ativo.', 404);

    await vinculoClinicaRepository.removerVinculo(vinculo.id);

    void notificarDesvinculo({
      crmPetId: vinculo.crmPetId,
      crmPetshopId: vinculo.crmPetshopId,
    });
  }

  async sincronizarVacina(crmPetId, dadosVacina) {
    const vinculo = await vinculoClinicaRepository.buscarVinculoPorCrmPetId(crmPetId);
    if (!vinculo) return null;

    const existente = await prisma.vacina.findUnique({
      where: { origemCrmRegistroId: dadosVacina.origemCrmRegistroId },
    });

    if (existente) {
      return await prisma.vacina.update({
        where: { id: existente.id },
        data: {
          nome: dadosVacina.nome,
          doses: {
            create: {
              dataAplicada: dadosVacina.dataAplicada,
              proximaDose: dadosVacina.proximaDose,
              tipo: 'Registrado pela clínica',
            },
          },
        },
        include: { doses: true },
      });
    }

    return await prisma.vacina.create({
      data: {
        nome: dadosVacina.nome,
        categoria: 'vaccine',
        recorrente: true,
        petId: vinculo.petId,
        origemClinica: true,
        origemCrmRegistroId: dadosVacina.origemCrmRegistroId,
        doses: {
          create: {
            dataAplicada: dadosVacina.dataAplicada,
            proximaDose: dadosVacina.proximaDose,
            tipo: 'Registrado pela clínica',
          },
        },
      },
      include: { doses: true },
    });
  }

  async sincronizarRegistroClinico(crmPetId, dados) {
    const vinculo = await vinculoClinicaRepository.buscarVinculoPorCrmPetId(crmPetId);
    if (!vinculo) return null;

    return await prisma.registroClinicoApp.upsert({
      where: { origemCrmRegistroId: dados.origemCrmRegistroId },
      create: {
        petId: vinculo.petId,
        tipo: dados.tipo,
        data: dados.data,
        descricao: dados.descricao,
        vetNome: dados.vetNome,
        clinicaNome: dados.clinicaNome,
        origemCrmRegistroId: dados.origemCrmRegistroId,
      },
      update: {
        tipo: dados.tipo,
        data: dados.data,
        descricao: dados.descricao,
        vetNome: dados.vetNome,
      },
    });
  }

  async sincronizarAnexo(dados) {
    const registro = await prisma.registroClinicoApp.findUnique({
      where: { origemCrmRegistroId: dados.origemCrmRegistroId },
    });
    if (!registro) return null;

    return await prisma.anexoRegistroClinicoApp.upsert({
      where: { origemCrmAnexoId: dados.origemCrmAnexoId },
      create: {
        registroClinicoAppId: registro.id,
        nomeArquivo: dados.nomeArquivo,
        url: dados.url,
        tipoArquivo: dados.tipoArquivo,
        origemCrmAnexoId: dados.origemCrmAnexoId,
      },
      update: {
        nomeArquivo: dados.nomeArquivo,
        url: dados.url,
      },
    });
  }
}

module.exports = new VinculoClinicaService();
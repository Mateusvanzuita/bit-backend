const prisma = require('../config/database');

class VinculoClinicaRepository {
  async criarCodigo(dados) {
    return await prisma.codigoVinculoClinica.create({ data: dados });
  }

  async buscarCodigoValido(codigo) {
    return await prisma.codigoVinculoClinica.findFirst({
      where: { codigo, usadoEm: null, expiraEm: { gt: new Date() } },
    });
  }

  async marcarCodigoUsado(id, userId) {
    return await prisma.codigoVinculoClinica.update({
      where: { id },
      data: { usadoEm: new Date(), usadoPorUserId: userId },
    });
  }

  async criarVinculo(dados) {
    return await prisma.vinculoClinicaPet.upsert({
      where: { petId_crmPetId: { petId: dados.petId, crmPetId: dados.crmPetId } },
      create: dados,
      update: {},
    });
  }

  async buscarVinculoPorCrmPetId(crmPetId) {
    return await prisma.vinculoClinicaPet.findFirst({ where: { crmPetId } });
  }

  async listarVinculosDoPet(petId) {
    return await prisma.vinculoClinicaPet.findMany({ where: { petId } });
  }

  async buscarVinculoAtivoPorPetId(petId) {
    return await prisma.vinculoClinicaPet.findFirst({
      where: { petId },
      orderBy: { vinculadoEm: 'desc' },
    });
  }

  async removerVinculo(id) {
    return await prisma.vinculoClinicaPet.delete({ where: { id } });
  }
}

module.exports = new VinculoClinicaRepository();
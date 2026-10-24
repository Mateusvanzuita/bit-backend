const prisma = require('../config/database');
const BaseRepository = require('./baseRepository');

class PetRepository extends BaseRepository {
  constructor() {
    // Passa o nome do model 'pet' para o BaseRepository
    super('pet');
  }

  /**
   * Busca todos os pets vinculados a um usuário específico
   */
  async findByUserId(userId) {
    return await prisma.pet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Busca um pet específico garantindo que ele pertença ao usuário logado
   * Útil para operações de Show, Update e Delete com segurança.
   */
  async findByIdAndUser(id, userId) {
    return await prisma.pet.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });
  }

  async findVaccinesByPetId(petId) {
  return await prisma.vacina.findMany({
    where: { petId },
    include: {
      doses: {
        orderBy: { dataAplicada: 'desc' } // Doses mais recentes primeiro
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async findAniversariantes() {
    return await prisma.$queryRaw`
      SELECT
        p.id,
        p.nome,
        p."userId",
        p."dataNascimento",
        p.especie,
        (EXTRACT(YEAR FROM h.d) - EXTRACT(YEAR FROM n.d))::int AS anos
      FROM pets p
      CROSS JOIN (SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date AS d) h
      CROSS JOIN LATERAL (
        SELECT ((p."dataNascimento" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date AS d
      ) n
      WHERE
        p."dataNascimento" IS NOT NULL
        AND EXTRACT(MONTH FROM n.d) = EXTRACT(MONTH FROM h.d)
        AND EXTRACT(DAY   FROM n.d) = EXTRACT(DAY   FROM h.d)
        AND EXTRACT(YEAR  FROM n.d) < EXTRACT(YEAR FROM h.d)
    `;
  }
  async findRegistrosClinicosByPetId(petId) {
    return await prisma.registroClinicoApp.findMany({
      where: { petId },
      include: { anexos: true },
      orderBy: { data: 'desc' },
    });
  }
}


module.exports = new PetRepository();
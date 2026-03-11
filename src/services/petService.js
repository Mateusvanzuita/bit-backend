// src/services/petService.js
const petRepository = require('../repositories/petRepository');
const { AppError } = require('../middlewares/errorHandler');
const prisma = require('../config/database');
class PetService {

  async createPet(userId, petData) {
      let idadeAnos = 0;
      let idadeMeses = 0;

      // Cálculo automático baseado APENAS na dataNascimento vinda do front
      if (petData.dataNascimento) {
        const nascimento = new Date(petData.dataNascimento);
        const hoje = new Date();
        
        let anos = hoje.getFullYear() - nascimento.getFullYear();
        let meses = hoje.getMonth() - nascimento.getMonth();

        if (meses < 0 || (meses === 0 && hoje.getDate() < nascimento.getDate())) {
          anos--;
          meses = meses < 0 ? meses + 12 : meses;
        }
        
        idadeAnos = Math.max(0, anos);
        idadeMeses = Math.max(0, meses);
      }

      const formattedData = {
        nome: petData.nome,
        raca: petData.raca,
        sexo: petData.sexo,
        especie: petData.especie,
        porte: petData.porte,
        cor: petData.cor,
        castrado: petData.castrado,
        comportamento: petData.comportamento,
        convivencia: petData.convivencia,
        userId: userId,
        dataNascimento: petData.dataNascimento ? new Date(petData.dataNascimento) : null,
        
        // Aqui o sistema salva o cálculo automático
        idade: idadeAnos, 
        meses: idadeMeses,
        
        // Garante que o peso seja um Float para o Prisma
        peso: petData.peso ? parseFloat(petData.peso) : 0
      };

      return await petRepository.create(formattedData);
  }

  async getAllPets(userId) {
    return await petRepository.findByUserId(userId);
  }

  async getPetById(id, userId) {
    const pet = await petRepository.findByIdAndUser(id, userId);
    if (!pet) throw new AppError('Pet não encontrado', 404);
    return pet;
  }

  async updatePet(id, userId, updateData) {
    const pet = await petRepository.findByIdAndUser(id, userId);
    if (!pet) throw new AppError('Pet não encontrado ou permissão negada', 404);

    if (updateData.dataNascimento) {
      updateData.dataNascimento = new Date(updateData.dataNascimento);
    }

    return await petRepository.update(id, updateData);
  }

  async deletePet(id, userId) {
    const pet = await petRepository.findByIdAndUser(id, userId);
    if (!pet) throw new AppError('Pet não encontrado', 404);
    
    return await petRepository.delete(id);
  }

  async addVaccine(petId, userId, data) {
      // Verifica se o pet pertence ao usuário
      const pet = await petRepository.findByIdAndUser(petId, userId);
      if (!pet) throw new AppError('Pet não encontrado', 404);

      return await prisma.vacina.create({
        data: {
          nome: data.name,
          categoria: data.category,
          recorrente: data.recurring,
          petId: petId,
          doses: {
            create: {
              dataAplicada: new Date(data.lastDoseDate),
              proximaDose: data.nextDueDate ? new Date(data.nextDueDate) : null,
              tipo: "Dose Inicial",
              observacoes: data.observacoes
            }
          }
        },
        include: { doses: true }
      });
  }

  async getPetVaccines(petId, userId) {
      // 1. Valida se o pet pertence ao usuário logado (reutilizando seu método existente)
      const pet = await petRepository.findByIdAndUser(petId, userId);
      if (!pet) throw new AppError('Pet não encontrado ou acesso negado', 404);

      // 2. Busca as vacinas
      return await petRepository.findVaccinesByPetId(petId);
  }

  async addDose(vaccineId, userId, data) {
      // Opcional: Validar se a vacina pertence a um pet do usuário antes de criar
      return await prisma.doseVacina.create({
        data: {
          vacinaId: vaccineId,
          dataAplicada: new Date(data.date),
          proximaDose: data.nextDueDate ? new Date(data.nextDueDate) : null,
          tipo: data.type,
          observacoes: data.notes
        }
      });
  }

  // ── DELETE VACINA COMPLETA
  // As doses são removidas em cascata pelo Prisma (onDelete: Cascade no schema)
async deleteVaccine(vaccineId, userId) {
    // Busca a vacina incluindo o pet para validar o dono
    const vacina = await prisma.vacina.findUnique({
      where: { id: vaccineId },
      include: { pet: { select: { userId: true } } }
    });

    console.log('[deleteVaccine] vaccineId:', vaccineId, '| userId:', userId, '| vacina:', vacina);

    if (!vacina) throw new AppError('Vacina não encontrada', 404);
    if (vacina.pet.userId !== userId) throw new AppError('Acesso negado', 403);

    await prisma.vacina.delete({ where: { id: vaccineId } });
  }

  // ── DELETE DOSE ESPECÍFICA
  async deleteDose(vaccineId, doseId, userId) {
    const dose = await prisma.doseVacina.findUnique({
      where: { id: doseId },
      include: {
        vacina: { include: { pet: { select: { userId: true } } } }
      }
    });

    console.log('[deleteDose] doseId:', doseId, '| vaccineId:', vaccineId, '| userId:', userId, '| dose:', dose);

    if (!dose) throw new AppError('Dose não encontrada', 404);
    if (dose.vacinaId !== vaccineId) throw new AppError('Dose não pertence a esta vacina', 400);
    if (dose.vacina.pet.userId !== userId) throw new AppError('Acesso negado', 403);

    await prisma.doseVacina.delete({ where: { id: doseId } });
  }
}

module.exports = new PetService();
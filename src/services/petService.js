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
}

module.exports = new PetService();
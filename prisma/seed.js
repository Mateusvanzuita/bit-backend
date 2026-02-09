const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // =========================
  // USER
  // =========================
  const senhaHash = await bcrypt.hash('123456', 10)

  const user = await prisma.user.upsert({
    where: { email: 'mateus@gmail.com' },
    update: {},
    create: {
      email: 'mateus@gmail.com',
      nome: 'Usuário Exemplo',
      senha: senhaHash,
      sexo: 'FEMEA',
      dataNascimento: new Date('1995-06-15')
    }
  })

  // =========================
  // PET
  // =========================
  const pet = await prisma.pet.create({
    data: {
      nome: 'Toby',
      especie: 'CACHORRO',
      sexo: 'MACHO',
      porte: 'MEDIO',
      peso: 20,
      comportamento: 'CALMO',
      convivencia: ['CRIANCAS', 'OUTROS_CAES'],
      alergiasRestricoes: [],
      doencasCronicas: [],
      userId: user.id
    }
  })

  // =========================
  // ANALISE - COMPORTAMENTO
  // =========================
  const analiseComportamento = await prisma.analise.create({
    data: {
      titulo: 'Comportamento',
      descricao: 'Avaliação de comportamento e mudanças recentes',
      icone: 'activity'
    }
  })

  // =========================
  // ETAPA 1
  // =========================
  const etapaTempo = await prisma.analiseEtapa.create({
    data: {
      titulo: 'Há quanto tempo você notou algo diferente?',
      ordem: 1,
      analiseId: analiseComportamento.id
    }
  })

  await prisma.analiseOpcao.createMany({
    data: [
      { texto: 'Começou hoje', valor: 'HOJE', ordem: 1, etapaId: etapaTempo.id },
      { texto: 'Há dois dias', valor: 'DOIS_DIAS', ordem: 2, etapaId: etapaTempo.id },
      { texto: 'Há três dias', valor: 'TRES_DIAS', ordem: 3, etapaId: etapaTempo.id },
      { texto: 'Mais de uma semana', valor: 'UMA_SEMANA', ordem: 4, etapaId: etapaTempo.id },
      { texto: 'É algo recorrente', valor: 'RECORRENTE', ordem: 5, etapaId: etapaTempo.id }
    ]
  })

  // =========================
  // ETAPA 2
  // =========================
  const etapaEnergia = await prisma.analiseEtapa.create({
    data: {
      titulo: 'Como está o nível de energia do seu pet?',
      ordem: 2,
      analiseId: analiseComportamento.id
    }
  })

  await prisma.analiseOpcao.createMany({
    data: [
      { texto: 'Normal', valor: 'NORMAL', ordem: 1, etapaId: etapaEnergia.id },
      { texto: 'Brincalhão', valor: 'BRINCALHAO', ordem: 2, etapaId: etapaEnergia.id },
      { texto: 'Um pouco quieto', valor: 'QUIETO', ordem: 3, etapaId: etapaEnergia.id },
      { texto: 'Muito apático', valor: 'APATICO', ordem: 4, etapaId: etapaEnergia.id },
      { texto: 'Agitado', valor: 'AGITADO', ordem: 5, etapaId: etapaEnergia.id }
    ]
  })

  // =========================
  // ETAPA 3
  // =========================
  const etapaApetite = await prisma.analiseEtapa.create({
    data: {
      titulo: 'Você percebeu alteração no apetite?',
      ordem: 3,
      analiseId: analiseComportamento.id
    }
  })

  await prisma.analiseOpcao.createMany({
    data: [
      { texto: 'Está comendo normalmente', valor: 'NORMAL', ordem: 1, etapaId: etapaApetite.id },
      { texto: 'Não quer comer', valor: 'SEM_APETITE', ordem: 2, etapaId: etapaApetite.id },
      { texto: 'Bebe muita água', valor: 'MUITA_AGUA', ordem: 3, etapaId: etapaApetite.id },
      { texto: 'Vomitou após comer', valor: 'VOMITO', ordem: 4, etapaId: etapaApetite.id }
    ]
  })

  // =========================
  // ETAPA 4 (TEXTO + FOTO)
  // =========================
  await prisma.analiseEtapa.create({
    data: {
      titulo: 'Descreva o que você está percebendo e, se possível, anexe uma foto',
      ordem: 4,
      permiteTexto: true,
      permiteFoto: true,
      analiseId: analiseComportamento.id
    }
  })

  console.log('✅ Seed finalizado com sucesso!')
  console.log('📧 Email:', user.email)
  console.log('🔑 Senha: 123456')
  console.log('🐾 Pet:', pet.nome)
  console.log('📊 Análise criada: Comportamento')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao rodar seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

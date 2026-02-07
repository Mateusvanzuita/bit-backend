const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { generateToken } = require('../utils/jwt');
const { AppError } = require('../middlewares/errorHandler');

class AuthService {
async register(userData) {
  // 1. Verifica se já existe
  const existingUser = await userRepository.findByEmail(userData.email);
  if (existingUser) {
    throw new AppError('Email já em uso', 400);
  }

  // 2. Hash da senha (O App envia 'password')
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // 3. Monte o objeto EXATAMENTE como o seu schema.prisma exige
  // Note que o log do Prisma reclamou que 'nome' (em português) estava faltando
  const formattedData = {
    email: userData.email,
    nome: userData.name,        // Mapeia 'name' do App para 'nome'
    senha: hashedPassword,      // Mapeia 'password' do App para 'senha'
    sexo: userData.sex,         // Mapeia 'sex' do App para 'sexo'
    dataNascimento: userData.birthDate ? new Date(userData.birthDate) : null
  };

  // 4. Envia o objeto formatado para o repositório
  const user = await userRepository.createUser(formattedData);

  const token = generateToken({ id: user.id, email: user.email });

  return { user, token };
}

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // AQUI: Alterar de user.password para user.senha
    const isPasswordValid = await bcrypt.compare(password, user.senha); 
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = generateToken({ id: user.id, email: user.email });

    // AQUI: Remover 'senha' do objeto de resposta
    const { senha: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = new AuthService();

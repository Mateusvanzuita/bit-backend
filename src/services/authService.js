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
    // 1. Valida formato básico antes de bater no banco
    if (!email || !password) {
      throw new AppError('Preencha o e-mail e a senha para continuar.', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Informe um endereço de e-mail válido.', 400);
    }

    // 2. Busca o usuário — mesma mensagem para não vazar se o e-mail existe
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.', 401);
    }

    // 3. Verifica senha
    const isPasswordValid = await bcrypt.compare(password, user.senha);
    if (!isPasswordValid) {
      throw new AppError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.', 401);
    }

    // 4. Verifica se a conta está ativa (caso você tenha esse campo futuramente)
    // if (!user.ativo) {
    //   throw new AppError('Esta conta foi desativada. Entre em contato com o suporte.', 403);
    // }

    const token = generateToken({ id: user.id, email: user.email });

    // 5. Remove senha da resposta
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

  async updateProfile(userId, updateData) {
  // Mapeamos os campos do App (Inglês) para o Prisma (Português)
  const data = {
    nome: updateData.name,
    sexo: updateData.sex ? updateData.sex.toUpperCase() : undefined,
    dataNascimento: updateData.birthDate ? new Date(updateData.birthDate) : undefined,
  };

  // Remove campos indefinidos para não sobrescrever com null por erro
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

  return await userRepository.update(userId, data);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    
    // 1. Verifica se a senha atual está correta
    const isMatch = await bcrypt.compare(currentPassword, user.senha);
    if (!isMatch) {
      throw new AppError('Senha atual incorreta', 401);
    }

    // 2. Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 3. Atualiza no banco
    return await userRepository.update(userId, { senha: hashedNewPassword });
  }
  
  async deleteAccount(userId) {
    // Opcional: Você pode adicionar verificações extras aqui antes de deletar
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    return await userRepository.delete(userId);
  }
}

module.exports = new AuthService();
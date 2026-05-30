// src/services/authService.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/database');
const userRepository = require('../repositories/userRepository');
const { generateToken, decodeToken } = require('../utils/jwt');
const { AppError } = require('../middlewares/errorHandler');
const emailService = require('./emailService');

class AuthService {
  async register(userData) {
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) throw new AppError('Email já em uso', 400);

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const formattedData = {
      email: userData.email,
      nome: userData.name,
      senha: hashedPassword,
      sexo: userData.sex,
      dataNascimento: userData.birthDate ? new Date(userData.birthDate) : null,
    };

    const user = await userRepository.createUser(formattedData);
    const token = generateToken({ id: user.id, email: user.email });

    return { user, token };
  }

  async login(email, password) {
    if (!email || !password)
      throw new AppError('Preencha o e-mail e a senha para continuar.', 400);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      throw new AppError('Informe um endereço de e-mail válido.', 400);

    const user = await userRepository.findByEmail(email);
    if (!user)
      throw new AppError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.', 401);

    const isPasswordValid = await bcrypt.compare(password, user.senha);
    if (!isPasswordValid)
      throw new AppError('E-mail ou senha incorretos. Verifique seus dados e tente novamente.', 401);

    const token = generateToken({ id: user.id, email: user.email });
    const { senha: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId, updateData) {
    const data = {
      nome: updateData.name,
      sexo: updateData.sex ? updateData.sex.toUpperCase() : undefined,
      dataNascimento: updateData.birthDate ? new Date(updateData.birthDate) : undefined,
    };

    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    return await userRepository.update(userId, data);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);

    const isMatch = await bcrypt.compare(currentPassword, user.senha);
    if (!isMatch) throw new AppError('Senha atual incorreta', 401);

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    return await userRepository.update(userId, { senha: hashedNewPassword });
  }

  async deleteAccount(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('Usuário não encontrado', 404);
    return await userRepository.delete(userId);
  }

  async refreshToken(oldToken) {
    const decoded = decodeToken(oldToken);
    if (!decoded?.id) throw new AppError('Token inválido', 401);

    const user = await userRepository.findById(decoded.id);
    if (!user) throw new AppError('Usuário não encontrado', 401);

    const newToken = generateToken({ id: user.id, email: user.email });
    const { senha: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token: newToken };
  }

  // ─── ESQUECEU A SENHA ────────────────────────────────────────────────────

  async sendPasswordResetCode(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) return;

    await prisma.passwordResetCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    const code = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    await prisma.passwordResetCode.create({
      data: {
        email,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await emailService.sendPasswordResetCode(email, user.nome, code);
  }

  async verifyPasswordResetCode(email, code) {
    const record = await prisma.passwordResetCode.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new AppError('Código inválido ou expirado.', 400);
    if (record.expiresAt < new Date()) throw new AppError('Código expirado. Solicite um novo.', 400);

    const isValid = await bcrypt.compare(code, record.code);
    if (!isValid) throw new AppError('Código incorreto. Verifique e tente novamente.', 400);

    await prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    const resetToken = generateToken(
      { id: record.id, email, type: 'password_reset' },
      '10m',
    );

    return { resetToken };
  }

  async resetPassword(resetToken, newPassword) {
    let decoded;
    try {
      const { verifyToken } = require('../utils/jwt');
      decoded = verifyToken(resetToken);
    } catch {
      throw new AppError('Token de redefinição inválido ou expirado.', 400);
    }

    if (decoded.type !== 'password_reset')
      throw new AppError('Token inválido.', 400);

    const user = await userRepository.findByEmail(decoded.email);
    if (!user) throw new AppError('Usuário não encontrado.', 404);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.update(user.id, { senha: hashedPassword });
  }

  // ─── LOCALIZAÇÃO ─────────────────────────────────────────────────────────

  async updateLocation(userId, locationData) {
    const { latitude, longitude, cidade, estado, pais } = locationData;

    const data = {};
    if (latitude !== undefined) data.latitude = latitude;
    if (longitude !== undefined) data.longitude = longitude;
    if (cidade !== undefined) data.cidade = cidade;
    if (estado !== undefined) data.estado = estado;
    if (pais !== undefined) data.pais = pais;

    return await userRepository.update(userId, data);
  }

  // ─── PUSH TOKEN ───────────────────────────────────────────────────────────

  async updatePushToken(userId, pushToken) {
    await userRepository.update(userId, { pushToken });
  }
}

module.exports = new AuthService();
// src/utils/jwt.js
const jwt = require('jsonwebtoken');
const config = require('../config/env');

// expiresIn opcional — se não passado usa o padrão do env (ex: 365d)
const generateToken = (payload, expiresIn) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: expiresIn || config.jwt.expiresIn,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

// Decodifica sem verificar expiração — usado para renovação silenciosa
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = { generateToken, verifyToken, decodeToken };
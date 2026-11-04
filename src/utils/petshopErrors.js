// src/utils/petshopErrors.js
// O portal do pet shop usa o MESMO tipo de erro do portal da ONG ({ status:'fail', message, code }),
// então o front reaproveita a mesma leitura de erros. Só trocamos o nome para ficar claro no código.
const { OngError, ongErrorHandler } = require('./ongErrors');

module.exports = { PortalError: OngError, portalErrorHandler: ongErrorHandler };

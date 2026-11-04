// ACRESCENTAR ao final de src/middlewares/rateLimiter.js (não apague os limiters existentes).
//
// Login/convite/recuperação do portal: 10 tentativas / 15 min por IP + e-mail.
// (o authLimiter atual é só por IP e bloquearia várias lojas na mesma rede)
exports.portalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: msg(15),
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${ipKeyGenerator(req.ip)}|${email}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload de imagens do portal: 200/hora POR PET SHOP (o uploadLimiter atual é 30/h por IP: pouco para cadastrar ofertas).
exports.petshopUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  message: msg(60),
  keyGenerator: (req) => (req.petshop?.petShopId ? `ps:${req.petshop.petShopId}` : ipKeyGenerator(req.ip)),
  standardHeaders: true,
  legacyHeaders: false,
});

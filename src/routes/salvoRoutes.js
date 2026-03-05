const router = require('express').Router();
const salvoService = require('../services/salvoService');
const auth = require('../middlewares/auth');

router.use(auth);

router.post('/', async (req, res) => {
  const item = await salvoService.salvarItem(req.user.id, req.body);
  res.status(201).json({ status: 'success', data: item });
});

router.get('/', async (req, res) => {
  const salvos = await salvoService.listarSalvos(req.user.id);
  res.status(200).json({ status: 'success', data: salvos });
});

router.delete('/:id', async (req, res) => {
  await salvoService.removerItem(req.user.id, req.params.id);
  res.status(200).json({ status: 'success', message: 'Item removido' });
});

module.exports = router;
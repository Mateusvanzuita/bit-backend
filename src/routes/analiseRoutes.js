const express = require('express');
const analiseController = require('../controllers/analiseController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', analiseController.index);
router.get('/:id', analiseController.show);
router.post('/:id/submit', analiseController.submit);

module.exports = router;
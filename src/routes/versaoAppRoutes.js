const express = require('express');
const versaoAppController = require('../controllers/versaoAppController');

const router = express.Router();
router.get('/versao', versaoAppController.obter);

module.exports = router;
const router = require("express").Router();

const controller = require("../../../../controllers/financeiro/relatorios/relatorios-controller");

router.get("/export-layout-recarga-rv", controller.exportLayoutRecargaRV);

module.exports = router;

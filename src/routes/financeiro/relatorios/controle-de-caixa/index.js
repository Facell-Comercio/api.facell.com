const router = require("express").Router();

const controller = require("../../../../controllers/financeiro/relatorios/relatorios-controller");

router.get("/export-layout-recarga-rv", controller.exportLayoutRecargaRV);
router.get("/export-layout-cartoes", controller.exportLayoutCartoes);
router.get("/export-layout-crediario", controller.exportLayoutCrediario);
router.get("/export-layout-pitzi", controller.exportLayoutPitzi);
router.get("/export-layout-pix", controller.exportLayoutPix);
router.get("/export-layout-tradein", controller.exportLayoutTradein);

module.exports = router;

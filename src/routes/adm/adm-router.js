const router = require("express").Router();

const logs = require("./logs-adm");
const permissoes = require("./permissoes");
const perfis = require("./perfis");

const modulosController = require("../../controllers/adm/modulos-controller");

router.use("/logs", logs);
router.use("/permissoes", permissoes);
router.use("/perfis", perfis);

// MÓDULOS
router.get("/modulos", modulosController.getAll);

module.exports = router;

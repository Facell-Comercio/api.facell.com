const router = require("express").Router();

const colaboradores = require("./colaboradores");

// Colaboradores
router.use("/colaboradores", colaboradores);

module.exports = router;

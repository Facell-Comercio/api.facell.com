const router = require("express").Router();

const colaboradores = require("./colaboradores");
const fardamentos = require("./fardamentos");

// Colaboradores
router.use("/colaboradores", colaboradores);
router.use("/fardamentos", fardamentos);

module.exports = router;

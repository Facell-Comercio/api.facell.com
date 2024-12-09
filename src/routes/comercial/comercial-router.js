const router = require("express").Router();

const vales = require("./vales");
const metas = require("./metas");
const agregadores = require("./agregadores");
const comissionamento = require("./comissionamento");
const comercial = require("../../controllers/comercial/comercial-controller");
const hasPermissionMiddleware = require("../../middlewares/permission-middleware");

// Vales
router.use("/vales", vales);

// Metas e Agregadores
router.use("/metas", metas);
router.use("/agregadores", agregadores);

// Comissionamento
router.use("/comissionamento", comissionamento);

// OUTROS
router.get(
  "/metas-agregadores",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_VER", "MASTER"]),
  async (req, res) => {
    try {
      const result = await comercial.getAllMetasAgregadores(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get("/cargos", async (req, res) => {
  try {
    const result = await comercial.getAllCargos(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

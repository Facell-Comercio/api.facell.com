const router = require("express").Router();

const controller = require("../../../../controllers/comercial/comercial-controller");
const hasPermissionMiddleware = require("../../../../middlewares/permission-middleware");

//* GET
router.get(
  "/",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_VER", "MASTER"]),
  controller.getAllVendasInvalidadas
);
router.get(
  "/:id",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_VER", "MASTER"]),
  controller.getOneVendaInvalidada
);
router.get(
  "/contestacoes/:id",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_VER", "MASTER"]),
  controller.getOneContestacao
);
router.get(
  "/rateios/:id",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_VER", "MASTER"]),
  controller.getOneRateio
);

//* POST
router.post(
  "/",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_GERAR", "MASTER"]),
  controller.processarVendasInvalidadas
);
router.post(
  "/contestacoes",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_CONTESTAR", "MASTER"]),
  controller.insertOneContestacao
);
router.post(
  "/rateios",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_EDITAR", "MASTER"]),
  controller.insertOneRateio
);
router.post("/vales", hasPermissionMiddleware(["VALES:CRIAR", "MASTER"]), async (req, res) => {
  try {
    const result = await controller.criacaoAutomaticaVales(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//* PUT
router.put(
  "/lote",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_EDITAR", "MASTER"]),
  controller.updateLote
);
router.put(
  "/contestacoes",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_RESPONDER", "MASTER"]),
  controller.updateContestacao
);
router.put(
  "/rateios",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_EDITAR", "MASTER"]),
  controller.updateRateio
);

//* DELETE
router.delete(
  "/",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_EDITAR", "MASTER"]),
  controller.excluirVendasInvalidadas
);
router.delete(
  "/contestacoes/:id",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_RESPONDER", "MASTER"]),
  controller.deleteContestacao
);
router.delete(
  "/rateios/:id",
  hasPermissionMiddleware(["COMISSOES:VENDAS_INVALIDAS_EXCLUIR", "MASTER"]),
  controller.deleteRateio
);

module.exports = router;

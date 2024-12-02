const router = require("express").Router();

const controller = require("../../../../controllers/comercial/espelhos-controller");
const hasPermissionMiddleware = require("../../../../middlewares/permission-middleware");

//* GET
router.get("/", hasPermissionMiddleware(["COMISSOES:ESPELHOS_VER", "MASTER"]), async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.get(
  "/contestacoes",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_VER", "MASTER"]),
  controller.getAllContestacoes
);
router.get(
  "/vendas-invalidadas",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_VER", "MASTER"]),
  controller.getAllVendasInvalidadas
);
router.get(
  "/itens",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_VER", "MASTER"]),
  controller.getAllItens
);
router.get(
  "/metas-agregadores",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_VER", "MASTER"]),
  controller.getAllMetasAgregadores
);
router.get(
  "/:id",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_VER", "MASTER"]),
  controller.getOne
);
router.get(
  "/contestacoes/:id",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_VER", "MASTER"]),
  controller.getOneContestacao
);
router.get(
  "/itens/:id",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_VER", "MASTER"]),
  controller.getOneItem
);

//* POST
router.post(
  "/contestacoes",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_CONTESTAR", "MASTER"]),
  controller.insertOneContestacao
);
router.post(
  "/itens",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_GERAR", "MASTER"]),
  controller.insertOneItem
);

//* PUT
router.put(
  "/contestacoes",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_RESPONDER", "MASTER"]),
  controller.updateContestacao
);
router.put(
  "/itens",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_EDITAR", "MASTER"]),
  controller.updateItem
);
router.put(
  "/recalcular/:id",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_CALCULAR", "MASTER"]),
  controller.recalcularEspelho
);

//* DELETE
router.delete(
  "/contestacoes/:id",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_RESPONDER", "MASTER"]),
  controller.deleteContestacao
);
router.delete(
  "/itens/:id",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_EDITAR", "MASTER"]),
  controller.deleteItem
);

router.delete(
  "/:id",
  hasPermissionMiddleware(["COMISSOES:ESPELHOS_EDITAR", "MASTER"]),
  controller.deleteOne
);

module.exports = router;

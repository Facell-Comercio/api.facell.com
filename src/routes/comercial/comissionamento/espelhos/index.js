const router = require("express").Router();

const controller = require("../../../../controllers/comercial/espelhos-controller");

router.get("/", async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.get("/contestacoes", controller.getAllContestacoes);
router.get("/vendas-invalidadas", controller.getAllVendasInvalidadas);
router.get("/itens", controller.getAllItens);
router.get("/metas-agregadores", controller.getAllMetasAgregadores);
router.get("/:id", controller.getOne);
router.get("/contestacoes/:id", controller.getOneContestacao);
router.get("/itens/:id", controller.getOneItem);

router.post("/contestacoes", controller.insertOneContestacao);
router.post("/itens", controller.insertOneItem);

router.put("/contestacoes", controller.updateStatusContestacao);
router.put("/itens", controller.updateItem);

router.delete("/contestacoes/:id", controller.deleteContestacao);
router.delete("/itens/:id", controller.deleteItem);

router.put("/recalcular/:id", controller.recalcularEspelho);
router.delete("/:id", controller.deleteOne);

module.exports = router;

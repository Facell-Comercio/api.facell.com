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
router.get("/:id", controller.getOne);
router.get("/contestacoes/:id", controller.getOneContestacao);

router.post("/contestacoes", controller.insertOneContestacao);
router.put("/contestacoes", controller.updateStatusContestacao);
router.delete("/contestacoes/:id", controller.deleteContestacao);

router.put("/recalcular/:id", controller.recalcularEspelho);
router.delete("/:id", controller.deleteOne);

router.post('/', controller.calcularEspelhos)

module.exports = router;

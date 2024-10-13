const router = require("express").Router();

const controller = require("../../../../controllers/financeiro/contas-a-receber/recebimentos/recebimentos-controller");

router.get("/", async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

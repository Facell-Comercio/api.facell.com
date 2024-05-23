const router = require("express").Router();

const {
  getAll,
  getOne,
  update,
  insertOne,
  downloadMovimentoContabil,
} = require("../../../../controllers/financeiro/contas-a-pagar/movimento-contabil-controller");

router.get("/", async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/download", async (req, res) => {
  try {
    const response = await downloadMovimentoContabil(req, res);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const result = await insertOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const result = await update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

const router = require("express").Router();

const {
  getAll,
  getOne,
  insertOne,
  update,
  deleteBordero,
  transferBordero,
  exportBorderos,
  deleteVencimento,
} = require("../../../../controllers/financeiro/contas-a-pagar/borderos-controller");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

router.put("/transfer", async (req, res) => {
  try {
    const result = await transferBordero(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/export", async (req, res) => {
  try {
    const result = await exportBorderos(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await insertOne(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
router.put(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await update(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete("/titulo/:id", async (req, res) => {
  try {
    const result = await deleteVencimento(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await deleteBordero(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

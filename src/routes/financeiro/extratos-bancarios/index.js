const router = require("express").Router();

const {
  getAll,
  getOne,
  importarExtrato,
  update,
} = require("../../../controllers/financeiro/extratos-bancarios/extratos-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware.js");

router.get("/extratos-bancarios/", async (req, res) => {
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
  "/importar-extrato",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  
  async (req, res) => {
    try {
      const result = await importarExtrato(req);
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

module.exports = router;

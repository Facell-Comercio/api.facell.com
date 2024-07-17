const router = require("express").Router();

const {
  getAll,
  getOne,
  insertOne,
  update,
  deleteBordero,
  deleteTitulo,
  deleteConciliacao,
  conciliacaoAutomatica,
  getConciliacoes,
  conciliacaoTarifas,
  getExtratosCredit,
  conciliacaoTransferenciaContas,
} = require("../../../../../controllers/financeiro/conciliacao-bancaria/conciliacao-cp-controller");
const checkUserAuthorization = require("../../../../../middlewares/authorization-middleware");

const tarifasPadraoRouter = require('../config/tarifas-padrao')
router.use('/tarifas-padrao', tarifasPadraoRouter)

router.get("/", async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/conciliacoes", async (req, res) => {
  try {
    const result = await getConciliacoes(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/extratos-credit", async (req, res) => {
  try {
    const result = await getExtratosCredit(req);
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
router.post(
  "/automatica",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await conciliacaoAutomatica(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/conciliar-tarifas",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await conciliacaoTarifas(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/transferencia-contas",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await conciliacaoTransferenciaContas(req);
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
    const result = await deleteTitulo(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await deleteConciliacao(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

const router = require("express").Router();

const {
  getAll,
  getOne,
  update,
  insertOne,
  getMyBudget,
  transfer,
  getMyBudgets,
  getIds,
  getLogs,
  deleteItemBudget,
  findAccountFromParams,
} = require("../../../controllers/financeiro/orcamento/orcamento-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

router.post("/get-ids", async (req, res) => {
  try {
    const result = await getIds(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/logs/:id", async (req, res) => {
  try {
    const result = await getLogs(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get(
  "/my-budget",
  async (req, res) => {
    try {
      const result = await getMyBudgets(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get("/my-budget/:id", async (req, res) => {
  try {
    const result = await getMyBudget(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put(
  "/my-budget",
  async (req, res) => {
    try {
      const result = await transfer(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get("/find-account", async (req, res) => {
  try {
    const result = await findAccountFromParams(req);
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

router.delete("/:id", async (req, res) => {
  try {
    const result = await deleteItemBudget(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

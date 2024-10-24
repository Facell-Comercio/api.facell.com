const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");
const caixasController = require("../../../../controllers/financeiro/controle-de-caixa/controle-de-caixa-controller");

const router = require("express").Router();

router.get("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.getAllCaixas(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get("/filiais", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.getAllFiliaisCaixas(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get("/to-robot", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.getCaixasToRobot(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get(
  "/ocorrencias",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.getAllOcorrencias(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.get("/ajustes", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.getAllAjustes(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get("/cards", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.getCardDetalhe(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get(
  "/cards/dinheiro",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.getCardDetalheDinheiro(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.get(
  "/transacoes-credit",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.getAllTransacoesCredit(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.get("/:id", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.getOneCaixa(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get(
  "/depositos/:id",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.getOneDeposito(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.get(
  "/ocorrencias/:id",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.getOneOcorrencia(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.get(
  "/ajustes/:id",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.getOneAjuste(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post("/import", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.importCaixasDatasys(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.post(
  "/import-por-periodo",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.importCaixasPorPeriodo(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/depositos",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.insertOneDeposito(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/multi-depositos-extratos",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.insertMultiDepositoExtrato(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/ocorrencias",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.insertOneOcorrencia(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post("/ajustes", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.insertOneAjuste(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.post(
  "/lancamento-despesa",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.lancamentoDespesa(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.put("/depositos", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.updateDeposito(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.put(
  "/ocorrencias",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.updateOcorrencia(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.put("/ajustes", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await caixasController.updateAjuste(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.put(
  "/ajustes/aprovar",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.aprovarAjuste(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.put(
  "/change-status",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.changeStatusCaixa(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.put(
  "/change-value",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.changeValueFieldCaixa(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.put(
  "/import-caixas-datasys",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.importCaixasDatasys(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.put(
  "/cruzar-relatorios",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.cruzarRelatorios(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.put(
  "/cruzar-relatorios-lote",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.cruzarRelatoriosLote(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.delete(
  "/depositos/:id",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.deleteDeposito(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.delete(
  "/ajustes/:id",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await caixasController.deleteAjuste(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

module.exports = router;

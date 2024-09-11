const {
  getOneCaixa,
  getFiliais,
  importCaixasDatasys,
  getAllOcorrencias,
  getOneDeposito,
  getOneOcorrencia,
  insertOneDeposito,
  updateDeposito,
  deleteDeposito,
  getCaixasToRobot,
  getAllCaixas,
  updateOcorrencia,
  insertOneOcorrencia,
  changeStatusCaixa,
  changeValueFieldCaixa,
  cruzarRelatorios,
  getCardDetalhe,
  cruzarRelatoriosLote,
  getAllTransacoesCredit,
  insertMultiDepositoExtrato,
  getOneAjuste,
  getAllAjustes,
  insertOneAjuste,
} = require("../../../../controllers/financeiro/controle-de-caixa/controle-de-caixa-controller");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

const router = require("express").Router();

router.get(
  "/",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getAllCaixas(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/filiais",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getFiliais(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/to-robot",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getCaixasToRobot(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/ocorrencias",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getAllOcorrencias(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/ajustes",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getAllAjustes(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/cards",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getCardDetalhe(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/transacoes-credit",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getAllTransacoesCredit(
        req
      );
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/:id",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getOneCaixa(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/depositos/:id",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getOneDeposito(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/ocorrencias/:id",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getOneOcorrencia(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.get(
  "/ajustes/:id",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await getOneAjuste(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.post(
  "/import",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await importCaixasDatasys(
        req
      );
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.post(
  "/depositos",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await insertOneDeposito(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.post(
  "/multi-depositos-extratos",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result =
        await insertMultiDepositoExtrato(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.post(
  "/ocorrencias",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await insertOneOcorrencia(
        req
      );
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.post(
  "/ajustes",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await insertOneAjuste(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.put(
  "/depositos",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await updateDeposito(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.put(
  "/ocorrencias",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await updateOcorrencia(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.put(
  "/change-status",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await changeStatusCaixa(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.put(
  "/change-value",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await changeValueFieldCaixa(
        req
      );
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.put(
  "/import-caixas-datasys",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await importCaixasDatasys(
        req
      );
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.put(
  "/cruzar-relatorios",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await cruzarRelatorios(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.put(
  "/cruzar-relatorios-lote",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await cruzarRelatoriosLote(
        req
      );
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

router.delete(
  "/depositos/:id",
  checkUserAuthorization(
    "FINANCEIRO",
    "OR",
    "MASTER"
  ),
  async (req, res) => {
    try {
      const result = await deleteDeposito(req);
      res.status(200).send(result);
    } catch (error) {
      res
        .status(400)
        .send({ message: error.message });
    }
  }
);

module.exports = router;

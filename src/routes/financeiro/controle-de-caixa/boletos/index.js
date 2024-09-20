const multer = require("multer");
const router = require("express").Router();

const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");
const {
  getAllBoletos,
  getAllCaixasComSaldo,
  insertOneBoleto,
  getOneBoleto,
  cancelarBoleto,
  exportRemessaBoleto,
  importRetornoRemessaBoleto,
} = require("../../../../controllers/financeiro/controle-de-caixa/boletos");

const { localTempStorage } = require("../../../../libs/multer");
const upload = multer({ storage: localTempStorage });

router.get("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await getAllBoletos(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get(
  "/caixas-com-saldo",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await getAllCaixasComSaldo(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.get("/:id", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await getOneBoleto(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.post("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await insertOneBoleto(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.put("/cancelar", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await cancelarBoleto(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.post(
  "/export-remessa",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const response = await exportRemessaBoleto(req, res);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

const multipleUpload = upload.array("files", 100);
router.post(
  "/import-retorno-remessa",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    multipleUpload(req, res, async (err) => {
      if (err) {
        return res.status(500).json({
          message: "Ocorreu algum problema com o(s) arquivo(s) enviado(s)",
        });
      } else {
        try {
          const result = await importRetornoRemessaBoleto(req);
          res.status(200).json(result);
        } catch (error) {
          res.status(400).json({ message: error.message });
        }
      }
    });
  }
);

module.exports = router;

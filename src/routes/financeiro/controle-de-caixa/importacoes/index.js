const router = require("express").Router();
const multer = require("multer");
const { localTempStorage } = require("../../../../libs/multer");
const upload = multer({storage: localTempStorage})

const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");
const {
  getLogsImportRelatorio,
  importCieloVendas,
  importPitziVendas,
  importPixBradesco,
  importPixItau,
  importCrediarioPayjoy,
  importCrediarioDimo,
  importRenovTradein,
  importRecargaRvCellcard,
} = require("../../../../controllers/financeiro/controle-de-caixa/controle-de-caixa-controller");

router.get(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await getLogsImportRelatorio(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-cielo-vendas",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importCieloVendas(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-pitzi-vendas",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importPitziVendas(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-pix-bradesco",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importPixBradesco(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-pix-itau",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importPixItau(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-renov-tradein",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importRenovTradein(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-recarga-rvcellcard",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importRecargaRvCellcard(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-crediario-payjoy",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importCrediarioPayjoy(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-crediario-dimo",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importCrediarioDimo(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);


module.exports = router;

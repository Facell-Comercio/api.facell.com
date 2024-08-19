const router = require("express").Router();
const multer = require("multer");
const { localTempStorage } = require("../../../../libs/multer");
const upload = multer({storage: localTempStorage})

const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");
const {
  importCieloVendas,
  importPitziVendas,
  importPixBradesco,
  importPixItau,
  importCrediario,
  importRenovTradein,
  importRecargaRvCellcard
} = require("../../../../controllers/financeiro/controle-de-caixa/controle-de-caixa-controller");


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
  "/import-crediario",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  upload.single('file'),
  async (req, res) => {
    try {
      const result = await importCrediario(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);


module.exports = router;

const router = require("express").Router();
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");
const multer = require("multer");

const controller = require("../../../../controllers/comercial/configuracoes-controller");
const { localTempStorage } = require("../../../../libs/multer.js");

const upload = multer({ storage: localTempStorage });
const multipleUpload = upload.array("files", 100);

// GET ESCALONAMENTOS
router.get(
  "/escalonamentos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await controller.getEscalonamentos(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

// GET SEGMENTOS
router.get(
  "/segmentos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await controller.getSegmentos(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

// GET CARGOS
router.get(
  "/cargos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await controller.getCargos(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

//* IMPORTAÇÕES
router.post("/import/tim-qualidade", async (req, res) => {
  multipleUpload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({
        message: "Ocorreu algum problema com o(s) arquivo(s) enviado(s)",
      });
    } else {
      return controller.importTimQualidade(req, res);
    }
  });
});
router.post("/import/tim-gu", upload.single("file"), controller.importTimGU);
router.post("/import/tim-gu-manual", upload.single("file"), controller.importTimGUManual);
router.post("/import/tim-app-vendas", upload.single("file"), controller.importTimAppTimVendas);
router.post("/import/tim-esteira-full", upload.single("file"), controller.importTimEsteiraFull);
router.post(
  "/import/tim-trafego-zero-dep",
  upload.single("file"),
  controller.importTimTrafegoZeroDep
);
router.post("/import/tim-portabilidade", upload.single("file"), controller.importTimPort);
router.post("/import/tim-dacc", upload.single("file"), controller.importTimDACC);

module.exports = router;

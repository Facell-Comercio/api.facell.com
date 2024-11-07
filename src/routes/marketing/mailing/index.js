const router = require("express").Router();

const controller = require("../../../controllers/marketing/mailing/mailing-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");
const checkUserPermission = require("../../../middlewares/permission-middleware");
const campanhas = require("./campanhas");
const clientes = require("./clientes");
const { localTempStorage } = require("../../../libs/multer");
const multer = require("multer");
const upload = multer({ storage: localTempStorage });
router.use("/campanhas", campanhas);
router.use("/clientes", clientes);

router.post(
  "/nova-campanha",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.insertCampanha
);

//* APARELHOS
router.get(
  "/aparelhos",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getAllAparelhos
);
router.get(
  "/aparelhos/estoque",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getEstoqueAparelho
);

//* IMPORT EXCELL
const multipleUpload = upload.array("files", 100);
router.post("/import-excel", checkUserPermission("MASTER"), async (req, res) => {
  multipleUpload(req, res, async (err) => {
    if (err) {
      console.log(err);

      return res
        .status(500)
        .json({ message: "Ocorreu algum problema com o(s) arquivo(s) enviado(s)" });
    } else {
      try {
        const result = await controller.importClientesExcel(req);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  });
});

//* IMPORT EXCELL
router.put("/update-excel", checkUserPermission("MASTER"), async (req, res) => {
  multipleUpload(req, res, async (err) => {
    if (err) {
      console.log(err);

      return res
        .status(500)
        .json({ message: "Ocorreu algum problema com o(s) arquivo(s) enviado(s)" });
    } else {
      try {
        const result = await controller.updateClientesExcel(req);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  });
});

module.exports = router;

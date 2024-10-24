const router = require("express").Router();
const multer = require("multer");

const controller = require("../../../../controllers/financeiro/contas-a-receber/titulo-receber/titulo-receber-controller");
const { localTempStorage } = require("../../../../libs/multer");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");
const upload = multer({ storage: localTempStorage });

//* TÍTULOS
router.get("/", async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get(
  "/vencimentos",
  async (req, res) => {
    try {
      const result = await controller.getAllVencimentosCR(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get("/:id", async (req, res) => {
  try {
    const result = await controller.getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const result = await controller.insertOneTituloReceber(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const result = await controller.update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post(
  "/change-status",
  async (req, res) => {
    try {
      const result = await controller.changeStatusTituloReceber(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

//* RECEBIMENTOS
router.get("/vencimentos/recebimentos",
  async (req, res) => {
    try {
      const result = await controller.getAllRecebimentosVencimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete(
  "/vencimentos/recebimentos/:id",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await controller.deleteRecebimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

//* IMPORTAÇÕES
const multipleUpload = upload.array("files", 100);

router.post(
  "/reembolso-tim-lote",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    multipleUpload(req, res, async (err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Ocorreu algum problema com o(s) arquivo(s) enviado(s)" });
      } else {
        try {
          const result = await controller.lancamentoReembolsosTim(req);
          res.status(200).json(result);
        } catch (error) {
          res.status(400).json({ message: error.message });
        }
      }
    });
  }
);

router.post(
  "/comissoes-tim-lote",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    multipleUpload(req, res, async (err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Ocorreu algum problema com o(s) arquivo(s) enviado(s)" });
      } else {
        try {
          const result = await controller.lancamentoComissoesTim(req);
          res.status(200).json(result);
        } catch (error) {
          res.status(400).json({ message: error.message });
        }
      }
    });
  }
);

router.post(
  "/reembolsos-tim-zip",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    multipleUpload(req, res, async (err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Ocorreu algum problema com o(s) arquivo(s) enviado(s)" });
      } else {
        try {
          const result = await controller.reembolsosTimZIP(req);
          res.status(200).json(result);
        } catch (error) {
          res.status(400).json({ message: error.message });
        }
      }
    });
  }
);

module.exports = router;

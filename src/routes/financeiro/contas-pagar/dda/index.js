const router = require("express").Router();
const multer = require('multer');
const path = require("path")

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/temp/'); // Defina o diretório de destino dos arquivos
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const {
  getAll,
  importDDA,
  exportDDA,
  limparDDA,
  autoVincularDDA,
  vincularDDA,
  desvincularDDA,
} = require("../../../../controllers/financeiro/contas-a-pagar/dda-controller");

router.get("/", async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const multipleUpload = upload.array('files', 100);

router.post("/import", async (req, res) => {
  multipleUpload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: 'Ocorreu algum problema com o(s) arquivo(s) enviado(s)' })
    } else {
      try {
        const result = await importDDA(req);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  })
});

router.post("/export", async (req, res) => {
  try {
    const result = await exportDDA(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/limpar", async (req, res) => {
  try {
    const result = await limparDDA(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/auto-vincular", async (req, res) => {
  try {
    const result = await autoVincularDDA(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/vincular", async (req, res) => {
  try {
    const result = await vincularDDA(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/desvincular", async (req, res) => {
  try {
    const result = await desvincularDDA(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

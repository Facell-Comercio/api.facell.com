const router = require("express").Router();
const multer = require('multer');

const upload = multer({ dest: 'public/temp/' });
const {
  getAll,
  importFile,
} = require("../../../../controllers/financeiro/contas-a-pagar/dda-controller");

router.get("/", async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/import", upload.single('file'), async (req, res) => {
    try {
      const result = await importFile(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

router.post("/", async (req, res) => {
  try {
    const result = await insertOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const result = await update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

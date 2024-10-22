const router = require("express").Router();

const controller = require("../../../../controllers/financeiro/contas-a-receber/movimento-contabil-controller");

router.get("/", async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/download", async (req, res) => {
  try {
    await controller.downloadMovimentoContabil(req, res);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// router.post("/", async (req, res) => {
//   try {
//     const result = await insertOne(req);
//     res.status(200).json(result);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });

// router.put("/", async (req, res) => {
//   try {
//     const result = await update(req);
//     res.status(200).json(result);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });

module.exports = router;

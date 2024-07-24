const router = require("express").Router();
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

const {
  getAll,
  getOne,
} = require("../../../controllers/comercial/comercial-controller");

router.get(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await getAll(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get(
  "/:id",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await getOne(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;

const router = require("express").Router();
const {
  login,
  updateSenha,
  recuperarSenha,
  validarToken,
} = require("../controllers/auth-controller");
const authMiddleware = require("../middlewares/auth-middleware");

router.put("/alterar-senha", async (req, res) => {
  try {
    const data = await updateSenha(req);
    res.status(200).json(data);
  } catch (error) {
    res
      .status(400)
      .json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = await login(req);
    res.status(200).json(data);
  } catch (error) {
    res
      .status(400)
      .json({ message: error.message });
  }
});

router.post(
  "/recuperar-senha",
  async (req, res) => {
    try {
      const data = await recuperarSenha(req);
      res.status(200).json(data);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.get(
  "/validar-token",
  authMiddleware,
  async (req, res) => {
    try {
      const token = await validarToken(req);

      res.status(200).json({ token });
    } catch (error) {
      // console.log("Router validar-token");
      // console.error(error);
      res.status(400).json({
        message:
          "Ocorreu um erro ao tentar validar a sua autenticação!",
      });
    }
  }
);

module.exports = router;

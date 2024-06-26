const router = require("express").Router();
const {
  register,
  login,
  updateSenha,
  recuperarSenha,
} = require("../controllers/auth-controller");
const authMiddleware = require("../middlewares/auth-middleware");

router.post("/register", async (req, res) => {
  try {
    await register(req);
    res.status(200).json({ message: "Sucesso!" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/alterar-senha", async (req, res) => {
  try {
    const data = await updateSenha(req);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = await login(req);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/recuperar-senha", async (req, res) => {
  try {
    const data = await recuperarSenha(req);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/validar-token", authMiddleware, async (req, res) => {
  try {
    res.status(200).json({ message: "Sucesso!" });
  } catch (error) {
    res.status(400).json({
      message: "Ocorreu um erro ao tentar validar a sua autenticação!",
    });
  }
});

module.exports = router;

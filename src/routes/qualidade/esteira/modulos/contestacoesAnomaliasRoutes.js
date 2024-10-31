const router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const {
  listarDadosSelectsContestacaoAnomalia,
  novaContestacaoAnomalia,
  listarContestacoesAnomalias,
  listarContestacoesAnomaliasNovas,
  confirmarContestacoesAnomalias,
  importarRespostaTimContestacoesAnomalias,
} = require("../../../../controllers/qualidade/esteira/contestacoesAnomaliasController");

// CONTESTAÇÕES DE ANOMALIA
router.get("/listardadosselects", async (req, res) => {
  try {
    const rows = await listarDadosSelectsContestacaoAnomalia();
    res.status(200).json({ msg: "Sucesso!", rows });
  } catch (error) {
    console.log(error);
    res.status(401).json({ msg: error });
  }
});

router.post("/nova", async (req, res) => {
  try {
    const resposta = await novaContestacaoAnomalia(req.body);
    res.status(200).json({ resposta });
  } catch (error) {
    console.log(error);
    res.status(401).json({ msg: error });
  }
});

router.post("/listar", async (req, res) => {
  try {
    const rows = await listarContestacoesAnomalias(req.body);
    res.status(200).json({ rows });
  } catch (error) {
    console.log(error);
    res.status(401).json({ msg: error });
  }
});
router.post("/listar-novas", async (req, res) => {
  try {
    const rows = await listarContestacoesAnomaliasNovas(req.body);
    res.status(200).json({ rows });
  } catch (error) {
    console.log(error);
    res.status(401).json({ msg: error });
  }
});

router.post(
  "/confirmar-importacao",
  upload.single("arquivo"),
  async (req, res) => {
    try {
      await confirmarContestacoesAnomalias(req.file.buffer, req.body.grupo_economico);
      res.status(200).json({ msg: "Sucesso!" });
    } catch (error) {
      console.log(error);
      res.status(401).json({ msg: error });
    }
  }
);

router.post(
  "/importar-respostas",
  upload.single("arquivo"),
  async (req, res) => {
    try {
      await importarRespostaTimContestacoesAnomalias(req.file.buffer, req.body.grupo_economico);
      res.status(200).json({ msg: "Sucesso!" });
    } catch (error) {
      console.log(error);
      res.status(401).json({ msg: error });
    }
  }
);

module.exports = router;

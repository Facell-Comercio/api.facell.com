const router = require("express").Router();
const path = require("path");
const multer = require("multer");

const { createId: cuid } = require("@paralleldrive/cuid2");
const { deleteFile } = require("../controllers/filesController");
require("dotenv").config();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, `${file.originalname.split(".")[0].substring(0, 30)}_${cuid()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ msg: "Nenhum arquivo recebido." });
  }
  if (!req.file.filename) {
    res.status(500).json({ msg: "Houve algum problema ao tentar salvar o arquivo." });
  }
  const fileName = req.file.filename;
  res.status(200).json({ fileName: fileName });
});

router.put("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ msg: "Nenhum arquivo recebido." });
    return;
  }

  const fileName = req.file.filename;
  const oldFileName = req?.body?.oldFileName;

  if (!fileName) {
    res.status(500).json({ msg: "Houve algum problema ao tentar salvar o arquivo." });
    return;
  }
  if (!oldFileName) {
    res.status(400).json({
      msg: "Você precisa enviar o nome do arquivo a ser substituído.",
    });
    return;
  }

  //   const fileUrl = process.env.BASE_URL + "/" + req.file.filename;
  //   const oldFileUrl = req.body?.oldFileUrl;
  //   const oldFileNameParts = oldFileUrl.split("/");
  //   const oldFileName = oldFileNameParts[oldFileNameParts.length - 1];
  const oldFilePath = "./public/uploads/" + oldFileName;

  try {
    await deleteFile(oldFilePath);
    res.status(200).json({ msg: "Sucesso!", fileName: fileName });
  } catch (error) {
    res.status(200).json({
      erro: true,
      fileName: fileName,
      msg: "Houve um erro ao tentar excluir o arquivo anterior no servidor, mas tudo bem. O arquivo pode já ter sido excluído.",
    });
  }
});

router.delete("/", async (req, res) => {
  const fileName = req?.body?.fileName;
  if (!fileName || fileName == "/") {
    res.status(400).json({ msg: "Nome do arquivo não recebido" });
    return;
  }
  //   const fileUrl = req.body?.fileUrl;
  //   const fileNameParts = fileUrl.split("/");
  //   const fileName = fileNameParts[fileNameParts.length - 1];
  const filePath = "./public/uploads/" + fileName;

  try {
    await deleteFile(filePath);
    res.status(200).json({ msg: "Sucesso!" });
  } catch (error) {
    res.status(500).json({
      msg: "Houve um erro ao tentar o arquivo no servidor, mas tudo bem. O arquivo pode já ter sido excluído.",
    });
  }
});

module.exports = router;

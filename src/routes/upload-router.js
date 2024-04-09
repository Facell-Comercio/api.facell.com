const router = require("express").Router();
const path = require("path");
const multer = require("multer");

const { createId: cuid } = require("@paralleldrive/cuid2");
const { deleteFile } = require("../controllers/files-controller");
require("dotenv").config();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, `${file.originalname.split(".")[0].substring(0, 30)}_${cuid()}${path.extname(file.originalname)}`);
  },
});

const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/temp/");
  },
  filename: function (req, file, cb) {
    cb(null, `${file.originalname.split(".")[0].substring(0, 30)}_${cuid()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });
const preUpload = multer({ storage: tempStorage });

router.post("/", upload.single("file"), (req, res) => {
  try {
    const filename = req?.file?.filename;
    if(!filename){
      throw new Error('Houve um problema com o upload, tente novamente.')
    }
    const fileUrl = process.env.BASE_URL + '/uploads/' + filename;
    res.status(200).json({ fileUrl: fileUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/pre-upload", preUpload.single("file"), (req, res) => {
  try {
    const filename = req?.file?.filename;
    if(!filename){
      throw new Error('Houve um problema com o upload, tente novamente.')
    }
    const fileUrl = process.env.BASE_URL + '/temp/' + filename;
    res.status(200).json({ fileUrl: fileUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "Nenhum arquivo recebido." });
    return;
  }

  const fileName = req.file.filename;
  const oldFileName = req?.body?.oldFileName;

  if (!fileName) {
    res.status(500).json({ message: "Houve algum problema ao tentar salvar o arquivo." });
    return;
  }
  if (!oldFileName) {
    res.status(400).json({
      message: "Você precisa enviar o nome do arquivo a ser substituído.",
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
    res.status(200).json({ message: "Sucesso!", fileName: fileName });
  } catch (error) {
    res.status(200).json({
      erro: true,
      fileName: fileName,
      message: "Houve um erro ao tentar excluir o arquivo anterior no servidor, mas tudo bem. O arquivo pode já ter sido excluído.",
    });
  }
});

router.delete("/", async (req, res) => {
  const originalName = req?.body?.fileName;
  if(!originalName){
    res.status(400).json({ message: "Nome do arquivo não recebido" });
    return
  }
  const fileNameParts = originalName.split('/')

  if (!fileNameParts || fileNameParts?.length === 0) {
    res.status(400).json({ message: "Nome do arquivo não recebido" });
    return;
  }
  const fileName = fileNameParts[fileNameParts.length -1]
  const filePath = originalName.includes('temp/') ? "./public/temp/" + fileName : "./public/uploads/" + fileName;

  try {
    await deleteFile(filePath);
    res.status(200).json({ message: "Sucesso!" });
  } catch (error) {
    res.status(500).json({
      message: "Houve um erro ao tentar o arquivo no servidor, mas tudo bem. O arquivo pode já ter sido excluído.",
    });
  }
});

module.exports = router;

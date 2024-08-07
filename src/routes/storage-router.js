require("dotenv").config();
const router = require("express").Router();
const multer = require("multer");
const { uploadFile, deleteFile, preUploadFile, createGoogleDriveUrl, downloadFile, extractGoogleDriveId } = require("../controllers/storage-controller");

const { localTempStorage } = require("../libs/multer");
const upload = multer({ storage: localTempStorage });

// * OK
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { fileUrl } = await uploadFile(req)
    res.status(200).json({ fileUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// * OK
router.post("/pre-upload", upload.single("file"), async (req, res) => {
  try {
    const { fileUrl } = await preUploadFile(req) 
    res.status(200).json({ fileUrl });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// * OK
router.put("/", upload.single("file"), async (req, res) => {
  try {

    if (!req.file) {
      throw new Error("Nenhum arquivo recebido.");
    }

    const fileName = req.file.filename;
    const oldFileId = req?.body?.oldFileId;

    if (!fileName) {
      throw new Error("Houve algum problema ao tentar salvar o arquivo.");
    }
    if (!oldFileId) {
      throw new Error("Você precisa enviar o ID do arquivo a ser substituído.");
    }
    const { fileUrl } = await uploadFile(req)
    try {
      await deleteFile(oldFileId);
    } catch (error) {}

    res.status(200).json({ message: "Sucesso!", fileUrl });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// * OK
router.delete("/", async (req, res) => {
  try {
    const {fileUrl} = req.query;
    if(!fileUrl){
      throw new Error('ID do arquivo não recebido!')
    }
    const fileId = extractGoogleDriveId(fileUrl)
    await deleteFile(fileId);
    res.status(200).json({ message: "Sucesso!" });
  } catch (error) {
    // console.log(error);
    res.status(500).json({
      message: "Houve um erro ao tentar o arquivo. Ou o arquivo pode já ter sido excluído.",
    });
  }
});

module.exports = router;

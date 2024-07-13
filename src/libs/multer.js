const multer = require("multer");
const path = require('path');
const { createId: cuid } = require("@paralleldrive/cuid2");

const localTempStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "public/temp/");
    },
    filename: function (req, file, cb) {
      cb(null, `${file.originalname.split(".")[0].substring(0, 30)}_${cuid()}${path.extname(file.originalname)}`);
    },
  });

  const localUploadsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "public/uploads/");
    },
    filename: function (req, file, cb) {
      cb(null, `${file.originalname.split(".")[0].substring(0, 30)}_${cuid()}${path.extname(file.originalname)}`);
    },
  });

module.exports = {
    localTempStorage,
    localUploadsStorage,
}
const insertModeloItem = require("./politicas/insertModeloItem");

module.exports = {
  getAll: require("./politicas/getAll"),
  getOne: require("./politicas/getOne"),
  getOneModelo: require("./politicas/getOneModelo"),
  getOneModeloItem: require("./politicas/getOneModeloItem"),
  insertCargoPolitica: require("./politicas/insertCargoPolitica"),
  insertModelo: require("./politicas/insertModelo"),
  insertModeloItem: require("./politicas/insertModeloItem"),
  update: require("./politicas/update"),
  updateModelo: require("./politicas/updateModelo"),
  updateModeloItem: require("./politicas/updateModeloItem"),
  removeCargoPolitica: require("./politicas/removeCargoPolitica"),
};

module.exports = {
  getAll: require("./politicas/getAll"),
  getOne: require("./politicas/getOne"),
  getOneModelo: require("./politicas/getOneModelo"),
  getOneModeloItem: require("./politicas/getOneModeloItem"),

  insertOne: require("./politicas/insertOne"),
  copyPolitica: require("./politicas/copyPolitica"),
  insertCargoPolitica: require("./politicas/insertCargoPolitica"),
  insertModelo: require("./politicas/insertModelo"),
  insertModeloItem: require("./politicas/insertModeloItem"),

  updateModelo: require("./politicas/updateModelo"),
  updateModeloItem: require("./politicas/updateModeloItem"),

  removeCargoPolitica: require("./politicas/removeCargoPolitica"),
};

module.exports = {
  getAll: require("./metodos/getAll"),
  getOne: require("./metodos/getOne"),
  getOneTransacao: require("./metodos/getOneTransacao"),

  insertAdiantamento: require("./metodos/insertAdiantamento"),
  insertSuprimento: require("./metodos/insertSuprimento"),
  updateDataFechamento: require("./metodos/updateDataFechamento"),

  deleteTransacao: require("./metodos/deleteTransacao"),
  updateTransacao: require("./metodos/updateTransacao"),

  transferirSaldo: require("./metodos/transferirSaldo"),
  vincularAdiantamento: require("./metodos/vincularAdiantamento"),
};

const insertOneContestacao = require("./espelhos/insertOneContestacao");

module.exports = {
  getAll: require("./espelhos/getAll"),
  getOne: require("./espelhos/getOne"),
  deleteOne: require("./espelhos/deleteOne"),

  getAllContestacoes: require("./espelhos/getAllContestacoes"),
  getOneContestacao: require("./espelhos/getOneContestacao"),
  insertOneContestacao: require("./espelhos/insertOneContestacao"),
  updateStatusContestacao: require("./espelhos/updateStatusContestacao"),
  deleteContestacao: require("./espelhos/deleteContestacao"),

  recalcularEspelho: require("./espelhos/recalcularEspelho"),
};

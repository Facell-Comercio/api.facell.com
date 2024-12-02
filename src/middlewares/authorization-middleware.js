const { checkUserDepartment } = require("../helpers/checkUserDepartment");
const { hasPermission } = require("../helpers/hasPermission");

function checkUserAuthorization(departamento, operador, permissao, gestor_departamento) {
  return function (req, res, next) {
    const passDepart = checkUserDepartment(req, departamento, gestor_departamento);
    const passPermissao = hasPermission(req, permissao);

    if (operador === "AND") {
      if (passDepart && passPermissao) {
        next();
      } else {
        res.status(403).json({
          message: `Acesso negado. É necessário ter acesso ao departamento ${departamento} e a permissão ${permissao}`,
        });
      }
    } else if (operador === "OR") {
      if (passDepart || passPermissao) {
        next();
      } else {
        res.status(403).json({
          message: `Acesso negado. É necessário ter acesso ao departamento ${departamento} ou a permissão ${permissao}`,
        });
      }
    }
  };
}

module.exports = checkUserAuthorization;

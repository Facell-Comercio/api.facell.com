const { checkUserPermission } = require("../helpers/checkUserPermission");

function checkUserPermissionMiddleware(permission) {
  return function (req, res, next) {
    const passPermissao = checkUserPermission(req, permission);

    if (passPermissao) {
      next();
    } else {
      res.status(403).json({
        message: "Acesso negado. É necessário ter a permissão: " + permission,
      });
    }
  };
}

module.exports = checkUserPermissionMiddleware;

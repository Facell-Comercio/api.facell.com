const { hasPermission } = require("../helpers/hasPermission");

function hasPermissionMiddleware(permission) {
  return function (req, res, next) {
    const passPermissao = hasPermission(req, permission);

    if (passPermissao) {
      next();
    } else {
      res.status(403).json({
        message: "Acesso negado. É necessário ter a permissão: " + permission,
      });
    }
  };
}

module.exports = hasPermissionMiddleware;

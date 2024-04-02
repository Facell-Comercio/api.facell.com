function checkUserDepartment(depart) {
  return function (req, res, next) {
    const departamentos = req.user?.departamentos;
    const index = departamentos?.findIndex((perm) => perm.nome === depart);

    if (departamentos && index >= 0) {
      next();
    } else {
      res.status(403).json({
        message:
          "Acesso negado. É necessário ter acesso ao departamento: " + depart,
      });
    }
  };
}

module.exports = checkUserDepartment;

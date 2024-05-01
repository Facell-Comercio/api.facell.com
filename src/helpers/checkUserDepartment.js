const checkUserDepartment = (req, depart, gestor = undefined) => {
  const user = req.user;
  const tipo = typeof depart;

  if (!user) return false;
  if (tipo !== "string" && tipo !== "number") return false;
  if (!user.departamentos || user.departamentos?.length === 0) {
    return false;
  }
  if (tipo === "number") {
    if (gestor !== undefined) {
      return (
        user.departamentos.findIndex(
          (perm) => perm.id === depart && perm.gestor === gestor
        ) >= 0
      );
    }
    return user.departamentos.findIndex((perm) => perm.id === depart) >= 0;
  }
  if (tipo === "string") {
    if (gestor !== undefined) {
      return (
        user.departamentos.findIndex(
          (perm) => perm.id === depart && perm.gestor === gestor
        ) >= 0
      );
    }
    return user.departamentos.findIndex((perm) => perm.nome === depart) >= 0;
  }
  return true;
};

module.exports = {
  checkUserDepartment,
};

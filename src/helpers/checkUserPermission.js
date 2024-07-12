const checkUserPermission = (req, permission) => {
  const user = req.user;
  const tipo = typeof permission;

  if (!user) return false;
  if (tipo !== "string" && tipo !== "number") return false;
  if (!user.permissoes || user.permissoes?.length === 0) {
    return false;
  }
  if (tipo === "number") {
    const index = user.permissoes.findIndex((perm) => perm.id_permissao === permission);
    return index >= 0;
  }
  if (tipo === "string") {
    const index = user.permissoes.findIndex((perm) => perm.nome === permission);
    return index >= 0;
  }
  return false;
};

module.exports = {
  checkUserPermission,
};

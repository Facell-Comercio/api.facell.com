const checkUserFilial = (req, filial) => {
  const user = req.user;
  const tipo = typeof filial;
  if (!user) return false;
  if (tipo !== "string" && tipo !== "number" && !(filial instanceof Array))
    return false;
  if (!user.permissoes || user.permissoes?.length === 0) {
    return false;
  }
  if (tipo === "number") {
    const index = user.permissoes.findIndex(
      (perm) => perm.id_permissao === filial
    );
    return index >= 0;
  }
  if (tipo === "string") {
    const index = user.permissoes.findIndex((perm) => perm.nome === filial);
    return index >= 0;
  }
  if (filial instanceof Array) {
    const index = user.permissoes.findIndex((perm) => {
      return filial.includes(perm.nome);
    });
    return index >= 0;
  }
  return false;
};

module.exports = {
  checkUserFilial,
};

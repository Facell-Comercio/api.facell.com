const checkUserFilial = (req, filialParam, gestor = undefined) => {
  const user = req.user;
  const tipo = typeof filialParam;
  if (!user) return false;
  if (tipo !== "string" && tipo !== "number" && !(filialParam instanceof Array))
    return false;
  if (!user.filiais || user.filiais?.length === 0) {
    return false;
  }
  if (tipo === "number") {
    if (gestor !== undefined) {
      return (
        user.filiais.findIndex(
          (filial) =>
            filial.id_filial === filialParam && filial.gestor == +gestor
        ) >= 0
      );
    }
    return (
      user.filiais.findIndex((filial) => filial.id_filial === filialParam) >= 0
    );
  }
  if (tipo === "string") {
    if (gestor !== undefined) {
      return (
        user.filiais.findIndex(
          (filial) => filial.nome === filialParam && filial.gestor == +gestor
        ) >= 0
      );
    }
    return user.filiais.findIndex((filial) => filial.nome === filialParam) >= 0;
  }
  if (filialParam instanceof Array) {
    const index = user.filiais.findIndex((filial) => {
      return filialParam.includes(filial.nome) && filial.gestor == +gestor;
    });
    return index >= 0;
  }
  return false;
};

module.exports = {
  checkUserFilial,
};

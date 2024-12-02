const [rowsQualidade] = await db.execute(
    "SELECT qualidade FROM comissao_qualidade_tim WHERE ref = ? and cpf = ?",
    [ref, meta.filial]
  );
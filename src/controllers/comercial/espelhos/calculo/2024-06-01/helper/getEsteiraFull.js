const [rowEsteiraFull] = await db.execute(
    "SELECT sum(indicador) / sum(total) as esteiraFull FROM comissao_esteira_full_tim WHERE ref = ? and filial = ? and cpf = ? ",
    [ref, meta.filial, meta.cpf]
  );
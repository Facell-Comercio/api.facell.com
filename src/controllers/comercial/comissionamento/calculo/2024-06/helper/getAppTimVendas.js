const [rowAppTimVendas] = await db.execute(
    "SELECT sum(indicador) / sum(total) as app FROM comissao_app_tim_vendas WHERE ref = ? and filial = ? and cpf = ? ",
    [ref, meta.filial, meta.cpf]
  );
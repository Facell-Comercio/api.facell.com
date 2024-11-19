const [rowsTrafegoZero] = await db.execute(
    `SELECT 
sum(indicador) / sum(total) as trafego_zero_percent,
(sum(indicador) / sum(total) - 0.1) * sum(total) as trafego_zero_qtde 
FROM comissao_tz_tim WHERE ref = ? and filial = ? and cpf = ? 
GROUP BY cpf
`,
    [ref, meta.filial, meta.cpf]
  );
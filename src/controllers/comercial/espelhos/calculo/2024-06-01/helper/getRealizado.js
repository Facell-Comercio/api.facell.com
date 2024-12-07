// obter todos os realizados
const [realizadoServico] = await db.execute(
    `
    SELECT 
        v.cpfVendedor,
        COUNT(CASE WHEN v.categoria = 'PÓS PURO' THEN v.id END) as pos,
        COUNT(CASE WHEN v.categoria = 'PÓS PURO' AND (v.plaOpera LIKE '%MULTI%' OR v.plaOpera LIKE '%FAM%') THEN v.id END) as pos_titular,
        COUNT(CASE WHEN v.categoria = 'PÓS PURO' AND NOT (v.plaOpera LIKE '%MULTI%' OR v.plaOpera LIKE '%FAM%' OR v.plaOpera LIKE '%DEPEN%') THEN v.id END) as pos_individual,
  
        COUNT(CASE WHEN v.categoria = 'CONTROLE' THEN v.id END) as controle,
        COUNT(CASE WHEN v.categoria = 'CONTROLE' AND v.plaOpera LIKE '%CONTROLE A%' THEN v.id END) as controle_a,
        SUM(CASE WHEN v.tipo_movimento <> 'UPGRADE 2' THEN v.valor_receita END) as receita,
        COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 1' THEN v.id END) as upgrade,
        COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 2' THEN v.id END) as upgrade2,
        COUNT(CASE WHEN v.categoria = 'TIM FIXO' OR v.categoria = 'WTTX' OR v.categoria = 'LIVE' THEN v.id END) as residenciais,
        COUNT(CASE WHEN v.categoria = 'LIVE' THEN v.id END) as live
    FROM
        datasys_ativacoes v
    WHERE
        v.dtAtivacao BETWEEN ? AND ?
        AND v.filial = ?
        AND v.cpfVendedor LIKE CONCAT('%', ?, '%')
        AND NOT v.statusLinha IN ('VENDA IRREGULAR', 'CANCELADA', 'DUPLICIDADE')
    GROUP BY
        v.cpfVendedor;
        `,
    [meta.data_inicial, meta.data_final, meta.filial, meta.cpf]
  );
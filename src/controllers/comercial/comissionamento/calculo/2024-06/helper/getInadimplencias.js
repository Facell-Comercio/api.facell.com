// [INADIMPLÊNCIAS]
let anoInadimplencia = ano;
let mesInadimplencia = mes;

if (mesInadimplencia === 1) {
  anoInadimplencia = anoInadimplencia - 1;
  mesInadimplencia = 12;
} else if (mesInadimplencia === 12) {
  anoInadimplencia++;
  mesInadimplencia = 1;
} else {
  mesInadimplencia--;
}
let refInadimplencia = `${anoInadimplencia}-${mesInadimplencia
  .toString()
  .padStart(2, "0")}`;

const [rowsInadimplencias] = await db.execute(
  `SELECT
  COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' THEN id END) as qtdeControle,  
  COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' AND NOT plaOpera LIKE '%CONTROLE A%' THEN id END) as qtdeOutrosControles,  
  COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' AND plaOpera LIKE '%CONTROLE A%' THEN id END) as qtdeControleA,  

  COUNT(CASE WHEN plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%' THEN id END) as qtdePos,  

  COUNT(CASE WHEN (plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%') AND (NOT plaOpera LIKE '%MULTI%' AND NOT plaOpera LIKE '%DEPE%' AND NOT plaOpera LIKE '%FAM%') THEN id END) as qtdePosIndividual, 

  COUNT(CASE WHEN (plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%') AND (plaOpera LIKE '%MULTI%' OR plaOpera LIKE '%FAM%') THEN id END) as qtdePosTitular,

  SUM(valor_receita) as receita

  FROM facell_docs
  WHERE 
      status_inadimplencia = 'Inadimplente'
      AND DATE_FORMAT(dtAtivacao, '%Y-%m') = ?
      AND cpfVendedor = ?

`,
  [refInadimplencia, meta.cpf]
);
espelho.inadimplencias = rowsInadimplencias && rowsInadimplencias[0];

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
const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { getAllVencimentosBordero } = require("../vencimentos-controller");
const { getAllFaturasBordero } = require("../cartoes-controller");

module.exports = function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id: id_bordero } = req.params;
    let conn;
    try {
      conn = await db.getConnection();
      const [rowBorderos] = await conn.execute(
        `
              SELECT 
                b.id, b.data_pagamento, b.id_conta_bancaria, 
                cb.descricao as conta_bancaria, f.id_matriz, LPAD(fb.codigo, 3, '0') as codigo_banco, fb.nome as banco
              FROM fin_cp_bordero b
              LEFT JOIN fin_cp_bordero_itens tb ON tb.id_bordero = b.id
              LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento
              LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
              LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
              LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
              LEFT JOIN filiais f ON f.id = cb.id_filial
              LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
              WHERE b.id = ?
              `,
        [id_bordero]
      );
      const bordero = rowBorderos && rowBorderos[0];

      const { rows: vencimentos } = await getAllVencimentosBordero({
        query: { id_bordero },
      });
      const { rows: faturas } = await getAllFaturasBordero({
        query: { id_bordero },
      });

      const itens_bordero = [
        ...vencimentos.map((v) => ({
          ...v,
          tipo: "vencimento",
          id_item: v.id_vencimento,
        })),
        ...faturas.map((f) => ({ ...f, tipo: "fatura", id_item: f.id })),
      ].map((item_bordero) => ({
        ...item_bordero,
        checked: false,
        can_remove: !item_bordero.data_pagamento,
        can_modify: !item_bordero.conciliado && !item_bordero.remessa,
      }));

      // console.log({itens_bordero});
      const objResponse = {
        ...bordero,
        itens: itens_bordero,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};

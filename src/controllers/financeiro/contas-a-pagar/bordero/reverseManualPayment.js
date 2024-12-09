const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { checkUserDepartment } = require("../../../../helpers/checkUserDepartment");
const { hasPermission } = require("../../../../helpers/hasPermission");
const { objectToStringLine } = require("../../../../helpers/mask");
const updateSaldoContaBancaria = require("../../tesouraria/metodos/updateSaldoContaBancaria");
const crypto = require("crypto");

function registrarDevolucaoTesouraria({ user, conn, id_vencimento }) {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowsVencimento] = await conn.execute(
        `
        SELECT 
          tv.id, tv.id_titulo, tv.valor_pago, bi.id_bordero
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
        WHERE tv.id = ?`,
        [id_vencimento]
      );
      const vencimento = rowsVencimento && rowsVencimento[0];

      const [rowsContaBancaria] = await conn.execute(
        `
        SELECT cb.id, cb.caixa, b.data_pagamento
        FROM fin_contas_bancarias cb
        LEFT JOIN fin_cp_bordero b ON b.id_conta_bancaria = cb.id
        WHERE b.id = ?
      `,
        [vencimento.id_bordero]
      );
      const contaBancaria = rowsContaBancaria && rowsContaBancaria[0];

      //* SE NÃO FOR CONTA CAIXA IGNORA OS PROCEDIMENTOS ABAIXO
      if (!contaBancaria.caixa) {
        resolve();
        return;
      }

      const id_conta_bancaria = contaBancaria.id;
      const data_pagamento = contaBancaria.data_pagamento;
      const valor = vencimento.valor_pago;

      const [rowTitulo] = await conn.execute(
        "SELECT id, descricao FROM fin_cp_titulos WHERE id = ?",
        [vencimento.id_titulo]
      );
      const titulo = rowTitulo && rowTitulo[0];

      let descricao = `DEVOLUCAO PAGAMENTO #${titulo.id} - ${titulo.descricao}`;

      // * Verifica se já existe um extrato com a mesma descrição:
      const [extratosRepetidos] = await conn.execute(
        "SELECT id FROM fin_extratos_bancarios WHERE descricao LIKE CONCAT(?,'%')",
        [descricao]
      );
      if (extratosRepetidos.length > 0) {
        descricao += ` (${extratosRepetidos.length})`;
      }

      const hashEntrada = crypto
        .createHash("md5")
        .update(
          objectToStringLine({
            id_conta_bancaria,
            valor: valor,
            data_deposito: data_pagamento,
            id_user: user.id,
            tipo_transacao: "CREDIT",
            descricao,
          })
        )
        .digest("hex");

      await conn.execute(
        `INSERT INTO fin_extratos_bancarios
            (id_conta_bancaria, id_transacao, documento, data_transacao, tipo_transacao, valor, descricao, id_user)
          VALUES(?,?,?,?,?,?,?,?)`,
        [
          id_conta_bancaria,
          hashEntrada,
          hashEntrada,
          data_pagamento,
          "CREDIT",
          valor,
          descricao,
          user.id,
        ]
      );

      await updateSaldoContaBancaria({
        body: {
          id_conta_bancaria,
          valor: valor,
          conn,
        },
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = function reverseManualPayment(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { tipo, forma_pagamento } = req.body;
    let conn;

    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!tipo) {
        throw new Error("Tipo não informado!");
      }

      await conn.beginTransaction();

      if (tipo === "vencimento") {
        if (forma_pagamento === "Dinheiro") {
          await registrarDevolucaoTesouraria({
            user: req.user,
            id_vencimento: id,
            conn,
          });
        }
        await reverseManualPaymentVencimento({
          req,
          id_vencimento: id,
          conn,
        });
      }

      if (tipo === "fatura") {
        await reverseManualPaymentFatura({
          req,
          id_fatura: id,
          conn,
        });
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "REVERSE_MANUAL_PAYMENT",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};

async function verificarVencimentosParciais({ id_vencimento, valor_pagamento, conn }) {
  let valor = parseFloat(valor_pagamento);
  const [rowItemPagamentosParciais] = await conn.execute(
    `
      SELECT id, data_pagamento, tipo_baixa, valor
      FROM fin_cp_titulos_vencimentos 
      WHERE vencimento_origem = ? 
      `,
    [id_vencimento]
  );

  const vencimentoParcial = rowItemPagamentosParciais && rowItemPagamentosParciais[0];

  const [rowVencimentoOrigemParciais] = await conn.execute(
    `
      SELECT data_pagamento
      FROM fin_cp_titulos_vencimentos 
      WHERE id = ?
      AND data_pagamento IS NOT NULL
      `,
    [vencimentoParcial.id]
  );

  if (rowVencimentoOrigemParciais.length > 0) {
    throw new Error(
      `Não é possível desfazer o pagamento, pois um pagamento parcial foi feito em ${formatDate(
        rowVencimentoOrigemParciais[0].data_pagamento,
        "dd/MM/yyyy"
      )}. Resolva todos os pagamentos parciais primeiro.`
    );
  }

  // console.log(rowVencimentosParciais);
  valor += parseFloat(vencimentoParcial.valor);

  await conn.execute(
    `
      DELETE FROM fin_cp_titulos_vencimentos WHERE id = ?
      `,
    [vencimentoParcial.id]
  );

  return valor;
}

function reverseManualPaymentVencimento({ req, id_vencimento, conn }) {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowVencimento] = await conn.execute(
        `
              SELECT 
                tv.tipo_baixa, tv.data_pagamento, tv.id_titulo, tv.valor as valor_pagamento,
                bi.remessa, cbi.id as conciliado
              FROM fin_cp_titulos_vencimentos tv
              LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
              LEFT JOIN fin_conciliacao_bancaria_itens cbi
                ON cbi.id_item = tv.id
                AND cbi.tipo = 'pagamento'
              WHERE tv.id = ?
            `,
        [id_vencimento]
      );

      const { tipo_baixa, data_pagamento, id_titulo, valor_pagamento, remessa, conciliado } =
        rowVencimento && rowVencimento[0];

      if (remessa) {
        throw new Error("Não é possível reverter pagamento feito por arquivo de remessa!");
      }
      if (conciliado) {
        throw new Error("Pagamento já foi conciliado!");
      }
      if (!checkUserDepartment(req, "FINACEIRO", true) && !hasPermission(req, "MASTER")) {
        throw new Error("Você não tem permissão para desfazer o pagamento!");
      }
      if (!rowVencimento.length) {
        throw new Error("Item não existente!");
      }
      if (!data_pagamento) {
        throw new Error("Item não pago!");
      }
      if (tipo_baixa !== "PARCIAL") {
        await conn.execute(
          `
            UPDATE fin_cp_titulos_vencimentos SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, status = ?, obs = ? WHERE id = ?
          `,
          [null, null, null, "pendente", null, id_vencimento]
        );
      } else {
        //* Esse caso só se aplica aos vencimentos
        const valorTotal = await verificarVencimentosParciais({
          id_vencimento,
          valor_pagamento,
          conn,
        });

        await conn.execute(
          `
            UPDATE fin_cp_titulos_vencimentos SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, valor = ?, status = ?, obs = ? WHERE id = ?
          `,
          [null, null, null, valorTotal, "pendente", null, id_vencimento]
        );
      }

      const [itensPagos] = await conn.execute(
        `
            SELECT 
              tv.id, tb.id_bordero 
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
            WHERE tv.id_titulo = ? 
            AND NOT tv.data_pagamento IS NULL
          `,
        [id_titulo]
      );

      if (itensPagos === undefined) {
        throw new Error("Houve algum erro na operação");
      }

      if (itensPagos.length === 0) {
        // ^ Se não houverem vencimentos pagos muda o status do título para "aprovado"
        await conn.execute(`UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`, [3, id_titulo]);
      }
      if (itensPagos.length > 1) {
        // ^ Se ainda houverem vencimentos pagos no título muda o status do titulo para pago parcial
        await conn.execute(`UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`, [4, id_titulo]);
      }

      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function reverseManualPaymentFatura({ req, id_fatura, conn }) {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowFatura] = await conn.execute(
        `
          SELECT
            ccf.tipo_baixa, ccf.data_pagamento, ccf.valor as valor_pagamento,
            bi.remessa, cbi.id as conciliado
          FROM fin_cartoes_corporativos_faturas ccf
          LEFT JOIN fin_cp_bordero_itens bi ON bi.id_fatura = ccf.id
          LEFT JOIN fin_conciliacao_bancaria_itens cbi
            ON cbi.id_item = ccf.id
            AND cbi.tipo = 'fatura'
          WHERE ccf.id = ?
        `,
        [id_fatura]
      );
      const { tipo_baixa, data_pagamento, remessa, conciliado } = rowFatura && rowFatura[0];

      if (remessa) {
        throw new Error("Não é possível reverter pagamento feito por arquivo de remessa!");
      }
      if (conciliado) {
        throw new Error("Pagamento já foi conciliado!");
      }
      if (!checkUserDepartment(req, "FINACEIRO", true) && !hasPermission(req, "MASTER")) {
        throw new Error("Você não tem permissão para desfazer o pagamento!");
      }
      if (!rowFatura.length) {
        throw new Error("Item não existente!");
      }
      if (!data_pagamento) {
        throw new Error("Item não pago!");
      }
      if (tipo_baixa !== "PARCIAL") {
        await conn.execute(
          `
            UPDATE fin_cartoes_corporativos_faturas SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, status = ?, obs = ? WHERE id = ?
          `,
          [null, null, null, "pendente", null, id_fatura]
        );

        const [rowsVencimentoFatura] = await conn.execute(
          `
          SELECT id FROM fin_cp_titulos_vencimentos WHERE id_fatura = ?
          `,
          [id_fatura]
        );

        for (const vencimento of rowsVencimentoFatura) {
          await reverseManualPaymentVencimento({
            req,
            id_vencimento: vencimento.id,
            conn,
          });
        }
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { normalizeFirstAndLastName, objectToStringLine } = require("../../../../helpers/mask");
const updateSaldoContaBancaria = require("../../../financeiro/tesouraria/metodos/updateSaldoContaBancaria");
const crypto = require("crypto");

function pagarTituloPorVencimento({ user, conn, vencimento }) {
  return new Promise(async (resolve, reject) => {
    try {
      const id_titulo = vencimento.id_titulo;

      // * OBTÉM OS VENCIMENTOS NÃO PAGOS PARA AVALIAR SE TODOS FORAM PAGOS..
      const [vencimentosNaoPagos] = await conn.execute(
        ` SELECT 
                tv.id, tb.id_bordero 
              FROM fin_cp_titulos_vencimentos tv
              LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura = tv.id_fatura
              WHERE  
               tv.data_pagamento IS NULL
                AND tv.id_titulo = ?
            `,
        [id_titulo]
      );

      let status = "PAGO";
      if (vencimentosNaoPagos.length === 0) {
        // * ALTERA STATUS DO TÍTULO PARA - PAGO
        await conn.execute(`UPDATE fin_cp_titulos SET id_status = 5 WHERE id = ?`, [id_titulo]);
      }
      if (vencimentosNaoPagos.length > 0) {
        // * ALTERA STATUS DO TÍTULO PARA - PAGO PARCIAL
        await conn.execute(`UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`, [4, id_titulo]);
        status = "PAGO PARCIALMENTE";
      }
      // * INCLUI REGISTRO NO HISTÓRICO DO TÍTULO:
      const historico = `${status} POR: ${normalizeFirstAndLastName(user.nome)}.`;
      await conn.execute(
        `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
        [id_titulo, historico]
      );

      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

function pagarVencimento({ user, conn, vencimento, data_pagamento, obs }) {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowVencimentoBanco] = await conn.execute(
        `
            SELECT status, id_titulo FROM fin_cp_titulos_vencimentos WHERE id = ?
        `,
        [vencimento.id_vencimento]
      );
      const vencimentoBanco = rowVencimentoBanco && rowVencimentoBanco[0];
      vencimento.id_titulo = vencimentoBanco.id_titulo;
      //* Verificando a existencia do vencimento
      if (!vencimentoBanco) {
        throw new Error(`Vencimento não encontrado no sistema`);
      }
      //* Verificando se o status do vencimento é pago
      if (vencimentoBanco.status === "pago") {
        resolve(true);
        return;
      }

      // ^ Atualiza o vencimento com os dados da conciliação
      const isParcial = vencimento.tipo_baixa === "PARCIAL";
      const pago = !!vencimento.tipo_baixa;
      const params = [
        pago ? new Date(data_pagamento) : null,
        vencimento.tipo_baixa || null,
        vencimento.valor_pago || null,
        isParcial ? vencimento.valor_pago : vencimento.valor_total,
        pago ? "pago" : "pendente",
        pago ? obs || "PAGAMENTO REALIZADO MANUALMENTE" : null,
        vencimento.id_vencimento,
      ];

      // console.log({vencimento, params});

      await conn.execute(
        `UPDATE fin_cp_titulos_vencimentos 
                SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, valor = ?, status = ?, obs = ? WHERE id = ?`,
        params
      );
      //* Realiza a atualização manual do status de remessa
      await conn.execute(
        `UPDATE fin_cp_bordero_itens
                SET remessa = ?
                WHERE id_vencimento = ?
                `,
        [!!vencimento.remessa, vencimento.id_vencimento]
      );

      //^ Se for com desconto ou acréscimo, devemos aplicar um ajuste nos itens rateados do título:
      if (vencimento.tipo_baixa === "COM DESCONTO" || vencimento.tipo_baixa === "COM ACRÉSCIMO") {
        const [itens_rateio] = await conn.execute(
          `SELECT id FROM fin_cp_titulos_rateio WHERE id_titulo = ?`,
          [vencimentoBanco.id_titulo]
        );
        // Aqui obtemos a diferença entre valor pago e valor do vencimento
        const diferenca = parseFloat(vencimento.valor_pago) - parseFloat(vencimento.valor_total);
        // Aqui geramos a diferença que será acrescida ou descontada de cada item rateio:
        const difAplicada = diferenca / (itens_rateio?.length || 1);
        // Aplicamos a diferença nos itens
        await conn.execute(
          "UPDATE fin_cp_titulos_rateio SET valor = valor + ? WHERE id_titulo = ?",
          [difAplicada, vencimentoBanco.id_titulo]
        );
      }

      if (vencimento.tipo_baixa === "PARCIAL") {
        const valor = parseFloat(vencimento.valor_total) - parseFloat(vencimento.valor_pago);

        if (!vencimento.data_prevista_parcial) {
          throw new Error(
            "Você precisa informar a Data de previsão de pagamento do que for tipo Baixa PARCIAL"
          );
        }
        // ^ Baixa parcial -> Cria um novo vencimento
        await conn.execute(
          `INSERT INTO fin_cp_titulos_vencimentos (id_titulo, data_vencimento, data_prevista, valor, vencimento_origem) VALUES (?,?,?,?,?);`,
          [
            vencimento.id_titulo,
            new Date(vencimento.data_prevista_parcial),
            new Date(vencimento.data_prevista_parcial),
            valor.toFixed(2),
            vencimento.id_vencimento,
          ]
        );
      }

      // * PAGAMENTO DE TÍTULO:
      await pagarTituloPorVencimento({
        user,
        conn,
        vencimento,
      });

      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

function registrarTransacoesTesouraria({ user, id_bordero, vencimentos, conn }) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!id_bordero) {
        throw new Error("Bordero não informado");
      }

      const [rowsContaBancaria] = await conn.execute(
        `
        SELECT cb.id, cb.caixa, b.data_pagamento
        FROM fin_contas_bancarias cb
        LEFT JOIN fin_cp_bordero b ON b.id_conta_bancaria = cb.id
        WHERE b.id = ?
      `,
        [id_bordero]
      );

      const contaBancaria = rowsContaBancaria && rowsContaBancaria[0];

      //* SE NÃO FOR CONTA CAIXA IGNORA OS PROCEDIMENTOS ABAIXO
      if (!contaBancaria.caixa) {
        resolve();
        return;
      }

      const id_conta_bancaria = contaBancaria.id;
      const data_pagamento = contaBancaria.data_pagamento;

      for (const vencimento of vencimentos) {
        if (!vencimento.tipo_baixa) {
          throw new Error(
            `Você precisa informar o tipo de baixa do vencimento ${vencimento.id_vencimento}`
          );
        }
        const [rowTitulo] = await conn.execute(
          "SELECT id, descricao FROM fin_cp_titulos WHERE id = ?",
          [vencimento.id_titulo]
        );
        const titulo = rowTitulo && rowTitulo[0];
        const valor = vencimento.valor_pago || vencimento.valor_total;

        let descricao = `PAGAMENTO #${titulo.id} - ${titulo.descricao}`;

        // * Verifica se já existe um extrato com a mesma descrição:
        const [extratosRepetidos] = await conn.execute(
          "SELECT id FROM fin_extratos_bancarios WHERE descricao LIKE CONCAT(?,'%')",
          [descricao]
        );
        if (extratosRepetidos.length > 0) {
          descricao += ` (${extratosRepetidos.length})`;
        }

        const hashSaida = crypto
          .createHash("md5")
          .update(
            objectToStringLine({
              id_conta_bancaria,
              valor: -valor,
              data_deposito: data_pagamento,
              id_user: user.id,
              tipo_transacao: "DEBIT",
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
            hashSaida,
            hashSaida,
            data_pagamento,
            "DEBIT",
            -valor,
            descricao,
            user.id,
          ]
        );

        await updateSaldoContaBancaria({
          body: {
            id_conta_bancaria,
            valor: -valor,
            conn,
          },
        });
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function pagarFatura({ user, conn, fatura, data_pagamento, obs }) {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowFaturaBanco] = await conn.execute(
        `
                SELECT status FROM fin_cartoes_corporativos_faturas WHERE id = ?
            `,
        [fatura.id_vencimento]
      );
      const faturaBanco = rowFaturaBanco && rowFaturaBanco[0];
      //* Verificando a existencia do fatura
      if (!faturaBanco) {
        throw new Error(`Fatura não encontrada no sistema`);
      }
      //* Verificando se o status do fatura é pago
      if (faturaBanco.status === "pago") {
        resolve(true);
        return;
      }
      const pago = !!fatura.tipo_baixa;

      await conn.execute(
        `UPDATE fin_cartoes_corporativos_faturas 
                SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, valor = ?, status = ?, obs = ? WHERE id = ?`,
        [
          pago ? new Date(data_pagamento) : null,
          fatura.tipo_baixa || null,
          fatura.valor_pago || null,
          fatura.valor_total,
          pago ? "pago" : "pendente",
          pago ? obs || "PAGAMENTO REALIZADO MANUALMENTE" : null,
          fatura.id_vencimento,
        ]
      );

      //* Realiza a atualização manual do status de remessa
      await conn.execute(
        `
                UPDATE fin_cp_bordero_itens
                SET remessa = 0
                WHERE id_fatura = ?
              `,
        [fatura.id_vencimento]
      );

      // Obtemos todos os vencimentos da fatura;
      const [vencimentosFatura] = await conn.execute(
        `SELECT DISTINCT tv.*
                FROM fin_cp_titulos_vencimentos tv
                INNER JOIN fin_cartoes_corporativos_faturas ccf ON ccf.id = tv.id_fatura
                INNER JOIN fin_cp_titulos t ON t.id = tv.id_titulo
                WHERE
                    t.id_status >= 3
                    AND ccf.id = ?
                `,
        [fatura.id_vencimento]
      );

      // * PAGAMENTO DOS VENCIMENTOS DA FATURA:
      await Promise.all(
        vencimentosFatura.map((vencimento) =>
          pagarVencimento({
            user,
            conn,
            vencimento: {
              ...vencimento,
              id_vencimento: vencimento.id,
              valor_pago: vencimento.valor,
              valor_total: vencimento.valor,
              tipo_baixa: "PADRÃO",
              obs: obs || "PAGAMENTO REALIZADO MANUALMENTE",
            },
            data_pagamento,
            obs: obs || "PAGAMENTO REALIZADO MANUALMENTE",
          })
        )
      );
      // console.log({ vencimentosFatura });

      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

function pagamentoItens(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const user = req.user;
      const { itens, data_pagamento, id_bordero } = req.body;

      conn = await db.getConnection();
      if (!data_pagamento) {
        throw new Error("Data pagamento não informada!");
      }

      await conn.beginTransaction();

      const vencimentos = itens.filter((item) => item.tipo === "vencimento");
      const faturas = itens.filter((item) => item.tipo === "fatura");
      const vencimentos_dinheiro = itens.filter(
        (item) => item.tipo === "vencimento" && item.forma_pagamento === "Dinheiro"
      );

      // * REGISTRO DE TRANSAÇÕES TESOURARIA
      await registrarTransacoesTesouraria({
        user,
        conn,
        vencimentos: vencimentos_dinheiro,
        id_bordero,
      });

      // * PAGAMENTO DOS VENCIMENTOS
      await Promise.all(
        vencimentos.map((vencimento) => pagarVencimento({ user, conn, vencimento, data_pagamento }))
      );

      // * PAGAMENTO DAS FATURAS
      await Promise.all(
        faturas.map((fatura) => pagarFatura({ user, conn, fatura, data_pagamento }))
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "PAGAMENTO_ITENS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

module.exports = {
  pagarVencimento,
  pagarFatura,
  pagamentoItens,
};

const { formatDate } = require("date-fns");
const { logger } = require("../../../../../logger");
const { normalizeFirstAndLastName } = require("../../../../helpers/mask");
const { db } = require("../../../../../mysql");

module.exports = function conciliacaoTarifas(req) {
  return new Promise(async (resolve, reject) => {
    const { tarifas, data_transacao, id_conta_bancaria } = req.body;
    if (!id_conta_bancaria) {
      throw new Error("A conta bancária não foi informada!");
    }
    if (!data_transacao) {
      throw new Error("A data de transação não foi informada!");
    }
    let conn;
    try {
      conn = await db.getConnection();
      const result = [];

      //* Query para conseguir um id_bordero com os dados fornecidos
      const [rowBorderos] = await conn.execute(
        `
        SELECT id 
        FROM fin_cp_bordero
        WHERE 
        id_conta_bancaria = ? 
        AND data_pagamento = ?
        `,
        [id_conta_bancaria, new Date(data_transacao)]
      );

      if (rowBorderos.length > 1) {
        throw new Error("Há mais de um borderô com esses dados");
      }

      const bordero = rowBorderos && rowBorderos[0];

      //* Query para conseguir alguns dados
      const [rowDadosSolicitacao] = await conn.execute(
        `
        SELECT cb.id_filial, cb.id_banco, fb.id_fornecedor, f.id_grupo_economico, f.nome as filial, forn.nome as fornecedor 
        FROM fin_contas_bancarias cb
        LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
        LEFT JOIN filiais f ON f.id = cb.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = fb.id_fornecedor
        WHERE cb.id = ?
        `,
        [id_conta_bancaria]
      );
      const dadosSolicitacao = rowDadosSolicitacao && rowDadosSolicitacao[0];

      for (const tarifa of tarifas) {
        await conn.beginTransaction();
        // ^ Para cada tarifa terá uma transação, pois se o lançamento de uma der errado, o rollBack da tarifa será acionado!
        try {
          const [rowTarifasDuplicadas] = await conn.execute(
            `
            SELECT id 
            FROM fin_cp_titulos
            WHERE id_filial = ?
            AND descricao = ?
            AND valor = ?
            AND data_emissao = ?
            `,
            [
              dadosSolicitacao.id_filial,
              tarifa.descricao,
              tarifa.valor,
              formatDate(tarifa.data_transacao, "yyyy-MM-dd"),
            ]
          );
          //* Verifica a existência da tarifa nas solicitações
          if (rowTarifasDuplicadas.length > 0) {
            throw new Error(
              `A tarifa de id transação ${tarifa.id_transacao} já foi lançada em solicitações`
            );
          }

          //* Coleta o plano de contas e o centro de custo da tarifa
          const [rowDadosTarifaPadrao] = await conn.execute(
            `
            SELECT id_centro_custo, id_plano_contas FROM fin_tarifas_padrao WHERE descricao = ? AND id_grupo_economico = ?
            `,
            [tarifa.descricao, dadosSolicitacao.id_grupo_economico]
          );
          if (rowDadosTarifaPadrao.length > 1) {
            throw new Error(
              `Aparentemente essa é uma tarifa duplicada, isso não era para ocorrer, contate o time de desenvolvimento`
            );
          }
          const dadosTarifaPadrao = rowDadosTarifaPadrao && rowDadosTarifaPadrao[0];
          if (!dadosTarifaPadrao) {
            throw new Error(`A tarifa não foi encontrada no cadastro de tarifas padrão`);
          }

          //* Criação da solicitação
          const [resultInsertTitulo] = await conn.execute(
            `
            INSERT INTO fin_cp_titulos
            (id_status, data_emissao, valor, id_fornecedor, id_filial, id_solicitante, id_tipo_solicitacao, id_banco, id_departamento, id_forma_pagamento, num_doc, descricao)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              5, //id_status
              new Date(tarifa.data_transacao), //data_emissao
              tarifa.valor, //valor
              dadosSolicitacao.id_fornecedor, // id_fornecedor
              dadosSolicitacao.id_filial, // id_filial
              req.user.id, //id_solicitante
              3, //id_tipo_solicitacao
              dadosSolicitacao.id_banco, // id_banco
              4, //id_departamento
              2, //id_forma_pagamento
              tarifa.doc, // num_doc
              tarifa.descricao, // descricao
            ]
          );
          const idTitulo = resultInsertTitulo.insertId;

          //* Criação do histórico
          const historico = `PAGO POR: ${normalizeFirstAndLastName(
            req.user.nome
          )}. AUTOMATICAMENTE POR LANÇAMENTO DE TARIFAS\n`;
          await conn.execute(
            `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
            [idTitulo, historico]
          );

          //* Criação do vencimento
          const [resultInsertVencimento] = await conn.execute(
            `
            INSERT INTO fin_cp_titulos_vencimentos
            (id_titulo, data_vencimento, data_prevista, data_pagamento, valor, valor_pago, tipo_baixa, status, obs)
            VALUES (?,?,?,?,?,?,?,?,?)
            `,
            [
              idTitulo, // id_titulo
              new Date(tarifa.data_transacao), // data_vencimento
              new Date(tarifa.data_transacao), // data_prevista
              new Date(tarifa.data_transacao), // data_pagamento
              tarifa.valor, // valor
              tarifa.valor, // valor_pago
              "PADRÃO", // tipo_baixa
              "pago", // status
              "PAGO AUTOMATICAMENTE PELA CONCILIAÇÃO", // obs
            ]
          );
          const idVencimento = resultInsertVencimento.insertId;

          //* Criação do item rateio
          await conn.execute(
            `
            INSERT INTO fin_cp_titulos_rateio (id_titulo, id_filial, id_centro_custo, id_plano_conta, valor, percentual)
            VALUES (?,?,?,?,?,?)`,
            [
              idTitulo, //id_titulo
              dadosSolicitacao.id_filial, // id_filial
              dadosTarifaPadrao.id_centro_custo, //id_centro_custo
              dadosTarifaPadrao.id_plano_contas, //id_plano_contas
              tarifa.valor, //valor
              1.0, //percentual
            ]
          );

          //* Adiciona o vencimento a um borderô existente ou novo
          if (bordero && bordero.id) {
            await conn.execute(
              `
              INSERT INTO fin_cp_bordero_itens (id_bordero, id_vencimento)
              VALUES (?,?)`,
              [bordero.id, idVencimento]
            );
          } else {
            const [resultInsertBordero] = await conn.execute(
              `
              INSERT INTO fin_cp_bordero (id_conta_bancaria, data_pagamento) VALUES (?,?)
              `,
              [id_conta_bancaria, new Date(data_transacao)]
            );
            const idBordero = resultInsertBordero.insertId;
            await conn.execute(
              `
              INSERT INTO fin_cp_bordero_itens (id_bordero, id_vencimento)
              VALUES (?,?)`,
              [idBordero, idVencimento]
            );
          }

          //* Conciliação automática
          const [resultConciliacao] = await conn.execute(
            `INSERT INTO fin_conciliacao_bancaria (id_user, tipo, id_conta_bancaria) VALUES (?, ?, ?);`,
            [req.user.id, "AUTOMATICA", id_conta_bancaria]
          );
          const newIdConciliacao = resultConciliacao.insertId;
          if (!newIdConciliacao) {
            throw new Error("Falha ao inserir a conciliação!");
          }

          //* Adiciona a conciliação da tarifa (transaçao)
          await conn.execute(
            `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?);`,
            [newIdConciliacao, tarifa.id, tarifa.valor, "transacao"]
          );

          //* Adiciona o vencimento nos itens da conciliação bancária
          await conn.execute(
            `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?)`,
            [newIdConciliacao, idVencimento, tarifa.valor, "pagamento"]
          );
          await conn.commit();
          result.push({
            id_titulo: idTitulo,
            fornecedor: dadosSolicitacao.fornecedor,
            filia: dadosSolicitacao.filial,
            data_pagamento: formatDate(tarifa.data_transacao, "dd/MM/yyyy"),
            valor: tarifa.valor,
            id_transacao: tarifa.id_transacao,
            descricao: tarifa.descricao,
            doc: tarifa.doc,
            conciliado: true,
          });
        } catch (errorTarifa) {
          logger.error({
            module: "FINANCEIRO",
            origin: "CONCILIACAO_BANCARIA_CP",
            method: "LANÇAMENTO TARIFA INDIVIDIAL",
            data: {
              message: errorTarifa.message,
              stack: errorTarifa.stack,
              name: errorTarifa.name,
            },
          });
          await conn.rollback();
          result.push({
            data_pagamento: formatDate(tarifa.data_transacao, "dd/MM/yyyy"),
            valor: tarifa.valor,
            id_transacao: tarifa.id_transacao,
            descricao: tarifa.descricao,
            doc: tarifa.doc,
            conciliado: false,
            error: errorTarifa.message,
          });
        }
      }
      resolve(result);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CP",
        method: "LANÇAMENTO TARIFAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};

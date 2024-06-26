const { addMonths, formatDate } = require("date-fns");
const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters } = req.query;
    const { id_conta_bancaria, range_data } = filters || {};
    let whereTransacao = ` WHERE 1=1 `;
    let whereTitulo = ` WHERE 1=1 `;
    let whereTituloConciliado = ` WHERE 1=1 `;
    const params = [];

    if (id_conta_bancaria) {
      whereTransacao += ` AND eb.id_conta_bancaria = ? `;
      whereTitulo += ` AND b.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
    }

    if (range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        whereTransacao += ` AND eb.data_transacao BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
        whereTitulo += ` AND tv.data_prevista BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
        whereTituloConciliado += ` AND tv.data_pagamento BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
      } else {
        if (data_de) {
          whereTransacao += ` AND eb.data_transacao = '${
            data_de.split("T")[0]
          }' `;
          whereTitulo += ` AND tv.data_prevista = '${data_de.split("T")[0]}' `;
          whereTituloConciliado += ` AND tv.data_pagamento = '${
            data_de.split("T")[0]
          }' `;
        }
        if (data_ate) {
          whereTransacao += ` AND eb.data_transacao = '${
            data_ate.split("T")[0]
          }' `;
          whereTitulo += ` AND tv.data_prevista = '${data_ate.split("T")[0]}' `;
          whereTituloConciliado += ` AND tv.data_pagamento = '${
            data_ate.split("T")[0]
          }' `;
        }
      }
    }

    const conn = await db.getConnection();

    try {
      if (!id_conta_bancaria || !range_data.to || !range_data.from) {
        resolve([]);
      }
      const [rowsTitulosConciliar] = await conn.execute(
        `
      SELECT
          tv.id_titulo, tv.id as id_vencimento, tv.valor_pago as valor, t.descricao, t.num_doc,
          forn.nome as nome_fornecedor,
          f.nome as filial,
          tv.data_prevista as data_pagamento
      FROM fin_cp_titulos t
      LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
      LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
      LEFT JOIN filiais f ON f.id = t.id_filial
      LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
      LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
      LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_cp = tv.id

      ${whereTitulo}
      AND tv.status = "pago"
      AND NOT b.data_pagamento IS NULL
      AND cbi.id IS NULL
      ORDER BY tv.data_prevista DESC
    `,
        params
      );

      const [rowsTransacoesConciliar] = await conn.execute(
        `
      SELECT
          eb.id, eb.id_transacao, eb.documento as doc,
          ABS(eb.valor) as valor, eb.data_transacao, eb.descricao
      FROM fin_extratos_bancarios eb
      LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_extrato = eb.id

      ${whereTransacao}
      AND tipo_transacao = 'DEBIT'
      AND cbi.id IS NULL
      ORDER BY id
    `,
        params
      );

      const [rowsTitulosConciliados] = await conn.execute(
        `
        SELECT
          cbi.id_conciliacao,
          t.id as id_titulo, tv.id as id_vencimento, tv.valor_pago as valor, t.descricao, t.num_doc,
          forn.nome as nome_fornecedor,
          f.nome as filial,
          tv.data_prevista as data_pagamento
        FROM fin_cp_titulos t
        LEFT JOIN fin_cp_titulos_vencimentos tv ON t.id = tv.id_titulo
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_cp = tv.id
        LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero

        ${whereTituloConciliado}
        AND NOT cbi.id IS NULL
        ORDER BY tv.data_prevista DESC
      `,
        params
      );

      const [rowsTransacoesConciliadas] = await conn.execute(
        `
        SELECT
          eb.id, eb.id_transacao, eb.documento as doc,
          ABS(eb.valor) as valor, eb.data_transacao, eb.descricao,
          cbi.id_conciliacao
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_extrato = eb.id

        ${whereTransacao}
        AND tipo_transacao = 'DEBIT'
        AND NOT cbi.id IS NULL
        ORDER BY eb.data_transacao DESC
    `,
        params
      );

      const objResponse = {
        titulosConciliados: rowsTitulosConciliados,
        titulosConciliar: rowsTitulosConciliar,
        transacoesConciliadas: rowsTransacoesConciliadas,
        transacoesConciliar: rowsTransacoesConciliar,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getConciliacoes(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { id_conta_bancaria, range_data } = filters || {};
    let where = ` WHERE 1=1 `;
    const params = [];

    if (id_conta_bancaria) {
      where += ` AND cb.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
    }

    if (range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND cb.created_at BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND cb.created_at = '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND cb.created_at = '${data_ate.split("T")[0]}' `;
        }
      }
    }

    const conn = await db.getConnection();
    const offset = pageIndex * pageSize;

    params.push(pageSize);
    params.push(offset);
    try {
      if (!id_conta_bancaria || !range_data.to || !range_data.from) {
        resolve([]);
      }
      const [rowsConciliacoes] = await conn.execute(
        `
        SELECT 
          cb.id, u.nome as responsavel, cb.created_at as data_conciliacao, cb.tipo,
          (
            SELECT SUM(tv.valor_pago)
            FROM fin_cp_titulos_vencimentos tv
            INNER JOIN fin_conciliacao_bancaria_itens cbip ON cbip.id_cp = tv.id 
            WHERE cbip.id_conciliacao = cb.id
          ) as valor_pagamentos,
          (
            SELECT SUM(ABS(eb.valor))
            FROM fin_extratos_bancarios eb
            INNER JOIN fin_conciliacao_bancaria_itens cbit ON cbit.id_extrato = eb.id 
            WHERE cbit.id_conciliacao = cb.id
          ) as valor_transacoes
        FROM fin_conciliacao_bancaria cb
        LEFT JOIN users u ON u.id = cb.id_user

        ${where}
        AND cb.modulo = "CP"
        LIMIT ? OFFSET ?
    `,
        params
      );

      resolve(rowsConciliacoes);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "GET_CONCILIACOES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowConciliacao] = await conn.execute(
        `
        SELECT 
          u.nome as responsavel, cb.created_at as data_conciliacao, cb.tipo
        FROM fin_conciliacao_bancaria cb
        LEFT JOIN users u ON u.id = cb.id_user
        WHERE cb.id = ?
      `,
        [id]
      );
      const conciliacao = rowConciliacao && rowConciliacao[0];
      if (!conciliacao) {
        throw new Error("Conciliação não encontrada!");
      }
      const [rowVencimentos] = await conn.execute(
        `
          SELECT
            tv.id as id_vencimento, tv.id_titulo, tv.valor_pago, tv.tipo_baixa,
            t.descricao, forn.nome as nome_fornecedor,
            f.nome as filial,
            tv.data_prevista as data_pagamento
          FROM fin_cp_titulos t
          LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_cp = tv.id
          WHERE cbi.id_conciliacao = ?
            `,
        [id]
      );
      const [rowTransacoes] = await conn.execute(
        `
          SELECT
            eb.id_transacao, ABS(eb.valor) as valor, eb.descricao,
            eb.documento as doc, eb.data_transacao
          FROM fin_extratos_bancarios eb
          LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_extrato = eb.id
          WHERE cbi.id_conciliacao = ?
            `,
        [id]
      );

      const objResponse = {
        id,
        data_conciliacao: conciliacao.data_conciliacao,
        tipo: conciliacao.tipo,
        responsavel: conciliacao.responsavel,
        vencimentos: rowVencimentos,
        transacoes: rowTransacoes,
      };
      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, vencimentos, transacoes, data_pagamento, id_conta_bancaria } =
      req.body;

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!id_conta_bancaria) {
        throw new Error("É necessário informar uma conta bancária!");
      }
      const vencimentosSoma = vencimentos.reduce(
        (acc, item) => acc + +item.valor_pago,
        0
      );
      const transacoesSoma = transacoes.reduce(
        (acc, item) => acc + +item.valor,
        0
      );
      // ^ Verificando os valores de títulos e transações batem
      if (vencimentosSoma !== transacoesSoma) {
        throw new Error("A soma dos vencimentos e das transações não batem!");
      }
      await conn.beginTransaction();

      // ^ Realiza a conciliação do tipo MANUAL
      const [result] = await conn.execute(
        `INSERT INTO fin_conciliacao_bancaria (id_user, tipo, id_conta_bancaria) VALUES (?, ?, ?);`,
        [req.user.id, "MANUAL", id_conta_bancaria]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir a conciliação!");
      }

      // ^ Adiciona todas as transações nos itens da conciliação bancária
      for (const transacao of transacoes) {
        await conn.execute(
          `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_extrato, valor) VALUES (?, ?, ?);`,
          [newId, transacao.id, transacao.valor]
        );
      }

      for (const vencimento of vencimentos) {
        // ^ Adiciona o título nos itens da conciliação bancária
        await conn.execute(
          `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_cp, valor) VALUES (?,?,?)`,
          [newId, vencimento.id_vencimento, vencimento.valor_pago]
        );
      }

      await conn.commit();
      // await conn.rollback();

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "INSERT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function conciliacaoAutomatica(req) {
  return new Promise(async (resolve, reject) => {
    let { vencimentos, transacoes, id_conta_bancaria } = req.body;
    const conn = await db.getConnection();
    try {
      if (!id_conta_bancaria) {
        throw new Error("A conta bancária não foi informada!");
      }
      await conn.beginTransaction();
      const result = [];
      const vencimentosLength = vencimentos.length;
      for (let v = 0; v < vencimentosLength; v++) {
        const vencimento = vencimentos[v];
        // console.log(vencimento);
        let obj = {
          "ID TÍTULO": vencimento.id_titulo,
          "DESCRIÇÃO TÍTULO": vencimento.descricao,
          FORNECEDOR: vencimento.nome_fornecedor,
          FILIAL: vencimento.filial,
          CONCILIADO: "NÃO",
        };

        let indexTransacaoConciliada = -1;
        const transacoesLength = transacoes.length;
        for (let t = 0; t < transacoesLength; t++) {
          const transacao = transacoes[t];
          if (
            formatDate(vencimento.data_pagamento, "dd-MM-yyyy").toString() ==
              formatDate(transacao.data_transacao, "dd-MM-yyyy").toString() &&
            vencimento.valor == transacao.valor
          ) {
            //^ UPDATE do Vencimento
            const [result] = await conn.execute(
              `INSERT INTO fin_conciliacao_bancaria (id_user, tipo, id_conta_bancaria) VALUES (?, ?, ?);`,
              [req.user.id, "AUTOMATICA", id_conta_bancaria]
            );
            const newId = result.insertId;
            if (!newId) {
              throw new Error("Falha ao inserir a conciliação!");
            }

            //^ INSERT registro conciliação item TRANSAÇÃO
            await conn.execute(
              `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_extrato, valor) VALUES (?, ?, ?);`,
              [newId, transacao.id, transacao.valor]
            );

            // ^ Adiciona o título nos itens da conciliação bancária
            await conn.execute(
              `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_cp, valor) VALUES (?,?,?)`,
              [newId, vencimento.id_vencimento, vencimento.valor]
            );

            obj = {
              ...obj,
              "DATA PAGAMENTO": formatDate(
                transacao.data_transacao,
                "dd/MM/yyyy"
              ),
              "VALOR PAGO": transacao.valor,
              "ID TRANSAÇÃO": transacao.id_transacao,
              "DESCRIÇÃO TRANSAÇÃO": transacao.descricao,
              DOC: transacao.doc,
              CONCILIADO: "SIM",
            };
            indexTransacaoConciliada = t;
            break;
          }
        }
        // Verificar se é diferente de -1
        if (indexTransacaoConciliada !== -1) {
          transacoes = transacoes.filter(
            (_, index) => index !== indexTransacaoConciliada
          );
        }
        result.push(obj);
      }

      await conn.commit();
      resolve(result);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "AUTOMATICA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function deleteConciliacao(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.beginTransaction();
      const [rowVencimentos] = await conn.execute(
        `
          SELECT id, valor FROM fin_cp_titulos_vencimentos
          WHERE id IN (SELECT id_cp
          FROM fin_conciliacao_bancaria_itens
          WHERE id_conciliacao = ?
          AND NOT id_cp IS NULL)
      `,
        [id]
      );
      if (rowVencimentos.length === 0) {
        throw new Error("Falha ao desfazer a conciliação!");
      }

      //* Deleta a conciliação bancária
      await conn.execute(
        `DELETE FROM fin_conciliacao_bancaria WHERE id = ? LIMIT 1`,
        [id]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "DELETE_CONCILIACAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getConciliacoes,
  getOne,
  insertOne,
  conciliacaoAutomatica,
  deleteConciliacao,
};

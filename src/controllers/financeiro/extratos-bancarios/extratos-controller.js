const path = require("path");
const { db } = require("../../../../mysql");
const { normalizeCnpjNumber } = require("../../../helpers/mask");
const { logger } = require("../../../../logger");
const importExtratoOFX = require("./importExtratoOFX");
const importExtratoCNAB240 = require("./importExtratoCNAB240");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    // console.log(req.query)
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { id_conta_bancaria, mes, ano } = filters || {};

    let where = ` WHERE 1=1 `;
    const params = [];
    let limit = "";
    let offset = 0;
    const conn = await db.getConnection();
    try {
      if (pagination) {
        limit = " LIMIT ? OFFSET ? ";
        offset = pageIndex * pageSize;
      }

      if (id_conta_bancaria) {
        where += ` AND e.id_conta_bancaria = ? `;
        params.push(id_conta_bancaria);
      }

      if (mes) {
        where += ` AND MONTH(e.data_transacao) = ? `;
        params.push(mes);
      }

      if (ano) {
        where += ` AND YEAR(e.data_transacao) = ? `;
        params.push(ano);
      }

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde FROM fin_extratos_bancarios e ${where} `,
        params
      );

      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }

      const query = `
        SELECT
          e.*, u.nome as nome_user
        FROM fin_extratos_bancarios e
        LEFT JOIN users u ON u.id = e.id_user

        ${where}
        ORDER BY e.id DESC
        ${limit}
      `;

      const [rows] = await conn.execute(query, params);

      const [dataChartTransacoes] = await conn.execute(
        `
      SELECT
          e.data_transacao, 
          COUNT(e.id) as 'Transações',
          SUM(CASE WHEN e.tipo_transacao = 'DEBIT' THEN e.valor ELSE 0 END) as 'Débito',
          SUM(CASE WHEN e.tipo_transacao = 'CREDIT' THEN e.valor ELSE 0 END) as 'Crédito'

        FROM fin_extratos_bancarios e
        ${where}
        GROUP BY e.data_transacao
        ORDER BY e.data_transacao ASC
      `,
        params
      );

      const objResponse = {
        rows: rows,
        dataChartTransacoes: dataChartTransacoes,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS BANCÁRIOS",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
}

function getAllTransacaoPadrao(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { id_conta_bancaria } = req.query;

    let where = ` WHERE 1=1 `;
    const params = [];

    const conn = await db.getConnection();
    try {
      if (id_conta_bancaria) {
        where += ` AND e.id_conta_bancaria = ? `;
        params.push(id_conta_bancaria);
      }

      const query = `
        SELECT
          e.*
        FROM fin_extratos_padroes e

        ${where}
        ORDER BY e.id DESC
      `;

      const [rows] = await conn.execute(query, params);

      const objResponse = {
        rows: rows,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS BANCÁRIOS",
        method: "GET_ALL_TRANSACAO_PADRAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    try {
      const [rowPlanoContas] = await db.execute(
        `
            SELECT 
              b.id, b.data_pagamento, b.id_conta_bancaria, 
              cb.descricao as conta_bancaria, f.id_matriz, fb.nome as banco
            FROM fin_extratos_bancarios b
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_bordero = b.id
            LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
            LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            LEFT JOIN filiais f ON f.id = cb.id_filial
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            WHERE b.id = ?
            `,
        [id]
      );
      const [rowTitulos] = await db.execute(
        `
            SELECT 
              tb.id_titulo, 
              t.id_status, 
              t.valor as valor_total, 
              t.descricao, 
              t.num_doc,
              t.data_prevista as previsao, 
              t.data_pagamento, 
              f.nome as nome_fornecedor, 
              t.data_emissao, 
              t.data_vencimento,
              c.nome as centro_custo,
              st.status,
              b.data_pagamento, 
              b.id_conta_bancaria, 
              f.cnpj,
              fi.nome as filial, 
              false AS checked
            FROM fin_extratos_bancarios b
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_bordero = b.id
            LEFT JOIN fin_cp_titulos t ON t.id = tb.id_titulo
            LEFT JOIN fin_cp_status st ON st.id = t.id_status
            LEFT JOIN fin_fornecedores f ON f.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            LEFT JOIN filiais fi ON fi.id = t.id_filial
            LEFT JOIN fin_centros_custo c ON c.id = t.id_centro_custo
            WHERE b.id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];

      const objResponse = {
        ...planoContas,
        titulos: rowTitulos,
      };
      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS BANCÁRIOS",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    }
  });
}

function importarExtrato(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { id_conta_bancaria, tipo_extrato } = req.body;
    const conn = await db.getConnection();
    try {
      if (!id_conta_bancaria) {
        throw new Error("Conta bancária não selecionada!");
      }
      if (!tipo_extrato) {
        throw new Error("Tipo de extrato não informado!");
      }
      if (!req.file.path) {
        throw new Error("Extrato não enviado!");
      }
      await conn.beginTransaction();

      const [rowContaBancaria] = await conn.execute(
        `SELECT * FROM fin_contas_bancarias WHERE id = ?;`,
        [id_conta_bancaria]
      );
      const contaBancaria = rowContaBancaria && rowContaBancaria[0];

      const filePath = path.join(process.cwd(), req.file.path);
      if (tipo_extrato === "ofx") {
        await importExtratoOFX({
          body: {
            filePath,
            conn_externa: conn,
            contaBancaria,
            user,
          },
        });
      }
      if (tipo_extrato === "cnab") {
        await importExtratoCNAB240({
          body: {
            filePath,
            conn_externa: conn,
            contaBancaria,
            user,
          },
        });
      }
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS BANCÁRIOS",
        method: "IMPORT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function insertOneTransacaoPadrao(req) {
  return new Promise(async (resolve, reject) => {
    const { id_conta_bancaria, descricao, tipo_transacao } = req.body;
    const conn = await db.getConnection();
    try {
      if (!id_conta_bancaria) {
        throw new Error("ID Conta bancária não informado");
      }
      if (!descricao || descricao.length === 0) {
        throw new Error("Campo Descrição não informado");
      }
      if (!tipo_transacao) {
        throw new Error("Campo Tipo Transação não informado");
      }

      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO fin_extratos_padroes (id_conta_bancaria, tipo_transacao, descricao) VALUES (?,?,?);`,
        [id_conta_bancaria, tipo_transacao, descricao]
      );

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS BANCÁRIOS",
        method: "INSERT_ONE_TRANSACAO_PADRAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function updateTransacaoPadrao(req) {
  return new Promise(async (resolve, reject) => {
    const { id_padrao, id_conta_bancaria, descricao, tipo_transacao } = req.body;
    const conn = await db.getConnection();
    try {
      if (!id_padrao) {
        throw new Error("ID do padrão não informado");
      }
      if (!id_conta_bancaria) {
        throw new Error("ID Conta bancária não informado");
      }
      if (!descricao || descricao.length === 0) {
        throw new Error("Campo Descrição não informado");
      }
      if (!tipo_transacao) {
        throw new Error("Campo Tipo Transação não informado");
      }

      await conn.beginTransaction();

      await conn.execute(
        `UPDATE fin_extratos_padroes SET tipo_transacao=?, descricao=? WHERE id=?;`,
        [tipo_transacao, descricao, id_padrao]
      );

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS BANCÁRIOS",
        method: "UPDATE_TRANSACAO_PADRAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function deleteTransacaoPadrao(req) {
  return new Promise(async (resolve, reject) => {
    const { id_padrao } = req.query;

    const conn = await db.getConnection();
    try {
      if (!id_padrao) {
        throw new Error("ID não informado!");
      }

      await conn.beginTransaction();

      await conn.execute(`DELETE FROM fin_extratos_padroes WHERE id = ? `, [id_padrao]);

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS BANCÁRIOS",
        method: "DELETE_TRANSACAO_PADRAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// ! refatorar para extratos
async function exportBorderos(req) {
  return new Promise(async (resolve, reject) => {
    const { data: borderos } = req.body;
    const titulosBordero = [];
    try {
      if (!borderos.length) {
        throw new Error("Quantidade inválida de de borderos!");
      }

      for (const b_id of borderos) {
        const response = await getOne({ params: { id: b_id } });
        response.titulos.forEach((titulo) => {
          const normalizeDate = (data) => {
            const date = new Date(data);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const formattedDay = String(day).padStart(2, "0");
            const formattedMonth = String(month).padStart(2, "0");
            return `${formattedDay}/${formattedMonth}/${year}`;
          };

          titulosBordero.push({
            IDPG: titulo.id_titulo || "",
            PAGAMENTO: titulo.data_pagamento ? normalizeDate(titulo.data_pagamento) : "",
            EMISSÃO: titulo.data_emissao ? normalizeDate(titulo.data_emissao) : "",
            VENCIMENTO: titulo.data_vencimento ? normalizeDate(titulo.data_vencimento) : "",
            FILIAL: titulo.filial || "",
            "CPF/CNPJ": titulo.cnpj ? normalizeCnpjNumber(titulo.cnpj) : "",
            FORNECEDOR: titulo.nome_fornecedor || "",
            "Nº DOC": titulo.num_doc || "",
            DESCRIÇÃO: titulo.descricao || "",
            VALOR: parseFloat(titulo.valor_total && titulo.valor_total.toString()) || "",
            "CENTRO CUSTO": titulo.centro_custo || "",

            "CONTA BANCÁRIA": response.conta_bancaria || "",
            BANCO: response.banco || "",
            PREVISÃO: normalizeDate(titulo.previsao) || "",
            STATUS: titulo.status || "",
          });
        });
      }

      resolve(titulosBordero);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS BANCÁRIOS",
        method: "EXPORT_BORDERO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getAllTransacaoPadrao,
  getOne,
  insertOneTransacaoPadrao,
  importarExtrato,
  updateTransacaoPadrao,
  deleteTransacaoPadrao,
  exportBorderos,
};

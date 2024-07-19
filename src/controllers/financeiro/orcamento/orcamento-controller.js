const { startOfDay, formatDate } = require("date-fns");
const { db } = require("../../../../mysql");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");
const { normalizeCurrency } = require("../../../helpers/mask");
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
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { termo } = filters || {};
    var where = ` WHERE 1=1 `;
    const params = [];

    if (termo) {
      where += ` AND ge.nome LIKE CONCAT(?,'%')`;
      params.push(termo);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();

    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(fo.id) as qtde  
            FROM fin_orcamento fo
            LEFT JOIN grupos_economicos ge ON fo.id_grupo_economico = ge.id
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT fo.*, ge.apelido as grupo_economico FROM fin_orcamento fo
            LEFT JOIN grupos_economicos ge ON fo.id_grupo_economico = ge.id
            ${where}
            ORDER BY fo.ref DESC
            LIMIT ? OFFSET ?
            `;

      const [rows] = await conn.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "GET_ALL",
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
    const { id, mes, ano, termo } = req.params;
    const conn = await db.getConnection();

    try {
      const [rowOrcamento] = await conn.execute(
        `
      SELECT 
        fo.id, fo.id_grupo_economico, fo.ref, fo.active,
        ge.apelido as grupo_economico,
        ge.id_matriz
      FROM fin_orcamento fo
      LEFT JOIN grupos_economicos ge ON ge.id = fo.id_grupo_economico
      WHERE fo.id = ?
            `,
        [id]
      );

      var where = ` WHERE 1=1 `;
      const params = [];

      if (mes && ano) {
        where += ` AND fo.ref = ? `;
        params.push(`${ano}-${("0" + `${mes}`).slice(-2)}-01`);
      }
      if (termo) {
        where += ` AND foc.id_centro_custo LIKE CONCAT(?,'%') 
                    OR CONCAT(fpc.codigo," - ",fpc.descricao) LIKE CONCAT('%',?,'%') `;
        params.push(termo);
        params.push(termo);
      }
      if (id) {
        where += ` AND fo.id = ? `;
        params.push(id);
      }

      const [rowOrcamentoItens] = await conn.execute(
        `
        SELECT 
          FALSE as checked,   
          foc.active,
          foc.active as active_inicial, 
          foc.id as id_conta,
          foc.id_centro_custo, foc.id_plano_contas,
          fcc.nome as centro_custo, 
          CONCAT(fpc.codigo," - ",fpc.descricao) as plano_contas, 
          foc.valor_previsto as valor,
          foc.valor_previsto as valor_inicial,
          COALESCE((SELECT sum(valor) FROM fin_orcamento_consumo tb_consumo WHERE tb_consumo.active = true AND tb_consumo.id_orcamento_conta = foc.id), 0) as realizado,
          foc.valor_previsto - COALESCE((SELECT sum(valor) FROM fin_orcamento_consumo tb_consumo WHERE tb_consumo.active = true AND tb_consumo.id_orcamento_conta = foc.id), 0) as saldo 
        FROM fin_orcamento_contas foc
        LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
        LEFT JOIN fin_orcamento as fo ON fo.id = foc.id_orcamento
        ${where}
        GROUP BY foc.id
            `,
        params
      );

      const orcamento = rowOrcamento && rowOrcamento[0];
      resolve({ ...orcamento, contas: rowOrcamentoItens });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
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

function findAccountFromParams(req) {
  return new Promise(async (resolve, reject) => {
    const { id_grupo_economico, id_centro_custo, id_plano_conta, data_titulo } =
      req.query;

    const conn = await db.getConnection();

    try {
      if (!id_grupo_economico) {
        throw new Error("ID GRUPO ECONOMICO não informado!");
      }
      if (!id_centro_custo) {
        throw new Error("ID GRUPO ECONOMICO não informado!");
      }
      if (!id_plano_conta) {
        throw new Error("ID GRUPO ECONOMICO não informado!");
      }

      const [rowGrupoEconomico] = await conn.execute(
        `SELECT id, orcamento FROM grupos_economicos WHERE id = ?`,
        [id_grupo_economico]
      );
      const grupoValidaOrcamento =
        rowGrupoEconomico &&
        rowGrupoEconomico[0] &&
        !!+rowGrupoEconomico[0]["orcamento"];

      if (!grupoValidaOrcamento) {
        resolve({ grupoValidaOrcamento: false });
        return;
      }
      const params = [id_grupo_economico, id_centro_custo, id_plano_conta];
      let where = `
      fo.id_grupo_economico = ?
      AND foc.id_centro_custo = ?
      AND foc.id_plano_contas = ?
      `;
      if (data_titulo) {
        where += ` AND DATE_FORMAT(fo.ref, '%Y-%m') = ?`;
        params.push(formatDate(data_titulo, "yyyy-MM"));
      } else {
        where += ` AND DATE_FORMAT(fo.ref, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m') `;
      }

      const [rowOrcamentoItens] = await conn.execute(
        `
        SELECT 
          foc.active,
          fo.active as orcamentoAtivo,
          foc.id as id_conta,
          foc.id_centro_custo, foc.id_plano_contas,
          fcc.nome as centro_custo, 
          CONCAT(fpc.codigo," - ",fpc.descricao) as plano_contas, 
          foc.valor_previsto as valor,
          foc.valor_previsto as valor_inicial,
          COALESCE((SELECT sum(valor) FROM fin_orcamento_consumo tb_consumo WHERE tb_consumo.active = true AND tb_consumo.id_orcamento_conta = foc.id), 0) as realizado,
          foc.valor_previsto - COALESCE((SELECT sum(valor) FROM fin_orcamento_consumo tb_consumo WHERE tb_consumo.active = true AND tb_consumo.id_orcamento_conta = foc.id), 0) as saldo 
        FROM fin_orcamento_contas foc
        LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
        LEFT JOIN fin_orcamento as fo ON fo.id = foc.id_orcamento
        WHERE 
          ${where}
        GROUP BY foc.id
            `,
        params
      );
      if (!rowOrcamentoItens || rowOrcamentoItens?.length <= 0) {
        throw new Error(
          "Não existe orçamento definido para este Centro de custos e Plano de contas"
        );
      }
      const contaOrcamento = rowOrcamentoItens && rowOrcamentoItens[0];
      resolve({
        ...contaOrcamento,
        grupoValidaOrcamento,
      });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "FIND_ACCOUNT_FROM_PARAMS",
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
    const { active, id_grupo_economico, ref, contas } = req.body;
    const conn = await db.getConnection();
    try {
      if (!id_grupo_economico) {
        throw new Error("ID_GRUPO_ECONOMICO não informado!");
      }
      if (!ref) {
        throw new Error("REF não informado!");
      }
      if (!contas?.length) {
        throw new Error("CONTAS não informadas!");
      }

      await conn.beginTransaction();

      // * Update do rateio
      const [result] = await conn.execute(
        `INSERT INTO fin_orcamento (id_grupo_economico, ref, active) VALUES (?,?,?)`,
        [id_grupo_economico, ref, active]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o rateio!");
      }

      // * Inserir as contas
      for (const conta of contas) {
        await conn.execute(
          `INSERT INTO fin_orcamento_contas (id_orcamento, id_centro_custo, id_plano_contas, valor_previsto, active) VALUES(?,?,?,?,?)`,
          [
            newId,
            conta.id_centro_custo,
            conta.id_plano_contas,
            conta.valor,
            conta.active,
          ]
        );
      }

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
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

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, active, id_grupo_economico, ref, contas } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_grupo_economico) {
        throw new Error("ID_GRUPO_ECONOMICO não informado!");
      }
      if (!ref) {
        throw new Error("REF não informado!");
      }
      await conn.beginTransaction();

      // * Update do active
      await conn.execute(`UPDATE fin_orcamento SET active = ? WHERE id = ?`, [
        active,
        id,
      ]);
      // console.log(contas);
      if (contas?.length) {
        // * Insert das contas
        for (const conta of contas) {
          const {
            id_conta,
            id_centro_custo,
            id_plano_contas,
            valor,
            valor_inicial,
            active,
          } = conta;
          // console.log(
          //   id_conta,
          //   id_centro_custo,
          //   id_plano_contas,
          //   valor,
          //   valor_inicial
          // );
          if (id_conta) {
            const diferenca = valor - valor_inicial;

            const [oldRow] = await conn.execute(
              `SELECT 
                  fcc.nome as centro_custo, 
                  CONCAT(fpc.codigo, " - ", fpc.descricao) as plano_contas,
                  COALESCE((SELECT sum(valor) FROM fin_orcamento_consumo tb_consumo WHERE tb_consumo.active = true AND tb_consumo.id_orcamento_conta = foc.id), 0) as realizado
                FROM fin_orcamento_contas foc
                LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
                LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
                WHERE foc.id = ? `,
              [id_conta]
            );

            const realizado = (oldRow && oldRow[0] && oldRow[0].realizado) || 0;
            if (valor < realizado) {
              throw new Error(
                `Valor não pode ser menor que o valor realizado ${normalizeCurrency(
                  realizado
                )}!`
              );
            }

            await conn.execute(
              `UPDATE fin_orcamento_contas SET 
                      id_centro_custo = ?, 
                      id_plano_contas = ?, 
                      valor_previsto = valor_previsto + ?,
                      active = ? 
                    WHERE id = ?`,
              [id_centro_custo, id_plano_contas, diferenca, active, id_conta]
            );

            const { centro_custo, plano_contas } = oldRow && oldRow[0];
            const descricao = `ATUALIZAÇÃO -> ${centro_custo} - ${plano_contas} | ANTES: ${normalizeCurrency(
              valor_inicial
            )} | DEPOIS: ${normalizeCurrency(
              valor
            )} | DIF.: ${normalizeCurrency(diferenca)}`;
            await conn.execute(
              `
                    INSERT INTO fin_orcamento_historico (id_orcamento, id_user, descricao) VALUES (?, ?, ?)
                    `,
              [id, req.user.id, descricao]
            );
          } else {
            const [contaOrcamento] = await conn.execute(
              `
              SELECT id FROM fin_orcamento_contas WHERE id_centro_custo = ? AND id_plano_contas = ? AND id_orcamento = ?
            `,
              [id_centro_custo, id_plano_contas, id]
            );
            // console.log(contaOrcamento);
            if (!contaOrcamento.length) {
              await conn.execute(
                `INSERT INTO fin_orcamento_contas (id_orcamento, id_centro_custo, id_plano_contas, active, valor_previsto) VALUES(?,?,?,?,?)`,
                [id, id_centro_custo, id_plano_contas, active, valor]
              );
            } else {
              await conn.execute(
                `
              UPDATE fin_orcamento_contas SET active = ?, valor_previsto = ? WHERE id = ?
              `,
                [active, valor, contaOrcamento[0].id]
              );
            }
          }
        }
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function deleteItemBudget(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();

    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      await conn.beginTransaction();

      const [rowsConsumo] = await conn.execute(
        `
        SELECT id FROM fin_orcamento_consumo WHERE id_orcamento_conta = ?
      `,
        [id]
      );
      if (rowsConsumo.length > 0) {
        throw new Error(
          "Não é possível excluir um item de orçamento com consumo!"
        );
      }

      const [oldRow] = await conn.execute(
        `
        SELECT 
          fcc.nome as centro_custo, 
          CONCAT(fpc.codigo, " - ", fpc.descricao) as plano_contas, 
          foc.valor_previsto as valor,
          fo.id as id_orcamento
        FROM fin_orcamento_contas foc
        LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
        LEFT JOIN fin_orcamento as fo ON fo.id = foc.id_orcamento
        WHERE foc.id = ? `,
        [id]
      );
      await conn.execute(
        `DELETE FROM fin_orcamento_contas WHERE id = ? LIMIT 1`,
        [id]
      );
      const { id_orcamento, centro_custo, plano_contas, valor } =
        oldRow && oldRow[0];
      const descricao = `EXCLUSÃO -> ${centro_custo} - ${plano_contas} - ${normalizeCurrency(
        valor
      )}`;
      await conn.execute(
        `
        INSERT INTO fin_orcamento_historico (id_orcamento, id_user, descricao) VALUES (?, ?, ?)
        `,
        [id_orcamento, req.user.id, descricao]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "DELETE_ITEM_BUDGET",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// Acompanhamento do Orçamento
function getMyBudgets(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros]
    const { user } = req;
    const isMaster = checkUserPermission(req, "MASTER");

    const orcamentos_habilitados = [];

    user?.centros_custo?.forEach((f) => {
      orcamentos_habilitados.push(f.id_centro_custo);
    });

    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { id_grupo_economico, id_centro_custo, plano_contas, mes, ano } =
      filters || {
        mes: (new Date().getMonth() + 1).toString(),
        ano: new Date().getFullYear().toString(),
      };
    var where = ` WHERE 1=1 `;
    const params = [];

    if (!isMaster) {
      if (!orcamentos_habilitados || orcamentos_habilitados.length === 0) {
        resolve({
          rows: [],
          pageCount: 0,
          rowCount: 0,
        });
        return;
      }
      where += `AND fcc.id IN(${orcamentos_habilitados.join(",")}) `;
    }

    if (mes && ano) {
      where += ` AND fo.ref = ? `;
      params.push(`${ano}-${("0" + `${mes}`).slice(-2)}-01`);
    }
    if (id_grupo_economico) {
      where += ` AND fo.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (id_centro_custo) {
      where += ` AND foc.id_centro_custo = ? `;
      params.push(id_centro_custo);
    }
    if (plano_contas) {
      where += ` AND CONCAT(fpc.codigo," - ",fpc.descricao) LIKE CONCAT('%',?,'%') `;
      params.push(plano_contas);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();

    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(foc.id) as qtde  
            FROM fin_orcamento_contas foc
            LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
            LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
            LEFT JOIN fin_orcamento as fo ON fo.id = foc.id_orcamento
            LEFT JOIN grupos_economicos ge ON ge.id = fo.id_grupo_economico
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ?" : "";
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      var query = `
          SELECT 
            foc.*, 
            ge.id AS id_grupo_economico,
            fcc.nome AS centro_custos, 
            CONCAT(fpc.codigo, ' - ', fpc.descricao) AS plano_contas, 
            ge.apelido AS grupo_economico, 
            SUM(COALESCE(oc.valor_total, 0)) AS realizado,
            foc.valor_previsto - SUM(COALESCE(oc.valor_total, 0)) AS saldo,
            SUM(COALESCE(oc.valor_total, 0)) / foc.valor_previsto AS realizado_percentual
            FROM fin_orcamento_contas foc
          LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
          LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
          LEFT JOIN fin_orcamento AS fo ON fo.id = foc.id_orcamento
          LEFT JOIN grupos_economicos ge ON ge.id = fo.id_grupo_economico
          LEFT JOIN (
            SELECT id_orcamento_conta, SUM(valor) AS valor_total
            FROM fin_orcamento_consumo
            WHERE active = true
            GROUP BY id_orcamento_conta
          ) as oc ON oc.id_orcamento_conta = foc.id

            ${where}
            GROUP BY foc.id
            ${limit}
            `;

      const [rows] = await conn.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
        mes,
        ano,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "GET_MY_BUDGETS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getMyBudget(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowOrcamento] = await conn.execute(
        `
      SELECT 
        foc.id as id_conta_saida,
        CONCAT(fpc.codigo," - ",fpc.descricao) as conta_saida,
        foc.valor_previsto - SUM(COALESCE(oc.valor_total, 0)) AS disponivel,
        fo.id_grupo_economico,
        foc.id_orcamento,
        fcc.nome as centro_custo_entrada,
        foc.id_centro_custo
      FROM fin_orcamento_contas foc
      LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
      LEFT JOIN fin_orcamento fo ON fo.id = foc.id_orcamento
      LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
      LEFT JOIN (
        SELECT id_orcamento_conta, SUM(valor) AS valor_total
        FROM fin_orcamento_consumo
        WHERE active = true
        GROUP BY id_orcamento_conta
      ) oc ON oc.id_orcamento_conta = foc.id

      WHERE foc.id = ?
      GROUP BY foc.id
            `,
        [id]
      );

      const orcamento = rowOrcamento && rowOrcamento[0];
      resolve(orcamento);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "GET_MY_BUDGET",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function transfer(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id_conta_saida,
      id_conta_entrada,
      valor_transferido,
      id_orcamento,
      id_centro_custo_saida,
      id_centro_custo_entrada,
    } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id_conta_saida) {
        throw new Error("ID_CONTA_SAIDA não informado!");
      }
      if (!id_conta_entrada) {
        throw new Error("ID_CONTA_ENTRADA não informado!");
      }
      if (!valor_transferido) {
        throw new Error("VALOR_TRANFERIDO não informado!");
      }
      if (!id_orcamento) {
        throw new Error("ID_ORCAMENTO não informado!");
      }
      if (!id_centro_custo_entrada) {
        throw new Error("ID_CENTRO_CUSTO_ENTRADA não informados!");
      }

      await conn.beginTransaction();

      const [rowOrcamentoContaSaida] = await conn.execute(
        `SELECT 
          foc.*,
          SUM(COALESCE(oc.valor_total, 0)) AS realizado,
          foc.valor_previsto - SUM(COALESCE(oc.valor_total, 0)) AS saldo,
          fcc.nome as centro_custo, 
          CONCAT(fpc.codigo, " - ", fpc.descricao) as plano_contas
        FROM fin_orcamento_contas foc
        LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas 
        LEFT JOIN (
          SELECT id_orcamento_conta, SUM(valor) AS valor_total
          FROM fin_orcamento_consumo
          WHERE active = true
          GROUP BY id_orcamento_conta
        ) oc ON oc.id_orcamento_conta = foc.id

        WHERE foc.id = ?
        GROUP BY foc.id
        `,
        [id_conta_saida]
      );

      const contaSaida = rowOrcamentoContaSaida && rowOrcamentoContaSaida[0];
      if (!contaSaida) {
        throw new Error("Conta de saída não encontrada!");
      }

      if (parseFloat(valor_transferido) > parseFloat(contaSaida.saldo)) {
        throw new Error("Saldo da conta insuficiente!");
      }

      // * Atualização da conta de saída:
      await conn.execute(
        `UPDATE fin_orcamento_contas SET valor_previsto = valor_previsto - ? WHERE id = ?`,
        [valor_transferido, contaSaida.id]
      );

      // * Tentamos obter a conta de entrada:
      const [rowOrcamentoContaEntrada] = await conn.execute(
        `SELECT 
          foc.*, 
          fcc.nome as centro_custo, 
          CONCAT(fpc.codigo, " - ", fpc.descricao) as plano_contas
        FROM fin_orcamento_contas foc
        LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
        WHERE foc.id_orcamento = ? 
        AND id_centro_custo = ? 
        AND id_plano_contas = ? 
      `,
        [id_orcamento, id_centro_custo_entrada, id_conta_entrada]
      );
      const contaEntrada =
        rowOrcamentoContaEntrada && rowOrcamentoContaEntrada[0];

      if (!contaEntrada) {
        // * A conta de orçamento destino não existe, então vamos cria-la:
        await conn.execute(
          `INSERT INTO fin_orcamento_contas (id_orcamento, id_centro_custo, id_plano_contas, valor_previsto)
          VALUES(?,?,?,?)
        `,
          [
            id_orcamento,
            id_centro_custo_entrada,
            id_conta_entrada,
            valor_transferido,
          ]
        );

        const [newCentroCusto] = await conn.execute(
          `
          SELECT nome FROM fin_centros_custo WHERE id = ?
        `,
          [id_centro_custo_entrada]
        );
        const [newPlanoContas] = await conn.execute(
          `
          SELECT CONCAT(fpc.codigo, " - ", fpc.descricao) as nome FROM fin_plano_contas fpc WHERE fpc.id = ?
        `,
          [id_conta_entrada]
        );

        const descricao = `TRANSFERÊNCIA -> DE: ${contaSaida.centro_custo} - ${
          contaSaida.plano_contas
        } | PARA: ${newCentroCusto[0].nome} - ${
          newPlanoContas[0].nome
        } | VALOR: ${normalizeCurrency(valor_transferido)}`;
        await conn.execute(
          `
          INSERT INTO fin_orcamento_historico (id_orcamento, id_user, descricao) VALUES (?, ?, ?)
          `,
          [contaSaida.id_orcamento, req.user.id, descricao]
        );
      } else {
        // * A conta de orçamento destino existe, então vamos atualiza-la:
        await conn.execute(
          `UPDATE fin_orcamento_contas SET valor_previsto = valor_previsto + ? WHERE id = ?`,
          [valor_transferido, contaEntrada.id]
        );
        const descricao = `TRANSFERÊNCIA -> VALOR: ${normalizeCurrency(
          valor_transferido
        )} | DE: ${contaSaida.centro_custo} - ${
          contaSaida.plano_contas
        } | PARA: ${contaEntrada.centro_custo} - ${contaEntrada.plano_contas}`;
        await conn.execute(
          `
          INSERT INTO fin_orcamento_historico (id_orcamento, id_user, descricao) VALUES (?, ?, ?)
          `,
          [contaSaida.id_orcamento, req.user.id, descricao]
        );
      }
      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "TRANSFER_BUDGET",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getIds(req) {
  return new Promise(async (resolve, reject) => {
    const { data, id_grupo_economico } = req.body;
    if (data?.length === 0) {
      throw new Error("Itens não informados!");
    }
    if (!id_grupo_economico) {
      throw new Error("ID_GRUPO_ECONOMICO não informado!");
    }
    const conn = await db.getConnection();
    try {
      const returnedIds = [];
      const erros = [];
      for (const array of data) {
        const erro = {
          centro_custo: "Não encontrado",
          plano_contas: "Não encontrado",
        };

        const [rows_grupo_economico] = await conn.execute(
          "SELECT id FROM grupos_economicos ge WHERE ge.nome LIKE ? OR ge.apelido LIKE ?",
          [
            array.grupo_economico.toUpperCase(),
            array.grupo_economico.toUpperCase(),
          ]
        );
        const grupo_economico = rows_grupo_economico && rows_grupo_economico[0];

        if (grupo_economico.id == id_grupo_economico) {
          const [rows_centro_custo] = await conn.execute(
            "SELECT id FROM fin_centros_custo fcc WHERE fcc.nome = ? AND fcc.id_grupo_economico = ?",
            [array.centro_custo.toUpperCase(), id_grupo_economico]
          );
          const centro_custo = rows_centro_custo && rows_centro_custo[0];
          if (centro_custo) {
            erro.centro_custo = "OK";
          }

          const [rows_plano_contas] = await conn.execute(
            "SELECT id FROM fin_plano_contas fpc WHERE fpc.codigo LIKE ? AND fpc.id_grupo_economico = ? AND fpc.tipo = 'Despesa'",
            [
              array.plano_contas.toUpperCase().split(" - ")[0],
              id_grupo_economico,
            ]
          );
          const plano_contas = rows_plano_contas && rows_plano_contas[0];
          if (plano_contas) {
            erro.plano_contas = "OK";
          }

          returnedIds.push({
            id_centro_custo: centro_custo.id || null,
            id_plano_contas: plano_contas.id || null,
          });
        } else {
          returnedIds.push({
            id_centro_custo: null,
            id_plano_contas: null,
          });
        }

        erros.push(erro);
      }
      resolve({ returnedIds, erros });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "GET_IDS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getLogs(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.execute(
        `
            SELECT 
              u.nome,
              foh.descricao,
              foh.created_at
            FROM fin_orcamento_historico foh
            LEFT JOIN users u ON u.id = foh.id_user
            WHERE foh.id_orcamento = ?`,
        [id]
      );

      const objResponse = {
        rows,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "ORCAMENTOS",
        method: "GET_LOGS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getOne,
  findAccountFromParams,
  insertOne,
  update,
  deleteItemBudget,
  getMyBudgets,
  getMyBudget,
  transfer,
  getIds,
  getLogs,
};

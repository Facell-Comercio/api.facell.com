const { db } = require("../../../../mysql");
const { normalizeCurrency } = require("../../../helpers/mask");

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

    try {
      const [rowQtdeTotal] = await db.execute(
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

      const [rows] = await db.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      reject(error);
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, mes, ano, termo } = req.params;
    try {
      const [rowOrcamento] = await db.execute(
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

      const [rowOrcamentoItens] = await db.execute(
        `
        SELECT 
          foc.id as id_conta,
          foc.id_centro_custo, foc.id_plano_contas,
          fcc.nome as centro_custo, 
          CONCAT(fpc.codigo," - ",fpc.descricao) as plano_contas, 
          foc.valor_previsto as valor,
          foc.valor_previsto as valor_inicial,
          foc.saldo 
        FROM fin_orcamento_contas foc
        LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
        LEFT JOIN fin_orcamento as fo ON fo.id = foc.id_orcamento
        ${where}
            `,
        params
      );

      const orcamento = rowOrcamento && rowOrcamento[0];
      resolve({ ...orcamento, contas: rowOrcamentoItens });
      return;
    } catch (error) {
      reject(error);
      return;
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

      // TODO Update do rateio
      const [result] = await conn.execute(
        `INSERT INTO fin_orcamento (id_grupo_economico, ref, active) VALUES (?,?,?)`,
        [id_grupo_economico, ref, active]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o rateio!");
      }

      // TODO Inserir as contas
      contas.forEach(async ({ id_centro_custo, id_plano_contas, valor }) => {
        await conn.execute(
          `INSERT INTO fin_orcamento_contas (id_orcamento, id_centro_custo, id_plano_contas, valor_previsto, saldo) VALUES(?,?,?,?,?)`,
          [newId, id_centro_custo, id_plano_contas, valor, valor]
        );
      });

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_ORCAMENTO_INSERT", error);
      await conn.rollback();
      reject(error);
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

      // todo: Update do active
      await conn.execute(`UPDATE fin_orcamento SET active = ? WHERE id = ?`, [
        active,
        id,
      ]);

      if (contas?.length) {
        // todo: Insert das contas
        for (const conta of contas) {
          const {
            id_conta,
            id_centro_custo,
            id_plano_contas,
            valor,
            valor_inicial,
          } = conta;

          if (id_conta) {
            const valorAtualizado = valor - valor_inicial;

            const [oldRow] = await conn.execute(
              `
                    SELECT 
                      fcc.nome as centro_custo, 
                      CONCAT(fpc.codigo, " - ", fpc.descricao) as plano_contas 
                    FROM fin_orcamento_contas foc
                    LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
                    LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
                    WHERE foc.id = ? `,
              [id_conta]
            );

            await conn.execute(
              `UPDATE fin_orcamento_contas SET 
                      id_centro_custo = ?, 
                      id_plano_contas = ?, 
                      valor_previsto = valor_previsto + ?, 
                      saldo = saldo + ? 
                    WHERE id = ?`,
              [
                id_centro_custo,
                id_plano_contas,
                valorAtualizado,
                valorAtualizado,
                id_conta,
              ]
            );

            const { centro_custo, plano_contas } = oldRow && oldRow[0];
            const descricao = `ATUALIZAÇÃO -> ${centro_custo} - ${plano_contas} | ANTES: ${normalizeCurrency(
              valor_inicial
            )} | DEPOIS: ${normalizeCurrency(
              valor
            )} | DIF.: ${normalizeCurrency(valorAtualizado)}`;
            await conn.execute(
              `
                    INSERT INTO fin_orcamento_historico (id_orcamento, id_user, descricao) VALUES (?, ?, ?)
                    `,
              [id, req.user.id, descricao]
            );
          } else {
            await conn.execute(
              `INSERT INTO fin_orcamento_contas (id_orcamento, id_centro_custo, id_plano_contas, valor_previsto, saldo) VALUES(?, ?, ?, ?, ?)`,
              [id, id_centro_custo, id_plano_contas, valor, valor]
            );
          }
        }
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_ORCAMENTO_UPDATE", error);
      await conn.rollback();
      reject(error);
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
      console.log("ERRO_DELETE_ITEM_BUDGET", error);
      await conn.rollback();
      reject(error);
    }
  });
}

function getMyBudgets(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
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

    try {
      const [rowQtdeTotal] = await db.execute(
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
              ge.id as id_grupo_economico,
              fcc.nome as centro_custos, 
              CONCAT(fpc.codigo," - ",fpc.descricao) as plano_contas, 
              ge.apelido as grupo_economico, 
              foc.valor_previsto - foc.saldo as realizado,
              (foc.valor_previsto - foc.saldo) / foc.valor_previsto as realizado_percentual
            FROM fin_orcamento_contas foc
            LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
            LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
            LEFT JOIN fin_orcamento as fo ON fo.id = foc.id_orcamento
            LEFT JOIN grupos_economicos ge ON ge.id = fo.id_grupo_economico
            ${where}
            ${limit}
            `;

      const [rows] = await db.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
        mes,
        ano,
      };
      resolve(objResponse);
    } catch (error) {
      reject(error);
    }
  });
}

function getMyBudget(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    try {
      const [rowOrcamento] = await db.execute(
        `
      SELECT 
        foc.id as id_conta_saida,
        CONCAT(fpc.codigo," - ",fpc.descricao) as conta_saida,
        foc.saldo as disponivel,
        fo.id_grupo_economico,
        foc.id_orcamento,
        fcc.nome as centro_custo_entrada,
        foc.id_centro_custo
      FROM fin_orcamento_contas foc
      LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
      LEFT JOIN fin_orcamento fo ON fo.id = foc.id_orcamento
      LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
      WHERE foc.id = ?
            `,
        [id]
      );

      const orcamento = rowOrcamento && rowOrcamento[0];
      resolve(orcamento);
    } catch (error) {
      reject(error);
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
          fcc.nome as centro_custo, 
          CONCAT(fpc.codigo, " - ", fpc.descricao) as plano_contas
        FROM fin_orcamento_contas foc
        LEFT JOIN fin_centros_custo fcc ON fcc.id = foc.id_centro_custo
        LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas WHERE foc.id = ?`,
        [id_conta_saida]
      );

      const contaSaida = rowOrcamentoContaSaida && rowOrcamentoContaSaida[0];
      if (!contaSaida) {
        throw new Error("Conta de saída não encontrada!");
      }

      if (parseFloat(valor_transferido) > parseFloat(contaSaida.saldo)) {
        throw new Error("Saldo da conta insuficiente!");
      }
      await conn.execute(
        `UPDATE fin_orcamento_contas SET valor_previsto = valor_previsto - ?, saldo = saldo - ? WHERE id = ?`,
        [valor_transferido, valor_transferido, contaSaida.id]
      );

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
        await conn.execute(
          `INSERT INTO fin_orcamento_contas (id_orcamento, id_centro_custo, id_plano_contas, valor_previsto, saldo)
          VALUES(?,?,?,?,?)
        `,
          [
            id_orcamento,
            id_centro_custo_entrada,
            id_conta_entrada,
            valor_transferido,
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
        await conn.execute(
          `UPDATE fin_orcamento_contas SET valor_previsto = valor_previsto + ?, saldo = saldo + ? WHERE id = ?`,
          [valor_transferido, valor_transferido, contaEntrada.id]
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
      console.log("ERRO_TRANSFER_BUDGET", error);
      await conn.rollback();
      reject(error);
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
      await conn.beginTransaction();

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
            array.grupo_economico.toString().toUpperCase(),
            array.grupo_economico.toString().toUpperCase(),
          ]
        );
        const grupo_economico = rows_grupo_economico && rows_grupo_economico[0];

        if (grupo_economico.id == id_grupo_economico) {
          const [rows_centro_custo] = await conn.execute(
            "SELECT id FROM fin_centros_custo fcc WHERE fcc.nome = ? AND fcc.id_grupo_economico = ?",
            [array.centro_custo.toString().toUpperCase(), id_grupo_economico]
          );
          const centro_custo = rows_centro_custo && rows_centro_custo[0];
          if (centro_custo) {
            erro.centro_custo = "OK";
          }

          const [rows_plano_contas] = await conn.execute(
            "SELECT id FROM fin_plano_contas fpc WHERE fpc.codigo LIKE ? AND fpc.id_grupo_economico = ? AND fpc.tipo = 'Despesa'",
            [
              array.plano_contas.toString().toUpperCase().split(" - ")[0],
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
      await conn.commit();
      resolve({ returnedIds, erros });
    } catch (error) {
      await conn.rollback();
      reject(error);
    }
  });
}

function getLogs(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { id } = req.params;
    try {
      const [rows] = await db.execute(
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
      reject(error);
    }
  });
}

function faker() {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [centrosDeCusto] = await conn.execute(
        `SELECT id FROM fin_centros_custo WHERE id_grupo_economico = ?`,
        [1]
      );
      const [planoDeContas] = await conn.execute(
        `SELECT id FROM fin_plano_contas WHERE tipo = ? AND id_grupo_economico = ?`,
        ["Despesa", 1]
      );
      for (const centro_custo of centrosDeCusto) {
        for (const conta of planoDeContas) {
          await conn.execute(
            `INSERT INTO fin_orcamento_contas (id_orcamento, id_centro_custo, id_plano_contas, valor_previsto, saldo)
            VALUES(?,?,?,?,?)
          `,
            [
              5,
              centro_custo.id,
              conta.id,
              Math.random() * 1000,
              Math.random() * 1000,
            ]
          );
        }
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      await conn.rollback();
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
  deleteItemBudget,
  getMyBudgets,
  getMyBudget,
  transfer,
  getIds,
  getLogs,
  faker,
};

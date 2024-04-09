const { db } = require("../../../mysql");

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
    // const { id_filial, termo } = filters || {id_filial: 1, termo: null}
    // console.log(filters);
    var where = ` WHERE 1=1 `;
    const params = [];

    if (termo) {
      where += ` AND ge.nome LIKE CONCAT(?,'%')
                      `;
      params.push(nome);
    }

    const offset = pageIndex * pageSize;

    // console.log(params);
    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT 
            COUNT(fr.id) as qtde  
            FROM fin_rateio fr
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      // console.log(params);
      var query = `
            SELECT fo.*, ge.apelido as grupo_economico FROM fin_orcamento fo
            LEFT JOIN grupos_economicos ge ON fo.id_grupo_economico = ge.id
            ${where}
            ORDER BY fo.id DESC
            LIMIT ? OFFSET ?
            `;

      // console.log(query)
      // console.log(params)
      const [rows] = await db.execute(query, params);

      // console.log('Fetched Titulos', titulos.size)
      // console.log(objResponse)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
      // console.log(objResponse)
    } catch (error) {
      console.log("ERRO_ORÇAMENTO_GET_ALL",error);
      reject(error);
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    try {
      const [rowOrcamento] = await db.execute(
        `
      SELECT 
        foc.id as id_conta_saida,
        CONCAT(fpc.codigo," - ",fpc.descricao) as conta_saida,
        foc.saldo as disponivel,
        foc.id_orcamento,
        foc.id_centro_custo,
        ge.id_matriz as id_filial
      FROM fin_orcamento_contas foc
      LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
      LEFT JOIN fin_orcamento fo ON fo.id = foc.id_orcamento
      LEFT JOIN grupos_economicos ge ON ge.id = fo.id_grupo_economico
      WHERE foc.id_plano_contas = ?
            `,
        [id]
      );

      const orcamento = rowOrcamento && rowOrcamento[0];

      resolve(orcamento);
      return;
    } catch (error) {
      reject(error);
      return;
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { active, id_grupo_economico, nome, codigo, manual, itens } =
      req.body;
    // console.log(req.body);
    const conn = await db.getConnection();
    try {
      if (!id_grupo_economico) {
        throw new Error("ID_GRUPO_ECONOMICO não informado!");
      }
      if (!nome) {
        throw new Error("NOME não informado!");
      }
      if (!codigo) {
        throw new Error("CODIGO não informado!");
      }
      if (!manual && !itens?.length) {
        throw new Error("ITENS não informados!");
      }
      if (manual === undefined) {
        throw new Error("MANUAL não informado!");
      }
      await conn.beginTransaction();

      // TODO Update do rateio
      const [result] = await conn.execute(
        `INSERT INTO fin_rateio_ALTERAR (id_grupo_economico, nome, codigo, manual, active) VALUES (?,?,?,?,?)`,
        [id_grupo_economico, nome, codigo, manual, active]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o rateio!");
      }

      // TODO Inserir os itens
      if (!manual) {
        itens.forEach(async ({ id_filial, percentual }) => {
          await conn.execute(
            `INSERT INTO fin_rateio_itens_ALTERAR (id_rateio, id_filial, percentual) VALUES(?,?,?)`,
            [newId, id_filial, percentual]
          );
        });
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_ORÇAMENTO_INSERT_ONE", error);
      reject(error);
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id, active, id_grupo_economico, nome, codigo, manual, itens } =
      req.body;
    // console.log("REQ.BODY", req.body);

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_grupo_economico) {
        throw new Error("ID_GRUPO_ECONOMICO não informado!");
      }
      if (!nome) {
        throw new Error("NOME não informado!");
      }
      if (!codigo) {
        throw new Error("CODIGO não informado!");
      }
      if (!manual && !itens?.length) {
        throw new Error("ITENS não informados!");
      }
      if (manual === undefined) {
        throw new Error("MANUAL não informado!");
      }
      await conn.beginTransaction();

      // TODO Deletar os itens anteriores
      await conn.execute(`DELETE FROM fin_rateio_itens_ALTERAR WHERE id_rateio =?`, [
        id,
      ]);
      // TODO Update do rateio
      await conn.execute(
        `UPDATE fin_rateio_ALTERAR SET id_grupo_economico = ?, nome = ?, codigo = ?, manual =?, active = ? WHERE id =?`,
        [id_grupo_economico, nome, codigo, manual, active, id]
      );
      // TODO Inserir os itens
      if (!manual) {
        itens.forEach(async ({ id_filial, percentual }) => {
          await conn.execute(
            `INSERT INTO fin_rateio_itens_ALTERAR (id_rateio, id_filial, percentual) VALUES(?,?,?)`,
            [id, id_filial, percentual]
          );
        });
      }
      
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_ORÇAMENTO_UPDATE", error);
      conn.rollback();
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
    const { id_centro_custo, plano_contas, mes, ano } = filters || {
      mes: (new Date().getMonth() + 1).toString(),
      ano: new Date().getFullYear().toString(),
    };
    var where = ` WHERE 1=1 `;
    const params = [];

    if (mes && ano) {
      where += ` AND fo.ref = ? `;
      params.push(`${ano}-${("0" + `${mes}`).slice(-2)}-01`);
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

    // console.log(params);
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

      params.push(pageSize);
      params.push(offset);
      // console.log(params);
      var query = `
            SELECT 
              foc.*, 
              ge.apelido as grupo_economico,
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
            LIMIT ? OFFSET ?
            `;

      // console.log(query)
      // console.log(params);
      const [rows] = await db.execute(query, params);

      // console.log('Fetched Titulos', titulos.size)
      // console.log(objResponse)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
        mes,
        ano,
      };
      resolve(objResponse);
      // console.log(objResponse)
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
        foc.id_orcamento,
        foc.id_centro_custo,
        ge.id_matriz as id_filial
      FROM fin_orcamento_contas foc
      LEFT JOIN fin_plano_contas fpc ON fpc.id = foc.id_plano_contas
      LEFT JOIN fin_orcamento fo ON fo.id = foc.id_orcamento
      LEFT JOIN grupos_economicos ge ON ge.id = fo.id_grupo_economico
      WHERE foc.id = ?
            `,
        [id]
      );

      const orcamento = rowOrcamento && rowOrcamento[0];
      resolve(orcamento);
      return;
    } catch (error) {
      reject(error);
      return;
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
    // console.log("REQ.BODY", req.body);

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
        `SELECT * FROM fin_orcamento_contas WHERE id = ?`,
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
        `SELECT * 
          FROM fin_orcamento_contas 
          WHERE id_orcamento = ? 
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
      } else {
        await conn.execute(
          `UPDATE fin_orcamento_contas SET valor_previsto = valor_previsto + ?, saldo = saldo + ? WHERE id = ?`,
          [valor_transferido, valor_transferido, contaEntrada.id]
        );
      }
      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      console.log("ERRO_TRANSFER_BUDGET",error);
      conn.rollback();
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  insertOne,
  update,
  getMyBudgets,
  getMyBudget,
  transfer,
};

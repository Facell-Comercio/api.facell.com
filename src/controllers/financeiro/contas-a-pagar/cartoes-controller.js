const { format, startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

//  * Cartões Corporativos:
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
    const { id_matriz, descricao, nome_portador, active } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const params = [];

    let where = ` WHERE 1=1 `;
    if (id_matriz) {
      where += ` AND fcc.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (descricao) {
      where += ` AND fcc.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (nome_portador) {
      where += ` AND fcc.nome_portador LIKE CONCAT('%',?,'%') `;
      params.push(nome_portador);
    }
    if (active) {
      where += ` AND fcc.active = ? `;
      params.push(active);
    }

    const conn = await db.getConnection();
    try {
      const [rowTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
            FROM (
            SELECT fcc.id 
              FROM fin_cartoes_corporativos fcc
              LEFT JOIN filiais f ON f.id_matriz = fcc.id_matriz
              LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
              ${where}
              GROUP BY fcc.id) 
            as subconsulta
            `,
        params
      );
      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      const [rows] = await conn.execute(
        `
            SELECT fcc.*,
            CASE WHEN f.id_matriz = 18 THEN f.nome ELSE ge.nome END as matriz 
            FROM fin_cartoes_corporativos fcc
            LEFT JOIN filiais f ON f.id_matriz = fcc.id_matriz 
            LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
            ${where}
            
            GROUP BY fcc.id
            ${limit}
            `,
        params
      );

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
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
    const { id } = req.params;

    const conn = await db.getConnection();
    try {
      const [rowCartoes] = await conn.execute(
        `
            SELECT fcc.*, f.id_grupo_economico, forn.nome as nome_fornecedor
            FROM fin_cartoes_corporativos fcc
            LEFT JOIN filiais f ON f.id = fcc.id_matriz
            LEFT JOIN fin_fornecedores forn ON forn.id = fcc.id_fornecedor
            WHERE fcc.id = ?
            `,
        [id]
      );
      const cartao = rowCartoes && rowCartoes[0];

      resolve(cartao);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
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
    const {
      id,
      id_matriz,
      nome_portador,
      dia_vencimento,
      dia_corte,
      descricao,
      active,
      id_fornecedor,
    } = req.body;
    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!id_matriz) {
        throw new Error("É necessário informar a matriz!");
      }
      if (!descricao) {
        throw new Error("É necessário informar a descrição!");
      }
      if (!nome_portador) {
        throw new Error("É necessário informar o nome do portador!");
      }
      if (!dia_vencimento) {
        throw new Error("É necessário informar o dia do vencimento!");
      }
      if (active === undefined || active === null) {
        throw new Error("É necessário informar o status!");
      }
      if (!dia_corte) {
        throw new Error("É necessário informar o dia de corte!");
      }
      if (!id_fornecedor) {
        throw new Error("É necessário informar o fornecedor!");
      }

      await conn.beginTransaction();

      await conn.execute(
        `
        INSERT INTO fin_cartoes_corporativos 
        (id_matriz, descricao, nome_portador, dia_vencimento, active, dia_corte, id_fornecedor) VALUES (?,?,?,?,?,?,?);`,
        [
          id_matriz,
          descricao,
          nome_portador,
          dia_vencimento,
          active,
          dia_corte,
          id_fornecedor,
        ]
      );
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
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
    const {
      id,
      id_matriz,
      descricao,
      nome_portador,
      dia_vencimento,
      active,
      dia_corte,
      id_fornecedor,
    } = req.body;
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_matriz) {
        throw new Error("É necessário informar a matriz!");
      }
      if (!descricao) {
        throw new Error("É necessário informar a descrição!");
      }
      if (!nome_portador) {
        throw new Error("É necessário informar o nome do portador!");
      }
      if (!dia_vencimento) {
        throw new Error("É necessário informar a data de vencimento!");
      }
      if (!active) {
        throw new Error("É necessário informar o status!");
      }
      if (!dia_corte) {
        throw new Error("É necessário informar o dia de corte!");
      }
      if (!id_fornecedor) {
        throw new Error("É necessário informar o fornecedor!");
      }
      await conn.beginTransaction();

      await conn.execute(
        `
          UPDATE fin_cartoes_corporativos SET
          id_matriz = ?,
          descricao = ?,
          nome_portador = ?,
          dia_vencimento = ?,
          active = ?,
          dia_corte = ?,
          id_fornecedor = ?
          WHERE id = ?
            `,
        [
          id_matriz,
          descricao,
          nome_portador,
          dia_vencimento,
          active,
          dia_corte,
          id_fornecedor,
          id,
        ]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function deleteCartao(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.beginTransaction();
      const [compras] = await conn.execute(
        `SELECT id
          FROM fin_cp_titulos
          WHERE id_cartao = ?`,
        [id]
      );

      if (compras && compras.length > 0) {
        throw new Error("Este cartão possui compras associadas");
      }

      await conn.execute(
        `DELETE FROM fin_cartoes_corporativos WHERE id = ? LIMIT 1`,
        [id]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "DELETE_CARTAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

// * Faturas:
function getOneFaturas(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    const params = [];
    const conn = await db.getConnection();
    try {
      const [rowVencimentosEmFaturaQTD] = await conn.execute(
        `
        SELECT COUNT(*) AS qtde
              FROM(
              SELECT id FROM fin_cartoes_corporativos_faturas
              WHERE id_cartao = ?
                  )
              as subconsulta
            `,
        [id]
      );
      const totalVencimentosEmFatura =
        (rowVencimentosEmFaturaQTD && rowVencimentosEmFaturaQTD[0]["qtde"]) ||
        0;

      const [rowVencimentosEmFatura] = await conn.execute(
        `
            SELECT 
                *
            FROM fin_cartoes_corporativos_faturas
            WHERE id_cartao = ?
            ORDER BY 
              id DESC
            LIMIT ? OFFSET ?
            `,
        [id, pageSize, offset]
      );

      resolve({
        rows: rowVencimentosEmFatura,
        pageCount: Math.ceil(totalVencimentosEmFatura / pageSize),
        rowCount: totalVencimentosEmFatura,
      });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "GET_ONE_FATURAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function getFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const conn = await db.getConnection();
    try {
      const [rowFaturas] = await conn.execute(
        `
            SELECT 
                ccf.*, fcc.dia_vencimento
            FROM fin_cartoes_corporativos_faturas ccf
            LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
            WHERE ccf.id = ?
            `,
        [id]
      );
      const fatura = rowFaturas && rowFaturas[0];

      //* Compras aprovadas
      const [rowComprasAprovadas] = await conn.execute(
        `
            SELECT 
                tv.*,
                t.id_status, t.created_at, t.num_doc, t.descricao,
                forn.nome as fornecedor,
                f.nome as filial,
                u.nome as solicitante
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN users u ON u.id = t.id_solicitante
            WHERE tv.id_fatura_cartao = ? AND t.id_status >= 3
            `,
        [id]
      );
      const [rowComprasAprovadasSoma] = await conn.execute(
        `
            SELECT 
                SUM(tv.valor) as total
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN users u ON u.id = t.id_solicitante
            WHERE tv.id_fatura_cartao = ? AND t.id_status >= 3
            `,
        [id]
      );
      const totalAprovadas =
        rowComprasAprovadasSoma &&
        rowComprasAprovadasSoma[0] &&
        rowComprasAprovadasSoma[0].total;

      //* Compras pendentes
      const [rowComprasPendentes] = await conn.execute(
        `
            SELECT 
                tv.*,
                t.id_status, t.created_at, t.num_doc, t.descricao,
                forn.nome as fornecedor,
                f.nome as filial,
                u.nome as solicitante
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN users u ON u.id = t.id_solicitante
            WHERE tv.id_fatura_cartao = ? 
            AND (t.id_status = 1   OR t.id_status = 2)
            `,
        [id]
      );
      const [rowComprasPendentesSoma] = await conn.execute(
        `
            SELECT 
                SUM(tv.valor) as total
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN users u ON u.id = t.id_solicitante
            WHERE tv.id_fatura_cartao = ? 
            AND (t.id_status = 1   OR t.id_status = 2)
            `,
        [id]
      );
      const totalPendentes =
        rowComprasPendentesSoma &&
        rowComprasPendentesSoma[0] &&
        rowComprasPendentesSoma[0].total;

      resolve({
        dados: fatura,

        comprasAprovadas: rowComprasAprovadas,
        totalAprovadas,

        comprasPendentes: rowComprasPendentes,
        totalPendentes,
      });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "GET_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function updateFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { data_prevista, closed, cod_barras, valor } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID da fatura não informado!");
      }
      if (closed === undefined && !data_prevista) {
        throw new Error("Campo data_prevista não informado!");
      }
      const [rowValorFatura] = await conn.execute(
        `
        SELECT 
          SUM(tv.valor) as total
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN users u ON u.id = t.id_solicitante
        WHERE tv.id_fatura_cartao = ? AND t.id_status >= 3
        `,
        [id]
      );
      const total = parseFloat(rowValorFatura && rowValorFatura[0].total) || 0;
      const diferenca = Math.abs(parseFloat(valor) - total);
      if (total < valor) {
        throw new Error(
          `Valor da fatura ultrapassou o esperado em R$${diferenca}`
        );
      }
      if (total > valor) {
        throw new Error(
          `Valor da fatura é inferior ao valor esperado em R$${diferenca}`
        );
      }
      if (data_prevista) {
        await conn.execute(
          `UPDATE fin_cartoes_corporativos_faturas SET data_prevista = ?, cod_barras = ?, valor = ? WHERE id = ?`,
          [startOfDay(data_prevista), cod_barras || null, valor, id]
        );
      }
      if (closed !== undefined) {
        await conn.execute(
          `UPDATE fin_cartoes_corporativos_faturas SET closed = ?, cod_barras = ?, valor = ? WHERE id = ?`,
          [closed, cod_barras, valor, id]
        );
      }
      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "UPDATE_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

function transferVencimentos(req) {
  return new Promise(async (resolve, reject) => {
    const { data_vencimento, data_prevista, id_cartao, id_antiga_fatura, ids } =
      req.body;
    const conn = await db.getConnection();
    try {
      if (!data_vencimento) {
        throw new Error("Campo data_vencimento não informado!");
      }
      if (!data_prevista) {
        throw new Error("Campo data_prevista não informado!");
      }
      if (!id_cartao) {
        throw new Error("Campo id_cartao não informado!");
      }
      if (!ids || (ids && ids.length === 0)) {
        throw new Error("Vencimentos não informados!");
      }
      await conn.beginTransaction();

      let id_fatura;
      const [rowFaturas] = await conn.execute(
        `
        SELECT id FROM fin_cartoes_corporativos_faturas
        WHERE id_cartao = ? AND data_vencimento = ?`,
        [id_cartao, startOfDay(data_vencimento)]
      );
      const fatura = rowFaturas && rowFaturas[0];
      if (!fatura) {
        const [result] = await conn.execute(
          `
          INSERT INTO fin_cartoes_corporativos_faturas (data_vencimento, id_cartao, data_prevista, valor)
          VALUES (?,?,?,?)
        `,
          [startOfDay(data_vencimento), id_cartao, startOfDay(data_prevista), 0]
        );
        id_fatura = result.insertId;
      } else {
        id_fatura = fatura.id;
      }
      let valor = 0;
      for (const id of ids) {
        const [rowVencimentos] = await conn.execute(
          `
          SELECT valor FROM fin_cp_titulos_vencimentos WHERE id = ?`,
          [id]
        );
        const vencimento = rowVencimentos && rowVencimentos[0];
        valor += parseFloat(vencimento.valor);
        await conn.execute(
          `UPDATE fin_cp_titulos_vencimentos SET id_fatura_cartao = ? WHERE id = ?`,
          [id_fatura, id]
        );
      }

      //* Fatura antiga
      await conn.execute(
        `UPDATE fin_cartoes_corporativos_faturas SET valor = valor - ? WHERE id = ?`,
        [valor, id_antiga_fatura]
      );
      const [rowFaturaAntiga] = await conn.execute(
        `
        SELECT valor FROM fin_cartoes_corporativos_faturas WHERE id = ?
      `,
        [id_antiga_fatura]
      );
      const faturaAntigaValor = rowFaturaAntiga && rowFaturaAntiga[0].valor;
      if (faturaAntigaValor < 0) {
        throw new Error("Valor da fatura antiga não pode ser negativo");
      }
      if (faturaAntigaValor == 0) {
        await conn.execute(
          `DELETE FROM fin_cartoes_corporativos_faturas WHERE id = ? LIMIT 1`,
          [id_antiga_fatura]
        );
      }

      //* Fatura nova
      await conn.execute(
        `UPDATE fin_cartoes_corporativos_faturas SET valor = valor + ? WHERE id = ?`,
        [valor, id_fatura]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "TRANSFER_VENCIMENTOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getOne,
  getOneFaturas,
  getFatura,
  insertOne,
  update,
  updateFatura,
  transferVencimentos,
  deleteCartao,
};
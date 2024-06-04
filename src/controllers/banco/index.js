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
      //   Coloquei esse pageSize pq queria usar no SelectBanco
      pageSize: 200,
    };
    const { termo } = filters || { termo: null };

    var where = ` WHERE 1=1 `;
    const params = [];

    if (termo) {
      where += ` AND d.nome LIKE CONCAT('%', ?, '%')`;
      params.push(termo);
    }

    const offset = pageIndex * pageSize;

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(d.id) as qtde 
            FROM fin_bancos d
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT d.id, d.codigo_banco codigo, d.nome_banco nome FROM fin_bancos d
            ${where}
            
            LIMIT ? OFFSET ?
            `;
      // console.log(query)
      // console.log(params)
      const [rows] = await conn.execute(query, params);

      // console.log('Fetched fin_bancos', fin_bancos.length)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      console.error("ERRO_GET_ALL_BANCO", error);
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
      const [rowPlanoContas] = await conn.execute(
        `
            SELECT *
            FROM fin_bancos
            WHERE id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];
      resolve(planoContas);
      return;
    } catch (error) {
      console.error("ERRO_GET_ONE_BANCO", error);
      reject(error);
      return;
    } finally {
      await conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (error) {}
  });
}

function remove(req) {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (error) {}
  });
}

function add(req) {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (error) {}
  });
}

function toggleActive(req) {
  return new Promise(async (resolve, reject) => {
    try {
    } catch (error) {}
  });
}

module.exports = {
  getAll,
  getOne,
  update,
  remove,
  add,
  toggleActive,
};

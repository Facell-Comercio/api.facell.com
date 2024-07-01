const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

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
    const { termo } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const params = [];

    var where = ` WHERE 1=1 `;
    if (termo) {
      const termoCnpj = termo.trim().replace(/[^a-zA-Z0-9 ]/g, '')

      where += ` AND (
                ff.nome LIKE CONCAT('%', ?, '%')  OR
                ff.razao LIKE CONCAT('%', ?, '%')  OR
                ff.cnpj = ?
            )`;
      params.push(termo.trim());
      params.push(termo.trim());
      params.push(termoCnpj);
    }

    const offset = pageIndex * pageSize;

    const conn = await db.getConnection();
    try {

      const [rowTotal] = await conn.execute(
        `SELECT count(ff.id) as qtde FROM fin_fornecedores ff
            ${where}
            `,
        params
      );
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);

      var query = `
            SELECT ff.id, ff.nome, ff.cnpj, ff.razao, ff.active FROM fin_fornecedores ff
            ${where}
            ORDER BY ff.id DESC
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
        origin: "FORNECEDORES",
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
      const [rowFornecedor] = await conn.execute(
        `
            SELECT ff.*, fb.codigo as codigo_banco, fb.nome as banco
            FROM fin_fornecedores ff
            LEFT JOIN fin_bancos fb ON fb.id = ff.id_banco
            WHERE ff.id = ?
            `,
        [id]
      );
      const fornecedor = rowFornecedor && rowFornecedor[0];
      resolve(fornecedor);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "FORNECEDORES",
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
    const { id, cnpj,
      nome,
      razao,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      municipio,
      uf,
      email,
      telefone,
      id_forma_pagamento,
      id_tipo_chave_pix,
      chave_pix,
      id_banco,
      agencia,
      dv_agencia,
      id_tipo_conta,
      conta,
      dv_conta,
      cnpj_favorecido,
      favorecido,
      active
    } = req.body;

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      await conn.beginTransaction();

      await conn.execute(`INSERT INTO fin_fornecedores (
        cnpj,
        nome,
        razao,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        municipio, 
        uf, 
        email,
        telefone, 
        id_forma_pagamento, 
        id_tipo_chave_pix, 
        chave_pix, 
        id_banco, 
        agencia, 
        dv_agencia, 
        id_tipo_conta, 
        conta, 
        dv_conta, 
        cnpj_favorecido, 
        favorecido, 
        active
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
        [
          cnpj,
          nome,
          razao,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          municipio,
          uf,
          email,
          telefone,
          id_forma_pagamento || null,
          id_tipo_chave_pix || null,
          chave_pix,
          id_banco || null,
          agencia,
          dv_agencia,
          id_tipo_conta || null,
          conta,
          dv_conta,
          cnpj_favorecido,
          favorecido,
          active
        ]);

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "FORNECEDORES",
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
    const { id,
      cnpj, nome, razao, cep,
      logradouro, numero, complemento, bairro,
      municipio, uf, email, telefone, id_forma_pagamento,
      id_tipo_chave_pix, chave_pix, id_banco, agencia, dv_agencia,
      id_tipo_conta, conta, dv_conta, cnpj_favorecido, favorecido,
      active
    } = req.body;

    const conn = await db.getConnection();
    
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.execute(`UPDATE fin_fornecedores SET 
        cnpj = ?,
        nome = ?,
        razao = ?,
        cep = ?,
        logradouro = ?,
        numero = ?,
        complemento = ?,
        bairro = ?,
        municipio = ?, 
        uf = ?, 
        email = ?,
        telefone = ?, 
        id_forma_pagamento = ?, 
        id_tipo_chave_pix = ?, 
        chave_pix = ?, 
        id_banco = ?, 
        agencia = ?, 
        dv_agencia = ?, 
        id_tipo_conta = ?, 
        conta = ?, 
        dv_conta = ?, 
        cnpj_favorecido = ?, 
        favorecido = ?, 
        active = ?

        WHERE id = ?`,

      [
        cnpj,
        nome,
        razao,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        municipio,
        uf,
        email,
        telefone,
        id_forma_pagamento || null,
        id_tipo_chave_pix || null,
        chave_pix,
        id_banco || null,
        agencia,
        dv_agencia,
        id_tipo_conta || null,
        conta,
        dv_conta,
        cnpj_favorecido,
        favorecido,
        active,
        id
      ])


      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "FORNECEDORES",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      reject(error);
    } finally {
      conn.release();
    }
  });
}

function consultaCnpj(req) {
  return new Promise(async (resolve, reject) => {
    const { cnpj } = req.params;

    fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`)
      .then((res) => res.json())
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        logger.error({
          module: "FINANCEIRO",
          origin: "FORNECEDORES",
          method: "CONSULTA_CNPJ",
          data: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        });
        reject(error);
      });
  });
}

function toggleActive(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.query;
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE fin_fornecedores SET active = NOT active WHERE id = ?`,
        [id]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "FORNECEDORES",
        method: "TOGGLE_ACTIVE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
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
  getOne,
  insertOne,
  update,
  consultaCnpj,
  toggleActive,
};

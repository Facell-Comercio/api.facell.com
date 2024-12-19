const { logger } = require("../../../logger");
const { db } = require("../../../mysql");
const { hasPermission } = require("../../helpers/hasPermission");
const { ensureArray } = require("../../helpers/formaters");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const isMaster = hasPermission(req, "MASTER");

    const filiais_habilitadas = [];

    user?.filiais?.forEach((f) => {
      filiais_habilitadas.push(f.id_filial);
    });

    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const {
      termo,
      descricao,
      id_grupo_economico,
      grupo_economico,
      id_matriz,
      tim_cod_sap,
      isLojaTim,
      uf_list,
    } = filters || {
      termo: null,
    };

    let where = ` WHERE f.active = 1 `;
    const params = [];
    const limit = pagination ? "LIMIT ? OFFSET ?" : "";

    if (!isMaster) {
      if (!filiais_habilitadas || filiais_habilitadas.length === 0) {
        resolve({
          rows: [],
          pageCount: 0,
          rowCount: 0,
        });
        return;
      }
      where += `AND f.id IN(${filiais_habilitadas.map((value) => db.escape(value)).join(",")}) `;
    }

    if (termo) {
      const termoSoNumeros = termo.replace(/[^\d]/g, "");
      if (termoSoNumeros) {
        where += ` AND (
          f.nome LIKE CONCAT('%', ?, '%')
          OR f.cnpj LIKE CONCAT('%',?,'%')
        ) 
        `;
        params.push(termo);
        params.push(termoSoNumeros);
      } else {
        where += ` AND f.nome LIKE CONCAT('%', ?, '%')`;
        params.push(termo);
      }
    }

    if (descricao) {
      where += ` AND f.nome LIKE CONCAT('%', ?, '%')`;
      params.push(descricao);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ?`;
      params.push(id_grupo_economico);
    }
    if (grupo_economico) {
      where += ` AND g.nome = ?`;
      params.push(grupo_economico);
    }
    if (tim_cod_sap) {
      if (tim_cod_sap !== "all") {
        where += ` AND f.tim_cod_sap = ?`;
        params.push(tim_cod_sap);
      } else {
        where += ` AND NOT f.tim_cod_sap IS NULL`;
      }
    }

    if (isLojaTim == "1" || isLojaTim === true) {
      where += ` AND f.tim_cod_sap IS NOT NULL`;
    }
    if (id_matriz && id_matriz !== undefined && id_matriz !== "all") {
      where += ` AND f.id_matriz = ?`;
      params.push(id_matriz);
    }
    if (uf_list && ensureArray(uf_list).length) {
      where += ` AND f.uf IN (${ensureArray(uf_list)
        .map((value) => db.escape(value))
        .join(",")})`;
    }

    const offset = pageIndex * pageSize;

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(f.id) as qtde
            FROM filiais f
            JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            ${where} `,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      let query = `
            SELECT f.*, g.nome as grupo_economico FROM filiais f
            JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            ${where}
            ORDER BY g.id ASC, f.nome ASC
            ${limit}
            `;
      const [rows] = await conn.execute(query, params);

      // console.log(params);
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "FILIAL",
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
      const [rowItem] = await conn.execute(
        `
            SELECT *
            FROM filiais
            WHERE id = ?
            `,
        [id]
      );
      const item = rowItem && rowItem[0];
      resolve(item);
      return;
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "FILIAL",
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

function update(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      nome,
      active,
      cnpj,
      cnpj_datasys,
      cod_datasys,
      apelido,
      id_matriz,
      id_grupo_economico,
      nome_fantasia,
      razao,
      telefone,
      email,
      logradouro,
      numero,
      complemento,
      cep,
      municipio,
      uf,
    } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID do usuário não enviado!");
      }
      if (!nome) {
        throw new Error("Nome não enviado!");
      }
      await conn.beginTransaction();

      const set = [];
      const params = [];
      if (nome !== undefined) {
        set.push("nome = ?");
        params.push(nome);
      }
      if (cnpj !== undefined) {
        set.push("cnpj = ?");
        params.push(cnpj);
      }
      if (cnpj_datasys !== undefined) {
        set.push("cnpj_datasys = ?");
        params.push(cnpj_datasys);
      }
      if (cod_datasys !== undefined) {
        set.push("cod_datasys = ?");
        params.push(cod_datasys);
      }
      if (apelido !== undefined) {
        set.push("apelido = ?");
        params.push(apelido);
      }
      if (active !== undefined) {
        set.push("active = ?");
        params.push(active);
      }
      if (nome_fantasia !== undefined) {
        set.push("nome_fantasia = ?");
        params.push(nome_fantasia);
      }
      if (razao !== undefined) {
        set.push("razao = ?");
        params.push(razao);
      }
      if (id_matriz !== undefined) {
        set.push("id_matriz = ?");
        params.push(id_matriz);
      }
      if (id_grupo_economico !== undefined) {
        set.push("id_grupo_economico = ?");
        params.push(id_grupo_economico);
      }
      if (telefone !== undefined) {
        set.push("telefone = ?");
        params.push(telefone);
      }
      if (email !== undefined) {
        set.push("email = ?");
        params.push(email);
      }
      if (logradouro !== undefined) {
        set.push("logradouro = ?");
        params.push(logradouro);
      }
      if (numero !== undefined) {
        set.push("numero = ?");
        params.push(numero);
      }
      if (complemento !== undefined) {
        set.push("complemento = ?");
        params.push(complemento);
      }
      if (cep !== undefined) {
        set.push("cep = ?");
        params.push(cep);
      }
      if (municipio !== undefined) {
        set.push("municipio = ?");
        params.push(municipio);
      }
      if (uf !== undefined) {
        set.push("uf = ?");
        params.push(uf);
      }

      params.push(id);
      // Atualização de dados do usuário
      await conn.execute(
        `UPDATE filiais SET ${set.map((value) => db.escape(value)).join(",")} WHERE id = ?`,
        params
      );

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "FILIAL",
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

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      nome,
      cnpj,
      cnpj_datasys,
      cod_datasys,
      apelido,
      id_matriz,
      id_grupo_economico,
      nome_fantasia,
      razao,
      telefone,
      email,
      logradouro,
      numero,
      complemento,
      cep,
      municipio,
      uf,
    } = req.body;

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      await conn.beginTransaction();

      const campos = [];
      const values = [];
      const params = [];

      if (nome !== undefined) {
        campos.push("nome");
        values.push("?");
        params.push(nome);
      }
      if (cnpj !== undefined) {
        campos.push("cnpj");
        values.push("?");
        params.push(cnpj);
      }
      if (cnpj_datasys !== undefined) {
        campos.push("cnpj_datasys");
        values.push("?");
        params.push(cnpj_datasys);
      }
      if (cod_datasys !== undefined) {
        campos.push("cod_datasys");
        values.push("?");
        params.push(cod_datasys);
      }
      if (apelido !== undefined) {
        campos.push("apelido");
        values.push("?");
        params.push(apelido);
      }
      if (id_matriz !== undefined) {
        campos.push("id_matriz");
        values.push("?");
        params.push(id_matriz);
      }
      if (id_grupo_economico !== undefined) {
        campos.push("id_grupo_economico");
        values.push("?");
        params.push(id_grupo_economico);
      }
      if (nome_fantasia !== undefined) {
        campos.push("nome_fantasia");
        values.push("?");
        params.push(nome_fantasia);
      }
      if (razao !== undefined) {
        campos.push("razao");
        values.push("?");
        params.push(razao);
      }
      if (telefone !== undefined) {
        campos.push("telefone");
        values.push("?");
        params.push(telefone);
      }
      if (email !== undefined) {
        campos.push("email");
        values.push("?");
        params.push(email);
      }
      if (logradouro !== undefined) {
        campos.push("logradouro");
        values.push("?");
        params.push(logradouro);
      }
      if (numero !== undefined) {
        campos.push("numero");
        values.push("?");
        params.push(numero);
      }
      if (complemento !== undefined) {
        campos.push("complemento");
        values.push("?");
        params.push(complemento);
      }
      if (cep !== undefined) {
        campos.push("cep");
        values.push("?");
        params.push(cep);
      }
      if (municipio !== undefined) {
        campos.push("municipio");
        values.push("?");
        params.push(municipio);
      }
      if (uf !== undefined) {
        campos.push("uf");
        values.push("?");
        params.push(uf);
      }

      const query = `INSERT INTO filiais (${campos
        .map((value) => db.escape(value))
        .join(",")}) VALUES (${values.map((value) => db.escape(value)).join(",")});`;

      await conn.execute(query, params);
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "FILIAL",
        method: "INSERT_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getAllUfs(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const isMaster = hasPermission(req, "MASTER");

    const filiais_habilitadas = [];

    user?.filiais?.forEach((f) => {
      filiais_habilitadas.push(f.id_filial);
    });

    // Filtros

    const { filters } = req.query;
    // console.log(filters);
    const { id_grupo_economico, id_matriz, tim_cod_sap, isLojaTim } = filters || {};

    let where = ` WHERE f.active = 1 `;
    const params = [];

    if (!isMaster) {
      if (!filiais_habilitadas || filiais_habilitadas.length === 0) {
        resolve({
          rows: [],
          pageCount: 0,
          rowCount: 0,
        });
        return;
      }
      where += `AND f.id IN(${filiais_habilitadas.map((value) => db.escape(value)).join(",")}) `;
    }

    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ?`;
      params.push(id_grupo_economico);
    }
    if (tim_cod_sap) {
      if (tim_cod_sap !== "all") {
        where += ` AND f.tim_cod_sap = ?`;
        params.push(tim_cod_sap);
      } else {
        where += ` AND NOT f.tim_cod_sap IS NULL`;
      }
    }

    if (isLojaTim == "1" || isLojaTim === true) {
      where += ` AND f.tim_cod_sap IS NOT NULL`;
    }
    if (id_matriz && id_matriz !== undefined && id_matriz !== "all") {
      where += ` AND f.id_matriz = ?`;
      params.push(id_matriz);
    }

    const conn = await db.getConnection();
    try {
      let query = `
            SELECT DISTINCT f.uf FROM filiais f
            JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            ${where}
            `;
      const [rows] = await conn.execute(query, params);
      // console.log(rows);
      resolve(rows);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "FILIAL",
        method: "GET_ALL_UFS",
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
  update,
  insertOne,

  getAllUfs,
};

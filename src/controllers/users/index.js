const { db } = require("../../../mysql");
const { v4: uuidv4 } = require("uuid");
// const {
//   urlContemTemp,
//   moverArquivoTempParaUploads,
//   replaceFileUrl,
// } = require("../files-controller");
const { logger } = require("../../../logger");
const {
  deleteFile,
  extractGoogleDriveId,
  persistFile,
  replaceFileUrl,
} = require("../storage-controller");

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
    const { pageIndex, pageSize } = pagination || { pageIndex: 0, pageSize: 5 };
    const { termo, inactives } = filters || {};

    var where = ` WHERE 1=1 `;
    const params = [];

    if (inactives != "true" && (!inactives || parseInt(inactives) != 1)) {
      where += ` AND u.active = 1 `;
      params.push();
    }

    if (termo) {
      where += ` AND u.nome LIKE CONCAT('%', ?, '%')`;
      params.push(termo);
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(u.id) as qtde 
            FROM users u
             ${where} `,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);
      var query = `
            SELECT u.*, '*****' as senha, '*****' as senha_temporaria FROM users u
            ${where}
            ORDER BY u.nome ASC
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
        module: "ADM",
        origin: "USERS",
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
    let conn;
    try {
      conn = await db.getConnection();
      const [rowUser] = await conn.execute(
        `
            SELECT u.*, '***' as senha, '***' as senha_temporaria
            FROM users u
            WHERE u.id = ?
            `,
        [id]
      );

      const user = rowUser && rowUser[0];

      const [permissoes] = await conn.execute(
        `
            SELECT up.*, p.nome, m.nome as modulo, "manual" as tipo
            FROM users_permissoes up
            INNER JOIN permissoes p ON p.id = up.id_permissao
            LEFT JOIN modulos m ON m.id = p.id_modulo
            WHERE up.id_user = ?
            `,
        [id]
      );

      const [perfis] = await conn.execute(
        `
            SELECT up.*, p.perfil
            FROM users_perfis up
            INNER JOIN perfis p ON p.id = up.id_perfil
            WHERE up.id_user = ? AND p.active = 1
            `,
        [id]
      );

      const [permissoes_perfil] = await conn.execute(
        `
        SELECT DISTINCT pp.*, p.nome, m.nome as modulo, "perfil" as tipo
        FROM perfis_permissoes pp
        INNER JOIN permissoes p ON p.id = pp.id_permissao
        LEFT JOIN modulos m ON m.id = p.id_modulo
        WHERE pp.id_perfil IN (
          SELECT p.id
            FROM users_perfis up
            INNER JOIN perfis p ON p.id = up.id_perfil
            WHERE up.id_user = ? AND p.active = 1
        )
        `,
        [id]
      );

      const permissoesUnicas = new Map();

      [...permissoes, ...permissoes_perfil].flat(Infinity).forEach((p) => {
        // Verificar se já existe um item no Map com o mesmo id_perfil
        if (!permissoesUnicas.has(p.id_permissao)) {
          permissoesUnicas.set(p.id_permissao, p);
        } else {
          // Se já existe, priorizar a permissão do tipo 'manual'
          const existingPermission = permissoesUnicas.get(p.id_permissao);
          if (p.tipo === "manual" && existingPermission.tipo !== "manual") {
            permissoesUnicas.set(p.id_permissao, p);
          }
        }
      });

      user.permissoes = Array.from(permissoesUnicas.values());

      const [departamentos] = await conn.execute(
        `
            SELECT ud.*, d.nome
            FROM users_departamentos ud
            INNER JOIN departamentos d ON d.id = ud.id_departamento
            WHERE ud.id_user = ?
            `,
        [id]
      );

      const [filiais] = await conn.execute(
        `
            SELECT uf.*, f.nome, g.nome as grupo_economico
            FROM users_filiais uf
            INNER JOIN filiais f ON f.id = uf.id_filial
            INNER JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            WHERE uf.id_user = ?
            ORDER BY g.id, f.id
            `,
        [id]
      );
      const [centros_custo] = await conn.execute(
        `
            SELECT ucc.*, fcc.nome, g.nome as grupo_economico
            FROM users_centros_custo ucc
            INNER JOIN fin_centros_custo fcc ON fcc.id = ucc.id_centro_custo
            INNER JOIN grupos_economicos g ON g.id = fcc.id_grupo_economico
            WHERE ucc.id_user = ?
            ORDER BY g.id, fcc.id
            `,
        [id]
      );

      const objUser = {
        ...user,
        perfis,
        departamentos,
        filiais,
        centros_custo,
      };
      resolve(objUser);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "USERS",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

function update(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const {
        id,
        nome,
        email,
        cpf,
        active,
        img_url,
        filiais,
        updateFiliais,
        departamentos,
        updateDepartamentos,
        centros_custo,
        updateCentrosCusto,
        permissoes,
        updatePermissoes,
        perfis,
        updatePerfis,
      } = req.body;

      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID do usuário não enviado!");
      }
      if (!nome) {
        throw new Error("Nome não enviado!");
      }
      if (!cpf) {
        throw new Error("CPF não enviado!");
      }
      if (!email) {
        throw new Error("Email não enviado!");
      }
      await conn.beginTransaction();

      const [rowUser] = await conn.execute(`SELECT * FROM users WHERE id = ?`, [id]);
      const user = rowUser && rowUser[0];
      if (!user) {
        throw new Error("Usuário não localizado!");
      }

      const nova_img_url = await replaceFileUrl({
        oldFileUrl: user.img_url,
        newFileUrl: img_url,
      });

      // Atualização de dados do usuário
      await conn.execute(
        "UPDATE users SET nome = ?, email = ?, cpf = ?, img_url = ?, active = ? WHERE id = ?",
        [nome, email, cpf, nova_img_url, active, id]
      );

      // Atualização de arrays
      if (updateFiliais) {
        await conn.execute(`DELETE FROM users_filiais WHERE id_user = ?`, [id]);
        for (const uf of filiais) {
          await conn.execute(
            `INSERT INTO users_filiais (id_user, id_filial, gestor) VALUES (?,?,?)`,
            [id, uf.id_filial, uf.gestor]
          );
        }
      }
      if (updateDepartamentos) {
        await conn.execute(`DELETE FROM users_departamentos WHERE id_user = ?`, [id]);
        for (const udp of departamentos) {
          await conn.execute(
            `INSERT INTO users_departamentos (id_user, id_departamento, gestor) VALUES (?,?,?)`,
            [id, udp.id_departamento, udp.gestor]
          );
        }
      }
      if (updateCentrosCusto) {
        await conn.execute(`DELETE FROM users_centros_custo WHERE id_user = ?`, [id]);
        for (const ucc of centros_custo) {
          await conn.execute(
            `INSERT INTO users_centros_custo (id_user, id_centro_custo, gestor) VALUES (?,?,?)`,
            [id, ucc.id_centro_custo, ucc.gestor]
          );
        }
      }
      if (updatePermissoes) {
        await conn.execute(`DELETE FROM users_permissoes WHERE id_user = ?`, [id]);
        for (const user_permissao of permissoes) {
          if (user_permissao.tipo !== "perfil") {
            await conn.execute(
              `INSERT INTO users_permissoes (id_user, id_permissao) VALUES (?,?)`,
              [id, user_permissao.id_permissao]
            );
          }
        }
      }
      if (updatePerfis) {
        await conn.execute(`DELETE FROM users_perfis WHERE id_user = ?`, [id]);
        for (const user_perfil of perfis) {
          await conn.execute(`INSERT INTO users_perfis (id_user, id_perfil) VALUES (?,?)`, [
            id,
            user_perfil.id_perfil,
          ]);
        }
      }

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      if (conn) await conn.rollback();
      logger.error({
        module: "ADM",
        origin: "USERS",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

function updateImg(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const { img_url } = req.body;
      const { id } = req.params;
      conn = await db.getConnection();
      if (!img_url) {
        throw new Error("Imagem não enviada!");
      }
      if (!id) {
        throw new Error("ID do usuário não informado!");
      }
      await conn.beginTransaction();

      const [rowUser] = await conn.execute(`SELECT * FROM users WHERE id = ?`, [id]);
      const user = rowUser && rowUser[0];
      if (!user) {
        throw new Error("Usuário não localizado!");
      }

      const nova_img_url = await replaceFileUrl({
        oldFileUrl: user.img_url,
        newFileUrl: img_url,
      });

      // Atualização de dados do usuário
      await conn.execute("UPDATE users SET img_url = ? WHERE id = ?", [nova_img_url, id]);
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "USERS",
        method: "UPDATE_IMG",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const {
        id,
        nome,
        email,
        cpf,
        active,
        img_url,
        filiais,
        updateFiliais,
        departamentos,
        updateDepartamentos,
        centros_custo,
        updateCentrosCusto,
        permissoes,
        updatePermissoes,
        perfis,
        updatePerfis,
      } = req.body;

      conn = await db.getConnection();

      if (id) {
        throw new Error("ID do usuário enviado, por favor, atualize ao invés de tentar inserir!");
      }
      if (!nome) {
        throw new Error("Nome não enviado!");
      }
      if (!email) {
        throw new Error("Email não enviado!");
      }
      if (!cpf) {
        throw new Error("CPF não enviado!");
      }
      await conn.beginTransaction();
      const id_publico = uuidv4();

      // Atualização de dados do usuário
      const [result] = await conn.execute(
        "INSERT INTO users (id_publico, nome, email, cpf, active) VALUES (?,?,?,?,?)",
        [id_publico, nome, email, cpf, active]
      );
      const newId = result.insertId;

      const nova_img_url = await persistFile({ fileUrl: img_url });

      await conn.execute("UPDATE users SET img_url = ? WHERE id = ?", [nova_img_url, newId]);

      // Atualização de arrays
      if (updateFiliais) {
        for (const uf of filiais) {
          await conn.execute(
            `INSERT INTO users_filiais (id_user, id_filial, gestor) VALUES (?,?,?)`,
            [newId, uf.id_filial, uf.gestor]
          );
        }
      }
      if (updateDepartamentos) {
        for (const udp of departamentos) {
          await conn.execute(
            `INSERT INTO users_departamentos (id_user, id_departamento, gestor) VALUES (?,?,?)`,
            [newId, udp.id_departamento, udp.gestor]
          );
        }
      }
      if (updateCentrosCusto) {
        for (const ucc of centros_custo) {
          await conn.execute(
            `INSERT INTO users_centros_custo (id_user, id_centro_custo, gestor) VALUES (?,?,?)`,
            [newId, ucc.id_centro_custo, ucc.gestor]
          );
        }
      }
      if (updatePermissoes) {
        for (const user_permissao of permissoes) {
          if (user_permissao.tipo !== "perfil") {
            await conn.execute(
              `INSERT INTO users_permissoes (id_user, id_permissao) VALUES (?,?)`,
              [newId, user_permissao.id_permissao]
            );
          }
        }
      }
      if (updatePerfis) {
        await conn.execute(`DELETE FROM users_perfis WHERE id_user = ?`, [id]);
        for (const user_perfil of perfis) {
          await conn.execute(`INSERT INTO users_perfis (id_user, id_perfil) VALUES (?,?)`, [
            id,
            user_perfil.id_perfil,
          ]);
        }
      }

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      if (conn) await conn.rollback();
      logger.error({
        module: "ADM",
        origin: "USERS",
        method: "INSERT_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

module.exports = {
  getAll,
  getOne,
  update,
  updateImg,
  insertOne,
};

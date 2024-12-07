const { logger } = require("../../../logger");
const { db } = require("../../../mysql");
const { checkUserFilial } = require("../../helpers/checkUserFilial");
const { hasPermission } = require("../../helpers/hasPermission");
const agregadoresController = require("./agregadores-controller");
const configuracoesController = require("./configuracoes-controller");
const metasController = require("./metas-controller");
const politicasController = require("./politicas-controller");
const valesController = require("./vales-controller");
const vendasInvalidadasController = require("./vendas-invalidadas-controller");

function getAllMetasAgregadores(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    const filiaisGestor = user.filiais
      .filter((filial) => filial.gestor)
      .map((filial) => filial.id_filial);

    const { filters } = req.query;

    const {
      id_filial,
      id_grupo_economico,
      nome,
      cpf,
      cargo,
      mes,
      ano,
      ref,
      cpf_list,
      agregacao,
      filial,
    } = filters || {};

    const params = [];

    let where = ` WHERE 1=1 `;

    if (id_filial) {
      where += ` AND fm.id_filial = ? `;
      params.push(id_filial);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (nome) {
      where += ` AND fm.nome LIKE CONCAT('%',?,'%') `;
      params.push(nome);
    }
    if (cpf) {
      where += ` AND fm.cpf LIKE CONCAT(?,'%') `;
      params.push(cpf);
    }
    if (cargo) {
      where += ` AND fm.cargo LIKE CONCAT('%',?,'%') `;
      params.push(cargo);
    }
    if (cpf_list && cpf_list.length > 0 && cpf_list[0] !== "") {
      where += ` AND NOT fm.cpf IN ('${cpf_list.join("','")}') `;
    }
    if (agregacao) {
      where += ` AND fm.cargo ${agregacao === "FILIAL" ? "=" : "<>"} "FILIAL" `;
    }
    if (filial) {
      where += ` AND f.nome LIKE CONCAT('%',?,'%') `;
      params.push(filial);
    }

    if (!hasPermission(req, ["MASTER", "VALES:VER"])) {
      if (filiaisGestor.length > 0) {
        where += ` AND (fm.id_filial IN ('${filiaisGestor.join("','")}') OR fm.cpf = ?)`;
        params.push(user.cpf);
      } else {
        if (user.cpf) {
          where += ` AND fm.cpf = ? `;
          params.push(user.cpf);
        }
      }
    }
    if (ref) {
      where += ` AND fm.ref =? `;
      params.push(ref.split("T")[0]);
    }
    if (mes) {
      where += ` AND MONTH(fm.ref) = ? `;
      params.push(mes);
    }

    if (ano) {
      where += ` AND YEAR(fm.ref) = ? `;
      params.push(ano);
    }

    let conn;
    try {
      conn = await db.getConnection();

      const [metas] = await conn.execute(
        `
        SELECT
          fm.id, fm.ref, fm.cargo, fm.cpf, fm.nome,
          f.nome as filial, "meta" as tipo
        FROM metas fm
        LEFT JOIN filiais f ON f.id = fm.id_filial
        LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
        ${where}
        AND fm.cargo <> "FILIAL"
        `,
        params
      );

      const [agregadores] = await conn.execute(
        `
        SELECT
          fm.id, fm.ref, fm.cargo, fm.cpf, fm.nome,
          f.nome as filial, "agregador" as tipo
        FROM metas_agregadores fm
        LEFT JOIN filiais f ON f.id = fm.id_filial
        LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
        ${where}
        AND fm.tipo_agregacao = "VENDEDOR"
        `,
        params
      );

      resolve([...metas, ...agregadores]);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "ROOT",
        method: "GET_ALL_METAS_AGREGADORES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

module.exports = {
  getAllMetasAgregadores,
  ...agregadoresController,
  ...configuracoesController,
  ...metasController,
  ...politicasController,
  ...valesController,
  ...vendasInvalidadasController,
};

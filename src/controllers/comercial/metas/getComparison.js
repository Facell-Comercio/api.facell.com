const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");

module.exports = function getComparison(req) {
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
      cpf_list,
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

    if (
      !checkUserPermission(req, [
        "MASTER",
        "GERENCIAR_METAS",
        "VISUALIZAR_METAS",
      ])
    ) {
      if (filiaisGestor.length > 0) {
        where += ` AND fm.id_filial IN ('${filiaisGestor.join("','")}') `;
      } else {
        resolve([]);
      }
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
      const [rowFiliais] = await conn.execute(
        `
          SELECT
            fm.*,
            f.nome as filial_nome
          FROM facell_metas fm
          LEFT JOIN filiais f ON f.id = fm.id_filial
          ${where}
          AND fm.cargo = "FILIAL"
        `,
        params
      );

      const result = [];
      for (const filial of rowFiliais) {
        const [rowMetas] = await conn.execute(
          `
            SELECT
              SUM(fm.controle) as controle,
              SUM(fm.pos) as pos,
              SUM(fm.upgrade) as upgrade,
              SUM(fm.qtde_aparelho) as qtde_aparelho,
              SUM(fm.receita) as receita,
              SUM(fm.aparelho) as aparelho,
              SUM(fm.acessorio) as acessorio,
              SUM(fm.pitzi) as pitzi,
              SUM(fm.fixo) as fixo,
              SUM(fm.wttx) as wttx,
              SUM(fm.live) as live
            FROM facell_metas fm
            WHERE fm.id_filial =?
            AND MONTH(fm.ref) =?
            AND YEAR(fm.ref) =?
            AND cargo <> "FILIAL"
          `,
          [filial.id_filial, mes, ano]
        );
        const meta = rowMetas && rowMetas[0];

        result.push({
          filial: filial.filial_nome,
          controle: parseFloat(meta.controle) >= parseFloat(filial.controle),
          pos: parseFloat(meta.pos) >= parseFloat(filial.pos),
          upgrade: parseFloat(meta.upgrade) >= parseFloat(filial.upgrade),
          qtde_aparelho:
            parseFloat(meta.qtde_aparelho) >= parseFloat(filial.qtde_aparelho),
          receita: parseFloat(meta.receita) >= parseFloat(filial.receita),
          aparelho: parseFloat(meta.aparelho) >= parseFloat(filial.aparelho),
          acessorio: parseFloat(meta.acessorio) >= parseFloat(filial.acessorio),
          pitzi: parseFloat(meta.pitzi) >= parseFloat(filial.pitzi),
          fixo: parseFloat(meta.fixo) >= parseFloat(filial.fixo),
          wttx: parseFloat(meta.wttx) >= parseFloat(filial.wttx),
          live: parseFloat(meta.live) >= parseFloat(filial.live),
        });
      }
      resolve(result);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "METAS",
        method: "GET_COMPARISON",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};

const { formatDate } = require("date-fns");

const XLSX = require("xlsx");
const { hasPermission } = require("../../../helpers/hasPermission");
const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const { formatDatabaseDate } = require("../../../helpers/mask");

module.exports = function exportLayoutMetas(req, res) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    const filiaisGestor = user.filiais
      .filter((filial) => filial.gestor)
      .map((filial) => filial.id_filial);

    const { filters, pagination } = req.query;
    const { id_filial, id_grupo_economico, nome, cpf, cargo, mes, ano, cpf_list, agregacao } =
      filters || {};

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

    if (!hasPermission(req, ["MASTER", "METAS:METAS_EDITAR_TODAS"])) {
      if (filiaisGestor.length > 0) {
        where += ` AND (fm.id_filial IN ('${filiaisGestor.join("','")}') OR fm.cpf = ?)`;
        params.push(user.cpf);
      } else {
        where += ` AND fm.cpf = ? `;
        params.push(user.cpf);
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

      const [metas] = await conn.execute(
        `
              SELECT 
                fm.id,
                fm.ref, 
                fm.ciclo,
                gp.nome as grupo_economico,
                f.nome as filial,
                fm.cargo,
                fm.cpf,
                fm.nome,
                fm.tags,
                fm.data_inicial,
                fm.data_final,
                fm.proporcional,
                fm.controle,
                fm.pos,
                fm.upgrade,
                fm.qtde_aparelho,
                fm.receita,
                fm.aparelho,
                fm.acessorio,
                fm.pitzi,
                fm.fixo,
                fm.wttx,
                fm.live
              FROM metas fm
              LEFT JOIN filiais f ON f.id = fm.id_filial
              LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
              ${where}
              ORDER BY fm.id DESC
              `,
        params
      );

      if (metas.length === 0) {
        throw new Error("Não há metas para exportar!");
      }

      metas.forEach((meta) => {
        meta.proporcional = parseFloat(meta.proporcional);
        meta.controle = parseInt(meta.controle);
        meta.pos = parseInt(meta.pos);
        meta.upgrade = parseInt(meta.upgrade);
        meta.qtde_aparelho = parseInt(meta.qtde_aparelho);
        meta.receita = parseFloat(meta.receita);
        meta.aparelho = parseFloat(meta.aparelho);
        meta.acessorio = parseFloat(meta.acessorio);
        meta.pitzi = parseFloat(meta.pitzi);
        meta.fixo = parseInt(meta.fixo);
        meta.wttx = parseInt(meta.wttx);
        meta.live = parseInt(meta.live);
        meta.ref = formatDatabaseDate(meta.ref);
        meta.ciclo = formatDatabaseDate(meta.ciclo);
        meta.data_inicial = formatDatabaseDate(meta.data_inicial);
        meta.data_final = formatDatabaseDate(meta.data_final);
      });

      // * Geração do buffer da planilha excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(metas);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
      const filename = `METAS ${formatDate(new Date(), "dd-MM-yyyy hh.mm")}.xlsx`;

      res.set("Content-Type", "text/plain");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);
      resolve();
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "METAS",
        method: "EXPORT_LAYOUT_METAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};

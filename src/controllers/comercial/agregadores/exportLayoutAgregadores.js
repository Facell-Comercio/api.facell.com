const { formatDate, startOfDay, addHours, addMinutes, parseISO, format } = require("date-fns");

const XLSX = require("xlsx");
const { hasPermission } = require("../../../helpers/hasPermission");
const { formatDatabaseDate } = require("../../../helpers/mask"); //
const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = function exportLayoutAgregadores(req, res) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { filters, pagination } = req.query;
    const { id_filial, id_grupo_economico, nome, cpf, cargo, mes, ano, tipo_agregacao } =
      filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const params = [];

    let where = ` WHERE 1=1 `;

    if (!hasPermission(req, ["MASTER", "METAS:AGREGADORES_VER_TODAS"])) {
      where += ` AND fa.cpf = ? `;
      params.push(user.cpf);
    }

    if (id_filial) {
      where += ` AND fa.id_filial = ? `;
      params.push(id_filial);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (nome) {
      where += ` AND fa.nome LIKE CONCAT('%',?,'%') `;
      params.push(nome);
    }
    if (cpf) {
      where += ` AND fa.cpf LIKE CONCAT(?,'%') `;
      params.push(cpf);
    }
    if (cargo) {
      where += ` AND fa.cargo LIKE CONCAT('%',?,'%') `;
      params.push(cargo);
    }
    if (tipo_agregacao) {
      where += ` AND fa.tipo_agregacao LIKE CONCAT('%',?,'%') `;
      params.push(tipo_agregacao);
    }

    if (mes) {
      where += ` AND MONTH(fa.ref) = ? `;
      params.push(mes);
    }

    if (ano) {
      where += ` AND YEAR(fa.ref) = ? `;
      params.push(ano);
    }

    let conn;
    try {
      conn = await db.getConnection();

      // const [agregadores] = await conn.execute(
      //   `
      //         SELECT
      //           fa.id,
      //           fa.ref,
      //           fa.ciclo,
      //           gp.nome as grupo_economico,
      //           f.nome as filial,
      //           fa.cargo,
      //           fa.cpf,
      //           fa.nome,
      //           fa.tags,
      //           fa.data_inicial,
      //           fa.data_final,
      //           fa.proporcional,
      //           fa.tipo_agregacao
      //         FROM metas_agregadores fa
      //         LEFT JOIN filiais f ON f.id = fa.id_filial
      //         LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
      //         ${where}
      //         ORDER BY fa.id DESC
      //         `,
      //   params
      // );
      const [rowsIdsAgregadores] = await conn.execute(
        `
              SELECT 
                fa.id
              FROM metas_agregadores fa
              LEFT JOIN filiais f ON f.id = fa.id_filial
              ${where}
              ORDER BY fa.id DESC
              `,
        params
      );
      const agregadores = [];

      for (const { id } of rowsIdsAgregadores) {
        const [rowsAgregadores] = await conn.execute(
          `
          SELECT
            fa.id,
            fa.ref,
            fa.ciclo,
            gp.nome as grupo_economico,
            f.nome as filial,
            fa.cargo,
            fa.cpf,
            fa.nome,
            fa.tags,
            fa.data_inicial,
            fa.data_final,
            fa.proporcional,
            fa.tipo_agregacao,
            fa.metas_agregadas
          FROM metas_agregadores fa
          LEFT JOIN filiais f ON f.id = fa.id_filial
          LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
          WHERE fa.id =?
          `,
          [id]
        );
        const agregador = rowsAgregadores && rowsAgregadores[0];
        if (!agregador) {
          throw new Error(`O agregador de id ${id} não foi encontrado`);
        }
        const metas_agregadas = agregador.metas_agregadas && agregador.metas_agregadas.split(";");
        console.log(metas_agregadas);

        const [rowsMetas] = await conn.execute(`
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
          FROM metas fm
          WHERE ${metas_agregadas ? `fm.cpf IN (${metas_agregadas.join(",")})` : "1<>1"}
          `);

        const metas = rowsMetas && rowsMetas[0];
        agregadores.push({
          ...agregador,
          ...metas,
        });
      }

      if (agregadores.length === 0) {
        throw new Error("Não há agregadores para exportar!");
      }

      agregadores.forEach((agregador) => {
        agregador.proporcional = parseFloat(agregador.proporcional);
        agregador.controle = parseInt(agregador.controle);
        agregador.pos = parseInt(agregador.pos);
        agregador.upgrade = parseInt(agregador.upgrade);
        agregador.qtde_aparelho = parseInt(agregador.qtde_aparelho);
        agregador.receita = parseFloat(agregador.receita);
        agregador.aparelho = parseFloat(agregador.aparelho);
        agregador.acessorio = parseFloat(agregador.acessorio);
        agregador.pitzi = parseFloat(agregador.pitzi);
        agregador.fixo = parseInt(agregador.fixo);
        agregador.wttx = parseInt(agregador.wttx);
        agregador.live = parseInt(agregador.live);
        agregador.ref = formatDatabaseDate(agregador.ref);
        agregador.ciclo = formatDatabaseDate(agregador.ciclo);
        agregador.data_inicial = formatDatabaseDate(agregador.data_inicial);
        agregador.data_final = formatDatabaseDate(agregador.data_final);
      });

      // * Geração do buffer da planilha excel
      const worksheet = XLSX.utils.json_to_sheet(agregadores);
      const dateStyle = { numFmt: "dd/MM/yyyy HH:mm:ss" };

      // Aplicar estilo a todas as células de data
      for (let cell in worksheet) {
        if (cell[0] === "!") continue; // Pular metadados da planilha
        if (worksheet[cell].t === "d") {
          // Se o tipo for data
          worksheet[cell].z = dateStyle.numFmt;
        }
      }
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
      const filename = `AGREGADORES ${formatDate(new Date(), "dd-MM-yyyy hh.mm")}.xlsx`;

      res.set("Content-Type", "text/plain");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);
      resolve();
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "AGREGADORES",
        method: "EXPORT_LAYOUT_AGREGADORES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};

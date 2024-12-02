const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const getAll = require("./getAll");
const { filter } = require("jszip");
const { ensureArray } = require("../../../helpers/formaters");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { filters } = req.query || {};
    const { grupo_economico, mes, ano, tipo_meta, status_list, filial_list, cargo_list } =
      filters || {};
    conn = conn_externa || (await db.getConnection());

    const params = [];
    let where = " WHERE 1=1 ";
    if (grupo_economico) {
      where += " AND grupo_economico LIKE ?";
      params.push(grupo_economico);
    }
    if (mes) {
      where += " AND MONTH(ciclo) =?";
      params.push(mes);
    }
    if (ano) {
      where += " AND YEAR(ciclo) =?";
      params.push(ano);
    }
    if (status_list && ensureArray(status_list).length) {
      where += ` AND status_espelho IN ('${ensureArray(status_list).join("','")}')`;
    }
    if (filial_list && ensureArray(filial_list).length) {
      where += ` AND id_filial IN ('${ensureArray(filial_list).join("','")}')`;
    }
    if (cargo_list && ensureArray(cargo_list).length) {
      where += ` AND cargo IN ('${ensureArray(cargo_list).join("','")}')`;
    }

    const rows = [];
    if (tipo_meta && (tipo_meta === "all" || tipo_meta === "meta")) {
      const [metas] = await conn.execute(
        `SELECT *, "meta" as tipo FROM metas ${where} AND cargo <> "FILIAL"`,
        params
      );
      rows.push(metas);
    }

    if (tipo_meta && (tipo_meta === "all" || tipo_meta === "agregador")) {
      const [agregadores] = await conn.execute(
        `SELECT *, "agregador" as tipo FROM metas_agregadores ${where}`,
        params
      );
      rows.push(agregadores);
    }

    const cargosMap = new Map();
    rows.flat().forEach((row) => {
      if (row.cargo && !cargosMap.has(row.cargo)) {
        cargosMap.set(row.cargo, row.cargo);
      }
    });

    const cargos = Array.from(cargosMap.keys());
    res.status(200).json({ rows: rows.flat(), cargos_list: cargos });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "GET_ALL_METAS_AGREGADORES",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};

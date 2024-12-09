const { formatDate } = require("date-fns");
const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const XLSX = require("xlsx");
const { ensureArray } = require("../../../../../helpers/formaters");
const gerarBufferExcelFiliais = require("./helper/gerarBufferExcelFiliais");

module.exports = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const { filters } = req.query || {};

    const { uf_list, mes, ano } = filters || {};
    const params = [];

    let where = " WHERE 1=1 ";

    if (mes) {
      where += ` AND MONTH(data) = ? `;
      params.push(mes);
    }

    if (ano) {
      where += ` AND YEAR(data) = ? `;
      params.push(ano);
    }

    let whereFiliais = " WHERE 1=1 ";
    if (uf_list && ensureArray(uf_list).length > 0) {
      whereFiliais += ` AND uf IN (${ensureArray(uf_list)
        .map((value) => db.escape(value))
        .join(",")})`;
    }

    const [filiais] = await conn.execute(
      `
        SELECT id, nome FROM filiais
        ${whereFiliais}
        AND tim_cod_sap IS NOT NULL`,
      params
    );

    const relatorioFilial = [];

    for (const filial of filiais) {
      const relatorioCaixa = [];
      const [caixas] = await conn.execute(
        `
          SELECT data, valor_crediario, valor_crediario_real FROM datasys_caixas
          ${where} AND id_filial = ?
          `,
        [...params, filial.id]
      );

      for (const caixa of caixas) {
        const obj = {
          Filial: filial.nome,
          Data: caixa.data,
          Datasys: parseFloat(caixa.valor_crediario || "0"),
          Crediario: parseFloat(caixa.valor_crediario_real || "0"),
          "Diferença": parseFloat(caixa.valor_crediario - caixa.valor_crediario_real || "0"),
        };
        relatorioCaixa.push(obj);
      }
      relatorioFilial.push(relatorioCaixa);
    }

    const relatorioFiltrado = relatorioFilial.filter((relatorio) => relatorio.length > 0);

    if (!relatorioFiltrado.length) {
      throw new Error("Não há relatórios a serem importados nesse período");
    }

    // Gera o buffer
    const buffer = gerarBufferExcelFiliais(relatorioFilial);
    const filename = `RELATORIO CREDIARIO DATASYS X PAYJOY (${mes}-${ano}) ${formatDate(
      new Date(),
      "dd-MM-yyyy hh.mm"
    )}.xlsx`;

    // Retorna o arquivo ao cliente
    res.set("Content-Type", "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    logger.error({
      module: "FINANCEIRO",
      origin: "RELATORIOS",
      method: "EXPORT_RELATORIO_CREDIARIO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

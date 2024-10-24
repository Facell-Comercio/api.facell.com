const { formatDate } = require("date-fns");
const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { checkUserDepartment } = require("../../../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../../../helpers/checkUserPermission");
const XLSX = require("xlsx");
const { normalizeDate, ensureArray } = require("../../../../../helpers/mask");

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
      whereFiliais += ` AND id IN ('${ensureArray(uf_list).join("','")}')`;
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
          SELECT data, valor_recarga, valor_recarga_real FROM datasys_caixas
          ${where} AND id_filial = ?
          `,
        [...params, filial.id]
      );

      for (const caixa of caixas) {
        const obj = {
          Filial: filial.nome,
          Data: caixa.data,
          Datasys: parseFloat(caixa.valor_recarga || "0"),
          RV: parseFloat(caixa.valor_recarga_real || "0"),
          "Diferença": parseFloat(caixa.valor_recarga - caixa.valor_recarga_real || "0"),
        };
        relatorioCaixa.push(obj);
      }
      relatorioFilial.push(relatorioCaixa);
    }

    // Função para organizar e mesclar os dados
    const organizarDadosPorLinha = (filiais) => {
      const linhasCombinadas = [];
      const maiorTamanho = Math.max(...filiais.map((filial) => filial.length));

      for (let i = 0; i < maiorTamanho; i++) {
        const linha = [];

        let index = 0;
        for (const filial of filiais) {
          if (filial[i]) {
            // Adiciona os valores de cada filial para a linha combinada
            linha.push(
              filial[i].Filial,
              filial[i].Data,
              parseFloat(filial[i].Datasys || "0"),
              parseFloat(filial[i].RV || "0"),
              parseFloat(filial[i].Diferença || "0")
            );
          } else {
            // Se não houver dados para a filial atual nessa linha, preenche com valores vazios
            linha.push("", "", "", "", "");
          }

          // Adiciona uma coluna vazia entre filiais (exceto depois da última filial)
          if (index < filiais.length - 1) {
            linha.push(""); // Adiciona coluna vazia
          }
          index++;
        }

        linhasCombinadas.push(linha);
      }

      return linhasCombinadas;
    };

    // Cabeçalhos para cada filial dinamicamente
    const gerarCabecalhos = (filiais) => {
      const cabecalhos = [];

      let index = 0;
      for (const filial of filiais) {
        cabecalhos.push("Filial", "Data", "Datasys", "RV", "Diferença");
        // Adiciona uma coluna vazia entre filiais (exceto depois da última filial)
        if (index < filiais.length - 1) {
          cabecalhos.push(""); // Coluna vazia
        }
        index++;
      }

      return cabecalhos;
    };

    const dadosFinal = organizarDadosPorLinha(relatorioFilial);
    const cabecalhos = gerarCabecalhos(relatorioFilial);

    // Adiciona os cabeçalhos às linhas combinadas
    dadosFinal.unshift(cabecalhos);

    // Cria a planilha com os dados combinados
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(dadosFinal);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");

    // Gera o buffer
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const filename = `EXPORT RECARGA DATASYS X RV (${mes}-${ano}) ${formatDate(
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
      method: "EXPORT_RELATORIO_RECARGA_RV",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

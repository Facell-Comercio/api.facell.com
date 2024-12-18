const { endOfMonth, formatDate } = require("date-fns");
const path = require("path");
const { db } = require("../../../../mysql");
const { createUploadsPath, zipFiles } = require("../../files-controller");
const { normalizeCnpjNumber } = require("../../../helpers/mask");
const XLSX = require("xlsx");
const { logger } = require("../../../../logger");

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
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { id_grupo_economico, id_conta_bancaria } = filters || {};

    let where = ` WHERE 1=1 `;
    const params = [];

    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ?`;
      params.push(id_grupo_economico);
    }
    if (id_conta_bancaria) {
      where += ` AND cb.id = ? `;
      params.push(id_conta_bancaria);
    }

    const offset = pageIndex * pageSize;

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
          FROM (
            SELECT
                cb.id
            FROM fin_contas_bancarias cb
            LEFT JOIN fin_tipos_contas tc ON tc.id = cb.id_tipo_conta
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            LEFT JOIN filiais f ON f.id = cb.id_filial
            LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
            ${where}
            GROUP BY cb.id
          ) AS subconsulta
          `,
        params
      );

      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
      params.push(pageSize);
      params.push(offset);

      const query = `
          SELECT
            cb.id, cb.descricao,
            fb.nome as banco,
            tc.tipo,
            ge.nome as grupo_economico,
            f.nome as filial, f.id_matriz,
            f.id_grupo_economico
          FROM fin_contas_bancarias cb
          LEFT JOIN fin_tipos_contas tc ON tc.id = cb.id_tipo_conta
          LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
          LEFT JOIN filiais f ON f.id = cb.id_filial
          LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
  
          ${where}
          GROUP BY cb.id
          ORDER BY cb.id DESC
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
        origin: "CONTAS_A_RECEBER",
        method: "MOVIMENTO_CONTABIL_GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function downloadMovimentoContabil(req, res) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      // ^ id_grupo_economico - id_conta_bancaria - mes - ano
      const { id_grupo_economico, id_conta_bancaria, range_data } = req.query.filters || {};
      const { from: data_de, to: data_ate } = range_data;

      if (!id_grupo_economico) {
        throw new Error("ID GRUPO ECONÔMICO não informado");
      }
      if (!data_de && !data_ate) {
        throw new Error("Período não informado");
      }
      const grupo_economico = req.query.filters.grupo_economico || "";
      const conta_bancaria = req.query.filters.conta_bancaria || "";

      let itemsExcel = [];
      let where = ` WHERE t.id_status > 30`;
      if (data_de && data_ate) {
        where += ` AND tr.data BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND tr.data >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND tr.data <= '${data_ate.split("T")[0]}' `;
        }
      }

      const params = [];
      if (id_grupo_economico) {
        where += ` AND ge.id = ?`;
        params.push(id_grupo_economico);
      }
      if (id_conta_bancaria) {
        where += ` AND cb.id = ? `;
        params.push(id_conta_bancaria);
      }

      // * Passar por cada dia gerando uma pasta do dia e gerar os files
      const [vencimentos] = await conn.execute(
        `
        SELECT
          tr.id, tr.id_vencimento, tv.id_titulo,
          ff.cnpj, ff.nome as nome_fornecedor,
          f.nome as filial, f.cnpj as cnpj_filial,
          t.descricao, t.num_doc, t.valor_liquido,
          t.ir, t.iss, t.valor as valor_titulo,
          tv.valor as valor_vencimento, tr.valor as valor_recebimento,
          tr.data as data_recebimento, cb.descricao as banco,
          t.tim_pedido, t.tim_pedido_sap,
          t.url_xml_nota,
          t.url_nota_fiscal,
          t.url_nota_debito,
          t.url_planilha,
          t.url_outros,
          t.url_recibo
        FROM fin_cr_titulos_recebimentos tr
        LEFT JOIN fin_cr_titulos_vencimentos tv ON tv.id = tr.id_vencimento
        LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais as f ON f.id = t.id_filial
        LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
        LEFT JOIN fin_fornecedores as ff ON ff.id = t.id_fornecedor
        LEFT JOIN fin_contas_bancarias as cb ON cb.id = tr.id_conta_bancaria
        ${where}
        GROUP BY tr.id
        `,
        params
      );

      // * Adiciona os títulos no array do excel e no Objeto de dia
      itemsExcel = vencimentos.map((vencimento) => ({
        "ID RECEBIMENTO": vencimento.id,
        "ID VENCIMENTO": vencimento.id_vencimento,
        "ID TÍTULO": vencimento.id_titulo,
        "CPF/CNPJ": normalizeCnpjNumber(vencimento.cnpj || ""),
        "NOME FORNECEDOR": vencimento.nome_fornecedor || "",
        FILIAL: vencimento.filial || "",
        "CNPJ FILIAL": vencimento.cnpj_filial || "",
        DESCRIÇÃO: vencimento.descricao || "",
        "PEDIDO TIM SAP": vencimento.tim_pedido_sap || "",
        "Nº DOC": vencimento.num_doc || "",
        "VALOR BRUTO": parseFloat(vencimento.valor_titulo) || "",
        "IR": parseFloat(vencimento.ir) || "",
        "ISS": parseFloat(vencimento.iss) || "",
        "VALOR LÍQUIDO": parseFloat(vencimento.valor_liquido) || "",
        "VALOR VENCIMENTO": parseFloat(vencimento.valor_vencimento) || "",
        "VALOR RECEBIDO": parseFloat(vencimento.valor_recebimento) || "",
        "DT RECEBIMENTO": vencimento.data_recebimento || "",
        BANCO: vencimento.banco || "",
        "XML NF": vencimento.url_xml,
        "NOTA FISCAL": vencimento.url_nota_fiscal,
        "NOTA DÉBITO": vencimento.url_nota_debito,
        PLANILHA: vencimento.url_planilha,
        OUTROS: vencimento.url_outros,
        RECIBO: vencimento.url_recibo,
      }));

      if (itemsExcel.length == 0) {
        throw new Error("Movimento Contábil Vazio");
      }

      // * Geração do buffer da planilha excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(itemsExcel);

      // Configura os hiperlinks:
      Object.keys(worksheet).forEach((cell) => {
        if (worksheet[cell].v && String(worksheet[cell].v).includes("http")) {
          worksheet[cell].l = { Target: worksheet[cell].v };
        }
      });

      XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      const filename = `MOVIMENTO CONTABIL - ${grupo_economico ? grupo_economico + " - " : ""}${
        conta_bancaria ? conta_bancaria : ""
      }.xlsx`;
      res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONTAS_A_RECEBER",
        method: "DOWNLOAD_MOVIMENTO_CONTABIL",
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
  downloadMovimentoContabil,
};

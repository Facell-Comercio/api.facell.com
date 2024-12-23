const { formatDate } = require("date-fns");
const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { checkUserDepartment } = require("../../../../../helpers/checkUserDepartment");
const { hasPermission } = require("../../../../../helpers/hasPermission");
const { ensureArray } = require("../../../../../helpers/formaters");
const XLSX = require("xlsx");

module.exports = (req, res) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();

      const { user } = req;
      const departamentosUser = user.departamentos.map(
        (departamento) => departamento.id_departamento
      );

      const { filters } = req.query || {};

      // Filtros
      let where = ` 1=1 `;
      //* Somente o Financeiro/Master podem ver todos
      if (
        !checkUserDepartment(req, "FINANCEIRO") &&
        !hasPermission(req, "MASTER") &&
        !hasPermission(req, "DESPESAS:VER_TODAS")
      ) {
        // where += ` AND t.id_solicitante = '${user.id}'`;
        if (departamentosUser?.length > 0) {
          where += ` AND (t.id_solicitante = '${
            user.id
          }' OR  t.id_departamento IN (${departamentosUser
            .map((value) => db.escape(value))
            .join(",")})) `;
        } else {
          where += ` AND t.id_solicitante = '${user.id}' `;
        }
      }

      const {
        id,
        id_grupo_economico,

        grupo_economico_list,
        id_forma_pagamento,
        forma_pagamento_list,
        id_status,
        status_list,
        tipo_data,
        range_data,
        descricao,
        id_matriz,
        arquivados,
        nome_fornecedor,
        nome_user,
        filial,
        num_doc,

        em_aberto,
      } = filters || {};

      const params = [];
      if (id) {
        where += ` AND t.id = ? `;
        params.push(id);
      }
      if (id_status && id_status !== "all") {
        where += ` AND t.id_status = ?`;
        params.push(id_status);
      }
      if (status_list && status_list.length > 0) {
        where += ` AND t.id_status IN (${status_list.map((value) => db.escape(value)).join(",")})`;
      }

      if (id_forma_pagamento && id_forma_pagamento !== "all") {
        where += ` AND t.id_forma_pagamento = ? `;
        params.push(id_forma_pagamento);
      }
      if (forma_pagamento_list && ensureArray(forma_pagamento_list).length > 0) {
        where += ` AND t.id_forma_pagamento IN (${ensureArray(forma_pagamento_list)
          .map((value) => db.escape(value))
          .join(",")})`;
      }

      if (descricao) {
        where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
        params.push(descricao);
      }
      if (id_matriz) {
        where += ` AND f.id_matriz = ? `;
        params.push(id_matriz);
      }
      if (!arquivados) {
        where += ` AND t.id_status != 0 `;
      }

      if (nome_fornecedor) {
        where += ` AND (forn.razao LIKE CONCAT('%', ?, '%') OR  forn.nome LIKE CONCAT('%', ?, '%')) `;
        params.push(nome_fornecedor);
        params.push(nome_fornecedor);
      }

      if (nome_user) {
        where += ` AND u.nome LIKE CONCAT('%', ?, '%') `;
        params.push(nome_user);
      }
      if (num_doc) {
        where += ` AND t.num_doc LIKE CONCAT('%', ?, '%') `;
        params.push(String(num_doc).trim());
      }

      if (tipo_data && range_data) {
        const { from: data_de, to: data_ate } = range_data;

        const campo_data =
          tipo_data == "data_prevista" ||
          tipo_data == "data_vencimento" ||
          tipo_data == "data_pagamento"
            ? `tv.${tipo_data}`
            : `t.${tipo_data}`;

        if (data_de && data_ate) {
          where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            where += ` AND ${campo_data} >= '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            where += ` AND ${campo_data} <= '${data_ate.split("T")[0]}' `;
          }
        }
      }

      if (id_grupo_economico && id_grupo_economico !== "all") {
        where += ` AND f.id_grupo_economico = ? `;
        params.push(id_grupo_economico);
      }
      if (grupo_economico_list && ensureArray(grupo_economico_list).length > 0) {
        where += ` AND f.id_grupo_economico IN (${ensureArray(grupo_economico_list)
          .map((value) => db.escape(value))
          .join(",")})`;
      }

      if (filial) {
        where += ` AND f.nome LIKE CONCAT("%", ?,"%")`;
        params.push(filial);
      }
      if (em_aberto && em_aberto !== "all") {
        if (Number(em_aberto)) {
          where += ` AND tv.data_pagamento IS NULL `;
        } else {
          where += ` AND tv.data_pagamento IS NOT NULL`;
        }
      }

      // * Lista de vencimentos
      const query = `SELECT
          tv.id as id_vencimento,
          ffp.forma_pagamento,
          t.id as id_titulo,
          s.status as status_titulo,
          tv.valor as valor_vencimento,
          tv.data_pagamento,
          t.valor as valor_titulo,
          COALESCE(ge.nome, 'RR') as grupo_economico,
          f.nome as filial,
          forn.cnpj as cnpj_fornecedor,
          forn.nome as nome_fornecedor,
          t.descricao,
          t.num_doc as documento,
          t.data_emissao,
          t.created_at as data_criacao,
          tv.data_vencimento,
          tv.data_prevista ,
          tv.tipo_baixa,
          tv.valor as valor_vencimento,
          tv.status AS status_pagamento,
          tv.valor_pago,
          u.nome as solicitante,
          cb.descricao as conta_bancaria,
          d.nome as departamento,
          COALESCE(r.nome, 'MANUAL') as rateio
        FROM fin_cp_titulos_vencimentos tv
        INNER JOIN fin_cp_titulos t on t.id = tv.id_titulo
        LEFT JOIN departamentos d ON d.id = t.id_departamento
        LEFT JOIN fin_rateio r ON r.id = t.id_rateio
        LEFT JOIN fin_formas_pagamento ffp ON ffp.id = t.id_forma_pagamento
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = bi.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_status s ON s.id = t.id_status
        LEFT JOIN users u ON u.id = t.id_solicitante
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN grupos_economicos ge ON ge.id_matriz = f.id_matriz
        WHERE
          ${where}
          ORDER BY tv.data_vencimento ASC`;

      const [vencimentos] = await conn.execute(query, params);
      // console.log({ query });
      // console.log({ params });

      const despesas = [];

      async function gerarDespesa({ vencimento }) {
        const [itens_rateio] = await conn.execute(
          `SELECT 
            tr.*,
            tr.id as id_item_rateio,
            f.nome as filial,
            fcc.nome  as centro_custo,
            fpc.codigo as codigo_plano_conta,
            fpc.descricao as plano_conta,
            tr.percentual
          FROM 
            fin_cp_titulos_rateio tr 
          LEFT JOIN filiais f ON f.id = tr.id_filial
          LEFT JOIN fin_centros_custo fcc ON fcc.id = tr.id_centro_custo
          LEFT JOIN fin_plano_contas fpc ON fpc.id = tr.id_plano_conta
            WHERE tr.id_titulo = ?`,
          [vencimento.id_titulo]
        );

        vencimento.valor_vencimento = parseFloat(vencimento.valor_vencimento);
        vencimento.valor_pago = parseFloat(vencimento.valor_pago);
        vencimento.valor_titulo = parseFloat(vencimento.valor_titulo);

        for (const item_rateio of itens_rateio) {
          const valorVencimentoRateado =
            parseFloat(item_rateio.percentual) * vencimento.valor_vencimento;
          const valorPagoVencimentoRateado =
            parseFloat(item_rateio.percentual) * (vencimento.valor_pago || 0);

          // Cada vencimento será quebrado em despesas, que nada mais é do que os itens_rateio do título quebrando os vencimentos.
          const despesa = {
            "IDPG": vencimento.id_vencimento + "." + item_rateio.id_item_rateio,
            "CNPJ FORNECEDOR": vencimento.cnpj_fornecedor,
            "NOME FORNECEDOR": vencimento.nome_fornecedor,

            "GRUPO": vencimento.grupo_economico,
            "FILIAL": vencimento.filial,
            "DEPARTAMENTO": vencimento.departamento,
            "SOLICITANTE": vencimento.solicitante,

            "FILIAL RATEIO": item_rateio.filial,
            "RATEIO": vencimento.rateio || "",

            "ID TITULO": vencimento.id_titulo,
            "STATUS TITULO": vencimento.status_titulo,
            "VALOR TITULO": vencimento.valor_titulo,
            "DOCUMENTO": vencimento.documento,
            "DESCRICAO": vencimento.descricao,
            "DATA SOLICITACAO": vencimento.data_criacao,
            "DATA EMISSAO": vencimento.data_emissao,
            "ID VENCIMENTO": vencimento.id_vencimento,
            "VALOR VENCIMENTO": vencimento.valor_pago || vencimento.valor,

            "DATA VENCIMENTO": vencimento.data_vencimento,
            "DATA PREVISTA": vencimento.data_prevista,
            "CENTRO DE CUSTOS": item_rateio.centro_custo,
            "CODIGO PLANO DE CONTAS": item_rateio.codigo_plano_conta,
            "PLANO DE CONTAS": item_rateio.plano_conta,
            "VALOR": valorVencimentoRateado,
            "DATA PAGAMENTO": vencimento.data_pagamento,
            "VALOR PAGO": valorPagoVencimentoRateado,
            "TIPO BAIXA": vencimento.tipo_baixa,
            "FORMA DE PAGAMENTO": vencimento.forma_pagamento,
          };
          // console.log({ despesa });
          despesas.push(despesa);
        }
      }

      await Promise.all(vencimentos.map((vencimento) => gerarDespesa({ vencimento })));

      // * Geração do buffer da planilha excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(despesas);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
      const filename = `EXPORT DESPESAS ${formatDate(new Date(), "dd-MM-yyyy hh.mm")}.xlsx`;

      res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "RELATORIOS",
        method: "EXPORT_LAYOUT_DESPESAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};

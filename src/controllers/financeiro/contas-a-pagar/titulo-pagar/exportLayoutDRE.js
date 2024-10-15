const { formatDate } = require("date-fns");
const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { checkUserDepartment } = require("../../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../../helpers/checkUserPermission");
const XLSX = require('xlsx');

module.exports = function exportLayoutDRE(req, res) {
  return new Promise(async (resolve, reject) => {
    let conn
    try {
      conn = await db.getConnection();

      const { user } = req;
      const departamentosUser = user.departamentos.map(
        (departamento) => departamento.id_departamento
      );

      const { filters } = req.query || {};

      // Filtros
      var where = ` tv.data_pagamento IS NOT NULL `;
      //* Somente o Financeiro/Master podem ver todos
      if (
        !checkUserDepartment(req, "FINANCEIRO") &&
        !checkUserPermission(req, "MASTER")
      ) {
        // where += ` AND t.id_solicitante = '${user.id}'`;
        if (departamentosUser?.length > 0) {
          where += ` AND (t.id_solicitante = '${user.id
            }' OR  t.id_departamento IN (${departamentosUser.join(",")})) `;
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
        where += ` AND t.id_status IN ('${status_list.join("','")}')`;
      }

      if (id_forma_pagamento && id_forma_pagamento !== "all") {
        where += ` AND t.id_forma_pagamento = ? `;
        params.push(id_forma_pagamento);
      }
      if (forma_pagamento_list && forma_pagamento_list.length > 0) {
        where += ` AND t.id_forma_pagamento IN ('${forma_pagamento_list.join(
          "','"
        )}')`;
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
          where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${data_ate.split("T")[0]
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
      if (grupo_economico_list && grupo_economico_list.length > 0) {
        where += ` AND f.id_grupo_economico IN ('${grupo_economico_list.join(
          "','"
        )}')`;
      }

      if (filial) {
        where += ` AND f.nome LIKE CONCAT("%", ?,"%")`;
        params.push(filial);
      }

      // * Lista de vencimentos
      const query = `SELECT 
          tv.id as id_vencimento,  
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
          tv.status AS status_pagamento,
          tv.valor_pago,
          u.nome as solicitante,
          cb.descricao as conta_bancaria
        FROM fin_cp_titulos_vencimentos tv 
        INNER JOIN fin_cp_titulos t on t.id = tv.id_titulo 
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
          ORDER BY tv.data_vencimento ASC`

      const [vencimentos] = await conn.execute(query, params)
      // console.log({ query });
      // console.log({ params });

      const despesas = []

      async function gerarDespesa({ vencimento }) {
        const [itens_rateio] = await conn.execute(
          `SELECT 
            tr.*,
            f.nome as filial,
            fcc.nome  as centro_custo,
            CONCAT(fpc.codigo, ' - ', fpc.descricao) as plano_conta,
            ROUND(tr.valor, 4) as valor, 
            tr.percentual
          FROM 
            fin_cp_titulos_rateio tr 
          LEFT JOIN filiais f ON f.id = tr.id_filial
          LEFT JOIN fin_centros_custo fcc ON fcc.id = tr.id_centro_custo
          LEFT JOIN fin_plano_contas fpc ON fpc.id = tr.id_plano_conta
            WHERE tr.id_titulo = ?`,
          [vencimento.id_titulo]
        );

        vencimento.valor_pago = parseFloat(vencimento.valor_pago)
        vencimento.valor_titulo = parseFloat(vencimento.valor_titulo)

        for (const item_rateio of itens_rateio) {
          const valorVencimentoRateado = parseFloat(item_rateio.percentual) * vencimento.valor_pago;
          
          // Cada vencimento será quebrado em despesas, que nada mais é do que os itens_rateio do título quebrando os vencimentos.
          const despesa = {
            'Nível': 4,
            'Grupo': vencimento.grupo_economico,
            'Empresa': item_rateio.filial,
            'Conta/Descrição': `Conta: ${item_rateio.plano_conta}`,
            'Data Movimento': vencimento.data_pagamento,
            'Documento': vencimento.documento,
            'Histórico': vencimento.descricao,
            'Origem Lançamento': 'Contas Pagar',
            'Centro Custos': item_rateio.centro_custo,
            'Cliente / Fornecedor': vencimento.nome_fornecedor,
            'Tipo': 'Pagamentos',
            'Base': 'Contas Pagar',
            'Valor': valorVencimentoRateado,
            'Banco': vencimento.conta_bancaria,
            'Filial Lançamento': vencimento.filial,
            'ID Titulo': vencimento.id_titulo,
            'Valor Titulo': vencimento.valor_titulo,
            'ID Vencimento': vencimento.id_vencimento,
            'Valor Vencimento': vencimento.valor_pago,
            'Tipo Baixa': vencimento.tipo_baixa,
            '% Rateio': item_rateio.percentual
          }
          // console.log({despesa});
          despesas.push(despesa)
        }
      }

      await Promise.all(vencimentos.map(vencimento => gerarDespesa({ vencimento })))


      // * Geração do buffer da planilha excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(despesas);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilha1');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      const filename = `EXPORT CONTAS A PAGAR LAYOUT DRE ${formatDate(new Date(), 'dd-MM-yyyy hh.mm')}.xlsx`;

      res.set("Content-Type", "text/plain");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "EXPORT_LAYOUT_DRE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}
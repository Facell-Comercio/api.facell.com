const { formatDate } = require("date-fns");
const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const XLSX = require('xlsx');

module.exports = function exportLayoutDatasys(req, res) {
  return new Promise(async (resolve, reject) => {
    const { filters } = req.query || {};
    const conn = await db.getConnection();
    const { data_pagamento, id_grupo_economico } = filters;
    try {
      if (!data_pagamento) {
        throw new Error("DATA PAGAMENTO não selecionada!");
      }
      if (!id_grupo_economico) {
        throw new Error("GRUPO ECONÔMICO não selecionada!");
      }

      // ^ Consultando vencimentos de acordo com o grupo econômico e da data de pagamento
      const [vencimentos] = await conn.execute(
        `
          SELECT 
            t.id as id_titulo, tv.id, tv.id as id_vencimento, tv.data_pagamento,
            t.data_emissao as emissao, tv.data_vencimento as vencimento,
            tv.valor_pago as valor,
            t.descricao as historico,
            f.cnpj_datasys as cnpj_loja,
            CASE WHEN fp.forma_pagamento LIKE '%Boleto%' THEN 'BOLETO' ELSE 'OUTRO' END as tipo_documento,
            fo.cnpj as cnpj_fornecedor, fo.nome as nome_fornecedor
          FROM fin_cp_titulos t 
          LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
          LEFT JOIN fin_fornecedores fo ON fo.id = t.id_fornecedor
          WHERE tv.data_pagamento = ?
          AND f.id_grupo_economico = ?
          `,
        [formatDate(data_pagamento, "yyyy-MM-dd"), id_grupo_economico]
      );
      const datasys = [];
      for (const vencimento of vencimentos) {
        // ^ Itereando sobre cada vencimento e pegando o valor de rateio referente
        const [rateios] = await conn.execute(
          `
            SELECT 
              tr.percentual,
              cc.nome as centro_custo, cc.id as id_centro_custo,
              pc.codigo as plano_contas, pc.id as id_plano_contas,
              f.cnpj_datasys as cnpj_rateio,
              cb.descricao as banco_pg
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos_rateio tr ON tr.id_titulo = tv.id_titulo 
            LEFT JOIN fin_centros_custo cc ON cc.id = tr.id_centro_custo 
            LEFT JOIN fin_plano_contas pc ON pc.id = tr.id_plano_conta
            LEFT JOIN filiais f ON f.id = tr.id_filial 
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
            LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
            LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
            WHERE tv.id = ?
            ORDER BY tr.id DESC
          `,
          [vencimento.id]
        );

        //^ Map para a criação do documento e Map para o armazenamento dos valores
        const map = new Map();
        const valoresMap = new Map();
        let autoIncrement = 1;
        let documento = "";

        for (const rateio of rateios) {
          const valorRateio =
            parseFloat(vencimento.valor) * parseFloat(rateio.percentual);
          // ^ Criando a chave para agrupar os rateios por centro de custo e plano de contas
          const chave = `${rateio.id_centro_custo}-${rateio.id_plano_contas}-${vencimento.id}`;

          // ^ Verifica se a chave já foi criada, para adicionar o autoincremento no documento, se não, criar e adicionar ao map
          if (map.has(chave)) {
            documento = map.get(chave);
          } else {
            documento = `${vencimento.id_titulo}.${vencimento.id}.${autoIncrement}`;
            map.set(chave, documento);
            autoIncrement++;
          }

          // ^ Verificando se o documento já foi criado, para adicionar ao autoincremento, se não, criando e adicionando ao map
          if (valoresMap.has(documento)) {
            valoresMap.set(
              documento,
              parseFloat(valoresMap.get(documento)) + valorRateio
            );
          } else {
            valoresMap.set(documento, valorRateio);
          }

          datasys.push({
            "CNPJ Loja": vencimento.cnpj_loja,
            "CPF / CNPJ Fornecedor": vencimento.cnpj_fornecedor,
            "Documento": documento,
            "Emissão": new Date(vencimento.emissao),
            "Vencimento": new Date(vencimento.vencimento),
            "Valor": valorRateio.toFixed(2).replace('.', ','),
            "Tipo Documento": vencimento.tipo_documento?.toUpperCase() || '',
            "Historico": vencimento.historico.toUpperCase(),
            "BarCode": "",
            "Centro de Custos": rateio.centro_custo?.toUpperCase() || '',
            "Plano de Contas": rateio.plano_contas,
            "CNPJ Rateio": rateio.cnpj_rateio,
            "Valor Rateio": parseFloat(valorRateio.toFixed(2)),
            "ID TITULO": vencimento.id_titulo,
            "ID VENCIMENTO": vencimento.id_vencimento,
            "BANCO PG": rateio.banco_pg?.toUpperCase() || '',
            "DATA PG": new Date(vencimento.data_pagamento),
            "NOME FORNECEDOR": vencimento.nome_fornecedor?.toUpperCase() || '',
            PERCENTUAL: parseFloat(rateio.percentual),
          });
        }

        // ^ Adicionando o valor total dos rateios ao documento, usando os valores do map gerado anteriormente
        for (const linha of datasys) {
          if (valoresMap.has(linha["Documento"])) {
            linha["Valor"] = valoresMap.get(linha["Documento"]).toFixed(2).replace('.', ',');
          }
        }
      }

      // * Geração do buffer da planilha excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(datasys);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilha1');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      const filename = `EXPORTAÇÃO DATASYS ${formatDate(new Date(), 'dd-MM-yyyy hh.mm')}.xlsx`;

      res.set("Content-Type", 'text/plain');
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);

      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "EXPORT_DATASYS_TITULOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}
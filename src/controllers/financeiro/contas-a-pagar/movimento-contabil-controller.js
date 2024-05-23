const { endOfMonth, formatDate } = require("date-fns");
const path = require("path");
const { db } = require("../../../../mysql");
const { createUploadsPath, zipFiles } = require("../../files-controller");
const { normalizeCnpjNumber } = require("../../../helpers/mask");
const XLSX = require("xlsx");

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

      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
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
      reject(error);
    } finally {
      await conn.release();
    }
  });
}

function downloadMovimentoContabil(req, res) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      // ! Alterar o caminho para definição da conta bancária de borderô para extrato bancário
      // ^ id_grupo_economico - id_conta_bancaria - mes - ano
      const { id_grupo_economico, id_conta_bancaria, mes, ano } =
        req.query.filters || {};
      if (!id_grupo_economico) {
        throw new Error("ID GRUPO ECONÔMICO não informado");
      }
      if (!mes) {
        throw new Error("Mês não informado");
      }
      if (!ano) {
        throw new Error("Ano não informado");
      }
      await conn.beginTransaction();

      function gerarArrayDeDias(ano, mes) {
        const ultimoDia = endOfMonth(
          new Date(ano, parseInt(mes) - 1, 1)
        ).getDate();
        const diasArray = new Array(ultimoDia)
          .fill(0)
          .map((_, index) => index + 1);
        return diasArray;
      }

      const dias = gerarArrayDeDias(ano, mes);
      const items = [];

      if (id_conta_bancaria) {
        await appendItem(id_conta_bancaria);
      } else {
        const [contasBancarias] = await conn.execute(
          `
            SELECT cb.id FROM fin_contas_bancarias cb
            LEFT JOIN filiais f ON f.id = cb.id_filial 
            WHERE f.id_grupo_economico = ?
        `,
          [id_grupo_economico]
        );
        for (const conta_bancaria of contasBancarias) {
          console.log("Conta bancaria: " + conta_bancaria.nome);
          await appendItem(conta_bancaria.id);
        }
      }

      async function appendItem(idContaBancaria) {
        // * Obter os dados da conta bancária
        const [rowContaBancaria] = await conn.execute(
          `
            SELECT descricao FROM fin_contas_bancarias WHERE id = ?
        `,
          [idContaBancaria]
        );
        const contaBancaria = rowContaBancaria && rowContaBancaria[0];

        // *  Gerar objeto que representa a pasta na conta bancaria no zip
        const objConta = {
          type: "folder",
          folderName: `Relatório Contábil ${mes}-${ano} ${contaBancaria.descricao}`,
          items: [],
        };

        // * Array que recebe todos os titulos da conta_bancaria no período definido
        const itemsExcel = [];

        // * Passar por cada dia gerando uma pasta do dia e gerar os files
        for (const dia of dias) {
          console.log("DIA:", dia);
          const objDia = {
            type: "folder",
            folderName: dia.toString().padStart(2, "0"),
            items: [],
          };
          const params = [
            idContaBancaria,
            formatDate(new Date(ano, parseInt(mes) - 1, dia), "yyyy-MM-dd"),
            4,
          ];
          const [titulos] = await conn.execute(
            `
            SELECT 
                tv.id,
                tv.id_titulo, 
                ff.cnpj, ff.nome as nome_fornecedor,
                f.nome as filial, f.cnpj as cnpj_filial,
                t.descricao, t.num_doc, tv.valor, 
                tv.data_pagamento, cb.descricao as banco,
                t.url_nota_fiscal,
                t.url_xml,
                t.url_boleto,
                t.url_contrato,
                t.url_planilha,
                t.url_txt
            FROM fin_cp_titulos as t
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo  = t.id 
            LEFT JOIN filiais as f ON f.id = t.id_filial
            LEFT JOIN fin_cp_titulos_borderos as tb ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_bordero as b ON b.id = tb.id_bordero
            LEFT JOIN fin_fornecedores as ff ON ff.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias as cb ON cb.id = b.id_conta_bancaria
            WHERE 
            cb.id = ?
            AND DATE(tv.data_pagamento) = ?
            AND t.id_status = ?
            GROUP BY t.id
        `,
            params
          );

          if (!titulos || titulos.length == 0) {
            continue;
          }
          const tipos_anexos = [
            { name: "url_boleto", acronym: "BO", zipName: "Boletos.zip" },
            {
              name: "url_nota_fiscal",
              acronym: "NF",
              zipName: "NotasFiscais.zip",
            },
            { name: "url_contrato", acronym: "CT", zipName: "Contratos.zip" },
            { name: "url_txt", acronym: "TX", zipName: "Textos.zip" },
            { name: "url_planilha", acronym: "PL", zipName: "Planilhas.zip" },
          ];

          // * Adiciona os títulos no array do excel e no Objeto de dia
          titulos.forEach((vencimento) => {
            console.log("VENCIMENTO", vencimento);
            itemsExcel.push({
              "ID VENCIMENTO": vencimento.id,
              "ID TÍTULO": vencimento.id_titulo,
              "CPF/CNPJ": normalizeCnpjNumber(vencimento.cnpj || ""),
              "NOME FORNECEDOR": vencimento.nome_fornecedor || "",
              FILIAL: vencimento.filial || "",
              "CNPJ FILIAL": vencimento.cnpj_filial || "",
              DESCRIÇÃO: vencimento.descricao || "",
              "Nº DOC": vencimento.num_doc || "",
              "VALOR TÍTULO": vencimento.valor || "",
              "DT PAG": vencimento.data_pagamento || "",
              BANCO: vencimento.banco || "",
            });

            tipos_anexos.forEach((tipo) => {
              const url = vencimento[tipo.name];
              if (url) {
                const ext = path.extname(url);
                objDia.items.push({
                  type: "file",
                  fileName: `${tipo.acronym} ${vencimento.id}${ext}`,
                  content: createUploadsPath(url),
                });
              }
            });
          });

          // * Adicionar os titulos na pasta do dia
          objConta.items.push({ ...objDia });
        }

        // * Cria a matriz bidimensional com o cabeçalho como primeira linha
        if (itemsExcel.length > 1) {
          const cabecalhos = Object.keys(itemsExcel[0]);
          const matrizBidimensional = [cabecalhos];
          itemsExcel.forEach((item) => {
            const valores = cabecalhos.map((cabecalho) => item[cabecalho]);
            matrizBidimensional.push(valores);
          });

          // * Geração do buffer da planilha excel
          const workbook = XLSX.utils.book_new();
          const worksheet = XLSX.utils.aoa_to_sheet(matrizBidimensional);
          XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
          const excelBuffer = XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
          });

          // * Inserção do buffer da planilha no zip
          objConta.items.push({
            type: "buffer",
            fileName: `RELATÓRIO DE PAGAMENTO ${mes}-${ano} ${contaBancaria.descricao.toUpperCase()}.xlsx`,
            content: excelBuffer,
          });
        }
        // * Adicionar cada pasta referente às contas bancárias
        items.push(objConta);
      }

      const zip = await zipFiles({
        items: items,
      });
      const filename = `MOVIMENTO CONTABIL ${mes} ${ano}.zip`;
      res.set("Content-Type", "application/zip");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(zip);
      await conn.commit();
      resolve();
    } catch (error) {
      await conn.rollback();
      console.log("ERRO NO DOWNLOAD MOVIMENTO CONTABIL", error);
      reject(error);
    } finally {
      await conn.release();
    }
  });
}

module.exports = {
  getAll,
  downloadMovimentoContabil,
};

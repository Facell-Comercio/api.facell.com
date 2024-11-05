const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const fs = require("fs/promises");
const { remessaToObject } = require("../remessa/CNAB240/to-object");
const { normalizeCodigoBarras } = require("../remessa/CNAB240/to-string/masks");
const { ensureArray } = require("../../../helpers/formaters");
const XLSX = require("xlsx");
const { formatDate } = require("date-fns");

async function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      const { filters, pagination } = req.query;

      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const {
        id_filial,
        nome_fornecedor,
        cod_barras,
        vinculados,
        naoVinculados,
        filiais_list,
        tipo_data,
        range_data,
      } = filters || {};

      let where = ` WHERE 1=1 `;
      const params = [];

      if (vinculados !== undefined) {
        if (vinculados == "false") {
          where += ` AND dda.id_vencimento IS NULL `;
        }
      }
      if (id_filial) {
        where += ` AND f.id = ? `;
        params.push(id_filial);
      }

      if (nome_fornecedor) {
        where += ` AND  dda.nome_fornecedor LIKE CONCAT("%",?,"%")  `;
        params.push(nome_fornecedor);
      }

      if (cod_barras) {
        const codBarras = normalizeCodigoBarras(cod_barras);
        where += ` AND dda.cod_barras = ?  `;
        params.push(codBarras);
      }

      if (tipo_data && range_data) {
        const { from: data_de, to: data_ate } = range_data;
        if (data_de && data_ate) {
          where += ` AND dda.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            where += ` AND dda.${tipo_data} = '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            where += ` AND dda.${tipo_data} = '${data_ate.split("T")[0]}' `;
          }
        }
      }

      if (ensureArray(filiais_list)) {
        where += ` AND f.id IN(${ensureArray(filiais_list).join(",")}) `;
      }

      const offset = pageIndex * pageSize;

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(dda.id) AS qtde 
                FROM fin_dda as dda 
                LEFT JOIN filiais f ON f.cnpj = dda.cnpj_filial
                ${where}
                
                `,
        params
      );

      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
      params.push(pageSize);
      params.push(offset);

      const query = `
              SELECT 
                dda.*, 
                tv.status as status_vencimento,
                f.id as id_filial
              FROM fin_dda as dda
              LEFT JOIN filiais f ON f.cnpj = dda.cnpj_filial
              LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = dda.id_vencimento
              ${where}
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
        origin: "DDA",
        method: "GET_ALL",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function importDDA(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const files = req.files;
      if (!files || !files.length) {
        throw new Error("Arquivos não recebidos!");
      }

      let index = 1;
      const result = [];
      for (const file of files) {
        let resultFile = {
          erro: false,
          message: `Arquivo ${index}: Importação realizada`,
        };
        const filePath = file?.path;
        try {
          if (!filePath) {
            throw new Error("O arquivo não importado corretamente!");
          }

          // Ler e fazer parse do arquivo
          const data = await fs.readFile(filePath, "utf8");
          const objRemessa = await remessaToObject(data);

          let qtdeImportada = 0;
          // Passagem pelos lotes
          const lotes = objRemessa.lotes;

          if (!lotes || !lotes.length) {
            throw new Error("Aquivo vazio ou não foi possível acessar os lotes de boletos...");
          }
          for (const lote of lotes) {
            // Passagem pelos segmentos G
            const segmentos = lote.detalhe?.filter((d) => d.cod_seg_registro_lote === "G");

            if (!segmentos || !segmentos.length) {
              continue;
            }
            for (const segmento of segmentos) {
              const params = [
                String(lote.loteHeader.cnpj_empresa).padStart(14, "0"),
                segmento.banco,
                segmento.cod_barras,
                String(segmento.cnpj_fornecedor).padStart(14, "0"),
                segmento.nome_fornecedor,
                segmento.data_vencimento,
                segmento.valor,
                segmento.num_doc_cobranca,
                segmento.data_emissao,
                segmento.agencia,
                segmento.dac,
                segmento.carteira,
                segmento.especie_titulo,
              ];
              // console.log(params)
              await conn.execute(
                `INSERT IGNORE fin_dda 
                (
                  cnpj_filial,
                  cod_banco,
                  cod_barras,
                  cnpj_fornecedor,
                  nome_fornecedor,
                  data_vencimento,
                  valor,
                  documento,
                  data_emissao,
                  agencia,
                  dac,
                  modalidade_carteira,
                  especie_boleto
                ) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                params
              );

              qtdeImportada++;
            }
          }
        } catch (error) {
          resultFile.erro = true;
          resultFile.message = `Erro: ${error.message}`;
        } finally {
          index++;
          try {
            await fs.unlink(filePath);
          } catch (unlinkErr) {
            logger.error({
              module: "FINANCEIRO",
              origin: "DDA",
              method: "UNLINK IMPORT",
              data: {
                message: unlinkErr.message,
                stack: unlinkErr.stack,
                name: unlinkErr.name,
              },
            });
          }
          result.push(resultFile);
        }
      }

      await conn.commit();

      await autoVincularDDA();

      // resolve({ qtdeImportada })
      resolve(result);
    } catch (error) {
      await conn.rollback();
      logger.error({
        module: "FINANCEIRO",
        origin: "DDA",
        method: "IMPORT",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function autoVincularDDA() {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [boletos] = await conn.execute(`
        SELECT 
          id, cnpj_filial, cnpj_fornecedor, valor
        FROM fin_dda WHERE id_vencimento IS NULL AND id_fatura IS NULL
      `);

      for (const boleto of boletos) {
        boleto.vinculado = false;
        boleto.id_vencimento = null;
        boleto.id_fatura = null;
        boleto.mensagem = null;

        const params = [boleto.valor, boleto.cnpj_filial, boleto.cnpj_fornecedor];
        // console.log(params)
        const [rowVencimento] = await conn.execute(
          `SELECT
              v.id, v.valor, f.cnpj as cnpj_filial, ff.cnpj as cnpj_fornecedor
            FROM fin_cp_titulos_vencimentos v 
            INNER JOIN fin_cp_titulos t ON t.id = v.id_titulo
            LEFT JOIN fin_dda dda ON dda.id_vencimento = v.id 
            LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
            LEFT JOIN filiais f ON f.id = t.id_filial
            WHERE 
              dda.id_vencimento IS NULL
              AND dda.id_fatura IS NULL
              AND v.valor = ?
              AND f.cnpj = ?
              AND ff.cnpj = ?
            LIMIT 1
            `,
          params
        );
        const vencimento = rowVencimento && rowVencimento[0];

        const [rowFatura] = await conn.execute(
          `SELECT
              ccf.id, ccf.valor, f.cnpj as cnpj_filial, ff.cnpj as cnpj_fornecedor
            FROM fin_cartoes_corporativos_faturas ccf
            LEFT JOIN fin_cartoes_corporativos cc ON cc.id = ccf.id_cartao
            LEFT JOIN fin_dda dda ON dda.id_fatura = ccf.id 
            LEFT JOIN fin_fornecedores ff ON ff.id = cc.id_fornecedor
            LEFT JOIN filiais f ON f.id = cc.id_matriz
            WHERE
              dda.id_vencimento IS NULL
              AND dda.id_fatura IS NULL
              AND ccf.valor = ?
              AND f.cnpj = ?
              AND ff.cnpj = ?
            LIMIT 1
            `,
          params
        );
        const fatura = rowFatura && rowFatura[0];

        if (vencimento && fatura) {
          boleto.mensagem = `O DDA de id ${boleto.id} pode ser vinculado tanto com um boleto como com uma fatura`;
          continue;
        }
        if (vencimento) {
          await conn.execute(`UPDATE fin_dda SET id_vencimento = ? WHERE id = ?`, [
            vencimento.id,
            boleto.id,
          ]);
          (boleto.vinculado = true), (boleto.id_vencimento = vencimento.id);
        }
        if (fatura) {
          await conn.execute("UPDATE fin_dda SET id_fatura = ? WHERE id = ?", [
            fatura.id,
            boleto.id,
          ]);
          (boleto.vinculado = true), (boleto.id_fatura = fatura.id);
        }

        // console.log({
        //     match: !!vencimento,
        //     boleto,
        //     vencimento
        // })
      }
      await conn.commit();
      resolve(boletos);
    } catch (error) {
      await conn.rollback();
      logger.error({
        module: "FINANCEIRO",
        origin: "DDA",
        method: "AUTOVINCULAR",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function exportDDA(req, res) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      const { filters } = req.query;

      const {
        id_filial,
        nome_fornecedor,
        cod_barras,
        vinculados,
        naoVinculados,
        filiais_list,
        tipo_data,
        range_data,
      } = filters || {};

      let where = ` WHERE 1=1 `;
      const params = [];

      if (vinculados !== undefined) {
        if (vinculados == "false") {
          where += ` AND dda.id_vencimento IS NULL `;
        }
      }
      if (id_filial) {
        where += ` AND f.id = ? `;
        params.push(id_filial);
      }

      if (nome_fornecedor) {
        where += ` AND  dda.nome_fornecedor LIKE CONCAT("%",?,"%")  `;
        params.push(nome_fornecedor);
      }

      if (cod_barras) {
        const codBarras = normalizeCodigoBarras(cod_barras);
        where += ` AND dda.cod_barras = ?  `;
        params.push(codBarras);
      }

      if (tipo_data && range_data) {
        const { from: data_de, to: data_ate } = range_data;
        if (data_de && data_ate) {
          where += ` AND dda.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            where += ` AND dda.${tipo_data} = '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            where += ` AND dda.${tipo_data} = '${data_ate.split("T")[0]}' `;
          }
        }
      }

      if (ensureArray(filiais_list)) {
        where += ` AND f.id IN(${ensureArray(filiais_list).join(",")}) `;
      }

      const [boletos] = await conn.execute(
        `
        SELECT dda.* FROM fin_dda as dda
        LEFT JOIN filiais f ON f.cnpj = dda.cnpj_filial
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = dda.id_vencimento
        ${where}`,
        params
      );

      // * Geração do buffer da planilha excel
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(boletos);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
      const filename = `EXPORTACAO DDA ${formatDate(new Date(), "dd-MM-yyyy hh.mm")}.xlsx`;

      res.set("Content-Type", "text/plain");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);

      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "DDA",
        method: "EXPORTAR",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function limparDDA() {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      // * Apaga todos os boletos do DDA que não estejam vinculados a Vencimentos e que sejam +30 dias inferior à data atual
      await conn.execute(
        "DELETE FROM fin_dda WHERE id_vencimento IS NULL and data_emissao < DATE_SUB(NOW(), INTERVAL 30 DAY)"
      );
      resolve(true);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "DDA",
        method: "LIMPAR",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function vincularDDA(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { id_vencimento, id_forma_pagamento, id_dda } = req.body;
      if (!id_vencimento) {
        throw new Error("ID do vencimento não informado!");
      }
      if (!id_dda) {
        throw new Error("ID do DDA não informado!");
      }
      if (!id_forma_pagamento) {
        throw new Error("ID da forma de pagamento não informado!");
      }

      const isFatura = id_forma_pagamento === 6;
      const columnName = isFatura ? "id_fatura" : "id_vencimento";

      // ^ Verificar se o Vencimento ou a fatura existe
      if (isFatura) {
        const [rowVencimento] = await conn.execute(
          `SELECT id FROM fin_cartoes_corporativos_faturas WHERE id = ?`,
          [id_vencimento]
        );
        if (rowVencimento && !rowVencimento.length) {
          throw new Error(`Fatura de ID ${id_vencimento} não existe!`);
        }
      } else {
        const [rowVencimento] = await conn.execute(
          `SELECT id FROM fin_cp_titulos_vencimentos WHERE id = ? AND id_fatura IS NULL`,
          [id_vencimento]
        );
        if (rowVencimento && !rowVencimento.length) {
          throw new Error(`Vencimento de ID ${id_vencimento} não existe!`);
        }
      }

      // ^ Verificar se vencimento já foi vinculado
      const [rowVencimentosVinculados] = await conn.execute(
        `SELECT id, cod_barras FROM fin_dda WHERE ${columnName} = ?`,
        [id_vencimento]
      );
      if (rowVencimentosVinculados && rowVencimentosVinculados.length > 0) {
        throw new Error(
          `${
            isFatura ? "Fatura" : "Vencimento"
          } de ID ${id_vencimento} já foi vinculado com o DDA ID: ${
            rowVencimentosVinculados[0]["id"]
          }, código de barras: ${rowVencimentosVinculados[0]["cod_barras"]}!`
        );
      }

      //^ Verificar se o registro no DDA já consta vinculado
      const [rowDDA] = await conn.execute(
        `SELECT id, id_vencimento, id_fatura FROM fin_dda WHERE id = ?`,
        [id_dda]
      );

      if (!rowDDA && !rowDDA.length) {
        throw new Error(`Registro ${id_dda} do DDA não existe!`);
      }
      const DDAbanco = rowDDA && rowDDA[0];
      //^ Se tem ID Vencimento no DDA então já está vinculado:
      if (isFatura ? DDAbanco.id_fatura : DDAbanco.id_vencimento) {
        throw new Error(
          `Registro ${id_dda} do DDA já consta como vinculado, não deu para vincular com o ${columnName} ${
            isFatura ? DDAbanco.id_forma_pagamento : DDAbanco.id_vencimento
          }`
        );
      }

      // * Vinculação
      await conn.execute(`UPDATE fin_dda SET ${columnName} = ? WHERE id = ?`, [
        id_vencimento,
        id_dda,
      ]);
      resolve(true);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "DDA",
        method: "VINCULAR_DDA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function desvincularDDA(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      const { id_dda } = req.body;
      if (!id_dda) {
        throw new Error("ID do DDA não informado!");
      }

      // ^ Obter o DDA
      const [rowDDA] = await conn.execute(
        `SELECT id, id_vencimento, id_fatura FROM fin_dda WHERE id = ?`,
        [id_dda]
      );

      if (!rowDDA && !rowDDA.length) {
        throw new Error(`Registro ${id_dda} do DDA não existe!`);
      }
      const DDAbanco = rowDDA && rowDDA[0];
      if (DDAbanco.id_vencimento) {
        //^ Obter o Vencimento:
        const [rowVencimento] = await conn.execute(
          `SELECT id, status FROM fin_cp_titulos_vencimentos WHERE id = ?`,
          [DDAbanco.id_vencimento]
        );
        const vencimento = rowVencimento && rowVencimento[0];
        if (vencimento && (vencimento.status == "pago" || vencimento.status == "programado")) {
          throw new Error(
            `Vencimento ${vencimento.id} do já consta como pago ou já foi programado para pagamento!`
          );
        }

        // * Desvinculação
        await conn.execute(`UPDATE fin_dda SET id_vencimento = ? WHERE id = ?`, [null, id_dda]);
      }
      if (DDAbanco.id_fatura) {
        //^ Obter a Fatura:
        const [rowFatura] = await conn.execute(
          `SELECT id, status FROM fin_cartoes_corporativos_faturas WHERE id = ?`,
          [DDAbanco.id_fatura]
        );
        const fatura = rowFatura && rowFatura[0];
        if (fatura && (fatura.status == "pago" || fatura.status == "programado")) {
          throw new Error(
            `Fatura ${fatura.id} já consta como pago ou já foi programado para pagamento!`
          );
        }

        // * Desvinculação
        await conn.execute(`UPDATE fin_dda SET id_fatura = ? WHERE id = ?`, [null, id_dda]);
      }
      resolve(true);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "DDA",
        method: "DESVINCULAR_DDA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  importDDA,
  exportDDA,
  limparDDA,
  autoVincularDDA,
  vincularDDA,
  desvincularDDA,
};

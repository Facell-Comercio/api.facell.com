const { formatDate, addDays } = require("date-fns");
const { db } = require("../../../../../../mysql");

const {
  createHeaderArquivo,
  createDetalheArquivo,
  createTrailerArquivo,
} = require("../../../remessa/CNAB400/to-string");
const { logger } = require("../../../../../../logger");
const { addDiasUteis } = require("../../../remessa/CNAB400/helper");
const { removeSpecialCharactersAndAccents } = require("../../../../../helpers/mask");
require('dotenv').config();

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    const { id_grupo_economico, id_conta_bancaria, id_boleto } = req.body;

    let conn;
    try {
      conn = await db.getConnection();

      if (!id_grupo_economico) {
        throw new Error("ID grupo econômico não indicado!");
      }
      if (!id_conta_bancaria) {
        throw new Error("ID da conta bancária não informada!");
      }

      await conn.beginTransaction();

      //* DADOS MATRIZ GRUPO ECONÔMICO
      const [rowsMatriz] = await conn.execute(
        `
        SELECT 
          f.cnpj as num_inscricao, cb.agencia, cb.conta,
          cb.dv_conta as dac, f.razao as empresa_nome, b.codigo as banco,
          b.nome as nome_banco, ge.nome as grupo_economico
        FROM grupos_economicos ge
        LEFT JOIN filiais f ON f.id = ge.id_matriz
        LEFT JOIN fin_contas_bancarias cb ON cb.id_filial = ge.id_matriz
        LEFT JOIN fin_bancos b ON b.id = cb.id_banco
        WHERE ge.id = ?
        AND cb.id = ?
        AND f.tim_cod_sap IS NOT NULL
        `,
        [id_grupo_economico, id_conta_bancaria]
      );
      const matriz = rowsMatriz && rowsMatriz[0];

      if (!matriz) {
        throw new Error("Houve algum erro na geração, tente contatar o time de desenvolvimento");
      }

      // Verifica se é CPF ou CNPJ
      // const empresa_tipo_insc = borderoData.num_inscricao.length === 11 ? 1 : 2;

      // * BOLETOS:
      const [boletos] = await conn.execute(
        `
        SELECT
          boleto.*, boleto.valor as valor_titulo, f.cnpj as num_inscricao_pagador,
          f.nome as nome_pagador, f.logradouro, f.municipio, f.municipio as cidade,
          f.cep, f.uf
        FROM datasys_caixas_boletos boleto
        LEFT JOIN filiais f ON f.id = boleto.id_filial
        WHERE ${id_boleto ? "boleto.id = ?" : "f.id_grupo_economico = ?"}
        AND f.tim_cod_sap IS NOT NULL
        AND (boleto.status = 'aguardando_emissao' OR boleto.status = 'erro')
      `,
        [id_boleto || id_grupo_economico]
      );

      const arquivo = [];

      let num_sequencial = 1;
      const data_emissao = new Date();
      const data_vencimento = addDiasUteis(data_emissao, 3)

      const headerArquivo = createHeaderArquivo({
        ...matriz,
        data_emissao,
        num_sequencial,
      });

      arquivo.push(headerArquivo);

      let emails = []

      for (const boleto of boletos) {
        ++num_sequencial;
        const segmentoDetalhe = createDetalheArquivo({
          ...matriz,
          ...boleto,
          data_emissao,
          data_vencimento,
          num_sequencial,
          uso_empresa: boleto.id,
          nosso_numero: boleto.id,
          num_doc: boleto.id,
        });
        arquivo.push(segmentoDetalhe);

        // * OBTEMOS OS RECEPTORES DO BOLETO..
        const [receptores] = await conn.execute(
          `
          SELECT dcrb.email FROM datasys_caixas_receptores_boletos dcrb
          LEFT JOIN datasys_caixas_boletos dcb ON dcb.id_filial = dcrb.id_filial
          LEFT JOIN filiais f ON f.id = dcrb.id_filial
          WHERE dcb.id = ?`,
          [boleto.id]
        );

        if (receptores.length > 0) {
          const emails_receptores = receptores?.map((boleto) => boleto.email);
          const link =
            process.env.NODE_ENV === "production"
              ? `https://api.facell.com/visualizar.boleto.caixa?id=${boleto.id}`
              : `http://localhost:7000/visualizar.boleto.caixa?id=${boleto.id}`;

          emails.push({
            destinatarios: [emails_receptores],
            assunto: `Novo Boleto Criado - ${normalizeCurrency(
              boleto.valor
            )} - Vencimento ${formatDate(data_vencimento, "dd/MM/yyyy")}`,
            corpo_html: `
                  <p>Valor: ${normalizeCurrency(boleto.valor)}<br/>
                  Data de emissão:  ${formatDate(data_emissao, "dd/MM/yyyy")}<br/>
                  Data de vencimento: ${formatDate(data_vencimento, "dd/MM/yyyy")}<br/>
                  Aguarde ao menos 15 minutos após o recebimento deste email para realização do pagamento!<br/>
                  Link para visualizar o boleto:</p>
                  <a href='${link}'>${link}</a>
                `,
          })
        }


        // * ATUALIZAÇÃO DO BOLETO:
        await conn.execute(`UPDATE datasys_caixas_boletos 
          SET 
            status = 'emitido',
            data_emissao = ?,
            data_vencimento = ?,
            documento = ?,
            nosso_numero = ?, 
            id_conta_bancaria = ? 
          WHERE id = ?`, [
          data_emissao,
          data_vencimento,
          boleto.id,
          boleto.id,
          boleto.id,
          id_conta_bancaria,
        ]);
      }

      // * REGISTRO DA EXPORTAÇÃO:
      await conn.execute(
        `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (?,?,?)`,
        [
          req.user.id,
          "EXPORT_REMESSA_BOLETO_CAIXA",
          `Foram exportados ${boletos.length} boletos para o grupo econômico ${matriz.grupo_economico}!`,
        ]
      );

      ++num_sequencial;
      const trailerArquivo = createTrailerArquivo({
        num_sequencial,
      });

      arquivo.push(trailerArquivo);

      // * ENVIO DO ARQUIVO
      const fileBuffer = Buffer.from(arquivo.join("\r\n") + "\r\n", "utf-8");
      const filename = `REMESSA BOLETO - ${formatDate(
        data_emissao,
        "dd_MM_yyyy"
      )} - ${removeSpecialCharactersAndAccents(
        matriz.grupo_economico
      ).toUpperCase()}.txt`.toUpperCase();
      res.set("Content-Type", "text/plain");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(fileBuffer);


      //* Dispara os emails:
      for (const email of emails) {
        await enviarEmail(email);
      }

      await conn.commit();
      // await conn.rollback();
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "EXPORT_REMESSA_BOLETO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};

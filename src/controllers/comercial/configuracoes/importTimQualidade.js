const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const { importFromExcel } = require("../../../helpers/lerXML");
const { excelDateToJSDate } = require("../../../helpers/mask");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const user = req.user;
    conn = conn_externa || (await db.getConnection());

    const files = req.files;
    if (!files || !files.length) {
      throw new Error("Arquivos não recebidos!");
    }
    let qtdeLinhas = 0;
    for (const file of files) {
      const filePath = file?.path;
      if (!filePath) {
        throw new Error("É necessário informar um arquivo!");
      }

      const excelFileList = importFromExcel(filePath);
      let totalLinhas = excelFileList.length;
      const arrayLinhas = [];
      const maxLength = 10000;

      // Implementar aqui a lógica de processamento dos arquivos
      // Exemplo: Importar dados do arquivo, validar, salvar em um banco de dados etc.

      for (const linha of excelFileList) {
        const data = excelDateToJSDate(linha.mes_divulgacao);
        arrayLinhas.push(`(
          ${db.escape(linha.grupo_economico == "FACELL LTDA" ? "FACELL" : "FORTTELECOM")},
          ${db.escape(data.getFullYear())},
          ${db.escape(data.getMonth() + 1)},
          ${db.escape(excelDateToJSDate(linha.mes))},
          ${db.escape(excelDateToJSDate(linha.mes_referencia))},
          ${db.escape(excelDateToJSDate(linha.mes_divulgacao))},
          ${db.escape(linha.cod_politica_comercial_consumer)},
          ${db.escape(linha.sky_contrato)},
          ${db.escape(linha.acesso)},
          ${db.escape(linha.identificador)},
          ${db.escape(linha.dimensao_grupo)},
          ${db.escape(linha.dimensao_indicador)},
          ${db.escape(linha.login)},
          ${db.escape(linha.nivel_plano)},
          ${db.escape(linha.pacote_minuto)},
          ${db.escape(linha.cidade_pdv)},
          ${db.escape(linha.cidade_cliente)},
          ${db.escape(linha.tipo_produto)},
          ${db.escape(linha.produto)},
          ${db.escape(linha.cod_operadora)},
          ${db.escape(linha.operadora_n1)},
          ${db.escape(linha.operadora_cadtim)},
          ${db.escape(linha.canal_ge)},
          ${db.escape(linha.cod_grupo_economico)},
          ${db.escape(linha.segmento_crc)},
          ${db.escape(linha.classificacao_crc)},
          ${db.escape(linha.custcode)},
          ${db.escape(linha.ddd)},
          ${db.escape(linha.tipo_familia_plano)},
          ${db.escape(linha.tecnologia)},
          ${db.escape(linha.voz_dados)},
          ${db.escape(linha.flg_grupo_contrato)},
          ${db.escape(linha.flg_contrato_principal)},
          ${db.escape(linha.dsc_pacote_dados)},
          ${db.escape(linha.tipo_portabilidade)},
          ${db.escape(linha.motivo_fraude)},
          ${db.escape(linha.fraude)},
          ${db.escape(linha.inadimplencia_m4)},
          ${db.escape(linha.recompra)},
          ${db.escape(linha.pos_pre_pos)},
          ${db.escape(linha.downgrade_pre)},
          ${db.escape(linha.downgrade_controle)},
          ${db.escape(linha.suspensos)},
          ${db.escape(linha.churn)},
          ${db.escape(linha.rec_controle_pos)},
          ${db.escape(linha.ativos)},
          ${db.escape(linha.total)},
          ${db.escape(excelDateToJSDate(linha.dt_carga))}
          )
        `);

        if (arrayLinhas.length === maxLength || totalLinhas === 1) {
          const queryInsert = `
          INSERT IGNORE INTO tim_qualidade_total (
              grupo_economico,
              ano,
              mes,
              mes_data,
              mes_referencia,
              mes_divulgacao,
              cod_politica_comercial_consumer,
              sky_contrato,
              acesso,
              identificador,
              dimensao_grupo,
              dimensao_indicador,
              login,
              nivel_plano,
              pacote_minuto,
              cidade_pdv,
              cidade_cliente,
              tipo_produto,
              produto,
              cod_operadora,
              operadora_n1,
              operadora_cadtim,
              canal_ge,
              cod_grupo_economico,
              segmento_crc,
              classificacao_crc,
              custcode,
              ddd,
              tipo_familia_plano,
              tecnologia,
              voz_dados,
              flg_grupo_contrato,
              flg_contrato_principal,
              dsc_pacote_dados,
              tipo_portabilidade,
              motivo_fraude,
              fraude,
              inadimplencia_m4,
              recompra,
              pos_pre_pos,
              downgrade_pre,
              downgrade_controle,
              suspensos,
              churn,
              rec_controle_pos,
              ativos,
              total,
              dt_carga
            ) VALUES
            ${arrayLinhas.join(",")}
          `;

          await conn.execute(queryInsert);
          arrayLinhas.length = 0;
        }

        totalLinhas--;
        qtdeLinhas++;
      }
      // console.log(excelFileList.length);
    }

    if (qtdeLinhas > 0) {
      await conn.execute(
        `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (?,?,?)`,
        [user.id, "IMPORT_TIM_QUALIDADE", `Foram importados ${qtdeLinhas} registros!`]
      );
    }

    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "COMISSIONAMENTO",
      method: "IMPORT_TIM_QUALIDADE",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};

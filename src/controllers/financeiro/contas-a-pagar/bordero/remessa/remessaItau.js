const { formatDate } = require("date-fns");
const {
  normalizeNumberOnly,
  normalizeURLChaveEnderecamentoPIX,
} = require("../../../../../helpers/mask");
const {
  createHeaderArquivo,
  createHeaderLote,
  createSegmentoA,
  createTrailerLote,
  createTrailerArquivo,
  createSegmentoB,
  createSegmentoJ,
  createSegmentoJ52Pix,
  createSegmentoJ52,
  createSegmentoO,
} = require("../../../remessa/CNAB240/to-string");
const { normalizeValue } = require("../../../remessa/CNAB240/to-string/masks");
const { logger } = require("../../../../../../logger");

module.exports = ({ formasPagamento, empresa_tipo_insc, borderoData, conn_externa }) => {
  return new Promise(async (resolve, reject) => {
    let conn = conn_externa;
    const codigo_banco = 341;

    try {
      if (!formasPagamento) {
        throw new Error("Formas de pagamento não informadas.");
      }
      if (!empresa_tipo_insc) {
        throw new Error("Tipo de inscrição da empresa não informado.");
      }
      if (!borderoData) {
        throw new Error("Bordero não informado.");
      }
      if (!conn_externa) {
        throw new Error("Conexão externa não disponível.");
      }

      const arquivo = [];

      let lote = 0;
      let qtde_registros_arquivo = 0;
      const dataCriacao = new Date();
      const headerArquivo = createHeaderArquivo({
        ...borderoData,
        banco: codigo_banco,
        empresa_tipo_insc,
        arquivo_data_geracao: formatDate(dataCriacao, "ddMMyyyy"),
        arquivo_hora_geracao: formatDate(dataCriacao, "HHmmss"),
      });
      arquivo.push(headerArquivo);
      qtde_registros_arquivo++;

      for (const [key, formaPagamento] of formasPagamento) {
        if (!formaPagamento.length) continue;
        let qtde_registros = 0;
        let somatoria_valores = 0;
        ++lote;

        let forma_pagamento = 6;
        switch (key) {
          case "PagamentoCorrente":
            forma_pagamento = 1;
            break;
          case "PagamentoPoupanca":
            forma_pagamento = 5;
            break;
          case "PagamentoCorrenteMesmaTitularidade":
            forma_pagamento = 6;
            break;
          case "PagamentoBoleto":
            forma_pagamento = 30;
            break;
          case "PagamentoFaturaBoleto":
            forma_pagamento = 30;
            break;
          case "PagamentoBoletoOutroBanco":
            forma_pagamento = 31;
            break;
          case "PagamentoFaturaBoletoOutroBanco":
            forma_pagamento = 31;
            break;
          case "PagamentoTEDOutroTitular":
            forma_pagamento = 41;
            break;
          case "PagamentoTEDMesmoTitular":
            forma_pagamento = 43;
            break;
          case "PagamentoPIX":
            forma_pagamento = 45;
            break;
          case "PagamentoPIXQRCode":
            forma_pagamento = 47;
            break;
          case "PagamentoTributosCodBarras":
            forma_pagamento = 91;
            break;
          case "PagamentoBoletoImpostos":
            forma_pagamento = 13; //! Validar se essa realmente é a forma de pagamento correta
            break;
        }

        //* Dependendo do tipo de pagamento o layout do lote muda
        if (
          key !== "PagamentoBoleto" &&
          key !== "PagamentoBoletoOutroBanco" &&
          key !== "PagamentoPIXQRCode" &&
          key !== "PagamentoTributosCodBarras" &&
          key !== "PagamentoBoletoImpostos"
        ) {
          const headerLote = createHeaderLote({
            ...borderoData,
            empresa_tipo_insc,
            lote,
            banco: codigo_banco,
            forma_pagamento,
          });
          arquivo.push(headerLote);
        } else {
          const headerLote = createHeaderLote({
            ...borderoData,
            lote,
            banco: codigo_banco,
            forma_pagamento,
            tipo_pagamento: key === "PagamentoTributosCodBarras" ? "22" : "20",
            versao_layout: "030",
          });
          arquivo.push(headerLote);
        }

        qtde_registros++;
        qtde_registros_arquivo++;

        let registroLote = 1;
        for (const pagamento of formaPagamento) {
          let query = `
          SELECT DISTINCT
              tv.id as id_vencimento,  
              fb.codigo as cod_banco_favorecido,
              forn.agencia,
              forn.dv_agencia,
              forn.conta,
              forn.dv_conta,
              forn.favorecido as favorecido_nome,
              DATE_FORMAT(tv.data_prevista, '%d/%m/%Y') as data_pagamento,
              DATE_FORMAT(tv.data_prevista, '%d/%m/%Y') as data_vencimento,
              tv.valor as valor_pagamento,
              forn.cnpj_favorecido as favorecido_cnpj,
              t.id_tipo_chave_pix,
              t.chave_pix,
              tv.qr_code,
              COALESCE(dda.cod_barras, tv.cod_barras) as cod_barras
            FROM fin_cp_titulos t
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
            WHERE tv.id = ?
          `;
          if (key === "PagamentoFaturaBoleto" || key === "PagamentoFaturaBoletoOutroBanco") {
            query = `
            SELECT DISTINCT
              ccf.id as id_vencimento,
              fb.codigo as cod_banco_favorecido,
              forn.agencia,
              forn.dv_agencia,
              forn.conta,
              forn.dv_conta,
              forn.favorecido as favorecido_nome,
              DATE_FORMAT(ccf.data_prevista, '%d/%m/%Y') as data_pagamento,
              DATE_FORMAT(ccf.data_prevista, '%d/%m/%Y') as data_vencimento,
              ccf.valor as valor_pagamento,
              forn.cnpj_favorecido as favorecido_cnpj,
              COALESCE(dda.cod_barras, ccf.cod_barras) as cod_barras
            FROM fin_cartoes_corporativos_faturas ccf
            LEFT JOIN fin_cartoes_corporativos cc ON cc.id = ccf.id_cartao
            LEFT JOIN fin_fornecedores forn ON forn.id = cc.id_fornecedor
            LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
            LEFT JOIN fin_dda dda ON dda.id_fatura = ccf.id
            WHERE ccf.id = ?
            `;
          }

          const [rowVencimento] = await conn.execute(query, [pagamento.id_vencimento]);

          const vencimento = rowVencimento && rowVencimento[0];

          const isFatura =
            key === "PagamentoFaturaBoleto" || key === "PagamentoFaturaBoletoOutroBanco";
          // console.log(vencimento);
          //* Verifica se é cpf ou cnpj
          if (!vencimento.favorecido_cnpj) {
            throw new Error(
              `Vencimento ${vencimento.id_vencimento}, fornecedor não tem o cnpj do favorecido ${vencimento.favorecido_nome}.`
            );
          }
          const favorecido_tipo_insc = vencimento.favorecido_cnpj.length === 11 ? 1 : 2;

          //* Dependendo do banco o modelo muda
          let agencia = [];
          if (vencimento.banco === codigo_banco) {
            agencia.push(
              0,
              normalizeValue(vencimento.agencia, "numeric", 4),
              " ",
              new Array(6).fill(0).join(""),
              normalizeValue(vencimento.conta, "numeric", 6),
              " ",
              normalizeValue(
                parseInt(vencimento.dv_conta) || parseInt(vencimento.dv_agencia),
                "numeric",
                1
              )
            );
          } else {
            agencia.push(
              normalizeValue(vencimento.agencia, "numeric", 5),
              " ",
              normalizeValue(vencimento.conta, "numeric", 12),
              " ",
              normalizeValue(
                parseInt(vencimento.dv_conta) || parseInt(vencimento.dv_agencia),
                "alphanumeric",
                1
              )
            );
          }
          //* O segmento A só é gerado se o tipo de pagamento não é boleto ou pix qr code
          if (
            key === "PagamentoPIX" ||
            key === "PagamentoTEDOutroTitular" ||
            key === "PagamentoTEDMesmoTitular" ||
            key === "PagamentoCorrente" ||
            key === "PagamentoPoupanca" ||
            key === "PagamentoCorrenteMesmaTitularidade"
          ) {
            const segmentoA = createSegmentoA({
              ...vencimento,
              codigo_banco,
              lote,
              banco: codigo_banco,
              num_registro_lote: registroLote,
              //* Quando um pagamento é do tipo PIX Transferência o código câmara é 009
              cod_camara: key === "PagamentoPIX" && 9,
              agencia: agencia.join(""),
              ident_transferencia: key === "PagamentoPIX" && "04", //^^ Verificar se está correto
              cod_banco_favorecido:
                key === "PagamentoPIX"
                  ? new Array(3).fill(0).join("")
                  : vencimento.cod_banco_favorecido,
            });
            arquivo.push(segmentoA);
            qtde_registros++;
            qtde_registros_arquivo++;
          }

          if (key === "PagamentoBoletoImpostos" || key === "PagamentoTributosCodBarras") {
            const segmentoO = createSegmentoO({
              ...vencimento,
              codigo_banco,
              lote,
              banco: codigo_banco,
              num_registro_lote: registroLote,
              cod_barras: vencimento.cod_barras,
              nome_concessionaria: vencimento.favorecido_nome,
            });
            arquivo.push(segmentoO);
            qtde_registros++;
            qtde_registros_arquivo++;
          }

          if (key === "PagamentoPIXQRCode") {
            //* Pagamento PIX QR Code
            const segmentoJ = createSegmentoJ({
              ...vencimento,
              codigo_banco,
              lote,
              banco: codigo_banco,
              num_registro_lote: registroLote,
              valor_titulo: vencimento.valor_pagamento,
            });
            registroLote++;
            const segmentoJ52Pix = createSegmentoJ52Pix({
              ...vencimento,
              codigo_banco,
              lote,
              banco: codigo_banco,
              num_registro_lote: registroLote,
              inscricao_sacado: empresa_tipo_insc,
              num_inscricao_sacado: borderoData.cnpj_empresa,
              nome_sacado: borderoData.empresa_nome,
              inscricao_cedente: favorecido_tipo_insc,
              num_inscricao_cedente: vencimento.favorecido_cnpj,
              nome_cedente: vencimento.favorecido_nome,
              chave_pagamento: normalizeURLChaveEnderecamentoPIX(vencimento.qr_code),
            });
            arquivo.push(segmentoJ);
            arquivo.push(segmentoJ52Pix);
            qtde_registros += 2;
            qtde_registros_arquivo += 2;
          }

          if (
            key === "PagamentoBoleto" ||
            key === "PagamentoBoletoOutroBanco" ||
            key === "PagamentoFaturaBoleto" ||
            key === "PagamentoFaturaBoletoOutroBanco"
          ) {
            //* Pagamento Boleto
            //todo Adicionar os valores de sacado e cedente
            const segmentoJ = createSegmentoJ({
              ...vencimento,
              codigo_banco,
              lote,
              banco: codigo_banco,
              num_registro_lote: registroLote,
              valor_titulo: vencimento.valor_pagamento,
              cod_barras: vencimento.cod_barras,
              id_vencimento: isFatura ? `F${vencimento.id_vencimento}` : vencimento.id_vencimento,
            });
            registroLote++;
            const segmentoJ52 = createSegmentoJ52({
              ...vencimento,
              codigo_banco,
              lote,
              banco: codigo_banco,
              num_registro_lote: registroLote,
              inscricao_sacado: empresa_tipo_insc,
              num_inscricao_sacado: borderoData.cnpj_empresa,
              nome_sacado: borderoData.empresa_nome,
              inscricao_cedente: favorecido_tipo_insc,
              num_inscricao_cedente: vencimento.favorecido_cnpj,
              nome_cedente: vencimento.favorecido_nome,
            });
            arquivo.push(segmentoJ);
            arquivo.push(segmentoJ52);
            qtde_registros += 2;
            qtde_registros_arquivo += 2;
          }

          somatoria_valores += parseFloat(vencimento.valor_pagamento);

          let tipo_chave = "00";
          let chave_pix = vencimento.chave_pix;
          if (key === "PagamentoPIX") {
            switch (vencimento.id_tipo_chave_pix) {
              case 1:
                // Aleatória
                tipo_chave = "04";
                break;
              case 2:
                // E-mail
                tipo_chave = "02";
                break;
              case 3:
                // Celular
                tipo_chave = "01";
                chave_pix = "+55" + normalizeNumberOnly(chave_pix);
                break;
              case 4:
                // CPF
                tipo_chave = "03";
                chave_pix = normalizeNumberOnly(chave_pix);
                break;
              case 5:
                // CNPJ
                tipo_chave = "03";
                chave_pix = normalizeNumberOnly(chave_pix);
                break;
            }

            const segmentoB = createSegmentoB({
              ...vencimento,
              codigo_banco,
              lote,
              banco: codigo_banco,
              num_seq_registro_lote: registroLote,
              tipo_chave,
              favorecido_tipo_insc,
              num_inscricao: vencimento.favorecido_cnpj,
              txid: vencimento.id_vencimento,
              chave_pix,
            });
            arquivo.push(segmentoB);
            qtde_registros++;
            qtde_registros_arquivo++;
          }

          registroLote++;

          //* Marcando vencimento como já incluso em uma remessa
          await conn.execute(
            `
              UPDATE fin_cp_bordero_itens
              SET remessa = ?
              WHERE id_vencimento = ?
            `,
            [true, vencimento.id_vencimento]
          );
        }
        qtde_registros++;
        qtde_registros_arquivo++;
        const trailerLote = createTrailerLote({
          ...borderoData,
          lote,
          banco: codigo_banco,
          qtde_registros,
          somatoria_valores: somatoria_valores.toFixed(2).replace(".", ""),
        });

        arquivo.push(trailerLote);
      }

      qtde_registros_arquivo++;
      const trailerArquivo = createTrailerArquivo({
        qtde_lotes: lote,
        codigo_banco,
        banco: codigo_banco,
        qtde_registros_arquivo,
      });
      arquivo.push(trailerArquivo);

      resolve(arquivo);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "EXPORT_REMESSA_",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
};

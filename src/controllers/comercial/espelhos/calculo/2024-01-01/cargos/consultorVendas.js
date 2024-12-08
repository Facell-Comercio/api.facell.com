"use strict";
const fs = require("fs");
const db = require("../../../../../../../../mysql");
const { formatarValor } = require("../../../helper");
const { verificaEscalonamento } = require("../helper");
const path = require("path");

module.exports = ({ ref, meta, politica }) => {
  return new Promise(async (resolve, reject) => {
    // console.log('[START_CALC_CONSULTOR]', meta.nome)
    const espelho = {
      filial,
      nome,
      cargo,
      data_inicial,
      data_final,
      proporcional,
      parametros: [],
      itens,
    }

    try {
      const ano = parseInt(ref.split("-")[0]);
      const mes = parseInt(ref.split("-")[1]);

      if (!meta) {
        throw new Error("Meta não localizada!");
      }
      if (!meta.ciclo) {
        throw new Error("Ciclo não informado!");
      }
      if (!meta.ref) {
        throw new Error("Referência não informada!");
      }
      if (!meta.cpf) {
        throw new Error("CPF não informado!");
      }

      meta.data_inicial = formatarValor(meta.data_inicial, "data");
      meta.data_final = formatarValor(meta.data_final, "data");

      espelho.cpf = meta.cpf;
      espelho.cargo = meta.cargo;
      espelho.grupo_economico = meta.grupo_economico;
      espelho.filial = meta.filial;
      espelho.nome = meta.nome;
      espelho.data_inicial = meta.data_inicial;
      espelho.data_final = meta.data_final;

      // * Verificar se é BLUE ou EMBAIXADOR DE ACESS
      espelho.embaixador_de_acess = meta.tags
        ?.toLowerCase()
        .includes("embaixador de acess")
        ? true
        : false;
      if (espelho.embaixador_de_acess) {
        espelho.itens.push({ tipo: 'bonus', segmento: 'ACESSORIO', descricao: 'EMBAIXADOR DE ACESSÓRIOS', meta: 0, realizado: 0, atingimento: 1, valor: 300, })
      }

      // todas as metas
      espelho.metas = {
        controle: parseInt(meta.controle) || 0,
        pos: parseInt(meta.pos) || 0,
        upgrade: parseInt(meta.upgrade) || 0,
        residenciais: parseInt(meta.fixo || 0) + parseInt(meta.wttx || 0),
        receita: parseFloat(meta.receita) || 0,
        aparelho: parseFloat(meta.aparelho) || 0,
        acessorio: parseFloat(meta.acessorio) || 0,
        pitzi: parseFloat(meta.pitzi) || 0,
      };

      // [QUALIDADE TIM]
      const [rowsQualidade] = await db.execute(
        "SELECT qualidade FROM comissao_qualidade_tim WHERE ref = ? and cpf = ?",
        [ref, meta.filial]
      );
      espelho.qualidade_tim =
        (rowsQualidade &&
          rowsQualidade[0] &&
          parseFloat(rowsQualidade[0]["qualidade"])) ||
        1;

      // [ESTEIRA_FULL]
      const [rowEsteiraFull] = await db.execute(
        "SELECT sum(indicador) / sum(total) as esteiraFull FROM comissao_esteira_full_tim WHERE ref = ? and filial = ? and cpf = ? ",
        [ref, meta.filial, meta.cpf]
      );
      espelho.esteira_full =
        (rowEsteiraFull &&
          rowEsteiraFull[0] &&
          parseFloat(rowEsteiraFull[0]["esteiraFull"])) ||
        1;

      // [APP TIM VENDAS]
      const [rowAppTimVendas] = await db.execute(
        "SELECT sum(indicador) / sum(total) as app FROM comissao_app_tim_vendas WHERE ref = ? and filial = ? and cpf = ? ",
        [ref, meta.filial, meta.cpf]
      );
      espelho.app_tim_vendas =
        (rowAppTimVendas &&
          rowAppTimVendas[0] &&
          parseFloat(rowAppTimVendas[0]["app"])) ||
        1;

      // !DEFLATOR ESTEIRA FULL E APP TIM VENDAS
      espelho.deflatores.app_e_esteira =
        espelho.esteira_full < 0.9 || espelho.app_tim_vendas < 0.9
          ? true
          : false;

      // [TRÁFEGO_ZERO]
      const [rowsTrafegoZero] = await db.execute(
        `SELECT 
    sum(indicador) / sum(total) as trafego_zero_percent,
    (sum(indicador) / sum(total) - 0.1) * sum(total) as trafego_zero_qtde 
    FROM comissao_tz_tim WHERE ref = ? and filial = ? and cpf = ? 
    GROUP BY cpf
    `,
        [ref, meta.filial, meta.cpf]
      );
      espelho.trafego_zero_qtde =
        rowsTrafegoZero &&
        rowsTrafegoZero[0] &&
        rowsTrafegoZero[0]["trafego_zero_qtde"] &&
        parseInt(rowsTrafegoZero[0]["trafego_zero_qtde"]) > 0
          ? parseInt(rowsTrafegoZero[0]["trafego_zero_qtde"])
          : 0;
      espelho.trafego_zero_percentual =
        rowsTrafegoZero &&
        rowsTrafegoZero[0] &&
        rowsTrafegoZero[0]["trafego_zero_percent"] &&
        parseFloat(rowsTrafegoZero[0]["trafego_zero_percent"]);

      // [INADIMPLÊNCIAS]
      let anoInadimplencia = ano;
      let mesInadimplencia = mes;

      if (mesInadimplencia === 1) {
        anoInadimplencia = anoInadimplencia - 1;
        mesInadimplencia = 12;
      } else if (mesInadimplencia === 12) {
        anoInadimplencia++;
        mesInadimplencia = 1;
      } else {
        mesInadimplencia--;
      }
      let refInadimplencia = `${anoInadimplencia}-${mesInadimplencia
        .toString()
        .padStart(2, "0")}`;

      const [rowsInadimplencias] = await db.execute(
        `SELECT
        COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' THEN id END) as qtdeControle,  
        COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' AND NOT plaOpera LIKE '%CONTROLE A%' THEN id END) as qtdeOutrosControles,  
        COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' AND plaOpera LIKE '%CONTROLE A%' THEN id END) as qtdeControleA,  

        COUNT(CASE WHEN plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%' THEN id END) as qtdePos,  

        COUNT(CASE WHEN (plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%') AND (NOT plaOpera LIKE '%MULTI%' AND NOT plaOpera LIKE '%DEPE%' AND NOT plaOpera LIKE '%FAM%') THEN id END) as qtdePosIndividual, 

        COUNT(CASE WHEN (plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%') AND (plaOpera LIKE '%MULTI%' OR plaOpera LIKE '%FAM%') THEN id END) as qtdePosTitular,

        SUM(valor_receita) as receita

        FROM facell_docs
        WHERE 
            status_inadimplencia = 'Inadimplente'
            AND DATE_FORMAT(dtAtivacao, '%Y-%m') = ?
            AND cpfVendedor = ?
    
    `,
        [refInadimplencia, meta.cpf]
      );
      espelho.inadimplencias = rowsInadimplencias && rowsInadimplencias[0];

      // obter todos os realizados
      const [realizadoServico] = await db.execute(
        `
        SELECT 
            v.cpfVendedor,
            COUNT(CASE WHEN v.categoria = 'PÓS PURO' THEN v.id END) as pos,
            COUNT(CASE WHEN v.categoria = 'PÓS PURO' AND (v.plaOpera LIKE '%MULTI%' OR v.plaOpera LIKE '%FAM%') THEN v.id END) as pos_titular,
            COUNT(CASE WHEN v.categoria = 'PÓS PURO' AND NOT (v.plaOpera LIKE '%MULTI%' OR v.plaOpera LIKE '%FAM%' OR v.plaOpera LIKE '%DEPEN%') THEN v.id END) as pos_individual,

            COUNT(CASE WHEN v.categoria = 'CONTROLE' THEN v.id END) as controle,
            COUNT(CASE WHEN v.categoria = 'CONTROLE' AND v.plaOpera LIKE '%CONTROLE A%' THEN v.id END) as controle_a,
            SUM(CASE WHEN v.tipo_movimento <> 'UPGRADE 2' THEN v.valor_receita END) as receita,
            COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 1' THEN v.id END) as upgrade,
            COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 2' THEN v.id END) as upgrade2,
            COUNT(CASE WHEN v.categoria = 'TIM FIXO' OR v.categoria = 'WTTX' OR v.categoria = 'LIVE' THEN v.id END) as residenciais,
            COUNT(CASE WHEN v.categoria = 'LIVE' THEN v.id END) as live
        FROM
            datasys_ativacoes v
        WHERE
            v.dtAtivacao BETWEEN ? AND ?
            AND v.filial = ?
            AND v.cpfVendedor LIKE CONCAT('%', ?, '%')
            AND NOT v.statusLinha IN ('VENDA IRREGULAR', 'CANCELADA', 'DUPLICIDADE')
        GROUP BY
            v.cpfVendedor;
            `,
        [meta.data_inicial, meta.data_final, meta.filial, meta.cpf]
      );

      const [realizadoProduto] = await db.execute(
        ` 
        SELECT 
            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa END) as aparelho,

            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND NOT v.descrComercial LIKE '%APPLE%' AND NOT ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO'))
            THEN v.valorCaixa END) as android_mov,

            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND NOT v.descrComercial LIKE '%APPLE%' AND ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO')) 
            THEN v.valorCaixa END) as android_sem_mov,

            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND v.descrComercial LIKE '%APPLE%' AND NOT ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO')) 
            THEN v.valorCaixa END) as apple_mov,

            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND v.descrComercial LIKE '%APPLE%' AND ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO')) 
            THEN v.valorCaixa END) as apple_sem_mov,

            SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.valorCaixa END) as acessorio,

            SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' AND v.descrComercial LIKE '%JBL%' THEN v.valorCaixa END) as jbl

        FROM
            datasys_vendas v
        WHERE
            v.tipoPedido = 'Venda'
            AND DATE(v.dataPedido) BETWEEN ? AND ?  
            AND v.filial = ?
            AND v.cpfVendedor LIKE CONCAT('%', ?, '%')
        GROUP BY
            v.cpfVendedor
            `,
        [meta.data_inicial, meta.data_final, meta.filial, meta.cpf]
      );

      const [realizadoPitzi] = await db.execute(
        `SELECT sum(p.valor) as faturamento FROM pitzi_vendas p 
        INNER JOIN filiais f ON f.nome_pitzi = p.loja
        WHERE
            DATE(p.data) between ? and ?
            AND f.filial = ?
            AND p.cpf_vendedor LIKE CONCAT('%', ?, '%')
            `,
        [meta.data_inicial, meta.data_final, meta.filial, meta.cpf]
      );

      // Realizado
      // Serviço
      let real_controle =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["controle"])) ||
        0;
      let real_controle_a =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["controle_a"])) ||
        0;
      let real_pos =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["pos"])) ||
        0;

      // !deflator pós
      real_pos =
        real_pos > espelho.trafego_zero_qtde
          ? real_pos - espelho.trafego_zero_qtde
          : 0;

      let real_pos_titular =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["pos_titular"])) ||
        0;
      let real_pos_individual =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["pos_individual"])) ||
        0;
      let real_residenciais =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["residenciais"])) ||
        0;
      let real_upgrade =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["upgrade"])) ||
        0;
      let real_upgrade2 =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["upgrade2"])) ||
        0;
      let real_receita =
        (realizadoServico &&
          realizadoServico[0] &&
          parseFloat(realizadoServico[0]["receita"])) ||
        0;
      let real_live =
        (realizadoServico &&
          realizadoServico[0] &&
          parseFloat(realizadoServico[0]["live"])) ||
        0;

      // Produtos
      let real_aparelho =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["aparelho"])) ||
        0;
      let real_android_mov =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["android_mov"])) ||
        0;
      let real_android_sem_mov =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["android_sem_mov"])) ||
        0;
      let real_apple_mov =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["apple_mov"])) ||
        0;
      let real_apple_sem_mov =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["apple_sem_mov"])) ||
        0;
      let real_acessorio =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["acessorio"])) ||
        0;
      let real_jbl =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["jbl"])) ||
        0;

      // Pitzi
      let real_pitzi =
        (realizadoPitzi &&
          realizadoPitzi[0] &&
          parseFloat(realizadoPitzi[0]["faturamento"])) ||
        0;

      espelho.realizado = {
        controle: real_controle,
        controle_a: real_controle_a,
        pos: real_pos,
        pos_titular: real_pos_titular,
        pos_individual: real_pos_individual,
        residenciais: real_residenciais,
        upgrade: real_upgrade,
        upgrade2: real_upgrade2,
        receita: real_receita,
        live: real_live,

        aparelho: real_aparelho,
        android_mov: real_android_mov,
        android_sem_mov: real_android_sem_mov,
        apple_mov: real_apple_mov,
        apple_sem_mov: real_apple_sem_mov,
        acessorio: real_acessorio,
        jbl: real_jbl,
        pitzi: real_pitzi,
      };

      // obter atingimento das metas
      let ating_pos =
        espelho.metas.pos == 0
          ? 1
          : parseFloat((real_pos / espelho.metas.pos).toFixed(4));
      let incremento_controle =
        real_pos > espelho.metas.pos && real_controle < espelho.metas.controle
          ? real_pos - espelho.metas.pos
          : 0;
      let ating_controle =
        espelho.metas.controle == 0
          ? 1
          : parseFloat(
              (
                (real_controle + incremento_controle) /
                espelho.metas.controle
              ).toFixed(4)
            );
      let ating_upgrade =
        espelho.metas.upgrade == 0
          ? 1
          : parseFloat((real_upgrade / espelho.metas.upgrade).toFixed(4));
      let ating_receita =
        espelho.metas.receita == 0
          ? 1
          : parseFloat((real_receita / espelho.metas.receita).toFixed(4));
      let ating_residenciais =
        espelho.metas.residenciais == 0
          ? 1
          : parseFloat(
              (real_residenciais / espelho.metas.residenciais).toFixed(4)
            );

      espelho.menor_ating_tim = Math.min(
        ating_pos,
        ating_controle,
        ating_receita,
        ating_upgrade
      );

      let ating_aparelho =
        espelho.metas.aparelho == 0
          ? 1
          : parseFloat((real_aparelho / espelho.metas.aparelho).toFixed(4));
      let ating_acessorio =
        espelho.metas.acessorio == 0
          ? 1
          : parseFloat((real_acessorio / espelho.metas.acessorio).toFixed(4));
      let ating_pitzi =
        espelho.metas.pitzi == 0
          ? 1
          : parseFloat((real_pitzi / espelho.metas.pitzi).toFixed(4));

      espelho.menor_ating_facell = Math.min(
        ating_aparelho,
        ating_acessorio,
        ating_pitzi
      );

      espelho.atingimento = {
        pos: ating_pos,
        controle: ating_controle,
        upgrade: ating_upgrade,
        receita: ating_receita,
        residenciais: ating_residenciais,
        aparelho: ating_aparelho,
        acessorio: ating_acessorio,
        pitzi: ating_pitzi,
      };

      espelho.escalonamento = {
        controle: verificaEscalonamento(ating_controle),
        pos: verificaEscalonamento(ating_pos),
        aparelho: verificaEscalonamento(ating_aparelho),
        acessorio: verificaEscalonamento(ating_acessorio),
        pitzi: verificaEscalonamento(ating_pitzi),
        receita: verificaEscalonamento(ating_receita),
        upgrade: verificaEscalonamento(ating_upgrade),
        residenciais: verificaEscalonamento(ating_residenciais),
      };
      // Obter outros atingimentos e deflatores de acordo com os percentuais de atingimento de metas
      const percentMinMetas = 0.75;
      espelho.deflatores.metasTim =
        espelho.menor_ating_tim < percentMinMetas ? true : false;

      espelho.deflatores.metasFacell =
        espelho.menor_ating_facell < percentMinMetas ? true : false;

      let elegivelBonusMetasTim = espelho.menor_ating_tim >= 1 ? true : false;

      let elegivelBonusMetasFacell =
        espelho.menor_ating_facell >= 1 ? true : false;

      let elegivelBonusTodasMetas =
        elegivelBonusMetasTim === true && elegivelBonusMetasFacell === true
          ? true
          : false;

      espelho.elegivelBonusMetasFacell = elegivelBonusMetasFacell
      espelho.elegivelBonusMetasTim = elegivelBonusMetasTim
      espelho.elegivelBonusTodasMetas = elegivelBonusTodasMetas
 
      // puxar a política
      const [rowsRegras] = await db.execute(
        `SELECT * FROM comissao_politica_regras WHERE id_politica = ${politica.id} AND cargo = 'consultor'`
      );

      espelho.regras = rowsRegras.map((row) => ({
        descr: row["descr"],
        tipo_remuneracao: row["tipo_remuneracao"],
        escalonamento: parseFloat(row.escalonamento),
        valor: parseFloat(row["valor"]),
      }));

      //* COMISSÃO
      let comissoes_a_calcular = [
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "APARELHO",
          descr: "ANDROID COM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.android_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.android_mov *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "APARELHO",
          descr: "ANDROID SEM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.android_sem_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.android_sem_mov *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "APARELHO",
          descr: "APPLE COM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.apple_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.apple_mov *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "APARELHO",
          descr: "APPLE SEM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.apple_sem_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.apple_sem_mov *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          segmento: "ACESSORIO",
          descr: "ACESSORIO",
          tipo_remuneracao: "COMISSÃO",
          meta: espelho.metas.acessorio,
          realizado: espelho.realizado.acessorio,
          atingimento: espelho.atingimento.acessorio,
          escalonamento: espelho.escalonamento.acessorio,
          faturamento: espelho.realizado.acessorio - espelho.realizado.jbl,
          calculo: (valor) => {
            return (
              (espelho.realizado.acessorio - espelho.realizado.jbl) *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "ACESSORIO",
          descr: "ACESSORIO JBL",
          meta: espelho.metas.acessorio,
          realizado: espelho.realizado.acessorio,
          atingimento: espelho.atingimento.acessorio,
          escalonamento: espelho.escalonamento.acessorio,
          faturamento: espelho.realizado.jbl,
          calculo: (valor) => {
            return (
              espelho.realizado.jbl *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "PITZI",
          descr: "PITZI",
          meta: espelho.metas.pitzi,
          realizado: espelho.realizado.pitzi,
          atingimento: espelho.atingimento.pitzi,
          escalonamento: espelho.escalonamento.pitzi,
          faturamento: espelho.realizado.pitzi,
          calculo: (valor) => {
            return (
              espelho.realizado.pitzi *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "RECEITA",
          descr: "RECEITA",
          meta: espelho.metas.receita,
          realizado: espelho.realizado.receita,
          atingimento: espelho.atingimento.receita,
          escalonamento: espelho.escalonamento.receita,
          faturamento: espelho.realizado.receita,
          calculo: (valor) => {
            return (
              espelho.realizado.receita *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "CONTROLE",
          descr: "CONTROLE A",
          meta: espelho.metas.controle,
          realizado: espelho.realizado.controle,
          atingimento: espelho.atingimento.controle,
          escalonamento: espelho.escalonamento.controle,
          faturamento: espelho.realizado.controle_a,
          calculo: (valor) => {
            return (
              espelho.realizado.controle_a *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "CONTROLE",
          descr: "DEMAIS PLANOS CONTROLE",
          meta: espelho.metas.controle,
          realizado: espelho.realizado.controle,
          atingimento: espelho.atingimento.controle,
          escalonamento: espelho.escalonamento.controle,
          faturamento:
            espelho.realizado.controle - espelho.realizado.controle_a,
          calculo: (valor) => {
            return (
              (espelho.realizado.controle - espelho.realizado.controle_a) *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "PÓS-PURO",
          descr: "VOZ INDIVIDUAL",
          meta: espelho.metas.pos,
          realizado: espelho.realizado.pos,
          atingimento: espelho.atingimento.pos,
          escalonamento: espelho.escalonamento.pos,
          faturamento: espelho.realizado.pos_individual,
          calculo: (valor) => {
            return (
              espelho.realizado.pos_individual *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "PÓS-PURO",
          descr: "FAMILIA TITULAR",
          meta: espelho.metas.pos,
          realizado: espelho.realizado.pos,
          atingimento: espelho.atingimento.pos,
          escalonamento: espelho.escalonamento.pos,
          faturamento: espelho.realizado.pos_titular,
          calculo: (valor) => {
            return (
              espelho.realizado.pos_titular *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "UPGRADE",
          descr: "UPGRADE 1",
          meta: espelho.metas.upgrade,
          realizado: espelho.realizado.upgrade,
          atingimento: espelho.atingimento.upgrade,
          escalonamento: espelho.escalonamento.upgrade,
          faturamento: espelho.realizado.upgrade,
          calculo: (valor) => {
            return (
              espelho.realizado.upgrade *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "UPGRADE",
          descr: "UPGRADE 2",
          meta: espelho.metas.upgrade,
          realizado: espelho.realizado.upgrade,
          atingimento: espelho.atingimento.upgrade,
          escalonamento: espelho.escalonamento.upgrade,
          faturamento: espelho.realizado.upgrade2,
          calculo: (valor) => {
            return (
              espelho.realizado.upgrade2 *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            );
          },
        },
      ];

      // * CÁLCULO COMISSÃO
      for (let comissao of comissoes_a_calcular) {
        var calc_comissao = 0;
        let regra;
        regra = espelho.regras.filter(
          (item) =>
            item.escalonamento == comissao.escalonamento &&
            item.tipo_remuneracao === "comissao" &&
            item.descr === comissao.descr
        );
        if (regra && regra[0]) {
          calc_comissao = comissao.calculo(regra[0].valor);
          if (calc_comissao) {
            espelho.comissao += calc_comissao;
          }
        }
        espelho.detalhe.push({
          tipo_remuneracao: comissao.tipo_remuneracao,
          segmento: comissao.segmento,
          detalhe_segmento: comissao.descr,
          meta: comissao.meta,
          realizado: comissao.realizado,
          faturamento: comissao.faturamento,
          atingimento: comissao.atingimento,
          valor_final: calc_comissao,
        });
      }

      // * BÔNUS
      const bonus_a_calcular = [
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "APARELHO",
          descr: "ANDROID COM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.android_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.android_mov *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ||
              espelho.deflatores.metasFacell ||
              espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "APARELHO",
          descr: "ANDROID SEM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.android_sem_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.android_sem_mov *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ||
              espelho.deflatores.metasFacell ||
              espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "APARELHO",
          descr: "APPLE COM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.apple_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.apple_mov *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ||
              espelho.deflatores.metasFacell ||
              espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "APARELHO",
          descr: "APPLE SEM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.apple_sem_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.apple_sem_mov *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ||
              espelho.deflatores.metasFacell ||
              espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "ACESSORIO",
          descr: "ACESSORIO",
          meta: espelho.metas.acessorio,
          realizado: espelho.realizado.acessorio,
          atingimento: espelho.atingimento.acessorio,
          escalonamento: espelho.escalonamento.acessorio,
          faturamento: espelho.realizado.acessorio - espelho.realizado.jbl,
          calculo: (valor) => {
            return (
              (espelho.realizado.acessorio - espelho.realizado.jbl) *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ||
              espelho.deflatores.metasFacell ||
              espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "ACESSORIO",
          descr: "ACESSORIO JBL",
          meta: espelho.metas.acessorio,
          realizado: espelho.realizado.acessorio,
          atingimento: espelho.atingimento.acessorio,
          escalonamento: espelho.escalonamento.acessorio,
          faturamento: espelho.realizado.jbl,
          calculo: (valor) => {
            return (
              espelho.realizado.jbl *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ||
              espelho.deflatores.metasFacell ||
              espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "PITZI",
          descr: "PITZI",
          meta: espelho.metas.pitzi,
          realizado: espelho.realizado.pitzi,
          atingimento: espelho.atingimento.pitzi,
          escalonamento: espelho.escalonamento.pitzi,
          faturamento: espelho.realizado.pitzi,
          calculo: (valor) => {
            return (
              espelho.realizado.pitzi *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ||
              espelho.deflatores.metasFacell ||
              espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "RECEITA",
          descr: "RECEITA",
          meta: espelho.metas.receita,
          realizado: espelho.realizado.receita,
          atingimento: espelho.atingimento.receita,
          escalonamento: espelho.escalonamento.receita,
          faturamento: espelho.realizado.receita,
          calculo: (valor) => {
            return (
              espelho.realizado.receita *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira || espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "CONTROLE",
          descr: "CONTROLE A",
          meta: espelho.metas.controle,
          realizado: espelho.realizado.controle,
          atingimento: espelho.atingimento.controle,
          escalonamento: espelho.escalonamento.controle,
          faturamento: espelho.realizado.controle_a,
          calculo: (valor) => {
            return (
              espelho.realizado.controle_a *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira || espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "CONTROLE",
          descr: "DEMAIS PLANOS CONTROLE",
          meta: espelho.metas.controle,
          realizado: espelho.realizado.controle,
          atingimento: espelho.atingimento.controle,
          escalonamento: espelho.escalonamento.controle,
          faturamento:
            espelho.realizado.controle - espelho.realizado.controle_a,
          calculo: (valor) => {
            return (
              (espelho.realizado.controle - espelho.realizado.controle_a) *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira || espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "PÓS-PURO",
          descr: "VOZ INDIVIDUAL",
          meta: espelho.metas.pos,
          realizado: espelho.realizado.pos,
          atingimento: espelho.atingimento.pos,
          escalonamento: espelho.escalonamento.pos,
          faturamento: espelho.realizado.pos_individual,
          calculo: (valor) => {
            return (
              espelho.realizado.pos_individual *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira || espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "PÓS-PURO",
          descr: "FAMILIA TITULAR",
          meta: espelho.metas.pos,
          realizado: espelho.realizado.pos,
          atingimento: espelho.atingimento.pos,
          escalonamento: espelho.escalonamento.pos,
          faturamento: espelho.realizado.pos_titular,
          calculo: (valor) => {
            return (
              espelho.realizado.pos_titular *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira || espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "UPGRADE",
          descr: "UPGRADE 1",
          meta: espelho.metas.upgrade,
          realizado: espelho.realizado.upgrade,
          atingimento: espelho.atingimento.upgrade,
          escalonamento: espelho.escalonamento.upgrade,
          faturamento: espelho.realizado.upgrade,
          calculo: (valor) => {
            return (
              espelho.realizado.upgrade *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira || espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "UPGRADE",
          descr: "UPGRADE 2",
          meta: espelho.metas.upgrade,
          realizado: espelho.realizado.upgrade,
          atingimento: espelho.atingimento.upgrade,
          escalonamento: espelho.escalonamento.upgrade,
          faturamento: espelho.realizado.upgrade2,
          calculo: (valor) => {
            return (
              espelho.realizado.upgrade2 *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira || espelho.deflatores.metasTim
                ? 0.5
                : 1)
            );
          },
        },
        //   Esses são peculiares:
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "METAS FACELL",
          meta: 0,
          realizado: 0,
          atingimento: espelho.menor_ating_facell,
          escalonamento: espelho.menor_ating_facell,
          faturamento: 0,
          calculo: (valor) => {
            let elegivelTodasMetas = espelho.elegivelBonusTodasMetas ? 0 : 1;
            let elegivelMetasFacell = espelho.elegivelBonusMetasFacell ? 1 : 0;
            return (
              elegivelTodasMetas *
              elegivelMetasFacell *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1) *
              (espelho?.consultor_blue ? 1.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "METAS TIM",
          meta: 0,
          realizado: 0,
          atingimento: espelho.menor_ating_tim,
          escalonamento: espelho.menor_ating_tim,
          faturamento: 0,
          calculo: (valor) => {
            let elegivelTodasMetas = espelho.elegivelBonusTodasMetas ? 0 : 1;
            let elegivelMetasTim = espelho.elegivelBonusMetasTim ? 1 : 0;
            return (
              elegivelTodasMetas *
              elegivelMetasTim *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1) *
              (espelho?.consultor_blue ? 1.5 : 1)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "TODAS AS METAS",
          meta: 0,
          realizado: 0,
          atingimento: verificaEscalonamento(
            Math.min(
              espelho.menor_ating_tim || 0,
              espelho.menor_ating_facell || 0,
              espelho.escalonamento.residenciais || 0
            )
          ),
          escalonamento: verificaEscalonamento(
            Math.min(
              espelho.menor_ating_tim || 0,
              espelho.menor_ating_facell || 0,
              espelho.escalonamento.residenciais || 0
            )
          ),
          faturamento: 0,
          calculo: (valor) => {
            let elegivelTodasAsMetas = espelho.elegivelBonusTodasMetas ? 1 : 0;
            return (
              elegivelTodasAsMetas *
              valor *
              espelho.qualidade_tim *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1) *
              (espelho?.consultor_blue ? 1.5 : 1)
            );
          },
        },
      ];

      // * CÁLCULO DOS BÔNUS
      for (let bonus of bonus_a_calcular) {
        var calc_bonus = 0;
        let regra;
        regra = espelho.regras.filter(
          (item) =>
            item.escalonamento == bonus.escalonamento &&
            item.tipo_remuneracao === "bonus" &&
            item.descr === bonus.descr
        );
        if (regra && regra[0]) {
          calc_bonus = bonus.calculo(regra[0].valor);
          if (calc_bonus) {
            espelho.bonus += calc_bonus;
          }
        }
        espelho.detalhe.push({
          tipo_remuneracao: bonus.tipo_remuneracao,
          segmento: bonus.segmento,
          detalhe_segmento: bonus.descr,
          meta: bonus.meta,
          realizado: bonus.realizado,
          faturamento: bonus.faturamento,
          atingimento: bonus.atingimento || 0,
          valor_final: calc_bonus || 0,
        });
      }

      // * APURAÇÃO DACC
      const [rowDACC] = await db.execute(
        `
    SELECT COUNT(c.id) AS qtde
    FROM datasys_ativacoes d
    JOIN tim_comissao c ON d.cpf = c.cpf_cnpjcliente OR d.gsm = c.gsm
    WHERE d.cpfVendedor LIKE CONCAT('%', ? , '%')
      AND c.ano = ? 
      AND c.mes = ?
      AND c.desc_tipocomissao = 'REV - Canvass Débito Automático - DACC'
    GROUP BY d.cpfVendedor;
    `,
        [espelho.cpf, ano, mes]
      );
      espelho.DACC = (rowDACC && rowDACC[0] && rowDACC[0]["qtde"]) || 0;
      espelho.detalhe.push({
        tipo_remuneracao: "BÔNUS",
        segmento: "DACC",
        detalhe_segmento: "CANVASS",
        meta: 0,
        realizado: espelho.DACC,
        faturamento: espelho.DACC,
        atingimento: 0,
        valor_final: (espelho.DACC * 5).toFixed(2),
      });
      espelho.bonus += espelho.DACC * 5;

      // * APURAÇÃO LIVE BAHIA
      let bonus_live = espelho.realizado.live * 40 * espelho.qualidade * espelho.deflatores.app_e_esteira ? 0.5 : 1;
      espelho.detalhe.push({
        tipo_remuneracao: "BÔNUS",
        segmento: "ULTRAFIBRA",
        detalhe_segmento: "ATIVAÇÃO LIVE",
        meta: 0,
        realizado: espelho.realizado.live,
        faturamento: espelho.realizado.live,
        atingimento: 1,
        valor_final: (bonus_live * 40).toFixed(2),
      });
      espelho.bonus += bonus_live;

      // * APURAÇÃO EMBAIXADOR
      if (espelho.embaixador_de_acess) {
        // buscar meta de acessorio da filial
        const [rowMetaAcessorioFilial] = await db.execute(
          `SELECT acessorio FROM metas WHERE ref = ? AND nome = ? `,
          [ref, espelho.filial]
        );
        if (rowMetaAcessorioFilial && rowMetaAcessorioFilial[0]) {
          var metaAcessorioFilial =
            rowMetaAcessorioFilial[0]["acessorio"] || null;

          // buscar realizado de acessorio da filial
          const [rowRealizadoAcessorioFilial] = await db.execute(
            `SELECT sum(valorCaixa) as acessorio FROM datasys_vendas 
        WHERE 
        grupoEstoque LIKE '%ACESS%'
        AND DATE_FORMAT(dataPedido, '%Y-%m') = ? 
        AND filial = ? `,
            [ref, espelho.filial]
          );

          if (
            rowRealizadoAcessorioFilial &&
            rowRealizadoAcessorioFilial[0] &&
            rowRealizadoAcessorioFilial[0]["acessorio"]
          ) {
            var realizadoAcessorioFilial =
              rowRealizadoAcessorioFilial[0]["acessorio"] || null;

            // Já que existe meta de acessorio da filial e o realizado é superior, então vamos gerar o bônus
            if (metaAcessorioFilial > 0 && realizadoAcessorioFilial) {
              const BONUS_EMBAIXADOR_ACESSORIO =
                realizadoAcessorioFilial > metaAcessorioFilial ? 200 : 0;
              espelho.bonus += BONUS_EMBAIXADOR_ACESSORIO;

              espelho.detalhe.push({
                tipo_remuneracao: "BÔNUS",
                segmento: "ACESSORIO",
                detalhe_segmento: "EMBAIXADOR DE ACESSÓRIOS",
                meta: metaAcessorioFilial,
                realizado: realizadoAcessorioFilial,
                faturamento: realizadoAcessorioFilial,
                atingimento: realizadoAcessorioFilial / metaAcessorioFilial,
                valor_final: BONUS_EMBAIXADOR_ACESSORIO,
              });
            }
          }
        }
      }

      // * EXCEÇÕES - OUTROS RECEBIMENTOS/PAGAMENTOS [recordes, contestações]
      const [rowsExcecoes] = await db.execute(
        `SELECT descr, valor FROM comissao_excecoes
       WHERE ref = ? and cpf = ? and filial = ? and cargo = ? `,
        [ref, espelho.cpf, espelho.filial, espelho.cargo]
      );

      if (rowsExcecoes && rowsExcecoes.length > 0) {
        rowsExcecoes.forEach((excecao) => {
          const valor_inicial = parseFloat(excecao.valor);
          const isNegative = valor_inicial < 0 ? true : false;
          
          if(!isNegative){
            let valor = valor_inicial * (espelho.qualidade ? espelho.qualidade : 1) * (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            espelho.bonus += valor;
          }else{
            let valor = Math.abs(valor_inicial)
            
            // Descontar do bônus
            if(espelho.bonus >= valor){
              espelho.bonus -= valor;
              valor = 0;
            }else{
              valor -= espelho.bonus;
              espelho.bonus = 0
            }
            
            // Descontar da comissão
            if(espelho.comissao >= valor){
              espelho.comissao -= valor;
              valor = 0;
            }else{
              valor -= espelho.comissao;
              espelho.comissao = 0
            }
          }

          espelho.detalhe.push({
            tipo_remuneracao: isNegative ? "DEDUÇÃO" : "BÔNUS",
            segmento: "OUTROS",
            detalhe_segmento: excecao.descr,
            meta: 0,
            realizado: 0,
            faturamento: 0,
            atingimento: 1,
            valor_final: valor_inicial,
          });
        });
      }

      // * PREPARAÇÃO DO ESPELHO:
      espelho.resumo.push({
        info: "Menor atingimento",
        descr: `Metas Tim: ${(espelho.menor_ating_tim || 0).toFixed(
          2
        )}% | Metas Facell: ${(espelho.menor_ating_facell || 0).toFixed(2)}%`,
      });

      espelho.resumo.push({
        info: "Residenciais",
        descr: `Meta: ${espelho.metas.residenciais || 0} | Realizado: ${
          espelho.realizado.residenciais || 0
        }  | Atingimento: ${(
          (espelho.atingimento.residenciais || 0) * 100
        ).toFixed(2)}%`,
      });

      espelho.resumo.push({
        info: "Percentuais TIM",
        descr: `Qualidade: ${(espelho.qualidade_tim * 100).toFixed(
          2
        )}% | App x Siebel: ${(espelho.app_tim_vendas * 100).toFixed(
          2
        )}%  | Esteira Full: ${(espelho.esteira_full * 100).toFixed(2)}%`,
      });

      espelho.resumo.push({
        info: "Total",
        descr: `Comissão: ${espelho.comissao.toFixed(
          2
        )} | Bônus: ${espelho.bonus.toFixed(2)}  | Comissão+Bônus: ${(
          espelho.comissao + espelho.bonus
        ).toFixed(2)}`,
      });

      // * GERAÇÃO DO ESPELHO:
      // Geração de log detalhado:
      // espelho.toJSON()

      fileUrl = await espelho.toPDF();
      // gerar registro em comissao_interna

      try {
        // Buscar se já existe o espelho, se existir, então excluir o pdf e o registro:
        const [rowEspelhoAntigo] = await db.execute(
          `SELECT fileUrl FROM comissao WHERE ref = ? and filial = ? and cpf = ? and cargo = ?`,
          [ref, espelho.filial, espelho.cpf, espelho.cargo]
        );

        if (
          rowEspelhoAntigo &&
          rowEspelhoAntigo[0]
        ) {
          let oldFileUrl = rowEspelhoAntigo[0]["fileUrl"];
          if (oldFileUrl) {
            espelho.deletePDF(oldFileUrl);
          }
          await db.execute(
            `UPDATE comissao 
            SET 
              updated = now(),
              nome = ${db.escape(espelho.nome)}, 
              comissao = ${db.escape(espelho.comissao)}, 
              bonus = ${db.escape(espelho.bonus)}, 
              fileUrl = ${db.escape(fileUrl)}

            WHERE ref = ? and filial = ? and cpf = ? and cargo = ?`,
            [ref, espelho.filial, espelho.cpf, espelho.cargo]
          );
        }else{
          // Vamos inserir já que não existe:
          await db.execute(
            `INSERT INTO comissao (
          ref, ciclo, filial, cpf, nome, cargo, comissao, bonus, fileUrl
          ) VALUES (
          ?, ?, ? ,? ,?, ?, ?, ?, ?
        );`,
            [
              ref,
              espelho.ciclo,
              espelho.filial,
              espelho.cpf,
              espelho.nome,
              espelho.cargo,
              espelho.comissao,
              espelho.bonus,
              fileUrl,
            ]
          );
        }
        await db.execute(`UPDATE metas SET status_espelho = 'Calculado', obs_espelho = '' WHERE id = ? `, [meta.id])

        resolve({ success: true });
        return true;
      } catch (error) {
        // tentar excluir o pdf
        try {
          await db.execute(`UPDATE metas SET status_espelho = 'Erro', obs_espelho = ? WHERE id = ? `, [error.message, meta.id])
          if(fileUrl){
            espelho.deletePDF(fileUrl);
          }
        } catch (error) {
          console.log('[TRY_DELETE_NEW_PDF_AFTER_ERROR]',fileUrl)
        }
        reject("[INSERT/UPDATE]:" + error.message);
        return false;
      }
    } catch (error) {
      console.log(error)
      // tentar excluir o pdf e atualizar status meta
      try {
        await db.execute(`UPDATE metas SET status_espelho = 'Erro', obs_espelho = ? WHERE id = ? `, [error.message, meta.id])
        if(fileUrl){
          espelho.deletePDF(fileUrl);
        }
      } catch (error) {
        console.log('[TRY_DELETE_NEW_PDF_AFTER_ERROR]',fileUrl)
      }

      reject("[CÁLCULO]:" + error.message);
      return false;
    }
  });
};

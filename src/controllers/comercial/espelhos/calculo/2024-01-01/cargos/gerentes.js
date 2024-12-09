"use strict";
const fs = require("fs");
const db = require("../../../../../../../../mysql");
const Espelho = require("../../../espelhos/modelo_espelho");
const { formatarValor } = require("../../../helper");
const { verificaEscalonamento } = require("../helper");
const path = require("path");

const gerente = async ({ ref, agregador, politica }) => {
  return new Promise(async (resolve, reject) => {
    // console.log('[START_CALC_GERENTE]', agregador.nome)
    let espelho = new Espelho(agregador.ciclo, agregador.nome?.toUpperCase(), [], []);
    var fileUrl;

    try {
      const ano = parseInt(ref.split("-")[0]);
      const mes = parseInt(ref.split("-")[1]);

      if (!agregador.metas_agregadas || !agregador.tipo_agregacao) {
        reject(`${agregador.nome} sem metas.`);
      }
      var tipo_agregacao = agregador.tipo_agregacao;

      if (tipo_agregacao !== "FILIAL" && tipo_agregacao !== "VENDEDOR") {
        reject("tipo_agregacao precisa ser FILIAL ou VENDEDOR");
        return false;
      }

      var listaMetas;
      listaMetas = agregador.metas_agregadas.split(";").map((filial) => filial.trim());

      const filterMeta =
        tipo_agregacao === "FILIAL"
          ? ` AND cargo = 'FILIAL' AND filial in(${listaMetas
              .map((value) => db.escape(value))
              .join(",")})`
          : ` AND cpf in(${listaMetas.map((value) => db.escape(value)).join(",")})`;

      const [rowMeta] = await db.execute(
        `SELECT 
        sum(controle) as controle, 
        sum(pos) as pos, 
        sum(upgrade) as upgrade, 
        sum(receita) as receita, 
        sum(aparelho) as aparelho, 
        sum(acessorio) as acessorio, 
        sum(pitzi) as pitzi 
    FROM metas 
    WHERE ref = ? ${filterMeta};
    `,
        [ref]
      );

      if (!rowMeta || !rowMeta[0]) {
        reject("Meta não localizada!");
        return false;
      }
      const meta = rowMeta[0];

      agregador.data_inicial = formatarValor(agregador.data_inicial, "data");
      agregador.data_final = formatarValor(agregador.data_final, "data");

      espelho.cpf = agregador.cpf;
      espelho.filial = agregador.filial;
      espelho.cargo = agregador.cargo;
      espelho.data_inicial = agregador.data_inicial;
      espelho.data_final = agregador.data_final;

      const isSub = espelho.cargo?.toLowerCase() === "gerente de loja" ? true : false;

      espelho.resumo.push({
        info: "Grupo Econômico",
        descr: `${agregador.grupo_economico} | Filial: ${agregador.filial}`,
      });
      espelho.resumo.push({
        info: "Nome",
        descr: `${agregador.nome?.toUpperCase()} | CPF: ${agregador.cpf}`,
      });
      espelho.resumo.push({ info: "Cargo", descr: agregador.cargo });
      espelho.resumo.push({
        info: "Período",
        descr: `${agregador.data_inicial?.split("-").reverse().join("/")} até ${agregador.data_final
          ?.split("-")
          .reverse()
          .join("/")}`,
      });

      // todas as metas
      espelho.metas = {
        controle: parseInt(meta.controle) * agregador.proporcional || 0,
        pos: parseInt(meta.pos) * agregador.proporcional || 0,
        upgrade: parseInt(meta.upgrade) * agregador.proporcional || 0,
        receita: parseFloat(meta.receita) * agregador.proporcional || 0,
        aparelho: parseFloat(meta.aparelho) * agregador.proporcional || 0,
        acessorio: parseFloat(meta.acessorio) * agregador.proporcional || 0,
        pitzi: parseFloat(meta.pitzi) * agregador.proporcional || 0,
      };

      // [QUALIDADE TIM]
      const filterQualidade = isSub
        ? ` and cpf = '${espelho.filial}'`
        : ` and cpf = '${espelho.cpf}'`;
      const [rowsQualidade] = await db.execute(
        `SELECT qualidade FROM comissao_qualidade_tim WHERE ref = ? ${filterQualidade}`,
        [ref]
      );

      espelho.qualidade_tim =
        (rowsQualidade && rowsQualidade[0] && parseFloat(rowsQualidade[0]["qualidade"])) || 0;

      // [ESTEIRA_FULL]
      const filterRelsTim =
        tipo_agregacao == "FILIAL"
          ? ` and filial in(${listaMetas.map((value) => db.escape(value)).join(",")})`
          : ` and cpf in(${listaMetas.joins(",")})`;

      const [rowEsteiraFull] = await db.execute(
        `SELECT sum(indicador) / sum(total) as esteiraFull FROM comissao_esteira_full_tim WHERE ref = ? ${filterRelsTim} `,
        [ref]
      );
      espelho.esteira_full =
        (rowEsteiraFull && rowEsteiraFull[0] && parseFloat(rowEsteiraFull[0]["esteiraFull"])) || 1;

      // [APP TIM VENDAS]
      const [rowAppTimVendas] = await db.execute(
        `SELECT sum(indicador) / sum(total) as app FROM comissao_app_tim_vendas WHERE ref = ? ${filterRelsTim} `,
        [ref]
      );
      espelho.app_tim_vendas =
        (rowAppTimVendas && rowAppTimVendas[0] && parseFloat(rowAppTimVendas[0]["app"])) || 1;

      // !DEFLATOR ESTEIRA FULL E APP TIM VENDAS
      espelho.deflatores.app_e_esteira =
        espelho.esteira_full < 0.9 || espelho.app_tim_vendas < 0.9 ? 0.5 : 1;

      // [TRÁFEGO_ZERO]
      const [rowsTrafegoZero] = await db.execute(
        `SELECT 
    sum(indicador) / sum(total) as trafego_zero_percent,
    (sum(indicador) / sum(total) - 0.1) * sum(total) as trafego_zero_qtde 
    FROM comissao_tz_tim WHERE ref = ? ${filterRelsTim}
    `,
        [ref]
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
      let anoInadimplencia = parseInt(ref.split("-")[0]);
      let mesInadimplencia = parseInt(ref.split("-")[1]);

      if (mesInadimplencia === 1) {
        anoInadimplencia = anoInadimplencia - 1;
        mesInadimplencia = 12;
      } else if (mesInadimplencia === 12) {
        anoInadimplencia++;
        mesInadimplencia = 1;
      } else {
        mesInadimplencia--;
      }
      let refInadimplencia = `${anoInadimplencia}-${mesInadimplencia.toString().padStart(2, "0")}`;

      const filterInadimplencias =
        tipo_agregacao == "FILIAL"
          ? ` and filial in(${listaMetas.map((value) => db.escape(value)).join(",")})`
          : ` and cpf in(${listaMetas.map((value) => db.escape(value)).join(",")})`;

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
            ${filterInadimplencias}
    `,
        [refInadimplencia]
      );
      espelho.inadimplencias = rowsInadimplencias && rowsInadimplencias[0];

      // obter todos os realizados
      const filterVendas =
        tipo_agregacao == "FILIAL"
          ? ` and v.filial in(${listaMetas.map((value) => db.escape(value)).join(",")})`
          : ` and CONVERT(v.cpfVendedor, INTEGER) in(${listaMetas
              .map((value) => db.escape(value))
              .join(",")})})`;

      const datasys_ativacoes =
        agregador.grupo_economico === "FACELL" ? "datasys_ativacoes" : "datasys_ativacoes_fort";
      const [realizadoServico] = await db.execute(
        `
        SELECT 
            COUNT(CASE WHEN v.categoria = 'PÓS PURO' THEN v.id END) as pos,
            COUNT(CASE WHEN v.categoria = 'PÓS PURO' AND (v.plaOpera LIKE '%MULTI%' OR v.plaOpera LIKE '%FAM%') THEN v.id END) as pos_titular,
            COUNT(CASE WHEN v.categoria = 'PÓS PURO' AND NOT (v.plaOpera LIKE '%MULTI%' OR v.plaOpera LIKE '%FAM%' OR v.plaOpera LIKE '%DEPEN%') THEN v.id END) as pos_individual,

            COUNT(CASE WHEN v.categoria = 'CONTROLE' THEN v.id END) as controle,
            COUNT(CASE WHEN v.categoria = 'CONTROLE' AND v.plaOpera LIKE '%CONTROLE A%' THEN v.id END) as controle_a,
            SUM(CASE WHEN v.tipo_movimento <> 'UPGRADE 2' THEN v.valor_receita END) as receita,
            COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 1' THEN v.id END) as upgrade,
            COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 2' THEN v.id END) as upgrade2,
            COUNT(CASE WHEN v.categoria = 'LIVE' THEN v.id END) as live
        FROM
            ${datasys_ativacoes} v
        WHERE
            v.dtAtivacao BETWEEN ? AND ?
            AND NOT v.statusLinha IN ('VENDA IRREGULAR', 'CANCELADA', 'DUPLICIDADE')
            ${filterVendas}
            `,
        [espelho.data_inicial, espelho.data_final]
      );

      const datasys_vendas =
        agregador.grupo_economico === "FACELL" ? "datasys_vendas" : "datasys_vendas_fort";
      const [realizadoProduto] = await db.execute(
        ` 
        SELECT 
            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa END) as aparelho,

            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND NOT ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO'))
            THEN v.valorCaixa END) as aparelho_mov,

            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO')) 
            THEN v.valorCaixa END) as aparelho_sem_mov,

            SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.valorCaixa END) as acessorio

        FROM
            ${datasys_vendas} v
        WHERE
            v.tipoPedido = 'Venda'
            AND DATE(v.dataPedido) BETWEEN ? AND ?  
            ${filterVendas}
            `,
        [espelho.data_inicial, espelho.data_final]
      );

      const filterPitzi =
        tipo_agregacao === "FILIAL"
          ? ` and f.filial in(${listaMetas.map((value) => db.escape(value)).join(",")})`
          : ` and p.cpf_vendedor in(${listaMetas.map((value) => db.escape(value)).join(",")})`;
      const [realizadoPitzi] = await db.execute(
        `SELECT sum(p.valor) as faturamento FROM pitzi_vendas p 
        INNER JOIN filiais f ON f.nome_pitzi = p.loja
        WHERE
            DATE(p.data) between ? and ?
            ${filterPitzi}
            `,
        [espelho.data_inicial, espelho.data_final]
      );

      // Realizado
      // Serviço
      let real_controle =
        (realizadoServico && realizadoServico[0] && parseInt(realizadoServico[0]["controle"])) || 0;

      let real_pos =
        (realizadoServico && realizadoServico[0] && parseInt(realizadoServico[0]["pos"])) || 0;

      // !deflator pós
      real_pos = real_pos > espelho.trafego_zero_qtde ? real_pos - espelho.trafego_zero_qtde : 0;

      let real_upgrade =
        (realizadoServico && realizadoServico[0] && parseInt(realizadoServico[0]["upgrade"])) || 0;

      let real_receita =
        (realizadoServico && realizadoServico[0] && parseFloat(realizadoServico[0]["receita"])) ||
        0;

      // Produtos
      let real_aparelho =
        (realizadoProduto && realizadoProduto[0] && parseFloat(realizadoProduto[0]["aparelho"])) ||
        0;
      let real_aparelho_mov =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["aparelho_mov"])) ||
        0;
      let real_aparelho_sem_mov =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["aparelho_sem_mov"])) ||
        0;

      let real_acessorio =
        (realizadoProduto && realizadoProduto[0] && parseFloat(realizadoProduto[0]["acessorio"])) ||
        0;

      // Pitzi
      let real_pitzi =
        (realizadoPitzi && realizadoPitzi[0] && parseFloat(realizadoPitzi[0]["faturamento"])) || 0;

      espelho.realizado = {
        controle: real_controle,
        pos: real_pos,
        upgrade: real_upgrade,
        receita: real_receita,

        aparelho: real_aparelho,
        aparelho_mov: real_aparelho_mov,
        aparelho_sem_mov: real_aparelho_sem_mov,
        acessorio: real_acessorio,
        pitzi: real_pitzi,
      };

      // obter atingimento das metas
      let ating_pos =
        espelho.metas.pos == 0 ? 1 : parseFloat((real_pos / espelho.metas.pos).toFixed(4));
      let incremento_controle =
        real_pos > espelho.metas.pos && real_controle < espelho.metas.controle
          ? real_pos - espelho.metas.pos
          : 0;
      let ating_controle =
        espelho.metas.controle == 0
          ? 1
          : parseFloat(((real_controle + incremento_controle) / espelho.metas.controle).toFixed(4));
      let ating_upgrade =
        espelho.metas.upgrade == 0
          ? 1
          : parseFloat((real_upgrade / espelho.metas.upgrade).toFixed(4));
      let ating_receita =
        espelho.metas.receita == 0
          ? 1
          : parseFloat((real_receita / espelho.metas.receita).toFixed(4));

      let ating_aparelho =
        espelho.metas.aparelho == 0
          ? 1
          : parseFloat((real_aparelho / espelho.metas.aparelho).toFixed(4));
      let ating_acessorio =
        espelho.metas.acessorio == 0
          ? 1
          : parseFloat((real_acessorio / espelho.metas.acessorio).toFixed(4));
      let ating_pitzi =
        espelho.metas.pitzi == 0 ? 1 : parseFloat((real_pitzi / espelho.metas.pitzi).toFixed(4));

      espelho.atingimento = {
        pos: ating_pos >= 0.96 && ating_pos < 1.0 ? 1 : ating_pos,
        controle: ating_controle >= 0.96 && ating_controle < 1.0 ? 1 : ating_controle,
        upgrade: ating_upgrade >= 0.96 && ating_upgrade < 1.0 ? 1 : ating_upgrade,
        receita: ating_receita >= 0.96 && ating_receita < 1.0 ? 1 : ating_receita,
        aparelho: ating_aparelho >= 0.96 && ating_aparelho < 1.0 ? 1 : ating_aparelho,
        acessorio: ating_acessorio >= 0.96 && ating_acessorio < 1.0 ? 1 : ating_acessorio,
        pitzi: ating_pitzi >= 0.96 && ating_pitzi < 1.0 ? 1 : ating_pitzi,
      };

      espelho.menor_ating_tim = Math.min(
        espelho.atingimento.pos,
        espelho.atingimento.controle,
        espelho.atingimento.receita,
        espelho.atingimento.upgrade
      );

      espelho.menor_ating_facell = Math.min(
        espelho.atingimento.aparelho,
        espelho.atingimento.acessorio,
        espelho.atingimento.pitzi
      );

      espelho.escalonamento = {
        controle: verificaEscalonamento(espelho.atingimento.controle),
        pos: verificaEscalonamento(espelho.atingimento.pos),
        aparelho: verificaEscalonamento(espelho.atingimento.aparelho),
        acessorio: verificaEscalonamento(espelho.atingimento.acessorio),
        pitzi: verificaEscalonamento(espelho.atingimento.pitzi),
        receita: verificaEscalonamento(espelho.atingimento.receita),
        upgrade: verificaEscalonamento(espelho.atingimento.upgrade),
      };
      // Obter outros atingimentos e deflatores de acordo com os percentuais de atingimento de metas
      const percentMinMetas = 0.75;
      let deflatorMetasTim =
        espelho.atingimento.pos < percentMinMetas ||
        espelho.atingimento.controle < percentMinMetas ||
        espelho.atingimento.upgrade < percentMinMetas ||
        espelho.atingimento.receita < percentMinMetas
          ? 0.5
          : 1;

      let deflatorMetasFacell =
        deflatorMetasTim ||
        espelho.atingimento.aparelho < percentMinMetas ||
        espelho.atingimento.acessorio < percentMinMetas ||
        espelho.atingimento.pitzi < percentMinMetas
          ? 0.5
          : 1;

      let elegivelBonusMetasTim =
        espelho.atingimento.pos >= 1 &&
        espelho.atingimento.controle >= 1 &&
        espelho.atingimento.upgrade >= 1 &&
        espelho.atingimento.receita >= 1
          ? true
          : false;
      let elegivelBonusMetasFacell =
        espelho.atingimento.aparelho >= 1 &&
        espelho.atingimento.acessorio >= 1 &&
        espelho.atingimento.pitzi >= 1
          ? true
          : false;
      let elegivelBonusTodasMetas =
        elegivelBonusMetasTim === true && elegivelBonusMetasFacell === true ? true : false;

      // APURAÇÃO BÔNUS GE - PÓS
      const [rowMetaGE] = await db.execute(
        `SELECT meta_pos FROM tim_ge_metas WHERE ano = ? and mes = ? `,
        [ano, mes]
      );
      const [rowRealizadoGE] = await db.execute(
        `SELECT pos FROM tim_ge_real WHERE ano = ? and mes = ? `,
        [ano, mes]
      );

      const metaGEpos =
        rowMetaGE && rowMetaGE[0] && rowMetaGE[0]["meta_pos"] && parseInt(rowMetaGE[0]["meta_pos"]);
      espelho.metas.GEpos = metaGEpos || 0;

      const realGEpos =
        rowRealizadoGE &&
        rowRealizadoGE[0] &&
        rowRealizadoGE[0]["pos"] &&
        parseInt(rowRealizadoGE[0]["pos"]);
      espelho.realizado.GEpos = realGEpos || 0;

      espelho.elegivelBonusGE = false;
      if (metaGEpos && metaGEpos > 0 && realGEpos >= metaGEpos) {
        espelho.elegivelBonusGE = true;
      }

      espelho = {
        ...espelho,
        elegivelBonusMetasFacell,
        elegivelBonusMetasTim,
        elegivelBonusTodasMetas,
      };
      // puxar a política
      const [rowsRegras] = await db.execute(
        `SELECT * FROM comissao_politica_regras WHERE id_politica = '${politica.id}' AND cargo = 'gerente'`
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
          descr: "APARELHO COM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.aparelho_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.aparelho_mov *
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira
            );
          },
        },
        {
          tipo_remuneracao: "COMISSÃO",
          segmento: "APARELHO",
          descr: "APARELHO SEM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.aparelho_sem_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.aparelho_sem_mov *
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira
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
          faturamento: espelho.realizado.acessorio,
          calculo: (valor) => {
            return (
              espelho.realizado.acessorio *
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira
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
              espelho.deflatores.app_e_esteira
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
              espelho.deflatores.app_e_esteira
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
          calc_comissao =
            comissao.calculo(regra[0].valor) * (isSub && tipo_agregacao === "FILIAL" ? 0.5 : 1);
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
          descr: "APARELHO COM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.aparelho_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.aparelho_mov *
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.aparelho < 1 ? 1 : deflatorMetasFacell)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "APARELHO",
          descr: "APARELHO SEM MOVIMENTACAO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.aparelho_sem_mov,
          calculo: (valor) => {
            return (
              espelho.realizado.aparelho_sem_mov *
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.aparelho < 1 ? 1 : deflatorMetasFacell)
            );
          },
        },
        {
          segmento: "ACESSORIO",
          descr: "ACESSORIO",
          tipo_remuneracao: "BÔNUS",
          meta: espelho.metas.acessorio,
          realizado: espelho.realizado.acessorio,
          atingimento: espelho.atingimento.acessorio,
          escalonamento: espelho.escalonamento.acessorio,
          faturamento: espelho.realizado.acessorio,
          calculo: (valor) => {
            return (
              espelho.realizado.acessorio *
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.aparelho < 1 ? 1 : deflatorMetasFacell)
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
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.aparelho < 1 ? 1 : deflatorMetasFacell)
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
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.aparelho < 1 ? 1 : deflatorMetasFacell)
            );
          },
        },

        {
          tipo_remuneracao: "BÔNUS",
          segmento: "APARELHO",
          descr: "ACELERADOR APARELHO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.aparelho,
          calculo: (valor) => {
            return (
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.aparelho < 1 ? 1 : deflatorMetasFacell)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "ACESSORIO",
          descr: "ACELERADOR ACESSORIO",
          meta: espelho.metas.acessorio,
          realizado: espelho.realizado.acessorio,
          atingimento: espelho.atingimento.acessorio,
          escalonamento: espelho.escalonamento.acessorio,
          faturamento: espelho.realizado.acessorio,
          calculo: (valor) => {
            return (
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.acessorio < 1 ? 1 : deflatorMetasFacell)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "PITZI",
          descr: "ACELERADOR PITZI",
          meta: espelho.metas.pitzi,
          realizado: espelho.realizado.pitzi,
          atingimento: espelho.atingimento.pitzi,
          escalonamento: espelho.escalonamento.pitzi,
          faturamento: espelho.realizado.pitzi,
          calculo: (valor) => {
            return (
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.pitzi < 1 ? 1 : deflatorMetasFacell)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "RECEITA",
          descr: "ACELERADOR RECEITA",
          meta: espelho.metas.receita,
          realizado: espelho.realizado.receita,
          atingimento: espelho.atingimento.receita,
          escalonamento: espelho.escalonamento.receita,
          faturamento: espelho.realizado.receita,
          calculo: (valor) => {
            return (
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.receita < 1 ? 1 : deflatorMetasTim)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "CONTROLE",
          descr: "ACELERADOR CONTROLE",
          meta: espelho.metas.controle,
          realizado: espelho.realizado.controle,
          atingimento: espelho.atingimento.controle,
          escalonamento: espelho.escalonamento.controle,
          faturamento: espelho.realizado.controle,
          calculo: (valor) => {
            return (
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.controle < 1 ? 1 : deflatorMetasTim)
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "PÓS-PURO",
          descr: "ACELERADOR VOZ",
          meta: espelho.metas.pos,
          realizado: espelho.realizado.pos,
          atingimento: espelho.atingimento.pos,
          escalonamento: espelho.escalonamento.pos,
          faturamento: espelho.realizado.pos,
          calculo: (valor) => {
            return (
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.pos < 1 ? 1 : deflatorMetasTim)
            );
          },
        },

        {
          tipo_remuneracao: "BÔNUS",
          segmento: "UPGRADE",
          descr: "ACELERADOR UPGRADE",
          meta: espelho.metas.upgrade,
          realizado: espelho.realizado.upgrade,
          atingimento: espelho.atingimento.upgrade,
          escalonamento: espelho.escalonamento.upgrade,
          faturamento: espelho.realizado.upgrade,
          calculo: (valor) => {
            return (
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira *
              (espelho.escalonamento.upgrade < 1 ? 1 : deflatorMetasTim)
            );
          },
        },

        //   Esses são peculiares:
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "BONUS METAS FACELL",
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
              espelho.deflatores.app_e_esteira
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "BONUS METAS TIM",
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
              espelho.deflatores.app_e_esteira
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "BONUS TODAS AS METAS",
          meta: 0,
          realizado: 0,
          atingimento: verificaEscalonamento(
            Math.min(espelho.menor_ating_tim || 0, espelho.menor_ating_facell || 0)
          ),
          escalonamento: verificaEscalonamento(
            Math.min(espelho.menor_ating_tim || 0, espelho.menor_ating_facell || 0)
          ),
          faturamento: 0,
          calculo: (valor) => {
            let elegivelTodasAsMetas = espelho.elegivelBonusTodasMetas ? 1 : 0;
            return (
              elegivelTodasAsMetas *
              valor *
              espelho.qualidade_tim *
              espelho.deflatores.app_e_esteira
            );
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "BONUS GE [META VOZ TIM]",
          meta: espelho.metas.GEpos,
          realizado: espelho.realizado.GEpos,
          atingimento: espelho.realizado.GEpos / espelho.metas.GEpos,
          escalonamento: verificaEscalonamento(espelho.realizado.GEpos / espelho.metas.GEpos),
          faturamento: 0,
          calculo: (valor) => {
            let elegivelBonusGE = espelho.elegivelBonusGE ? 1 : 0;

            return (
              elegivelBonusGE * valor * espelho.qualidade_tim * espelho.deflatores.app_e_esteira
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

          if (!isNegative) {
            let valor =
              valor_inicial *
              (espelho.qualidade ? espelho.qualidade : 1) *
              (espelho.deflatores.app_e_esteira ? 0.5 : 1);
            espelho.bonus += valor;
          } else {
            let valor = Math.abs(valor_inicial);

            // Descontar do bônus
            if (espelho.bonus >= valor) {
              espelho.bonus -= valor;
              valor = 0;
            } else {
              valor -= espelho.bonus;
              espelho.bonus = 0;
            }

            // Descontar da comissão
            if (espelho.comissao >= valor) {
              espelho.comissao -= valor;
              valor = 0;
            } else {
              valor -= espelho.comissao;
              espelho.comissao = 0;
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
        info: "Percentuais TIM",
        descr: `Qualidade: ${(espelho.qualidade_tim * 100).toFixed(2)}% | App x Siebel: ${(
          espelho.app_tim_vendas * 100
        ).toFixed(2)}%  | Esteira Full: ${(espelho.esteira_full * 100).toFixed(2)}%`,
      });

      espelho.resumo.push({
        info: "Total",
        descr: `Comissão: ${espelho.comissao.toFixed(2)} | Bônus: ${espelho.bonus.toFixed(
          2
        )}  | Comissão+Bônus: ${(espelho.comissao + espelho.bonus).toFixed(2)}`,
      });

      // * GERAÇÃO DO ESPELHO:
      // Geração de log detalhado:
      // espelho.toJSON()

      // Em PDF
      fileUrl = await espelho.toPDF();
      // gerar registro em comissao_interna

      try {
        // Buscar se já existe o espelho, se existir, então excluir o pdf e o registro:
        const [rowEspelhoAntigo] = await db.execute(
          `SELECT fileUrl FROM comissao WHERE ref = ? and filial = ? and cpf = ? and cargo = ?`,
          [ref, espelho.filial, espelho.cpf, espelho.cargo]
        );

        if (rowEspelhoAntigo && rowEspelhoAntigo[0]) {
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
        } else {
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
        await db.execute(
          `UPDATE metas_agregadores SET status_espelho = 'Calculado', obs_espelho = '' WHERE id = ? `,
          [agregador.id]
        );

        resolve({ success: true });
        return true;
      } catch (error) {
        // tentar excluir o pdf
        try {
          await db.execute(
            `UPDATE metas_agregadores SET status_espelho = 'Erro', obs_espelho = ? WHERE id = ? `,
            [error.message, agregador.id]
          );
          if (fileUrl) {
            espelho.deletePDF(fileUrl);
          }
        } catch (error) {
          console.log("[TRY_DELETE_NEW_PDF_AFTER_ERROR]", fileUrl);
        }
        reject("[INSERT/UPDATE]:" + error.message);
        return false;
      }
    } catch (error) {
      console.log(error);
      // tentar excluir o pdf e atualizar status agregador
      try {
        await db.execute(
          `UPDATE metas_agregadores SET status_espelho = 'Erro', obs_espelho = ? WHERE id = ? `,
          [error.message, agregador.id]
        );
        if (fileUrl) {
          espelho.deletePDF(fileUrl);
        }
      } catch (error) {
        console.log("[TRY_DELETE_NEW_PDF_AFTER_ERROR]", fileUrl);
      }

      reject("[CÁLCULO]:" + error.message);
      return false;
    }
  });
};

module.exports = gerente;

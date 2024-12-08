"use strict";
const fs = require("fs");
const db = require("../../../../../../../../mysql");
const Espelho = require("../../../espelhos/modelo_espelho");
const { formatarValor } = require("../../../helper");
const path = require("path");

const verificaEscalonamento = (atingimento) => {
  if (!atingimento) {
    return null;
  }
  let ating = parseFloat(atingimento);
  if (ating >= 1.1) {
    return 1.1;
  } else if (ating >= 1.0 && ating < 1.1) {
    return 1.0;
  } else if (ating >= 0.9 && ating < 1.0) {
    return 0.9;
  } else {
    return 0;
  }
};

const coordenadorComercial = async ({ ref, agregador, politica }) => {
  return new Promise(async (resolve, reject) => {
    // console.log('[START_CALC_GERENTE]', agregador.nome)
    const espelho = new Espelho(
      agregador.ciclo,
      agregador.nome?.toUpperCase(),
      [],
      []
    );
    var fileUrl

    try {
      const ano = parseInt(ref.split("-")[0]);
      const mes = parseInt(ref.split("-")[1]);

      if (!agregador.metas_agregadas || !agregador.tipo_agregacao) {
        reject(`${agregador.nome} sem metas.`);
      }

      var listaMetas;
      listaMetas = agregador.metas_agregadas
        .split(";")
        .map((filial) => filial.trim());

      if (listaMetas?.length < 1) {
        reject("Nenhuma meta_agregada para o coordenador!");
        return false;
      }

      const filterMeta = ` AND cargo = 'FILIAL' AND filial in('${listaMetas.join(
        "','"
      )}')`;

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

      espelho.grupo_economico = agregador.grupo_economico;
      espelho.cpf = agregador.cpf;
      espelho.filial = agregador.filial;
      espelho.cargo = agregador.cargo;
      espelho.data_inicial = agregador.data_inicial;
      espelho.data_final = agregador.data_final;

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
        descr: `${agregador.data_inicial
          ?.split("-")
          .reverse()
          .join("/")} até ${agregador.data_final
          ?.split("-")
          .reverse()
          .join("/")}`,
      });

      // todas as metas
      espelho.metas = {
        controle: parseInt(meta.controle) || 0,
        pos: parseInt(meta.pos) || 0,
        upgrade: parseInt(meta.upgrade) || 0,
        receita: parseFloat(meta.receita) || 0,
        aparelho: parseFloat(meta.aparelho) || 0,
        acessorio: parseFloat(meta.acessorio) || 0,
        pitzi: parseFloat(meta.pitzi) || 0,
      };

      // [QUALIDADE TIM]
      const filterQualidade = ` and nome in('${listaMetas.join("','")}')`;

      const [rowsQualidade] = await db.execute(
        `SELECT qualidade FROM comissao_qualidade_tim WHERE ref = ? ${filterQualidade}`,
        [ref]
      );

      espelho.qualidade_tim =
        (rowsQualidade &&
          rowsQualidade[0] &&
          parseFloat(rowsQualidade[0]["qualidade"])) ||
        0;

      // [ESTEIRA_FULL]
      const filterRelsTim = `AND filial in('${listaMetas.join("','")}')`;

      const [rowEsteiraFull] = await db.execute(
        `SELECT sum(indicador) / sum(total) as esteiraFull FROM comissao_esteira_full_tim WHERE ref = ? ${filterRelsTim} `,
        [ref]
      );
      espelho.esteira_full =
        (rowEsteiraFull &&
          rowEsteiraFull[0] &&
          parseFloat(rowEsteiraFull[0]["esteiraFull"])) ||
        1;

      // [APP TIM VENDAS]
      const [rowAppTimVendas] = await db.execute(
        `SELECT sum(indicador) / sum(total) as app FROM comissao_app_tim_vendas WHERE ref = ? ${filterRelsTim} `,
        [ref]
      );
      espelho.app_tim_vendas =
        (rowAppTimVendas &&
          rowAppTimVendas[0] &&
          parseFloat(rowAppTimVendas[0]["app"])) ||
        1;

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
      let refInadimplencia = `${anoInadimplencia}-${mesInadimplencia
        .toString()
        .padStart(2, "0")}`;

      const filterInadimplencias = ` AND filial in('${listaMetas.join(
        "','"
      )}')`;
      const facell_docs =
        espelho.grupo_economico === "FACELL"
          ? "facell_docs"
          : "facell_docs_fort";

      const [rowsInadimplencias] = await db.execute(
        `SELECT
        COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' THEN id END) as qtdeControle,  
        COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' AND NOT plaOpera LIKE '%CONTROLE A%' THEN id END) as qtdeOutrosControles,  
        COUNT(CASE WHEN plaOpera LIKE '%CONTROLE%' AND plaOpera LIKE '%CONTROLE A%' THEN id END) as qtdeControleA,  

        COUNT(CASE WHEN plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%' THEN id END) as qtdePos,  

        COUNT(CASE WHEN (plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%') AND (NOT plaOpera LIKE '%MULTI%' AND NOT plaOpera LIKE '%DEPE%' AND NOT plaOpera LIKE '%FAM%') THEN id END) as qtdePosIndividual, 

        COUNT(CASE WHEN (plaOpera LIKE '%BLACK%' OR plaOpera LIKE '%POS%') AND (plaOpera LIKE '%MULTI%' OR plaOpera LIKE '%FAM%') THEN id END) as qtdePosTitular,

        SUM(valor_receita) as receita

        FROM ${facell_docs}
        WHERE 
            status_inadimplencia = 'Inadimplente'
            AND DATE_FORMAT(dtAtivacao, '%Y-%m') = ?
            ${filterInadimplencias}
    `,
        [refInadimplencia]
      );
      espelho.inadimplencias = rowsInadimplencias && rowsInadimplencias[0];

      // obter todos os realizados
      const filterVendas = ` and v.filial in('${listaMetas.join("','")}')`;
      const datasys_ativacoes =
        espelho.grupo_economico === "FACELL"
          ? "datasys_ativacoes"
          : "datasys_ativacoes_fort";

      const [realizadoServico] = await db.execute(
        `
        SELECT 
            COUNT(CASE WHEN v.categoria = 'PÓS PURO' THEN v.id END) as pos,
            SUM(CASE WHEN v.tipo_movimento <> 'UPGRADE 2' THEN v.valor_receita END) as receita

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
        espelho.grupo_economico === "FACELL"
          ? "datasys_vendas"
          : "datasys_vendas_fort";

      const [realizadoProduto] = await db.execute(
        `SELECT 
            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa END) as aparelho,
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

      const filterPitzi = ` AND f.filial in('${listaMetas.join("','")}')`;

      const [realizadoPitzi] = await db.execute(
        `SELECT sum(p.valor) as faturamento FROM pitzi_vendas p 
        INNER JOIN filiais f ON f.nome_pitzi = p.loja
        WHERE
            DATE(p.data) between ? and ?
            ${filterPitzi}
            `,
        [espelho.data_inicial, espelho.data_final]
      );

      // Destaque Ranking
      const [rowDestaque] = await db.execute(
        `SELECT posicao, percent FROM comissao_ranking_libertadores WHERE ref = ? and cpf = ?;`,
        [ref, espelho.cpf]
      );

      // Realizado

      // Serviço
      let real_destaque =
        (rowDestaque &&
          rowDestaque[0] &&
          parseInt(rowDestaque[0]["posicao"])) ||
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

      let real_receita =
        (realizadoServico &&
          realizadoServico[0] &&
          parseFloat(realizadoServico[0]["receita"])) ||
        0;

      // Produtos
      let real_aparelho =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["aparelho"])) ||
        0;

      let real_acessorio =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["acessorio"])) ||
        0;

      // Pitzi
      let real_pitzi =
        (realizadoPitzi &&
          realizadoPitzi[0] &&
          parseFloat(realizadoPitzi[0]["faturamento"])) ||
        0;

      espelho.realizado = {
        destaque: real_destaque,

        pos: real_pos,
        receita: real_receita,

        aparelho: real_aparelho,
        acessorio: real_acessorio,
        pitzi: real_pitzi,
      };

      // obter atingimento das metas
      let ating_destaque =
        (rowDestaque &&
          rowDestaque[0] &&
          parseFloat(rowDestaque[0]["percent"])) ||
        0;

      let ating_pos =
        espelho.metas.pos == 0
          ? 1
          : parseFloat((real_pos / espelho.metas.pos).toFixed(4));

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
        espelho.metas.pitzi == 0
          ? 1
          : parseFloat((real_pitzi / espelho.metas.pitzi).toFixed(4));

      espelho.atingimento = {
        destaque: ating_destaque,

        pos: ating_pos >= 0.96 && ating_pos < 1.0 ? 1 : ating_pos,

        receita:
          ating_receita >= 0.96 && ating_receita < 1.0 ? 1 : ating_receita,
        aparelho:
          ating_aparelho >= 0.96 && ating_aparelho < 1.0 ? 1 : ating_aparelho,
        acessorio:
          ating_acessorio >= 0.96 && ating_acessorio < 1.0
            ? 1
            : ating_acessorio,
        pitzi: ating_pitzi >= 0.96 && ating_pitzi < 1.0 ? 1 : ating_pitzi,
      };

      espelho.menor_ating_tim = Math.min(
        espelho.atingimento.pos,
        espelho.atingimento.receita
      );

      espelho.menor_ating_facell = Math.min(
        espelho.atingimento.aparelho,
        espelho.atingimento.acessorio,
        espelho.atingimento.pitzi
      );

      espelho.escalonamento = {
        destaque: espelho.atingimento.destaque >= 0.9 ? 0.9000 : 0,
        pos: verificaEscalonamento(espelho.atingimento.pos),
        aparelho: verificaEscalonamento(espelho.atingimento.aparelho),
        acessorio: verificaEscalonamento(espelho.atingimento.acessorio),
        pitzi: verificaEscalonamento(espelho.atingimento.pitzi),
        receita: verificaEscalonamento(espelho.atingimento.receita),
      };
      // Obter outros atingimentos e deflatores de acordo com os percentuais de atingimento de metas

      let elegivelBonusMetasTim =
        espelho.atingimento.pos >= 1 &&
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
        elegivelBonusMetasTim === true && elegivelBonusMetasFacell === true
          ? true
          : false;

      espelho.elegivelBonusMetasFacell = elegivelBonusMetasFacell
      espelho.elegivelBonusMetasTim = elegivelBonusMetasTim
      espelho.elegivelBonusTodasMetas = elegivelBonusTodasMetas

      // puxar a política
      const [rowsRegras] = await db.execute(
        `SELECT * FROM comissao_politica_regras WHERE id_politica = '${politica.id}' AND cargo = 'coordenador comercial'`
      );

      espelho.regras = rowsRegras.map((row) => ({
        descr: row["descr"],
        tipo_remuneracao: row["tipo_remuneracao"],
        escalonamento: parseFloat(row.escalonamento),
        valor: parseFloat(row["valor"]),
      }));

      //* COMISSÃO
      let comissoes_a_calcular = [];

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
            comissao.calculo(regra[0].valor) 
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
          descr: "APARELHO",
          meta: espelho.metas.aparelho,
          realizado: espelho.realizado.aparelho,
          atingimento: espelho.atingimento.aparelho,
          escalonamento: espelho.escalonamento.aparelho,
          faturamento: espelho.realizado.aparelho,
          calculo: (valor) => {
            return valor * espelho.deflatores.app_e_esteira;
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
          faturamento: espelho.realizado.acessorio,
          calculo: (valor) => {
            return valor * espelho.deflatores.app_e_esteira;
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "PÓS-PURO",
          descr: "PÓS-PURO",
          meta: espelho.metas.pos,
          realizado: espelho.realizado.pos,
          atingimento: espelho.atingimento.pos,
          escalonamento: espelho.escalonamento.pos,
          faturamento: espelho.realizado.pos,
          calculo: (valor) => {
            return valor * espelho.deflatores.app_e_esteira;
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
            return valor * espelho.deflatores.app_e_esteira;
          },
        },
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "RECEITA",
          descr: "RECEITA TIM",
          meta: espelho.metas.receita,
          realizado: espelho.realizado.receita,
          atingimento: espelho.atingimento.receita,
          escalonamento: espelho.escalonamento.receita,
          faturamento: espelho.realizado.receita,
          calculo: (valor) => {
            return valor * espelho.deflatores.app_e_esteira;
          },
        },

        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "FATURAMENTO TOTAL",
          meta: 0,
          realizado: 0,
          atingimento: 1,
          escalonamento: 0,
          faturamento:
            espelho.realizado.aparelho +
            espelho.realizado.acessorio +
            espelho.realizado.pitzi +
            espelho.realizado.receita,
          calculo: (valor) => {
            let faturamento_total =
              espelho.realizado.aparelho +
              espelho.realizado.acessorio +
              espelho.realizado.pitzi +
              espelho.realizado.receita;
            return valor * faturamento_total;
          },
        },

        //   Esses são peculiares:
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "DESTAQUE RANKING",
          meta: 0,
          realizado: espelho.realizado.destaque,
          atingimento: espelho.atingimento.destaque,
          escalonamento: espelho.atingimento.destaque >= 0.9 ? 0.9 : 0,
          faturamento: 0,
          calculo: (valor) => {
            return valor * espelho.deflatores.app_e_esteira;
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
              espelho.menor_ating_facell || 0
            )
          ),
          escalonamento: verificaEscalonamento(
            Math.min(
              espelho.menor_ating_tim || 0,
              espelho.menor_ating_facell || 0
            )
          ),
          faturamento: 0,
          calculo: (valor) => {
            let elegivelTodasAsMetas = espelho.elegivelBonusTodasMetas ? 1 : 0;
            return (
              valor * elegivelTodasAsMetas * espelho.deflatores.app_e_esteira
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

      // Em PDF
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
        await db.execute(`UPDATE metas_agregadores SET status_espelho = 'Calculado', obs_espelho = '' WHERE id = ? `, [agregador.id])

        resolve({ success: true });
        return true;
      } catch (error) {
        // tentar excluir o pdf
        try {
          await db.execute(`UPDATE metas_agregadores SET status_espelho = 'Erro', obs_espelho = ? WHERE id = ? `, [error.message, agregador.id])
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
      // tentar excluir o pdf e atualizar status agregador
      try {
        await db.execute(`UPDATE metas_agregadores SET status_espelho = 'Erro', obs_espelho = ? WHERE id = ? `, [error.message, agregador.id])
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

module.exports = coordenadorComercial;

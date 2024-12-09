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
  if (ating >= 1.2) {
    return 1.2;
  } else if (ating >= 1.0 && ating < 1.2) {
    return 1.0;
  } else if (ating >= 0.8 && ating < 1.0) {
    return 0.8;
  } else {
    return 0;
  }
};

const caixa = async ({ ref, agregador, politica }) => {
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
      const ano = parseInt(ref.toString().split("-")[0]);
      const mes = parseInt(ref.toString().split("-")[1]);

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
    WHERE cargo = 'FILIAL' and ref = ? AND cpf = ?
    ;
    `,
        [ref, agregador.filial]
      );

      if (!rowMeta || !rowMeta[0]) {
        reject("[INICIO_DO_CALCULO]: Meta não localizada!");
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

      // [TRÁFEGO_ZERO]
      const [rowsTrafegoZero] = await db.execute(
        `SELECT 
    sum(indicador) / sum(total) as trafego_zero_percent,
    (sum(indicador) / sum(total) - 0.1) * sum(total) as trafego_zero_qtde 
    FROM comissao_tz_tim WHERE ref = ? AND filial = ?
    `,
        [ref, espelho.filial]
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

      const facell_docs =
        agregador.grupo_economico === "FACELL"
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
            AND filial = ?
    `,
        [refInadimplencia, espelho.filial]
      );
      espelho.inadimplencias = rowsInadimplencias && rowsInadimplencias[0];

      // * [REALIZADO]
      // obter todos os realizados
      const datasys_ativacoes =
        agregador.grupo_economico === "FACELL"
          ? "datasys_ativacoes"
          : "datasys_ativacoes_fort";
      const [realizadoServico] = await db.execute(
        `
        SELECT 
            COUNT(CASE WHEN v.categoria = 'PÓS PURO' THEN v.id END) as pos,
            COUNT(CASE WHEN v.categoria = 'CONTROLE' THEN v.id END) as controle,
            SUM(CASE WHEN v.tipo_movimento <> 'UPGRADE 2' THEN v.valor_receita END) as receita,
            COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 1' THEN v.id END) as upgrade
        FROM
            ${datasys_ativacoes} v
        WHERE
            v.dtAtivacao BETWEEN ? AND ?
            AND NOT v.statusLinha IN ('VENDA IRREGULAR', 'CANCELADA', 'DUPLICIDADE')
            AND v.filial = ?
            `,
        [espelho.data_inicial, espelho.data_final, espelho.filial]
      );

      const datasys_vendas =
        agregador.grupo_economico === "FACELL"
          ? "datasys_vendas"
          : "datasys_vendas_fort";
      const [realizadoProduto] = await db.execute(
        ` 
        SELECT 
            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa END) as aparelho,
            SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.valorCaixa END) as acessorio,
            SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' AND v.cpfVendedor LIKE '%${espelho.cpf}%' THEN v.valorCaixa END) as faturamento_acessorio

        FROM
            ${datasys_vendas} v
        WHERE
            v.tipoPedido = 'Venda'
            AND DATE(v.dataPedido) BETWEEN ? AND ?  
            AND v.filial = ?
            `,
        [espelho.data_inicial, espelho.data_final, espelho.filial]
      );

      const [realizadoPitzi] = await db.execute(
        `SELECT sum(p.valor) as faturamento FROM pitzi_vendas p 
        INNER JOIN filiais f ON f.nome_pitzi = p.loja
        WHERE
            DATE(p.data) between ? and ?
            AND f.filial = ?
            `,
        [espelho.data_inicial, espelho.data_final, espelho.filial]
      );

      let real_controle =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["controle"])) ||
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

      let real_upgrade =
        (realizadoServico &&
          realizadoServico[0] &&
          parseInt(realizadoServico[0]["upgrade"])) ||
        0;

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
      let faturamento_acessorio =
        (realizadoProduto &&
          realizadoProduto[0] &&
          parseFloat(realizadoProduto[0]["faturamento_acessorio"])) ||
        0;

      // Pitzi
      let real_pitzi =
        (realizadoPitzi &&
          realizadoPitzi[0] &&
          parseFloat(realizadoPitzi[0]["faturamento"])) ||
        0;

      espelho.realizado = {
        controle: real_controle,
        pos: real_pos,
        upgrade: real_upgrade,
        receita: real_receita,

        aparelho: real_aparelho,
        acessorio: real_acessorio,
        faturamento_acessorio: faturamento_acessorio,
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
        pos: ating_pos >= 0.96 && ating_pos < 1.0 ? 1 : ating_pos,
        controle:
          ating_controle >= 0.96 && ating_controle < 1.0 ? 1 : ating_controle,
        upgrade:
          ating_upgrade >= 0.96 && ating_upgrade < 1.0 ? 1 : ating_upgrade,
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

      let elegivelBonusTodasMetas =
        espelho.atingimento.controle >= 1 &&
        espelho.atingimento.pos >= 1 &&
        espelho.atingimento.upgrade >= 1 &&
        espelho.atingimento.receita >= 1 &&
        espelho.atingimento.aparelho >= 1 &&
        espelho.atingimento.acessorio >= 1 &&
        espelho.atingimento.pitzi >= 1;

      espelho.elegivelBonusTodasMetas = elegivelBonusTodasMetas
  
      // puxar a política
      const [rowsRegras] = await db.execute(
        `SELECT * FROM comissao_politica_regras WHERE id_politica = ${politica.id} AND cargo = 'caixa'`
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
          segmento: "ACESSORIO",
          descr: "FATURAMENTO ACESSORIO",
          meta: 0,
          realizado: espelho.realizado.faturamento_acessorio,
          atingimento: 0,
          escalonamento: 0,
          faturamento: espelho.realizado.faturamento_acessorio,
          calculo: (valor) => {
            return espelho.realizado.faturamento_acessorio * parseFloat(valor);
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
        //   Esses são peculiares:
        {
          tipo_remuneracao: "BÔNUS",
          segmento: "OUTROS",
          descr: "TODAS AS METAS",
          meta: 0,
          realizado: 0,
          atingimento: Math.min(
            espelho.atingimento.controle,
            espelho.atingimento.pos,
            espelho.atingimento.upgrade,
            espelho.atingimento.receita,

            espelho.atingimento.aparelho,
            espelho.atingimento.acessorio,
            espelho.atingimento.pitzi
          ),
          escalonamento: verificaEscalonamento(
            Math.min(
              espelho.escalonamento.controle,
              espelho.escalonamento.pos,
              espelho.escalonamento.upgrade,
              espelho.escalonamento.receita,

              espelho.escalonamento.aparelho,
              espelho.escalonamento.acessorio,
              espelho.escalonamento.pitzi
            )
          ),
          faturamento: 0,
          calculo: (valor) => {
            let elegivelTodasAsMetas = espelho.elegivelBonusTodasMetas ? 1 : 0;
            return elegivelTodasAsMetas * parseFloat(valor);
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

module.exports = caixa;

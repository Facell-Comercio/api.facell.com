"use strict";
const path = require("path");
const fs = require("fs");
const db = require("../../../../../../../../mysql");
const Espelho = require("../../../espelhos/modelo_espelho");
const { formatarValor } = require("../../../helper");

const verificaEscalonamento = (atingimento) => {
    if (!atingimento) {
      return null;
    }
    let ating = parseFloat(atingimento);
    if (ating >= 1.2) {
      return 1.2;
    } else if (ating >= 1.0 && ating < 1.2) {
      return 1.0;
    } else if (ating >= 0.9 && ating < 1.0) {
      return 0.9;
    } else {
      return 0;
    }
  };

const supervisorRelacionamento = async ({ ref, agregador, politica }) => {
  return new Promise(async (resolve, reject) => {
    // console.log('[START_CALC_CONSULTOR]', meta.nome)
    const espelho = new Espelho(
      agregador.ciclo,
      agregador.nome?.toUpperCase(),
      [],
      []
    );
    var fileUrl

    try{
    const ano = parseInt(ref.split("-")[0]);
    const mes = parseInt(ref.split("-")[1]);

    if (!agregador) {
      reject("Meta não localizada!");
      return false;
    }
    if(!agregador.ciclo){
      reject("Ciclo não informado!");
      return false;
    }
    if(!agregador.ref){
      reject("Referência não informada!");
      return false;
    }
    if(!agregador.cpf){
      reject("CPF não informado!");
      return false;
    }

    agregador.data_inicial = formatarValor(agregador.data_inicial, "data");
    agregador.data_final = formatarValor(agregador.data_final, "data");

    espelho.cpf = agregador.cpf;
    espelho.cargo = agregador.cargo;
    espelho.grupo_economico = agregador.grupo_economico;
    espelho.filial = agregador.filial;

    espelho.resumo.push({
      info: "Grupo Econômico",
      descr: `${espelho.grupo_economico} | Filial: ${espelho.filial}`,
    });
    espelho.resumo.push({
      info: "Nome",
      descr: `${espelho.nome} | CPF: ${espelho.cpf}`,
    });
    espelho.resumo.push({ info: "Cargo", descr: espelho.cargo });
    espelho.resumo.push({
      info: "Período",
      descr: `${agregador.data_inicial
        ?.split("-")
        .reverse()
        .join("/")} até ${agregador.data_final?.split("-").reverse().join("/")}`,
    });


    //* [METAS DE VENDAS DIRETAS]
    var listaMetas = agregador.metas_agregadas
        .split(";")
        .map((cpf) => cpf.trim());

    const filterMeta = ` AND cpf in('${listaMetas.join("','")}')`;
    console.log(filterMeta)

    const [rowMetasDiretas] = await db.execute(
        `SELECT 
        sum(receita) as receita, 
        sum(aparelho) as aparelho, 
        sum(acessorio) as acessorio, 
        sum(pitzi) as pitzi 
    FROM metas 
    WHERE cargo = 'CONSULTOR DE VENDAS DIRETAS' and ref = ? ${filterMeta};
    `,
        [ref]
      );
    const metaVendasDiretas = rowMetasDiretas && rowMetasDiretas[0]
    if(!metaVendasDiretas){
        reject(`Não foram encontradas metas de vendas diretas para ${espelho.nome}`)
        return false;
    }

    //* [METAS DE VENDAS INDIRETAS] 
    const [rowMetasIndiretas] = await db.execute(
        `SELECT 
        sum(aparelho) as aparelho
    FROM metas 
    WHERE cargo = 'CONSULTOR DE VENDAS INDIRETAS' and ref = ? ${filterMeta};
    `,
        [ref]
      );
    const metaVendasIndiretas = rowMetasIndiretas && rowMetasIndiretas[0]
    if(!metaVendasIndiretas){
        reject(`Não foram encontradas metas de vendas indiretas para ${espelho.nome}`)
        return false;
    }

    // todas as metas
    espelho.metas = {
      receita: parseFloat(metaVendasDiretas.receita) || 0,
      aparelho: parseFloat(metaVendasDiretas.aparelho) || 0,
      acessorio: parseFloat(metaVendasDiretas.acessorio) || 0,
      pitzi: parseFloat(metaVendasDiretas.pitzi) || 0,

      aparelho_vendas_indiretas: parseFloat(metaVendasIndiretas.aparelho) || 0
    };


    //! [DEFLATORES DE VENDAS DIRETAS]
    // [TRÁFEGO_ZERO]
    const [rowsTrafegoZero] = await db.execute(
      `SELECT 
    sum(indicador) / sum(total) as trafego_zero_percent,
    (sum(indicador) / sum(total) - 0.1) * sum(total) as trafego_zero_qtde 
    FROM comissao_tz_tim WHERE ref = ? ${filterMeta} 
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
            AND cpfVendedor in('${listaMetas.join("','")}')
    `,
      [refInadimplencia]
    );
    espelho.inadimplencias = rowsInadimplencias && rowsInadimplencias[0];

    //* [REALIZADO DE VENDAS DIRETAS]
    const [realizadoServico] = await db.execute(
      `
        SELECT 
            SUM(CASE WHEN v.tipo_movimento <> 'UPGRADE 2' THEN v.valor_receita END) as receita
        FROM
            datasys_ativacoes v
        WHERE
            v.dtAtivacao BETWEEN ? AND ?
            AND v.cpfVendedor in('${listaMetas.join("','")}')
            AND NOT v.statusLinha IN ('VENDA IRREGULAR', 'CANCELADA', 'DUPLICIDADE')

            `,
      [agregador.data_inicial, agregador.data_final]
    );

    const [realizadoProduto] = await db.execute(
      ` 
        SELECT 
            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa END) as aparelho,

            SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.valorCaixa END) as acessorio

        FROM
            datasys_vendas v
        WHERE
            v.tipoPedido = 'Venda'
            AND DATE(v.dataPedido) BETWEEN ? AND ?  
            AND v.cpfVendedor in('${listaMetas.join("','")}')
            `,
      [agregador.data_inicial, agregador.data_final]
    );

    const [realizadoProdutoVendasIndiretas] = await db.execute(
        ` 
          SELECT 
              SUM(aparelho) as aparelho
          FROM
              comissao_realizado_vendas_indiretas
          WHERE
              ref = ?
              AND cpf in('${listaMetas.join("','")}')
              `,
        [ref]
      );

    const [realizadoPitzi] = await db.execute(
      `SELECT sum(p.valor) as faturamento FROM pitzi_vendas p 
        INNER JOIN filiais f ON f.nome_pitzi = p.loja
        WHERE
            DATE(p.data) between ? and ?
            AND p.cpf_vendedor in('${listaMetas.join("','")}')
            `,
      [agregador.data_inicial, agregador.data_final]
    );

    // Realizado
    // Serviço
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

      let real_aparelho_vendas_indiretas =
      (realizadoProdutoVendasIndiretas &&
        realizadoProdutoVendasIndiretas[0] &&
        parseFloat(realizadoProdutoVendasIndiretas[0]["aparelho"])) ||
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
      receita: real_receita,
      aparelho: real_aparelho,
      aparelho_vendas_indiretas: real_aparelho_vendas_indiretas,
      acessorio: real_acessorio,
      pitzi: real_pitzi,
    };

    // obter atingimento das metas

    let ating_receita =
      espelho.metas.receita == 0
        ? 1
        : parseFloat((real_receita / espelho.metas.receita).toFixed(4));

    espelho.menor_ating_tim = Math.min(
      ating_receita
    );

    let ating_aparelho =
      espelho.metas.aparelho == 0
        ? 1
        : parseFloat((real_aparelho / espelho.metas.aparelho).toFixed(4));

    let ating_aparelho_vendas_indiretas =
    espelho.metas.aparelho_vendas_indiretas == 0
        ? 1
        : parseFloat((real_aparelho_vendas_indiretas / espelho.metas.aparelho_vendas_indiretas).toFixed(4));

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
      ating_aparelho_vendas_indiretas,
      ating_acessorio,
      ating_pitzi
    );

    espelho.atingimento = {
      receita: ating_receita,
      aparelho: ating_aparelho,
      aparelho_vendas_indiretas: ating_aparelho_vendas_indiretas,
      acessorio: ating_acessorio,
      pitzi: ating_pitzi,
    };

    espelho.escalonamento = {
      aparelho: verificaEscalonamento(ating_aparelho),
      aparelho_vendas_indiretas: verificaEscalonamento(ating_aparelho_vendas_indiretas),
      acessorio: verificaEscalonamento(ating_acessorio),
      pitzi: verificaEscalonamento(ating_pitzi),
      receita: verificaEscalonamento(ating_receita),
    };
    // Obter outros atingimentos e deflatores de acordo com os percentuais de atingimento de metas

    let elegivelBonusMetasTim = ating_receita >= 1;

    let elegivelBonusMetasFacell =
      ating_aparelho >= 1 && 
      ating_aparelho_vendas_indiretas >= 1 && 
      ating_acessorio >= 1 && 
      ating_pitzi >= 1;

    let elegivelBonusTodasMetas = elegivelBonusMetasTim === true && elegivelBonusMetasFacell === true;

    espelho.elegivelBonusMetasFacell = elegivelBonusMetasFacell
    espelho.elegivelBonusMetasTim = elegivelBonusMetasTim
    espelho.elegivelBonusTodasMetas = elegivelBonusTodasMetas

    // puxar a política
    const [rowsRegras] = await db.execute(
      "SELECT * FROM comissao_politica_regras WHERE id_politica = 1 AND cargo = 'supervisor de relacionamento'"
    );

    espelho.regras = rowsRegras.map((row) => ({
      descr: row["descr"],
      tipo_remuneracao: row["tipo_remuneracao"],
      escalonamento: parseFloat(row.escalonamento),
      valor: parseFloat(row["valor"]),
    }));

    //* COMISSÃO
    let comissoes_a_calcular = [
     
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
        descr: "VENDAS INDIRETAS: APARELHO",
        meta: espelho.metas.aparelho_vendas_indiretas,
        realizado: espelho.realizado.aparelho_vendas_indiretas,
        atingimento: espelho.atingimento.aparelho_vendas_indiretas,
        escalonamento: espelho.escalonamento.aparelho_vendas_indiretas,
        faturamento: espelho.realizado.aparelho_vendas_indiretas,
        calculo: (valor) => {
          return (
            valor
          );
        },
      },
      {
        tipo_remuneracao: "BÔNUS",
        segmento: "PRODUTOS",
        descr: "VENDAS DIRETAS: APARELHO + ACESSORIO",
        meta: espelho.metas.aparelho + espelho.metas.acessorio,
        realizado: espelho.realizado.aparelho + espelho.realizado.acessorio,
        atingimento: Math.min(
            espelho.atingimento.aparelho, espelho.atingimento.acessorio
            ),
        escalonamento: Math.min(
            espelho.escalonamento.aparelho, espelho.escalonamento.acessorio
            ),
        faturamento: espelho.realizado.aparelho + espelho.realizado.acessorio,
        calculo: (valor) => {
          return (
            valor
          );
        },
      },
      {
        tipo_remuneracao: "BÔNUS",
        segmento: "PRODUTOS",
        descr: "VENDAS DIRETAS: RECEITA TIM + PITZI",
        meta: espelho.metas.receita + espelho.metas.pitzi,
        realizado: espelho.realizado.receita + espelho.realizado.pitzi,
        atingimento: Math.min(
            espelho.atingimento.receita, espelho.atingimento.pitzi
            ),
        escalonamento: Math.min(
            espelho.escalonamento.receita, espelho.escalonamento.pitzi
            ),
        faturamento: espelho.realizado.receita + espelho.realizado.pitzi,
        calculo: (valor) => {
          return (
            valor
          );
        },
      },
      
      //   Esses são peculiares:
      {
        tipo_remuneracao: "BÔNUS",
        segmento: "OUTROS",
        descr: "TODAS AS METAS",
        meta: 
        espelho.metas.aparelho +
        espelho.metas.aparelho_vendas_indiretas +
        espelho.metas.acessorio +
        espelho.metas.pitzi +
        espelho.metas.receita,

        realizado: espelho.realizado.aparelho +
        espelho.realizado.aparelho_vendas_indiretas +
        espelho.realizado.acessorio +
        espelho.realizado.pitzi +
        espelho.realizado.receita,

        atingimento: 
          Math.min(
            espelho.menor_ating_tim,
            espelho.menor_ating_facell
          ),
        escalonamento: verificaEscalonamento(
          Math.min(
            espelho.menor_ating_tim,
            espelho.menor_ating_facell
          )
        ),
        faturamento: 
        espelho.realizado.aparelho +
        espelho.realizado.aparelho_vendas_indiretas +
        espelho.realizado.acessorio +
        espelho.realizado.pitzi +
        espelho.realizado.receita
        ,
        calculo: (valor) => {
          let elegivelTodasAsMetas = espelho.elegivelBonusTodasMetas ? 1 : 0;
          return (
            elegivelTodasAsMetas *
            valor
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
        calc_bonus =
          bonus.calculo(regra[0].valor)
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

module.exports = supervisorRelacionamento;

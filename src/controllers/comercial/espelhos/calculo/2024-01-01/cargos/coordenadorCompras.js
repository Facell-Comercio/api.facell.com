"use strict";
const fs = require("fs");
const db = require("../../../../../../../../mysql");
const Espelho = require("../../../espelhos/modelo_espelho");
const { formatarValor } = require("../../../helper");
const path = require("path");

const verificaEscalonamento = (atingimento)=>{
  if(!atingimento){
      return null;
  }
  let ating = parseFloat(atingimento)
  if(ating >= 1.0000){
      return 1.0000
  }  else if(ating >= 0.9500 && ating < 1.0000){
      return 0.9500
  } else {
      return 0
  }
}

const coordenadorCompras = async ({ ref, agregador, politica }) => {
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

      const [rowMeta] = await db.execute(
        `SELECT 
        sum(aparelho) as aparelho, 
        sum(acessorio) as acessorio
    FROM metas 
    WHERE cargo = 'FILIAL' and ref = ? AND grupo_economico = ?
    ;
    `,
        [ref, agregador.grupo_economico]
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
        aparelho: parseFloat(meta.aparelho) || 0,
        acessorio: parseFloat(meta.acessorio) || 0
      };


      // * [REALIZADO]
      // obter todos os realizados
      const datasys_vendas = agregador.grupo_economico === 'FACELL' ? 'datasys_vendas' : 'datasys_vendas_fort';
      const [realizadoProduto] = await db.execute(
        ` 
        SELECT 
            SUM(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa END) as aparelho,
            SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.valorCaixa END) as acessorio

        FROM
            ${datasys_vendas} v
        WHERE
            v.tipoPedido = 'Venda'
            AND DATE(v.dataPedido) BETWEEN ? AND ?  
            `,
        [espelho.data_inicial, espelho.data_final]
      );


      // Realizado
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

      espelho.realizado = {
        aparelho: real_aparelho,
        acessorio: real_acessorio,
      };

      // obter atingimento das metas
      let ating_aparelho =
        espelho.metas.aparelho == 0
          ? 1
          : parseFloat((real_aparelho / espelho.metas.aparelho).toFixed(4));
      let ating_acessorio =
        espelho.metas.acessorio == 0
          ? 1
          : parseFloat((real_acessorio / espelho.metas.acessorio).toFixed(4));


      espelho.atingimento = {
        aparelho:
          ating_aparelho >= 0.96 && ating_aparelho < 1.0 ? 1 : ating_aparelho,
        acessorio:
          ating_acessorio >= 0.96 && ating_acessorio < 1.0
            ? 1
            : ating_acessorio,
      };


      espelho.escalonamento = {
        aparelho: verificaEscalonamento(espelho.atingimento.aparelho),
        acessorio: verificaEscalonamento(espelho.atingimento.acessorio),
      };
      // Obter outros atingimentos e deflatores de acordo com os percentuais de atingimento de metas

      let elegivelBonusTodasMetas = espelho.escalonamento.aparelho >= 1 && espelho.escalonamento.acessorio >= 1;

      espelho.elegivelBonusTodasMetas = elegivelBonusTodasMetas;
    
      // puxar a política
      const [rowsRegras] = await db.execute(
        `SELECT * FROM comissao_politica_regras WHERE id_politica = ${politica.id} AND cargo = 'coordenador de compras'`
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
          calc_comissao =
            comissao.calculo(regra[0].valor) *
            (isSub && tipo_agregacao === "FILIAL" ? 0.5 : 1);
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
            return (
              valor
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
          faturamento: espelho.realizado.acessorio,
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
          meta: 0,
          realizado: 0,
          atingimento: 
            Math.min(
              espelho.atingimento.aparelho || 0,
              espelho.atingimento.acessorio || 0
            )
          ,
          escalonamento: verificaEscalonamento(
            Math.min(
              espelho.escalonamento.aparelho || 0,
              espelho.escalonamento.acessorio || 0
            )
          ),
          faturamento: 0,
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

module.exports = coordenadorCompras;

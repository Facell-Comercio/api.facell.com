module.exports = {
  ArquivoHeader: {
    REGISTRY_FIELD: "registro",
    ARQUIVO_COD: {
      REMESSA: "1",
      RETORNO: "2",
    },
    TIPO_INSC_EMPRESA: {
      ISENTO: "0",
      CPF: "1",
      CNPJ: "2",
      PIS_PASEP: "3",
      OUTRO: "9",
    },
  },
  ArquivoTrailer: {
    TOTAL_LOTES_FIELD: "qtde_lotes",
    REGISTRY_FIELD: "registro",
  },
  Pagamento: {
    REGISTRY_FIELD: "cod_seg_registro_lote",
    TIPO_MOVIMENTO: {
      // tipo de movimento a que o detalhe se destina
      INCLUSAO: 0,
      CONSULTA: 1,
      ESTORNO: 3,
      ALTERACAO: 5,
      LIQUIDACAO: 7,
      EXCLUSAO: 9,
    },
    CODIGO_MOVIMENTO: {
      // indica a movimentação a ser efetuada
      INCLUSAO: "00", // inclusão com registro detalhe
      INCLUSAO_COM_BLOQUEIO: "09",
    }, // inclusão com bloqueio
    COD_CAMARA_CENTRALIZADORA: {
      TED: "18",
      DOC: "700",
    },
  },
  Detail: "A",
  Segmentos: {
    A: "Detail",
    B: "Detail2",
    C: false,
    5: false,
  },
  CodigosOcorrencias: {
    "00": "PAGAMENTO EFETUADO",
    AE: "DATA DE PAGAMENTO ALTERADA",
    AG: "NÚMERO DO LOTE INVÁLIDO",
    AH: "NÚMERO SEQUENCIAL DO REGISTRO NO LOTE INVÁLIDO",
    AI: "PRODUTO DEMONSTRATIVO DE PAGAMENTO NÃO CONTRATADO",
    AJ: "TIPO DE MOVIMENTO INVÁLIDO",
    AL: "CÓDIGO DO BANCO FAVORECIDO INVÁLIDO",
    AM: "AGÊNCIA DO FAVORECIDO INVÁLIDA",
    AN: "CONTA CORRENTE DO FAVORECIDO INVÁLIDA",
    AO: "NOME DO FAVORECIDO INVÁLIDO",
    AP: "DATA DE PAGAMENTO / DATA DE VALIDADE / HORA DE LANÇAMENTO / ARRECADAÇÃO / APURAÇÃO INVÁLIDA",
    AQ: "QUANTIDADE DE REGISTROS MAIOR QUE 999999",
    AR: "VALOR ARRECADADO / LANÇAMENTO INVÁLIDO",
    BC: "NOSSO NÚMERO INVÁLIDO",
    BD: "PAGAMENTO AGENDADO",
    BE: "PAGAMENTO AGENDADO COM FORMA ALTERADA PARA OP",
    BI: "CNPJ / CPF DO FAVORECIDO NO SEGMENTO J-52 ou B INVÁLIDO / DOCUMENTO FAVORECIDO INVÁLIDO PIX",
    BL: "VALOR DA PARCELA INVÁLIDO",
    CD: "CNPJ / CPF INFORMADO DIVERGENTE DO CADASTRADO",
    CE: "PAGAMENTO CANCELADO",
    CF: "VALOR DO DOCUMENTO INVÁLIDO / VALOR DIVERGENTE DO QR CODE",
    CG: "VALOR DO ABATIMENTO INVÁLIDO",
    CH: "VALOR DO DESCONTO INVÁLIDO",
    CI: "CNPJ / CPF / IDENTIFICADOR / INSCRIÇÃO ESTADUAL / INSCRIÇÃO NO CAD / ICMS INVÁLIDO",
    CJ: "VALOR DA MULTA INVÁLIDO",
    CK: "TIPO DE INSCRIÇÃO INVÁLIDA",
    CL: "VALOR DO INSS INVÁLIDO",
    CM: "VALOR DO COFINS INVÁLIDO",
    CN: "CONTA NÃO CADASTRADA",
    CO: "VALOR DE OUTRAS ENTIDADES INVÁLIDO",
    CP: "CONFIRMAÇÃO DE OP CUMPRIDA",
    CQ: "SOMA DAS FATURAS DIFERE DO PAGAMENTO",
    CR: "VALOR DO CSLL INVÁLIDO",
    CS: "DATA DE VENCIMENTO DA FATURA INVÁLIDA",
    DA: "NÚMERO DE DEPEND. SALÁRIO FAMILIA INVALIDO",
    DB: "NÚMERO DE HORAS SEMANAIS INVÁLIDO",
    DC: "SALÁRIO DE CONTRIBUIÇÃO INSS INVÁLIDO",
    DD: "SALÁRIO DE CONTRIBUIÇÃO FGTS INVÁLIDO",
    DE: "VALOR TOTAL DOS PROVENTOS INVÁLIDO",
    DF: "VALOR TOTAL DOS DESCONTOS INVÁLIDO",
    DG: "VALOR LÍQUIDO NÃO NUMÉRICO",
    DH: "VALOR LIQ. INFORMADO DIFERE DO CALCULADO",
    DI: "VALOR DO SALÁRIO-BASE INVÁLIDO",
    DJ: "BASE DE CÁLCULO IRRF INVÁLIDA",
    DK: "BASE DE CÁLCULO FGTS INVÁLIDA",
    DL: "FORMA DE PAGAMENTO INCOMPATÍVEL COM HOLERITE",
    DM: "E-MAIL DO FAVORECIDO INVÁLIDO",
    DV: "DOC / TED DEVOLVIDO PELO BANCO FAVORECIDO",
    D0: "FINALIDADE DO HOLERITE INVÁLIDA",
    D1: "MÊS DE COMPETENCIA DO HOLERITE INVÁLIDA",
    D2: "DIA DA COMPETENCIA DO HOLETITE INVÁLIDA",
    D3: "CENTRO DE CUSTO INVÁLIDO",
    D4: "CAMPO NUMÉRICO DA FUNCIONAL INVÁLIDO",
    D5: "DATA INÍCIO DE FÉRIAS NÃO NUMÉRICA",
    D6: "DATA INÍCIO DE FÉRIAS INCONSISTENTE",
    D7: "DATA FIM DE FÉRIAS NÃO NUMÉRICO",
    D8: "DATA FIM DE FÉRIAS INCONSISTENTE",
    D9: "NÚMERO DE DEPENDENTES IR INVÁLIDO",
    EM: "CONFIRMAÇÃO DE OP EMITIDA",
    EX: "DEVOLUÇÃO DE OP NÃO SACADA PELO FAVORECIDO",
    E0: "TIPO DE MOVIMENTO HOLERITE INVÁLIDO",
    E1: "VALOR 01 DO HOLERITE / INFORME INVÁLIDO",
    E2: "VALOR 02 DO HOLERITE / INFORME INVÁLIDO",
    E3: "VALOR 03 DO HOLERITE / INFORME INVÁLIDO",
    E4: "VALOR 04 DO HOLERITE / INFORME INVÁLIDO",
    FC: "PAGAMENTO EFETUADO ATRAVÉS DE FINANCIAMENTO COMPROR",
    FD: "PAGAMENTO EFETUADO ATRAVÉS DE FINANCIAMENTO DESCOMPROR",
    HÁ: "ERRO NO LOTE",
    HM: "ERRO NO REGISTRO HEADER DE ARQUIVO",
    IB: "VALOR DO DOCUMENTO INVÁLIDO",
    IC: "VALOR DO ABATIMENTO INVÁLIDO",
    ID: "VALOR DO DESCONTO INVÁLIDO",
    IE: "VALOR DA MORA INVÁLIDO",
    IF: "VALOR DA MULTA INVÁLIDO",
    IG: "VALOR DA DEDUÇÃO INVÁLIDO",
    IH: "VALOR DO ACRÉSCIMO INVÁLIDO",
    II: "DATA DE VENCIMENTO INVÁLIDA / QR CODE EXPIRADO",
    IJ: "COMPETÊNCIA / PERÍODO REFERÊNCIA / PARCELA INVÁLIDA",
    IK: "TRIBUTO NÃO LIQUIDÁVEL VIA SISPAG OU NÃO CONVENIADO COM ITAÚ",
    IL: "CÓDIGO DE PAGAMENTO / EMPRESA /RECEITA INVÁLIDO",
    IM: "TIPO X FORMA NÃO COMPATÍVEL",
    IN: "BANCO/AGÊNCIA NÃO CADASTRADOS",
    IO: "DAC / VALOR / COMPETÊNCIA / IDENTIFICADOR DO LACRE INVÁLIDO / IDENTIFICAÇÃO DO QR CODE INVÁLIDO",
    IP: "DAC DO CÓDIGO DE BARRAS INVÁLIDO / ERRO NA VALIDAÇÃO DO QR CODE",
    IQ: "DÍVIDA ATIVA OU NÚMERO DE ETIQUETA INVÁLIDO",
    IR: "PAGAMENTO ALTERADO",
    IS: "CONCESSIONÁRIA NÃO CONVENIADA COM ITAÚ",
    IT: "VALOR DO TRIBUTO INVÁLIDO",
    IU: "VALOR DA RECEITA BRUTA ACUMULADA INVÁLIDO",
    IV: "NÚMERO DO DOCUMENTO ORIGEM / REFERÊNCIA INVÁLIDO",
    IX: "CÓDIGO DO PRODUTO INVÁLIDO",
    LA: "DATA DE PAGAMENTO DE UM LOTE ALTERADA",
    LC: "LOTE DE PAGAMENTOS CANCELADO",
    NA: "PAGAMENTO CANCELADO POR FALTA DE AUTORIZAÇÃO",
    NB: "IDENTIFICAÇÃO DO TRIBUTO INVÁLIDA",
    NC: "EXERCÍCIO (ANO BASE) INVÁLIDO",
    ND: "CÓDIGO RENAVAM NÃO ENCONTRADO/INVÁLIDO",
    NE: "UF INVÁLIDA",
    NF: "CÓDIGO DO MUNICÍPIO INVÁLIDO",
    NG: "PLACA INVÁLIDA",
    NH: "OPÇÃO/PARCELA DE PAGAMENTO INVÁLIDA",
    NI: "TRIBUTO JÁ FOI PAGO OU ESTÁ VENCIDO",
    NR: "OPERAÇÃO NÃO REALIZADA",
    PD: "AQUISIÇÃO CONFIRMADA (EQUIVALE A OCORRÊNCIA 02 NO LAYOUT DE RISCO SACADO)",
    RJ: "REGISTRO REJEITADO – CONTA EM PROCESSO DE ABERTURA OU BLOQUEADA",
    RS: "PAGAMENTO DISPONÍVEL PARA ANTECIPAÇÃO NO RISCO SACADO – MODALIDADE RISCO SACADO PÓS AUTORIZADO",
    SS: "PAGAMENTO CANCELADO POR INSUFICIÊNCIA DE SALDO / LIMITE DIÁRIO DE PAGTO EXCEDIDO",
    TA: "LOTE NÃO ACEITO - TOTAIS DO LOTE COM DIFERENÇA",
    TI: "TITULARIDADE INVÁLIDA",
    X1: "FORMA INCOMPATÍVEL COM LAYOUT 010",
    X2: "NÚMERO DA NOTA FISCAL INVÁLIDO",
    X3: "IDENTIFICADOR DE NF/CNPJ INVÁLIDO",
    X4: "FORMA 32 INVÁLIDA",
  },
  FinalidadeTED: {
    "00001": "Pagamento de Imposto, Tributos e Taxas",
    "00002": "Pagamentos a concessionárias de serviços Públicos",
    "00003": "Pagamentos de Dividendos",
    "00004": "Pagamentos de Salários",
    "00005": "Pagamentos de Fornecedores",
    "00006": "Pagamentos de Honorários",
    "00007": "Pagamentos de Aluguéis e Taxas e Condomínio",
    "00008": "Pagamentos de Duplicatas e Títulos",
    "00009": "Pagamentos de Honorários",
    "00010": "Créditos em Conta",
    "00011": "Pagamentos a Corretoras",
    "00016": "Créditos em Conta Investimento",
    "00100": "Depósitos Judiciais",
    "00101": "Pensões Alimentícias",
    "00200": "Transferências Internacional de Reais",
    "00201": "Ajustes Posição Mercado Futuro",
    "00202": "Repasse de Valores do BNDS",
    "00203": "Liquidação de Compromisso com BNDS",
    "00204": "Compra/Venda de Ações – Bolsa de Valores e Mercado de Balcão",
    "00205": "Contrato referenciado em Ações/Índices de Ações – BV/BMF",
    "00300": "Restituição Imposto de Renda",
    "00500": "Restituição Prêmio de Seguros",
    "00501": "Pagamento de Indenização de Sinistro de Seguro",
    "00502": "Pagamento de Prêmio de Co-seguro",
    "00503": "Restituição de Prêmio de CO-Seguro",
    "00504": "Pagamentos de Indenização de CO-Seguro",
    "00505": "Pagamentos de Prêmio de Resseguro",
    "00506": "Restituição de Prêmio de Resseguro",
    "00507": "Pagamento de Indenização de sinistro de Resseguro",
    "00508": "Restituição de Indenização de Sinistro de Resseguro",
    "00509": "Pagamento de Despesas com sinistros",
    "00510": "Pagamento de Inspeções/Vistorias Prévias",
    "00511": "Pagamento de Resgate de Título de Capitalização",
    "00512": "Pagamento de Sorteio de Título de Capitalização",
    "00513": "Pagamento de Devolução de Mensalidade de Títulos de Capitalização",
    "00514": "Restituição de Contribuição de Plano Previdência",
    "00515": "Pagamento de Beneficio Previdência de Pecúlio",
    "00516": "Pagamento de Beneficio Previdenciário de Pensão",
    "00517": "Pagamento de Beneficio Previdenciário de Aposentadoria",
    "00518": "Pagamento de Resgate Previdenciário",
    "00519": "Pagamento de Comissão de Corretagem",
    "00520": "Pagamento de Transferências/Portabilidade de Reserva de Seguro/Previdência",
    "99999": "Outros"
  }
};
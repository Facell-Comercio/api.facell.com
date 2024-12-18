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
  LoteHeader: {
    REGISTRY_FIELD: "registro",
    TIPO_SERVICO: {
      COBRANCA: "01",
      BLOQUETO_ELETRONICO: "03",
      CONCILIACAO_BANCARIA: "04",
      DEBITOS: "05",
      CUSTODIA_CHEQUES: "06",
      GESTAO_CAIXA: "07",
      CONSULTA_MARGEM: "08",
      AVERBACAO_CONSIGNACAO: "09",
      PAGAMENTO_DIVIDENDOS: "10",
      MANUTENCAO_CONSIGNACAO: "11",
      CONSIGNACAO_PARCELAS: "12",
      GLOSA_CONSIGNACAO: "13",
      CONSULTA_TRIBUTOS_PAGAR: "14",
      PAGAMENTO_FORNECEDORES: "20",
      PAGAMENTO_CONTAS: "22",
      COMPROR: "25",
      COMPROR_ROTATIVO: "26",
      ALEGACAO_SACADO: "29",
      PAGAMENTO_SALARIOS: "30",
      PAGAMENTO_HONORARIOS: "32",
      PAGAMENTO_BOLSA_AUXILIO: "33",
      PAGAMNETO_PREBENDA: "34",
      VENDOR: "40",
      VENDOR_TERMO: "41",
      PAGAMENTO_SINISTROS: "50",
      PAGAMENTO_DESPESAS_VIAJANTE: "60",
      PAGAMENTO_AUTORIZADO: "70",
      PAGAMENTO_CREDENCIADOS: "75",
      PAGAMENTO_REMUNERACAO: "77",
      PAGAMENTO_REPRESENTANTES: "80",
      PAGAMENTO_BENEFICIOS: "90",
      PAGAMENTOS_DIVERSOS: "98",
      EXCLUSIVO_BRADESCO: "99",
    },
    FORMA_LANCAMENTO: {
      CREDITO_CC: "01", // transferência para contas do Bradesco
      CEDITO_ADM: "02",
      DOCTO_CREDITO: "03", // DOC/TED
      CARTAO_SALARIO: "04", // Somente para tipo serviço 30
      CREDITO_POUPANCA: "05",
      OP_DISPOSICAO: "10",
      PGTO_CONTAS: "11",
      TED_OUTRA_TITULARIDADE: "41",
    },
  },
  // ... 99
  LoteTrailer: {
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
    "00": "Crédito ou Débito Efetivado - Este códigoindicaque o pagamento foi confirmado",
    "01": "Insuficiência de Fundos - Débito Não Efetuado",
    "02": "Crédito ou Débito Cancelado pelo Pagador/Credor",
    "03": "Débito Autorizado pela Agência – Efetuado",
    "AA": "Controle Inválido",
    "AB": "Tipo de Operação Inválido",
    "AC": "Tipo de Serviço Inválido",
    "AD": "Forma de Lançamento Inválida",
    "AE": "Tipo/Número de Inscrição Inválido",
    "AF": "Código de Convênio Inválido",
    "AG": "Agência/Conta Corrente/DV Inválido",
    "AH": "Nº Sequencial do Registro no Lote Inválido",
    "AI": "Código de Segmento de Detalhe Inválido",
    "AJ": "Tipo de Movimento Inválido",
    "AK": "Código da Câmara de Compensação do Banco Favorecido/Depositário Inválido",
    "AL": "Código do Banco Favorecido Inoperante nesta data ou Depositário Inválido",
    "AM": "Agência Mantenedora da Conta Corrente do Favorecido Inválida",
    "AN": "Conta Corrente/DV do Favorecido Inválido",
    "AO": "Nome do Favorecido Não Informado",
    "AP": "Data Lançamento Inválido",
    "AQ": "Tipo/Quantidade da Moeda Inválido",
    "AR": "Valor do Lançamento Inválido",
    "AT": "Tipo/Número de Inscrição do Favorecido Inválido",
    "AU": "Logradouro do Favorecido Não Informado",
    "AV": "Nº do Local do Favorecido Não Informado",
    "AW": "Cidade do Favorecido Não Informada",
    "AX": "CEP/Complemento do Favorecido Inválido",
    "AY": "Sigla do Estado do Favorecido Inválida",
    "AZ": "Código/Nome do Banco Depositário Inválido",
    "BA": "Código/Nome da Agência Depositária Não Informado",
    "BB": "Seu Número Inválido",
    "BC": "Nosso Número Inválido",
    "BD": "Inclusão Efetuada com Sucesso",
    "BE": "Alteração Efetuada com Sucesso",
    "BF": "Exclusão Efetuada com Sucesso",
    "BG": "Agência/Conta Impedida Legalmente",
    "BH": "Empresa não pagou salário",
    "BI": "Falecimento do mutuário",
    "BJ": "Empresa não enviou remessa do mutuário",
    "BK": "Empresa não enviou remessa no vencimento",
    "BL": "Valor da parcela inválida",
    "BM": "Identificação do contrato inválida",
    "BN": "Operação de Consignação Incluída com Sucesso",
    "BO": "Operação de Consignação Alterada com Sucesso",
    "BP": "Operação de Consignação Excluída com Sucesso",
    "BQ": "Operação de Consignação Liquidada com Sucesso",
    "CA": "Código de Barras - Código do Banco Inválido",
    "CB": "Código de Barras - Código da Moeda Inválido",
    "CC": "Código de Barras - Dígito Verificador Geral Inválido",
    "CD": "Código de Barras - Valor do Título Divergente/Inválido.",
    "CE": "Código de Barras - Campo Livre Inválido",
    "CF": "Valor do Documento Inválido",
    "CG": "Valor do Abatimento Inválido",
    "CH": "Valor do Desconto Inválido",
    "CI": "Valor de Mora Inválido",
    "CJ": "Valor da Multa Inválido",
    "CK": "Valor do IR Inválido",
    "CL": "Valor do ISS Inválido",
    "CM": "Valor do IOF Inválido",
    "CN": "Valor de Outras Deduções Inválido",
    "CO": "Valor de Outros Acréscimos Inválido",
    "CP": "Valor do INSS Inválido",
    "HA": "Lote Não Aceito",
    "HB": "Inscrição da Empresa Inválida para o Contrato",
    "HC": "Convênio com a Empresa Inexistente/Inválido para o Contrato",
    "HD": "Agência/Conta Corrente da Empresa Inexistente/Inválido para o Contrato",
    "HE": "Tipo de Serviço Inválido para o Contrato",
    "HF": "Conta Corrente da Empresa com Saldo Insuficiente",
    "HG": "Lote de Serviço Fora de Sequência",
    "HH": "Lote de Serviço Inválido",
    "HI": "Arquivo não aceito",
    "HJ": "Tipo de Registro Inválido",
    "HK": "Código Remessa / Retorno Inválido",
    "HL": "ersão de layout inválida",
    "HM": "Mutuário não identificado",
    "HN": "Tipo do benefício não permite empréstimo",
    "HO": "Benefício cessado/suspenso",
    "HP": "Benefício possui representante legal",
    "HQ": "Benefício é do tipo PA (Pensão alimentícia)",
    "HR": "Quantidade de contratos permitida excedida",
    "HS": "Benefício não pertence ao Banco informado",
    "HT": "Início do desconto informado já ultrapassado",
    "HU": "Número da parcela inválida",
    "HV": "Quantidade de parcela inválida",
    "HW": "Margem consignável excedida para o mutuário dentro do prazo do contrato",
    "HX": "Empréstimo já cadastrado",
    "HY": "Empréstimo inexistente",
    "HZ": "Empréstimo já encerrado",
    "H1": "Arquivo sem trailer",
    "H2": "Mutuário sem crédito na competência",
    "H3": "Não descontado – outros motivos",
    "H4": "Retorno de Crédito não pago",
    "H5": "Cancelamento de empréstimo retroativo",
    "H6": "Outros Motivos de Glosa",
    "H7": "Margem consignável excedida para o mutuário acima do prazo do contrato",
    "H8": "Mutuário desligado do empregador",
    "H9": "Mutuário afastado por licença",
    "IA": "Primeiro nome do mutuário diferente do primeiro nome do movimento do censo ou diferente da base de Titular do Benefício",
    "PA": "Pix não efetivado - Tente mais tarde",
    "PB": "Transação interrompida devido a erro no PSP do Recebedor",
    "PC": "Número da conta transacional encerrada no PSP do Recebedor",
    "PD": "Tipo incorreto para a conta transacional especificada",
    "PE": "Tipo de transação não é suportado/autorizado na conta transacional especificada",
    "PF": "CPF/CNPJ do usuário recebedor não é consistente com o titular da conta transaciona especificada",
    "PG": "CPF/CNPJ do usuário recebedor incorreto",
    "PH": "Ordem rejeitada pelo PSP do Recebedor",
    "PI": "ISPB do PSP do Pagador inválido ou inexistente",
    "PJ": "Chave não cadastrada no DICT",
    "PK": "QR COde Inválido/vencido",
    "PL": "Forma de iniciação invalid",
    "PM": "Chave de Pagamento invalid",
    "PN": "Chave de Pagamento não informad",
    "TA": "Lote Não Aceito - Totais do Lote com Diferença",
    "YA": "Título Não Encontrado",
    "YB": "Identificador Registro Opcional Inválido",
    "YC": "Código Padrão Inválido",
    "YD": "Código de Ocorrência Inválido",
    "YE": "Complemento de Ocorrência Inválido",
    "YF": "Alegação já Informada",
    "ZA": "Agência/Conta do Favorecido Substituída",
    "ZB": "Divergência entre o primeiro e último nome do beneficiário versus primeiro e último nome na Receita Federal",
    "ZC": "Confirmação de Antecipação de Valor",
    "ZD": "Antecipação Parcial de Valor",
    "ZE": "Título bloqueado na base",
    "ZF": "Sistema em contingência – título valor maior que referência",
    "ZG": "Sistema em contingência – título vencido",
    "ZH": "Sistema em contingência – título indexado",
    "ZI": "Beneficiário divergente - Dados do Beneficiário divergente do constante na CIP.",
    "ZJ": "Limite de pagamentos parciais excedidos",
    "ZK": "Boleto já liquidado - Título de cobrança já liquidado na base da CIP.",
    "5A": "Agendado sob lista de debito",
    "5B": "Pagamento não autoriza sob lista de debito",
    "5C": "Lista com mais de uma modalidade",
    "5D": "Lista com mais de uma data de pagamento",
    "5E": "Número de lista duplicado",
    "5F": "Lista de debito vencida e não autorizada",
    "5I": "Ordem de Pagamento emitida",
    "5J": "Ordem de pagamento com data limite vencida",
    "5M": "Número de lista de debito invalida",
    "5T": "Pagamento realizado em contrato na condição de TESTE",
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
    "99999": "Outros",
  },
};

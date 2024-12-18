module.exports = [
  {
    field: "registro",
    startPos: 1,
    endPos: 1,
    length: 1,
    required: true,
    type: "numeric",
    default: 0,
  },
  {
    field: "operacao",
    startPos: 2,
    endPos: 2,
    length: 1,
    required: true,
    type: "numeric",
    default: 1,
  },
  {
    field: "literal_remessa",
    startPos: 3,
    endPos: 9,
    length: 7,
    required: true,
    type: "alphanumeric",
    default: "REMESSA",
  },
  {
    field: "cod_servico",
    startPos: 10,
    endPos: 11,
    length: 2,
    required: false,
    default: "01",
  },
  {
    field: "literal_servico",
    startPos: 12,
    endPos: 26,
    length: 15,
    required: true,
    type: "alphanumeric",
    default: "COBRANCA",
  },
  {
    field: "codigo_empresa",
    startPos: 27,
    endPos: 46,
    length: 20,
    required: true,
    type: "numeric",
    default: new Array(20).fill(0).join(""),
  },
  {
    field: "empresa_nome",
    startPos: 47,
    endPos: 76,
    length: 30,
    required: false,
    type: "alphanumeric",
  },
  {
    field: "banco",
    startPos: 77,
    endPos: 79,
    length: 3,
    required: true,
    type: "alphanumeric",
    default: 237,
  },
  {
    field: "nome_banco",
    startPos: 80,
    endPos: 94,
    length: 15,
    required: true,
    type: "alphanumeric",
    default: "BRADESCO",
  },
  {
    field: "data_emissao", //* Data emissão
    startPos: 95,
    endPos: 100,
    length: 6,
    required: true,
    type: "date",
  },
  {
    field: "brancos",
    startPos: 101,
    endPos: 108,
    length: 8,
    required: false,
    type: "alphanumeric",
    default: new Array(8).fill(" ").join(""),
  },
  {
    field: "identificacao_sistema",
    startPos: 109,
    endPos: 110,
    length: 2,
    required: false,
    type: "alphanumeric",
    default: "MX",
  },
  {
    field: "sequencial_remessa",
    startPos: 111,
    endPos: 117,
    length: 7,
    required: true,
    type: "numeric",
  },
  {
    field: "brancos",
    startPos: 118,
    endPos: 394,
    length: 277,
    required: false,
    type: "alphanumeric",
    default: new Array(277).fill(" ").join(""),
  },
  {
    field: "num_sequencial",
    startPos: 395,
    endPos: 400,
    length: 6,
    required: true,
    type: "numeric",
  },
];

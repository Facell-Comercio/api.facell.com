module.exports = [
    {
        field: 'banco',
        startPos: 1,
        endPos: 3,
        length: 3,
        required: true,
        default: 237
    },
    {
        field: "lote",
        startPos: 4,
        endPos: 7,
        length: 4,
        required: true,
        type: "numeric",
        default: new Array(4).fill(0).join(""),
      },
      {
        field: "registro",
        startPos: 8,
        endPos: 8,
        length: 1,
        required: true,
        type: "numeric",
        default: 3,
      },
      {
        field: "num_registro_lote",
        startPos: 9,
        endPos: 13,
        length: 5,
        required: true,
        type: "numeric",
        default: 1,
      },
      {
        field: "cod_seg_registro_lote",
        startPos: 14,
        endPos: 14,
        length: 1,
        required: true,
        type: "alphanumeric",
        default: "H",
      },
      {
        field: "brancos",
        startPos: 15,
        endPos: 15,
        length: 1,
        required: false,
        type: "alphanumeric",
        default: new Array(1).fill(" ").join(""),
      },
      {
        field: "cod_movimento",
        startPos: 16,
        endPos: 17,
        length: 2,
        required: true,
        type: "numeric",
      },
      {
        field: "tipo_inscricao_sacador_avalista",
        startPos: 18,
        endPos: 18,
        length: 1,
        required: true,
        type: "numeric",
        default: 2,
      },
      {
        field: "inscricao_sacador_avalista",
        startPos: 19,
        endPos: 33,
        length: 15,
        type: "alphanumeric",
        default: new Array(15).fill(0).join(''),
      },
      {
        field: "nome_sacador_avalista",
        startPos: 34,
        endPos: 73,
        length: 40,
        type: "alphanumeric",
        default: new Array(40).fill(' ').join(''),
      },
      {
        field: "cod_desconto2",
        startPos: 74,
        endPos: 74,
        length: 1,
        type: "numeric",
        default: 0,
      },
      {
        field: "data_desconto2",
        startPos: 75,
        endPos: 82,
        length: 8,
        type: "numeric",
        default: new Array(8).fill(0).join(''),
      },
      {
        field: "valor_desconto2",
        startPos: 83,
        endPos: 97,
        length: 15,
        required: true,
        type: "numeric",
        default: new Array(15).fill(0).join(''),
      },
      {
        field: "cod_desconto3",
        startPos: 98,
        endPos: 98,
        length: 1,
        type: "numeric",
        default: 0,
      },
      {
        field: "data_desconto3",
        startPos: 99,
        endPos: 106,
        length: 8,
        type: "numeric",
        default: new Array(8).fill(0).join(''),
      },
      {
        field: "valor_desconto3",
        startPos: 107,
        endPos: 121,
        length: 15,
        required: true,
        type: "numeric",
        default: new Array(15).fill(0).join(''),
      },
      {
        field: "cod_multa",
        startPos: 122,
        endPos: 122,
        length: 1,
        type: "numeric",
        default: 0,
      },
      {
        field: "data_multa",
        startPos: 123,
        endPos: 130,
        length: 8,
        type: "numeric",
        default: new Array(8).fill(0).join(''),
      },
      {
        field: "valor_multa",
        startPos: 131,
        endPos: 145,
        length: 15,
        required: true,
        type: "numeric",
        default: new Array(15).fill(0).join(''),
      },
      {
        field: "valor_abatimento",
        startPos: 146,
        endPos: 160,
        length: 15,
        required: true,
        type: "numeric",
        default: new Array(15).fill(0).join(''),
      },
      {
        field: "instrucao",
        startPos: 161,
        endPos: 200,
        length: 40,
        required: true,
        type: "alphanumeric",
        default: new Array(40).fill(' ').join(''),
      },
      {
        field: "instrucao2",
        startPos: 200,
        endPos: 240,
        length: 40,
        required: true,
        type: "alphanumeric",
        default: new Array(40).fill(' ').join(''),
      },
     
];


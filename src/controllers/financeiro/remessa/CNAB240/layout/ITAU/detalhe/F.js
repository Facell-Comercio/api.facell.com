// OK
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
        field: 'lote',
        startPos: 4,
        endPos: 7,
        length: 4,
        required: true,
        default: '0000'
    },
    {
        field: 'registro',
        startPos: 8,
        endPos: 8,
        length: 1,
        required: true,
        default: 3
    },
    {
        field: 'num_seq_registro_lote',
        startPos: 9,
        endPos: 13,
        length: 5,
        required: true,
        type: 'numeric'
    },
    {
        field: 'cod_seg_registro_lote',
        startPos: 14,
        endPos: 14,
        length: 1,
        required: true,
        default: 'D',
        type: 'alphanumeric'
    },
    {
        field: 'brancos1',
        startPos: 15,
        endPos: 17,
        length: 3,
        type: 'alphanumeric',
        default: new Array(3).fill(' ').join(''),
    },
    {
        field: 'informacoes_complementares',
        startPos: 18,
        endPos: 161,
        length: 144,
        required: true,
        type: 'alphanumeric'
    },
    {
        field: 'brancos2',
        startPos: 162,
        endPos: 230,
        length: 3,
        default: new Array(3).fill(' ').join(''),
        type: 'alphanumeric'
    },
    {
        field: 'cod_ocorrencia',
        startPos: 231,
        endPos: 240,
        length: 10,
        type: 'alphanumeric'
    },
];

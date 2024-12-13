module.exports = [
  {
    field: "registro",
    startPos: 1,
    endPos: 1,
    length: 1,
    required: true,
    default: "9",
  },
  {
    field: "brancos",
    startPos: 2,
    endPos: 394,
    length: 393,
    required: false,
    type: "alphanumeric",
    default: new Array(393).fill(" ").join(""),
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

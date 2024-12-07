module.exports = async ({ conn_externa, tipo, valor, id_item, id_comissao }) => {
  return new Promise(async (resolve, reject) => {
    const conn = conn_externa;
    try {
      let type = tipo === "bonus" ? "bonus" : "comissao";
      if (id_item) {
        const [rowItem] = await conn.execute(
          "SELECT valor, id_comissao, tipo FROM comissao_itens WHERE id = ?",
          [id_item]
        );
        const item = rowItem && rowItem[0];

        id_comissao = item.id_comissao;
        type = item.tipo;

        await conn.execute(`UPDATE comissao SET ${type} = ${type} - ? WHERE id = ? `, [
          item.valor,
          id_comissao,
        ]); // RETIRA O VALOR ANTERIOR
      }

      await conn.execute(
        `UPDATE comissao SET ${type} = ${type} + ?, updated = NOW() WHERE id = ? `,
        [valor, id_comissao]
      ); // ACRESCENTA O VALOR NO TOTALIZADOR
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

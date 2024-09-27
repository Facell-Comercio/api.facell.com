const sendNotification = (message) => {
  if (message) {
    console.log("Enviando notificação:", message);
    return message; // Retorna a mensagem para uso posterior, se necessário
  }
  return null;
};

// Exporta a função
module.exports = { sendNotification };

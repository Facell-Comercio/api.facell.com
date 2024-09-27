const registerMachine = require("./registerMachine");
const { sendNotification } = require("./notification");
const { sendNotificationToMachines } = require("../rabbitmq/publisher");
const startConsumer = require("../rabbitmq/consumer");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Um usuário se conectou:", socket.id);

    // Configurando o evento de desconexão
    socket.on("disconnect", () => {
      console.log("User disconnected");
    });

    // Chamando as funções de registro e notificações
    registerMachine(socket);

    // Exemplo de como enviar notificações para um array específico de máquinas
    socket.on("sendToMachines", ({ machineIds, message }) => {
      sendNotificationToMachines(machineIds, message);
    });
  });

  startConsumer(); // Inicia o consumidor
};

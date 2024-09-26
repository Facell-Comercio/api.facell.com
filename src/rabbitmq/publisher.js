const amqp = require("amqplib");

async function sendNotificationToMachines(machineIds, message) {
  const queue = "machine_notifications";

  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: false });

    machineIds.forEach((machineId) => {
      const notification = { machineId, message };
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(notification)));
      console.log(`Sent to ${machineId}: ${message}`);
    });

    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

module.exports = { sendNotificationToMachines };

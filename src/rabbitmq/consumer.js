const amqp = require("amqplib");
const { sendNotification } = require("../socket/notification");

async function startConsumer() {
  const queue = "machine_notifications";

  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: false });

    console.log("Waiting for messages in %s", queue);
    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const notification = JSON.parse(msg.content.toString());
        sendNotification(notification.message, notification.machineId);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Error starting consumer:", error);
  }
}

startConsumer();

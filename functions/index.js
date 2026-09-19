const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Función que escucha cambios en los documentos de la colección "orders"
exports.sendPushNotificationOnStatusChange = functions.firestore
    .document("orders/{orderId}")
    .onUpdate(async (change, context) => {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      // Preparar el mensaje según el estado o si hay mensaje personalizado
      let title = "";
      let body = "";
      const newStatus = afterData.status;

      // Comprobar si se envió un mensaje personalizado
      if (afterData.customMessage && beforeData.customMessage !== afterData.customMessage) {
        title = "Mensaje sobre tu pedido 💬";
        body = afterData.customMessage;
      } 
      // Comprobar si el estado cambió
      else if (beforeData.status !== afterData.status) {
        if (newStatus === "preparing") {
          title = "¡Tu pedido está en el horno! 👨‍🍳";
          body = "Hemos comenzado a preparar tu orden. Te avisaremos cuando esté lista.";
        } else if (newStatus === "ready") {
          title = "¡Pedido listo! 🛵";
          body = "Tu pedido ya está listo para ser recogido o enviado. ¡Ya casi!";
        } else if (newStatus === "done") {
          title = "¡Pedido Entregado! ✅";
          body = "¡Que lo disfrutes! Gracias por pedir con nosotros.";
        } else {
          return null;
        }
      } else {
        // No cambió ni el estado ni el mensaje
        return null;
      }

      const userId = afterData.userId; 

      if (!userId) {
        console.log("No hay userId en el pedido. No se puede notificar.");
        return null;
      }

      // Obtener el documento del usuario para sacar su FCM Token
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      if (!userDoc.exists) {
        console.log(`El usuario ${userId} no existe en la base de datos.`);
        return null;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log(`El usuario ${userId} no tiene fcmToken configurado.`);
        return null;
      }

      // Construir el payload del mensaje
      const payload = {
        notification: {
          title: title,
          body: body,
        },
        token: fcmToken,
      };

      try {
        // Enviar notificación a través de Firebase Cloud Messaging (FCM)
        const response = await admin.messaging().send(payload);
        console.log("Notificación enviada exitosamente:", response);
        return response;
      } catch (error) {
        console.error("Error enviando notificación:", error);
        return null;
      }
    });

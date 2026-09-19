importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyC5r6l7-iOXt0xzvRFcbK0B-TXjJ8A3TMg",
  authDomain: "mtshopi.firebaseapp.com",
  projectId: "mtshopi",
  storageBucket: "mtshopi.firebasestorage.app",
  messagingSenderId: "424948655883",
  appId: "1:424948655883:web:5d85cc02b286c7987ae40e"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Este bloque intercepta notificaciones cuando la app está en segundo plano (background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje en background recibido ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png' // Puedes cambiar esto al logo de la app si lo tienes
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

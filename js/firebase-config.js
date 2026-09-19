// Configuración de Firebase (Proyecto: mtshopi)

const firebaseConfig = {
  apiKey: "AIzaSyC5r6l7-iOXt0xzvRFcbK0B-TXjJ8A3TMg",
  authDomain: "mtshopi.firebaseapp.com",
  projectId: "mtshopi",
  storageBucket: "mtshopi.firebasestorage.app",
  messagingSenderId: "424948655883",
  appId: "1:424948655883:web:5d85cc02b286c7987ae40e",
  measurementId: "G-5C4T92NCZ9"
};

// Inicializar Firebase
let app;
let db;
let auth;
let messaging;
let isFirebaseActive = false;

try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    
    // Solo inicializamos messaging si el navegador lo soporta
    if (firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
    }
    
    isFirebaseActive = true;
    console.log("🔥 Firebase inicializado correctamente con Firestore y Auth.");
} catch (e) {
    console.error("Error al inicializar Firebase:", e);
}

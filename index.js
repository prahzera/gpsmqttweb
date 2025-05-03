const express = require("express");
const path = require("path");
const http = require("http");
const session = require('express-session');
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configura EJS como motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Servir archivos estáticos desde el directorio "public"
app.use(express.static(path.join(__dirname, "public")));

// Configuración para analizar datos del formulario
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Añadimos soporte para JSON

// Configuración de la sesión
app.use(session({
  secret: 'ickki2p2',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Cambia a true si usas HTTPS
}));

// Importa y utiliza las rutas desde el archivo routes.js
const routes = require('./routes/routes');
app.use('/', routes);

// Conectar el cliente MQTT con Socket.io
const mqttHandler = require('./client/mqttClient');
mqttHandler(io); // Pasa la instancia de io al cliente MQTT

// Inicia el servidor y lo pone a escuchar en el puerto especificado
const port = 3000;
server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

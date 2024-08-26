const express = require("express");
const path = require("path");
const mqtt = require("mqtt");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

// Configura EJS como motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Configuración del cliente MQTT
/* const mqttClient = mqtt.connect('mqtt://broker.hivemq.com', {
  username: 'ArthurRios',
  password: 'arthuralex99'
}); */

const mqttClient = mqtt.connect("mqtt://localhost", {});

let coordinates = { lat: null, lon: null };

mqttClient.on("connect", () => {
  console.log("Conectado al servidor MQTT");
  mqttClient.subscribe(["longps/perro1", "latgps/perro1"], (err) => {
    if (!err) {
      console.log("Suscrito a los temas longps/perro1 y latgps/perro1");
    } else {
      console.error("Error al suscribirse a los temas:", err);
    }
  });
});

mqttClient.on("message", (topic, message) => {
  if (topic === "longps/perro1") {
    coordinates.lon = parseFloat(message.toString());
  } else if (topic === "latgps/perro1") {
    coordinates.lat = parseFloat(message.toString());
  }

  // Emitir las coordenadas al cliente si ambas están disponibles
  if (coordinates.lat !== null && coordinates.lon !== null) {
    io.emit("coordinates", coordinates);
  }
});

app.get("/", (req, res) => {
  res.render("index");
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

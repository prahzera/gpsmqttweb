const express = require("express");
const path = require("path");
const mqtt = require("mqtt");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

// Configura EJS como motor de plantillas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Configuración de la conexión
const options = {
  username: 'ArthurRios',
  password: 'arthuralex99',
};

// Conéctate al servidor MQTT
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com', options);

let coordinates = { lat: null, lon: null };

// Ruta al archivo JSON donde se almacenarán las coordenadas
const dataFilePath = path.join(__dirname, "coordinates.json");
const lastCoordFilePath = path.join(__dirname, "lastCoordinate.json");

// Función para leer las coordenadas almacenadas
const readCoordinates = () => {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return [];
};

// Función para escribir nuevas coordenadas en el archivo
const writeCoordinates = (newCoord) => {
  const coords = readCoordinates();
  coords.push(newCoord);
  fs.writeFileSync(dataFilePath, JSON.stringify(coords, null, 2));

  // Actualiza el archivo de la última coordenada
  fs.writeFileSync(lastCoordFilePath, JSON.stringify(newCoord, null, 2));
};

// Función para filtrar coordenadas por tiempo
const filterCoordinatesByTime = (minutes) => {
  const coords = readCoordinates();
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

  return coords.filter(coord => new Date(coord.timestamp) >= cutoffTime);
};

// Función para filtrar coordenadas por valor de 0
const isValidCoordinate = (coord) => {
  return coord.lat !== 0 && coord.lon !== 0;
};

// Conexión al servidor MQTT y manejo de mensajes
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

  // Enviar coordenadas al cliente solo si ambas están disponibles y no son 0
  if (coordinates.lat !== null && coordinates.lon !== null && isValidCoordinate(coordinates)) {
    const newCoord = {
      lat: coordinates.lat,
      lon: coordinates.lon,
      timestamp: new Date().toISOString()
    };

    writeCoordinates(newCoord); // Guarda las coordenadas en el archivo JSON
    io.emit("coordinates", newCoord); // Envía las coordenadas completas al cliente
    // Reinicia las coordenadas para el siguiente conjunto de datos
    coordinates = { lat: null, lon: null };
  }
});

// Función para calcular distancia entre dos coordenadas usando la fórmula de Haversine
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateDistances = (coords) => {
  let totalDistance = 0;
  let dailyDistances = {};
  let monthlyDistances = {};

  // Calcular distancias y actualizar los objetos
  coords.forEach((coord, index) => {
    // Ejemplo de cómo calcular la distancia
    if (index > 0) {
      const prevCoord = coords[index - 1];
      const distance = haversineDistance(
        prevCoord.lat,
        prevCoord.lon,
        coord.lat,
        coord.lon
      );
      totalDistance += distance;

      // Actualizar distancias diarias y mensuales
      const date = new Date(coord.timestamp);
      const day = date.toISOString().split('T')[0];
      const month = date.getFullYear() + '-' + (date.getMonth() + 1);

      if (!dailyDistances[day]) dailyDistances[day] = 0;
      dailyDistances[day] += distance;

      if (!monthlyDistances[month]) monthlyDistances[month] = 0;
      monthlyDistances[month] += distance;
    }
  });

  return {
    totalDistance,
    dailyDistances,
    monthlyDistances
  };
};

// Ruta para la página principal
app.get("/", (req, res) => {
  const coordinates = readCoordinates();
  const { totalDistance, dailyDistances, monthlyDistances } = calculateDistances(coordinates);
  res.render("index", {
    totalDistance,
    dailyDistances,
    monthlyDistances
  });
});

// Ruta para obtener la última ubicación
app.get("/last-location", (req, res) => {
  if (fs.existsSync(lastCoordFilePath)) {
    const data = fs.readFileSync(lastCoordFilePath);
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: "No location data available" });
  }
});

// Ruta para obtener la ruta de las últimas X minutos
app.get("/route/:minutes", (req, res) => {
  const minutes = parseInt(req.params.minutes, 10);
  const filteredCoords = filterCoordinatesByTime(minutes);
  res.json(filteredCoords);
});

server.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

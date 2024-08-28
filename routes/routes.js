const express = require('express');
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Define la ruta al archivo JSON donde se almacenan las coordenadas
const dataFilePath = path.join(__dirname, "../coordinates.json");
const lastCoordFilePath = path.join(__dirname, "../lastCoordinate.json");
const profilesFilePath = path.join(__dirname, '../profiles.json');

// Middleware para verificar si el usuario está autenticado
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next(); // El usuario está autenticado, continúa a la siguiente ruta
  } else {
    res.redirect('/login'); // Redirige al login si no está autenticado
  }
};

// Ruta principal protegida por autenticación
router.get('/', requireAuth, (req, res) => {
  const coordinates = readCoordinates();
  const { totalDistance, dailyDistances, monthlyDistances } = calculateDistances(coordinates);
  res.render('index', {
    totalDistance,
    dailyDistances,
    monthlyDistances
  });
});

// Ruta de login
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/'); // Redirige si ya está autenticado
  }
  res.render('login');
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const profiles = readProfiles(); // Lee los perfiles al momento del intento de login

  if (profiles[username] && profiles[username].contraseña === password) {
    req.session.user = username; // Guarda el usuario en la sesión
    res.redirect('/'); // Redirige al usuario a la página principal
  } else {
    res.redirect('/login'); // Redirige al login si las credenciales son incorrectas
  }
});

// Ruta para cerrar sesión
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Could not log out.');
    }
    res.redirect('/login');
  });
});

// Ruta para obtener la última ubicación
router.get("/last-location", (req, res) => {
  if (fs.existsSync(lastCoordFilePath)) {
    const data = fs.readFileSync(lastCoordFilePath);
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: "No location data available" });
  }
});

// Ruta para obtener la ruta de las últimas X minutos
router.get('/route/:minutes', (req, res) => {
  const minutes = parseInt(req.params.minutes, 10);
  const filteredCoords = filterCoordinatesByTime(minutes);
  res.json(filteredCoords);
});

const ACCESS_TOKEN = 'D2YW3PZVYDMB6M14ZM8IS7MXYEXO5DA8';

router.get('/coordinates', (req, res) => {
  const token = req.query.token;

  if (token === ACCESS_TOKEN) {
    res.sendFile(dataFilePath);
  } else {
    res.status(403).json({ error: 'Token inválido' });
  }
});

// Funciones auxiliares para leer y escribir datos

const readCoordinates = () => {
  if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath);
    return JSON.parse(data);
  }
  return [];
};

const readProfiles = () => {
  if (fs.existsSync(profilesFilePath)) {
    const data = fs.readFileSync(profilesFilePath);
    return JSON.parse(data);
  }
  return {};
};

const filterCoordinatesByTime = (minutes) => {
  const coords = readCoordinates();
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  return coords.filter(coord => new Date(coord.timestamp) >= cutoffTime);
};

// Función para calcular la distancia entre dos coordenadas usando la fórmula de Haversine
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

// Función para calcular distancias totales, diarias y mensuales
const calculateDistances = (coords) => {
  let totalDistance = 0;
  let dailyDistances = {};
  let monthlyDistances = {};

  coords.forEach((coord, index) => {
    if (index > 0) {
      const prevCoord = coords[index - 1];
      const distance = haversineDistance(
        prevCoord.lat,
        prevCoord.lon,
        coord.lat,
        coord.lon
      );
      totalDistance += distance;

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

module.exports = router;

// Cargar módulos necesarios
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

// Configurar la conexión a la base de datos
const db = mysql.createConnection({
    host: 'hapore-db.cda24m6okblz.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: 'Nada2008',
    database: 'prot'
});

// Conectar a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        process.exit(1);
    }
    console.log('Conectado a la base de datos MySQL.');

    // Función para crear tablas si no existen
    const createTables = () => {
        const createCoordinatesTableQuery = `
            CREATE TABLE IF NOT EXISTS coordinates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lat DECIMAL(9, 6) NOT NULL,
                lon DECIMAL(9, 6) NOT NULL,
                timestamp DATETIME NOT NULL,
                UNIQUE KEY unique_coord (lat, lon, timestamp)
            )
        `;
        const createProfilesTableQuery = `
            CREATE TABLE IF NOT EXISTS profiles (
                username VARCHAR(255) PRIMARY KEY,
                password VARCHAR(255) NOT NULL
            )
        `;
        const createLastCoordinateTableQuery = `
            CREATE TABLE IF NOT EXISTS last_coordinates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lat DECIMAL(9, 6) NOT NULL,
                lon DECIMAL(9, 6) NOT NULL,
                timestamp DATETIME NOT NULL
            )
        `;

        db.query(createCoordinatesTableQuery, err => {
            if (err) {
                console.error('Error al crear la tabla de coordenadas:', err);
                process.exit(1);
            }
            console.log('Tabla de coordenadas creada (o ya existente).');

            db.query(createProfilesTableQuery, err => {
                if (err) {
                    console.error('Error al crear la tabla de perfiles:', err);
                    process.exit(1);
                }
                console.log('Tabla de perfiles creada (o ya existente).');

                db.query(createLastCoordinateTableQuery, err => {
                    if (err) {
                        console.error('Error al crear la tabla de última coordenada:', err);
                        process.exit(1);
                    }
                    console.log('Tabla de última coordenada creada (o ya existente).');

                    // Cargar datos después de crear las tablas
                    loadCoordinatesFromFileToDB();
                    loadProfilesFromFileToDB();
                    loadLastCoordinateFromFileToDB();
                });
            });
        });
    };

    // Función para leer coordenadas desde el archivo JSON
    const readCoordinates = () => {
        const dataFilePath = path.join(__dirname, "coordinates.json");
        if (fs.existsSync(dataFilePath)) {
            const data = fs.readFileSync(dataFilePath);
            console.log('Datos de coordenadas leídos del archivo JSON:', JSON.parse(data));
            return JSON.parse(data);
        }
        console.log('El archivo de coordenadas no existe o está vacío.');
        return [];
    };

    // Función para leer perfiles desde el archivo JSON
    const readProfiles = () => {
        const profilesFilePath = path.join(__dirname, 'profiles.json');
        if (fs.existsSync(profilesFilePath)) {
            const data = fs.readFileSync(profilesFilePath);
            console.log('Datos de perfiles leídos del archivo JSON:', JSON.parse(data));
            return JSON.parse(data);
        }
        console.log('El archivo de perfiles no existe o está vacío.');
        return {};
    };

    // Función para leer la última coordenada desde el archivo JSON
    const readLastCoordinate = () => {
        const lastCoordFilePath = path.join(__dirname, "lastCoordinate.json");
        if (fs.existsSync(lastCoordFilePath)) {
            const data = fs.readFileSync(lastCoordFilePath);
            console.log('Última coordenada leída del archivo JSON:', JSON.parse(data));
            return JSON.parse(data);
        }
        console.log('El archivo de última coordenada no existe o está vacío.');
        return null;
    };

    // Función para cargar coordenadas desde el archivo JSON a la base de datos
    const loadCoordinatesFromFileToDB = () => {
        const coords = readCoordinates();
        coords.forEach(coord => {
            const insertQuery = `
                INSERT INTO coordinates (lat, lon, timestamp)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE lat = VALUES(lat), lon = VALUES(lon), timestamp = VALUES(timestamp)
            `;
            db.query(insertQuery, [coord.lat, coord.lon, coord.timestamp], err => {
                if (err) {
                    console.error('Error al insertar coordenada en la base de datos:', err);
                }
            });
        });
        console.log('Datos de coordenadas cargados a la base de datos desde el archivo JSON.');
    };

    // Función para cargar perfiles desde el archivo JSON a la base de datos
    const loadProfilesFromFileToDB = () => {
        const profiles = readProfiles();
        for (const [username, { contraseña }] of Object.entries(profiles)) {
            const insertQuery = `
                INSERT INTO profiles (username, password)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE password = VALUES(password)
            `;
            db.query(insertQuery, [username, contraseña], err => {
                if (err) {
                    console.error('Error al insertar perfil en la base de datos:', err);
                }
            });
        }
        console.log('Datos de perfiles cargados a la base de datos desde el archivo JSON.');
    };

    // Función para cargar la última coordenada desde el archivo JSON a la base de datos
    const loadLastCoordinateFromFileToDB = () => {
        const lastCoord = readLastCoordinate();
        if (lastCoord) {
            const insertQuery = `
                INSERT INTO last_coordinates (lat, lon, timestamp)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE lat = VALUES(lat), lon = VALUES(lon), timestamp = VALUES(timestamp)
            `;
            db.query(insertQuery, [lastCoord.lat, lastCoord.lon, lastCoord.timestamp], err => {
                if (err) {
                    console.error('Error al insertar última coordenada en la base de datos:', err);
                }
            });
            console.log('Última coordenada cargada a la base de datos desde el archivo JSON.');
        }
    };

    // Crear tablas y luego cargar los datos
    createTables();
});

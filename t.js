const axios = require('axios');

async function getGeolocation(ip) {
    try {
        const response = await axios.get(`https://ipinfo.io/${ip}/json?token=tu_token`);
        console.log(response.data);
    } catch (error) {
        console.error(error);
    }
}

getGeolocation('8.8.8.8'); // Ejemplo con la IP de Google

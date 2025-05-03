const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Código para almacenar los códigos de verificación temporales
const verificationCodes = new Map();

// Iniciar el cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    // Generar el código QR en la terminal para escanear
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR con tu WhatsApp para iniciar la sesión');
});

client.on('ready', () => {
    console.log('Cliente de WhatsApp listo y conectado');
});

// Iniciar el cliente
client.initialize();

// Generar un código de verificación de 6 dígitos
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Enviar código de verificación
const sendVerificationCode = async (phoneNumber, username) => {
    try {
        // Asegurarse de que el número tenga el formato correcto (con código de país)
        // Si el número no empieza con +, agregar +
        if (!phoneNumber.startsWith('+')) {
            phoneNumber = '+' + phoneNumber;
        }
        
        // Generar un código y guardarlo
        const code = generateVerificationCode();
        verificationCodes.set(username, {
            code,
            timestamp: Date.now(),
            phoneNumber
        });
        
        // Enviar el mensaje con el código
        const message = `Tu código de verificación para el registro en GPS Tracker es: *${code}*\nEste código expirará en 10 minutos.`;
        
        // Formato para WhatsApp: número@c.us
        const formattedNumber = `${phoneNumber.replace('+', '')}@c.us`;
        
        await client.sendMessage(formattedNumber, message);
        return true;
    } catch (error) {
        console.error('Error al enviar código de verificación:', error);
        return false;
    }
};

// Verificar un código
const verifyCode = (username, code) => {
    const verificationData = verificationCodes.get(username);
    
    if (!verificationData) {
        return { valid: false, message: 'No se encontró código de verificación para este usuario' };
    }
    
    // Verificar si el código ha expirado (10 minutos = 600000 ms)
    const now = Date.now();
    if (now - verificationData.timestamp > 600000) {
        verificationCodes.delete(username);
        return { valid: false, message: 'El código de verificación ha expirado' };
    }
    
    // Verificar el código
    if (verificationData.code === code) {
        verificationCodes.delete(username);
        return { valid: true, message: 'Código verificado correctamente' };
    }
    
    return { valid: false, message: 'Código de verificación incorrecto' };
};

module.exports = {
    sendVerificationCode,
    verifyCode
}; 
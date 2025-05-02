document.addEventListener('DOMContentLoaded', function() {
    // Detectar el tipo de dispositivo
    function detectDevice() {
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        if (isMobile) {
            document.body.classList.add('celular');
        } else {
            document.body.classList.add('pc');
        }
    }

    // Detectar el dispositivo y aplicar la clase
    detectDevice();

    // Espera a que la ventana esté completamente cargada
    window.onload = function() {
        // Ocultar el loader
        document.querySelector('.loader').style.display = 'none';
        // Mostrar el contenido de la página
        document.getElementById('content').style.display = 'block';
    };
});

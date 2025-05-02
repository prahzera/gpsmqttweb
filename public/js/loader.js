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

    // Espera a que todos los recursos estén completamente cargados
    window.addEventListener('load', function() {
        // Referencia al loader
        const loader = document.querySelector('.loader');
        
        // Primero aplicamos la clase para iniciar la animación de salida
        loader.classList.add('hidden');
        
        // Después de que termine la animación, eliminamos el elemento completamente
        setTimeout(() => {
            loader.style.display = 'none';
        }, 600); // Un poco más que la duración de la transición (0.5s)
    });
    
    // Si después de 5 segundos el loader sigue visible, lo ocultamos de todos modos
    // (por si acaso hay algún problema con la carga de recursos)
    setTimeout(() => {
        const loader = document.querySelector('.loader');
        if (loader && !loader.classList.contains('hidden')) {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 600);
        }
    }, 5000);
});

// Función para cambiar el tema
function toggleTheme() {
    const body = document.body;
    const isDarkMode = body.classList.toggle('dark-mode');
    const themeButton = document.getElementById('dark-mode-toggle');
    themeButton.textContent = isDarkMode ? '🌙' : '☀️';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Verifica el tema al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const isDarkMode = savedTheme === 'dark';
    document.body.classList.toggle('dark-mode', isDarkMode);
    const themeButton = document.getElementById('dark-mode-toggle');
    themeButton.textContent = isDarkMode ? '🌙' : '☀️';
});

// Agrega el evento de clic al botón
document.getElementById('dark-mode-toggle').addEventListener('click', toggleTheme);
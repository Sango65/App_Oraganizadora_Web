const nombreHeader = document.getElementById("nombreUsuarioHeader");

if (nombreHeader) {
    const correoActivo = localStorage.getItem("sesionActiva");
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const usuario = usuarios.find(u => u.correo === correoActivo);

    if (usuario) {
        nombreHeader.textContent = usuario.nombre;
    }
}

// Abre el modal de confirmación al tocar el nombre de usuario
const btnCerrarSesion = document.getElementById("btnCerrarSesion");
const modalCerrarSesion = document.getElementById("modalCerrarSesion");

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", function () {
        modalCerrarSesion.classList.remove("hidden");
        modalCerrarSesion.classList.add("flex");
    });

    document.getElementById("btnCancelarCerrarSesion").addEventListener("click", function () {
        modalCerrarSesion.classList.add("hidden");
        modalCerrarSesion.classList.remove("flex");
    });

    document.getElementById("btnConfirmarCerrarSesion").addEventListener("click", function () {
        localStorage.removeItem("sesionActiva");
        window.location.href = "log-in.html";
    });
}

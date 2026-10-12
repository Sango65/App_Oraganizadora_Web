// Muestra el nombre del usuario con sesión activa; si no hay sesión, regresa al login
async function cargarUsuarioHeader() {
    const nombreHeader = document.getElementById("nombreUsuarioHeader");
    if (!nombreHeader) return;

    const { data: { session } } = await clienteSupabase.auth.getSession();

    if (!session) {
        window.location.href = "log-in.html";
        return;
    }

    nombreHeader.textContent = session.user.user_metadata.nombre || "Usario";
}

cargarUsuarioHeader();

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

    document.getElementById("btnConfirmarCerrarSesion").addEventListener("click", async function () {
        await clienteSupabase.auth.signOut();
        window.location.href = "log-in.html";
    });
}

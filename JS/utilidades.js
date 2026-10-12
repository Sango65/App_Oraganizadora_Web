// Convierte texto en HTML seguro evitando que se ejecute código malicioso
function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

const indicadorCarga = document.getElementById("indicadorCarga");

if (indicadorCarga) {
    document.addEventListener("click", function (evento) {
        if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
            return;
        }

        const enlace = evento.target.closest("a[href]");
        if (!enlace || enlace.target === "_blank") return;

        const destino = new URL(enlace.href, window.location.href);
        const pantallasConCarga = ["mis-proyectos.html", "guia-tareas.html"];

        if (!pantallasConCarga.includes(destino.pathname.split("/").pop())) return;

        evento.preventDefault();
        indicadorCarga.classList.remove("hidden");
        indicadorCarga.classList.add("flex");

        window.requestAnimationFrame(function () {
            window.location.assign(destino.href);
        });
    });
}

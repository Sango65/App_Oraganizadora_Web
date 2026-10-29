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

// Globito rojo sobre el ícono de Guía: cuántos proyectos nuevos aún no se han avisado.
// Si se le pasa la lista de proyectos que la pantalla ya cargó, cuenta ahí mismo
// y no manda otra consulta; si no, le pregunta a Supabase.
async function actualizarBadgeGuia(proyectos) {
    const badge = document.getElementById("badgeGuia");
    if (!badge) return;

    let cantidad = 0;

    if (Array.isArray(proyectos)) {
        cantidad = proyectos.filter(p => p.avisado_en_guia === false).length;
    } else {
        const { count, error } = await clienteSupabase
            .from("proyectos")
            .select("id", { count: "exact", head: true })
            .eq("avisado_en_guia", false);

        if (!error) cantidad = count || 0;
    }

    if (cantidad === 0) {
        badge.classList.add("hidden");
        badge.classList.remove("flex");
        return;
    }

    badge.textContent = cantidad > 99 ? "99+" : String(cantidad);
    badge.classList.remove("hidden");
    badge.classList.add("flex");
}
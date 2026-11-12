// ---------- Estado ----------
// Ids de tarjetas y fases que están abiertas (para no colapsarlas al redibujar)
const abiertos = new Set();
let proyectoIdNuevaFase = null;
let faseIdNuevaTarea = null;

// Modo activo sobre UNA fase: { faseId, accion: "renombrar" | "eliminar" }
let modo = null;
let borradores = {};          // renombrar: id -> texto que se está escribiendo
let marcadas = new Set();     // eliminar: ids marcados (la fase y/o tareas)
let fallidos = new Set();     // renombrar: ids que no se pudieron guardar
let guardando = false;
let menuAbiertoDe = null;
let accionConfirmar = null;

// Opciones del menú ⋮ de la fase. Para sumar "Mover" más adelante:
// agregar aquí { id: "mover", ... } y manejarlo en iniciarModo / dibujar.
const ACCIONES_FASE = [
    { id: "renombrar", texto: "Renombrar", icono: "ti-pencil" },
    { id: "eliminar", texto: "Eliminar", icono: "ti-trash", peligro: true }
];

// ---------- Utilidades ----------
function escaparCampo(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function plural(n, singular, pluralTexto) {
    return n + " " + (n === 1 ? singular : pluralTexto);
}

async function actualizarVistaGuia() {
    const contenedorGuia = document.getElementById("contenedorGuia");
    if (!contenedorGuia) return;

    const ok = await cargarDatos();

    if (!ok) {
        // En pleno modo no se reemplaza la pantalla para no perder lo que se escribió
        if (!modo) {
            contenedorGuia.innerHTML = '<p class="text-red-400 text-sm">No se pudieron cargar los proyectos.</p>';
        }
        return;
    }

    dibujarVista();

    // Primero se dibuja y después se marca como avisado: si se marcara antes,
    // el aviso se apagaría sin haberse mostrado
    void marcarProyectosAvisados();
}

// Marca como "avisados" los proyectos que el globito ya contó y apaga el globito
async function marcarProyectosAvisados() {
    // Si no hay proyectos sin avisar, no se manda ninguna consulta
    if (!datosProyectos.some(p => p.avisado_en_guia === false)) return;

    const { error } = await actualizarAvisoProyectosEnSupabase();

    if (error) {
        console.error("No se pudo marcar el aviso de Guía:", error);
        return;
    }

    datosProyectos.forEach(function (proyecto) {
        proyecto.avisado_en_guia = true;
    });
    void actualizarBadgeGuia(datosProyectos);
}

// Al abrir una tarjeta nueva se quita su etiqueta NUEVO al instante
// y se guarda en segundo plano (la tarjeta no espera a la red)
function marcarProyectoVisto(id) {
    const proyecto = datosProyectos.find(p => p.id === id);
    if (!proyecto || proyecto.visto_en_guia) return;

    proyecto.visto_en_guia = true;

    const etiqueta = document.getElementById("nuevo-" + id);
    if (etiqueta) etiqueta.remove();

    void guardarProyectoVisto(id);
}

// Ids (fase o tareas) cuyo texto es distinto del original
function idsConCambio() {
    return Object.keys(borradores).filter(function (id) {
        return borradores[id].trim() !== (textos[id] || "").trim();
    });
}

// ---------- Barra inferior del modo ----------
function textoContador() {
    if (!modo) return "";

    if (modo.accion === "renombrar") {
        const n = idsConCambio().length;
        return n === 0 ? "Sin cambios" : plural(n, "cambio", "cambios");
    }

    if (marcadas.has(modo.faseId)) return "fase completa";
    const n = idsTareasAEliminar().length;
    return n === 0 ? "Nada marcado" : plural(n, "marcada", "marcadas");
}

function textoBotonEliminar() {
    const n = idsTareasAEliminar().length;

    if (marcadas.has(modo.faseId)) {
        return n === 0 ? "Eliminar fase" : "Eliminar fase y " + plural(n, "tarea", "tareas");
    }

    return n === 0 ? "Listo" : "Eliminar " + plural(n, "tarea", "tareas");
}

// Muestra u oculta la barra y refresca sus textos. La barra reemplaza a la
// barra de pestañas mientras hay un modo activo (no se puede salir sin querer)
function actualizarBarra() {
    const barra = document.getElementById("barraModo");
    const nav = document.querySelector("body > nav");
    if (!barra) return;

    if (!modo) {
        barra.classList.add("hidden");
        barra.classList.remove("flex");
        if (nav) nav.style.display = "";
        return;
    }

    barra.classList.remove("hidden");
    barra.classList.add("flex");
    if (nav) nav.style.display = "none";

    const btnAplicar = document.getElementById("btnAplicarModo");
    const btnCancelar = document.getElementById("btnCancelarModo");

    if (modo.accion === "renombrar") {
        const n = idsConCambio().length;
        if (guardando) {
            btnAplicar.textContent = "Guardando…";
        } else if (n > 0) {
            btnAplicar.textContent = "Guardar cambios (" + n + ")";
        } else {
            btnAplicar.textContent = "Listo";
        }
    } else {
        btnAplicar.textContent = textoBotonEliminar();
    }

    btnAplicar.disabled = guardando;
    btnCancelar.disabled = guardando;

    const contador = document.getElementById("contadorModo");
    if (contador) contador.textContent = textoContador();
}

// Menu de la fase
function abrirMenuFase(faseId, boton) {
    if (modo) return;

    if (menuAbiertoDe === faseId) {
        cerrarMenuFase();
        return;
    }

    cerrarMenuFase();
    menuAbiertoDe = faseId;

    const menu = document.getElementById("menuFase");
    menu.innerHTML = ACCIONES_FASE.map(function (accion) {
        return `
            <button onclick="iniciarModo('${faseId}', '${accion.id}')" class="flex items-center gap-2 w-full text-left px-4 py-3 text-sm hover:bg-gray-600 ${accion.peligro ? "text-red-400" : "text-white"}">
                <i class="ti ${accion.icono} text-base"></i>${accion.texto}
            </button>
        `;
    }).join("");

    menu.classList.remove("hidden");

    // Se abre hacia abajo; si no hay espacio (por la barra de pestañas), hacia arriba
    const rect = boton.getBoundingClientRect();
    const alto = menu.offsetHeight;
    const ancho = menu.offsetWidth;
    const hayEspacioAbajo = rect.bottom + alto + 8 < window.innerHeight - 70;

    menu.style.top = (hayEspacioAbajo ? rect.bottom + 4 : rect.top - alto - 4) + "px";
    menu.style.left = Math.max(8, Math.min(rect.right - ancho, window.innerWidth - ancho - 8)) + "px";
}

function cerrarMenuFase() {
    menuAbiertoDe = null;
    const menu = document.getElementById("menuFase");
    if (menu) menu.classList.add("hidden");
}

// Entrar y salir de un modo
function iniciarModo(faseId, accion) {
    cerrarMenuFase();

    const info = fasesInfo[faseId];
    if (!info || modo) return;

    // Fase sin tareas: eliminar va directo a la confirmación
    if (accion === "eliminar" && info.tareaIds.length === 0) {
        abrirConfirmacion(
            "Eliminar",
            'Se eliminará la fase "' + textos[faseId] + '". No se puede deshacer.',
            "Eliminar",
            async function () {
                const ok = await ejecutarEliminacion(faseId, true, []);
                if (ok) {
                    cerrarConfirmacion();
                    dibujarVista();
                    void actualizarVistaGuia();
                }
            }
        );
        return;
    }

    modo = { faseId: faseId, accion: accion };
    borradores = {};
    marcadas = new Set();
    fallidos = new Set();

    if (accion === "renombrar") {
        borradores[faseId] = textos[faseId];
        info.tareaIds.forEach(function (id) { borradores[id] = textos[id]; });
    }

    abiertos.add(faseId);
    abiertos.add(info.proyectoId);
    dibujarVista();
}

// Limpia el estado del modo sin dibujar
function reiniciarModo() {
    modo = null;
    borradores = {};
    marcadas = new Set();
    fallidos = new Set();
    guardando = false;

    const contenedorGuia = document.getElementById("contenedorGuia");
    if (contenedorGuia) contenedorGuia.classList.remove("pointer-events-none");

    actualizarBarra();
}

function salirDelModo() {
    reiniciarModo();
    dibujarVista();
}

function cancelarModo() {
    if (!modo || guardando) return;

    if (modo.accion === "renombrar" && idsConCambio().length > 0) {
        abrirConfirmacion(
            "Descartar cambios",
            "Tienes " + plural(idsConCambio().length, "cambio", "cambios") + " sin guardar. ¿Descartarlos?",
            "Descartar",
            function () {
                cerrarConfirmacion();
                salirDelModo();
            }
        );
        return;
    }

    salirDelModo();
}

function aplicarModo() {
    if (!modo || guardando) return;

    if (modo.accion === "renombrar") {
        if (idsConCambio().length === 0) {
            salirDelModo();
            return;
        }
        void guardarRenombrados();
        return;
    }

    const faseId = modo.faseId;
    const eliminarFase = marcadas.has(faseId);
    const ids = idsTareasAEliminar();

    if (!eliminarFase && ids.length === 0) {
        salirDelModo();
        return;
    }

    abrirConfirmacion("Eliminar", mensajeEliminacion(faseId), "Eliminar", async function () {
        const ok = await ejecutarEliminacion(faseId, eliminarFase, ids);
        if (ok) {
            cerrarConfirmacion();
            salirDelModo();
            void actualizarVistaGuia();
        }
    });
}

// ---------- Renombrar en lote ----------
async function guardarRenombrados() {
    // Ningún nombre puede quedar vacío
    const vacios = Object.keys(borradores).filter(id => borradores[id].trim() === "");
    if (vacios.length > 0) {
        alert("Hay nombres vacíos. Escribe un nombre o cancela los cambios.");
        const campo = document.querySelector('#contenedorGuia textarea[data-id="' + vacios[0] + '"]');
        if (campo) campo.focus();
        return;
    }

    const ids = idsConCambio();
    const contenedorGuia = document.getElementById("contenedorGuia");

    guardando = true;
    contenedorGuia.classList.add("pointer-events-none");
    actualizarBarra();

    const resultados = await Promise.all(ids.map(function (id) {
        const esFase = id === modo.faseId;
        return guardarNombreEnSupabase(id, borradores[id].trim(), esFase);
    }));

    guardando = false;
    contenedorGuia.classList.remove("pointer-events-none");

    resultados.filter(r => r.ok).forEach(r => aplicarNombreEnCache(r.id, borradores[r.id].trim()));
    const fallos = resultados.filter(r => !r.ok);

    if (fallos.length === 0) {
        salirDelModo();
        void actualizarVistaGuia();
        return;
    }

    // Se queda en el modo: los que fallaron siguen en rojo con su texto
    fallos.forEach(f => fallidos.add(f.id));
    await cargarDatos();
    dibujarVista();

    const faltan = fallos.some(f => f.motivo === "ya no existe");
    alert(
        "No se pudieron guardar " + plural(fallos.length, "cambio", "cambios") + ". " +
        (faltan ? "Algunos elementos ya no existen. " : "") +
        "Revisa los campos en rojo y vuelve a intentar."
    );
}

// Eliminar en lote
function toggleMarca(id) {
    if (modo?.accion !== "eliminar") return;

    if (marcadas.has(id)) {
        marcadas.delete(id);
    } else {
        marcadas.add(id);
    }

    dibujarVista();
}

// Tareas que se eliminarían: todas las de la fase si la fase está marcada,
// o solo las marcadas una por una
function idsTareasAEliminar() {
    const info = fasesInfo[modo.faseId];
    if (!info) return [];

    if (marcadas.has(modo.faseId)) return info.tareaIds.slice();
    return info.tareaIds.filter(id => marcadas.has(id));
}

function mensajeEliminacion(faseId) {
    const ids = idsTareasAEliminar();
    const completas = contarTareasCompletadas(ids);
    let mensaje;

    if (marcadas.has(faseId)) {
        let resto = "";
        if (ids.length === 1) {
            resto = " y su tarea";
        } else if (ids.length > 1) {
            resto = " y sus " + ids.length + " tareas";
        }
        mensaje = 'Se eliminarán la fase "' + textos[faseId] + '"' + resto + ". No se puede deshacer.";
    } else if (ids.length === 1) {
        mensaje = 'Se eliminará la tarea "' + textos[ids[0]] + '". No se puede deshacer.';
    } else {
        mensaje = "Se eliminarán " + ids.length + " tareas. No se puede deshacer.";
    }

    if (completas > 0) {
        mensaje += "\nIncluye " + plural(completas, "tarea completada", "tareas completadas") + ".";
    }

    return mensaje;
}

// Borra en Supabase. Si se elimina la fase, primero se borran sus tareas
// (funciona con o sin ON DELETE CASCADE). Devuelve true si salió bien
async function ejecutarEliminacion(faseId, eliminarFase, ids) {
    const btnConfirmar = document.getElementById("btnConfirmarEliminar");
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Eliminando…";

    const error = await eliminarEnSupabase(faseId, eliminarFase, ids);

    btnConfirmar.disabled = false;
    btnConfirmar.textContent = "Eliminar";

    if (error) {
        alert("No se pudo eliminar: " + (error.message || "revisa tu conexión"));
        return false;
    }

    if (eliminarFase) abiertos.delete(faseId);
    quitarDeCache(faseId, eliminarFase, ids);
    return true;
}

// ---------- Modal de confirmación (reutiliza #modalEliminar) ----------
function abrirConfirmacion(titulo, mensaje, textoBoton, accion) {
    accionConfirmar = accion;

    const modal = document.getElementById("modalEliminar");
    modal.querySelector("h2").textContent = titulo;

    const parrafo = document.getElementById("mensajeEliminar");
    parrafo.textContent = mensaje;
    parrafo.style.whiteSpace = "pre-line";

    document.getElementById("btnConfirmarEliminar").textContent = textoBoton;

    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarConfirmacion() {
    const modal = document.getElementById("modalEliminar");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    accionConfirmar = null;
}

document.getElementById("btnCancelarEliminar").addEventListener("click", cerrarConfirmacion);
document.getElementById("btnConfirmarEliminar").addEventListener("click", function () {
    if (accionConfirmar) accionConfirmar();
});

// ---------- Abrir/cerrar tarjetas y completar tareas ----------
function toggleFasesProyecto(id) {
    if (modo) return;

    const fases = document.getElementById("fases-" + id);
    const flecha = document.getElementById("flecha-" + id);

    fases.classList.toggle("hidden");
    flecha.classList.toggle("ti-chevron-down");
    flecha.classList.toggle("ti-chevron-up");

    if (abiertos.has(id)) {
        abiertos.delete(id);
    } else {
        abiertos.add(id);
        marcarProyectoVisto(id);
    }
}

function toggleTareasFase(id) {
    if (modo) return;

    const tareas = document.getElementById("tareas-" + id);
    const flecha = document.getElementById("flecha-fase-" + id);

    tareas.classList.toggle("hidden");
    flecha.classList.toggle("ti-chevron-down");
    flecha.classList.toggle("ti-chevron-up");

    if (abiertos.has(id)) {
        abiertos.delete(id);
    } else {
        abiertos.add(id);
    }
}

// Marca o desmarca una tarea en la base de datos
async function toggleTareaCompletada(id, completada) {
    if (modo) return;

    const { error } = await guardarEstadoTareaEnSupabase(id, completada);

    if (error) {
        alert("No se pudo actualizar la tarea.");
    }
    void actualizarVistaGuia();
}

// ---------- Modal de nueva fase ----------
function abrirModalFase(proyectoId) {
    if (modo) return;

    proyectoIdNuevaFase = proyectoId;
    document.getElementById("inputNombreFase").value = "";
    const modal = document.getElementById("modalFase");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarModalFase() {
    const modal = document.getElementById("modalFase");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    proyectoIdNuevaFase = null;
}

document.getElementById("btnCancelarFase").addEventListener("click", cerrarModalFase);

document.getElementById("btnGuardarFase").addEventListener("click", async function () {
    const nombre = document.getElementById("inputNombreFase").value.trim();

    if (nombre === "") {
        alert("Escribe el nombre de la fase");
        return;
    }

    const { error } = await crearFaseEnSupabase(proyectoIdNuevaFase, nombre);

    if (error) {
        alert("No se pudo crear la fase: " + error.message);
        return;
    }

    abiertos.add(proyectoIdNuevaFase);
    cerrarModalFase();
    void actualizarVistaGuia();
});

// ---------- Modal de nueva tarea ----------
function abrirModalTarea(faseId) {
    if (modo) return;

    faseIdNuevaTarea = faseId;
    document.getElementById("inputNombreTarea").value = "";
    const modal = document.getElementById("modalTarea");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("inputNombreTarea").focus();
}

function cerrarModalTarea() {
    const modal = document.getElementById("modalTarea");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    faseIdNuevaTarea = null;
}

async function guardarTarea() {
    const descripcion = document.getElementById("inputNombreTarea").value.trim();

    if (descripcion === "") {
        alert("Escribe el nombre de la tarea");
        return;
    }

    const btnGuardar = document.getElementById("btnGuardarTarea");
    btnGuardar.disabled = true;

    const { error } = await crearTareaEnSupabase(faseIdNuevaTarea, descripcion);

    btnGuardar.disabled = false;

    if (error) {
        alert("No se pudo crear la tarea: " + error.message);
        return;
    }

    abiertos.add(faseIdNuevaTarea);
    cerrarModalTarea();
    void actualizarVistaGuia();
}

document.getElementById("btnCancelarTarea").addEventListener("click", cerrarModalTarea);
document.getElementById("btnGuardarTarea").addEventListener("click", guardarTarea);
document.getElementById("inputNombreTarea").addEventListener("keydown", function (e) {
    if (e.key === "Enter") void guardarTarea();
});

// ---------- Elementos creados por JavaScript (no requieren HTML) ----------
// Menú flotante del ⋮ (fixed, para que no lo corte el overflow de las tarjetas)
const menuFase = document.createElement("div");
menuFase.id = "menuFase";
menuFase.className = "hidden fixed z-40 bg-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[160px]";
document.body.appendChild(menuFase);

// Barra de acciones del modo (reemplaza a la barra de pestañas mientras dura)
const barraModo = document.createElement("div");
barraModo.id = "barraModo";
barraModo.className = "hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-3 gap-2 z-40";
barraModo.innerHTML = `
    <button id="btnCancelarModo" class="flex-1 bg-gray-700 text-white py-3 rounded-xl text-sm font-medium">Cancelar</button>
    <button id="btnAplicarModo" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-medium">Listo</button>
`;
document.body.appendChild(barraModo);

document.getElementById("btnCancelarModo").addEventListener("click", cancelarModo);
document.getElementById("btnAplicarModo").addEventListener("click", aplicarModo);

// ---------- Eventos globales ----------
const contenedorGuiaEl = document.getElementById("contenedorGuia");

// Escribir en un campo: actualiza el borrador sin redibujar (no pierde el foco)
contenedorGuiaEl.addEventListener("input", function (e) {
    const campo = e.target.closest("textarea[data-id]");
    if (!campo || modo?.accion !== "renombrar") return;

    const id = campo.dataset.id;
    borradores[id] = campo.value;
    fallidos.delete(id);
    campo.className = claseCampo(id) + (id === modo.faseId ? " font-medium" : "");
    ajustarAltura(campo);
    actualizarBarra();
});

// Enter pasa al siguiente campo; en el último cierra el teclado
contenedorGuiaEl.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || !e.target.matches("textarea[data-id]")) return;

    e.preventDefault();
    const campos = Array.from(contenedorGuiaEl.querySelectorAll("textarea[data-id]"));
    const siguiente = campos[campos.indexOf(e.target) + 1];

    if (siguiente) {
        siguiente.focus();
    } else {
        e.target.blur();
    }
});

// Al entrar a un campo se selecciona el texto y se desplaza a la vista
contenedorGuiaEl.addEventListener("focusin", function (e) {
    if (!e.target.matches("textarea[data-id]")) return;

    const campo = e.target;
    setTimeout(function () {
        if (!campo.isConnected) return;
        campo.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
});

// El menú ⋮ se cierra al tocar fuera o al hacer scroll
document.addEventListener("click", function (e) {
    if (!menuAbiertoDe) return;
    if (e.target.closest("#menuFase") || e.target.closest("[aria-haspopup='true']")) return;
    cerrarMenuFase();
});
contenedorGuiaEl.addEventListener("scroll", cerrarMenuFase);
window.addEventListener("resize", cerrarMenuFase);

// Mientras hay un modo activo no se puede abrir "Cerrar sesión" por accidente
document.addEventListener("click", function (e) {
    if (modo && e.target.closest("#btnCerrarSesion")) {
        e.stopPropagation();
        e.preventDefault();
    }
}, true);

// Aviso del navegador si se intenta salir con cambios sin guardar
window.addEventListener("beforeunload", function (e) {
    if (modo?.accion === "renombrar" && idsConCambio().length > 0) {
        e.preventDefault();
    }
});

async function iniciarVistaGuia() {
    try {
        await actualizarVistaGuia();
    } catch (error) {
        console.error("No se pudo iniciar la guía:", error);
    }
}

queueMicrotask(iniciarVistaGuia);
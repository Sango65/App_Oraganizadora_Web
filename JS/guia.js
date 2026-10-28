// ---------- Estado ----------
// Ids de tarjetas y fases que están abiertas (para no colapsarlas al redibujar)
const abiertos = new Set();
let proyectoIdNuevaFase = null;
let faseIdNuevaTarea = null;

// Datos cargados de Supabase y sus índices (se reconstruyen en reconstruirIndices)
let datosProyectos = [];
let textos = {};              // id (fase o tarea) -> texto original
let fasesInfo = {};           // faseId -> { proyectoId, tareaIds: [] }
let completadas = new Set();  // ids de tareas completadas

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

// ---------- Carga de datos ----------
function reconstruirIndices() {
    textos = {};
    fasesInfo = {};
    completadas = new Set();

    datosProyectos.forEach(function (proyecto) {
        (proyecto.fases || []).forEach(function (fase) {
            const tareas = fase.tareas || [];
            textos[fase.id] = fase.nombre;
            fasesInfo[fase.id] = { proyectoId: proyecto.id, tareaIds: tareas.map(t => t.id) };

            tareas.forEach(function (tarea) {
                textos[tarea.id] = tarea.descripcion;
                if (tarea.completada) completadas.add(tarea.id);
            });
        });
    });
}

// Trae proyectos con fases y tareas anidadas. Devuelve true si salió bien
async function cargarDatos() {
    const { data, error } = await clienteSupabase
        .from("proyectos")
        .select("id, nombre, fases(id, nombre, orden, tareas(id, descripcion, completada, orden))")
        .order("creado_en", { ascending: false });

    if (error) return false;

    datosProyectos = data;
    reconstruirIndices();
    return true;
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
}

// Cambios locales en la caché (para que la pantalla no parpadee con datos viejos)
function aplicarNombreEnCache(id, texto) {
    datosProyectos.forEach(function (proyecto) {
        (proyecto.fases || []).forEach(function (fase) {
            if (fase.id === id) fase.nombre = texto;
            (fase.tareas || []).forEach(function (tarea) {
                if (tarea.id === id) tarea.descripcion = texto;
            });
        });
    });
    textos[id] = texto;
}

function quitarDeCache(faseId, eliminarFase, ids) {
    datosProyectos.forEach(function (proyecto) {
        if (eliminarFase) {
            proyecto.fases = (proyecto.fases || []).filter(f => f.id !== faseId);
        } else {
            (proyecto.fases || []).forEach(function (fase) {
                fase.tareas = (fase.tareas || []).filter(t => !ids.includes(t.id));
            });
        }
    });
    reconstruirIndices();
}

// ---------- Dibujo ----------
function dibujarVista() {
    const contenedorGuia = document.getElementById("contenedorGuia");
    if (!contenedorGuia) return;

    cerrarMenuFase();

    // Si la fase en modo ya no existe (se borró desde otro dispositivo), se sale del modo
    if (modo && !fasesInfo[modo.faseId]) {
        reiniciarModo();
        alert("Esa fase ya no existe.");
    }

    const posicionScroll = contenedorGuia.scrollTop;
    const enModo = modo !== null;

    contenedorGuia.innerHTML = datosProyectos.map(function (proyecto) {
        const fases = (proyecto.fases || []).slice().sort((a, b) => a.orden - b.orden);

        const proyectoContieneModo = enModo && fases.some(f => f.id === modo.faseId);
        const bloqueaProyecto = enModo && !proyectoContieneModo;
        const proyectoAbierto = abiertos.has(proyecto.id) || proyectoContieneModo;

        const htmlFases = fases.map(function (fase, indice) {
            const tareas = (fase.tareas || []).slice().sort((a, b) => a.orden - b.orden);
            const etiqueta = "Fase " + (indice + 1);

            if (enModo && modo.faseId === fase.id) {
                return modo.accion === "renombrar"
                    ? htmlFaseRenombrar(fase, tareas, etiqueta)
                    : htmlFaseEliminar(fase, tareas, etiqueta);
            }

            return htmlFaseNormal(fase, tareas, etiqueta, enModo);
        }).join("");

        const claseBotonAgregarFase = enModo ? "opacity-40 pointer-events-none" : "";
        const contenidoFases = fases.length === 0
            ? `
                <p class="text-gray-500 text-sm mb-3">Aún no tiene fases, crea una</p>
                <button onclick="abrirModalFase('${proyecto.id}')" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm">Crear primera fase</button>
            `
            : `
                ${htmlFases}
                <button onclick="abrirModalFase('${proyecto.id}')" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm mt-1 ${claseBotonAgregarFase}">+ Agregar fase</button>
            `;

        return `
            <div class="bg-gray-800 rounded-2xl mb-3 overflow-hidden ${bloqueaProyecto ? "opacity-40 pointer-events-none" : ""}">
                <div class="flex items-center justify-between p-4 ${enModo ? "" : "cursor-pointer"}" ${enModo ? "" : `onclick="toggleFasesProyecto('${proyecto.id}')"`}>
                    <div class="flex items-center gap-2">
                        <i class="ti ti-folder text-red-500"></i>
                        <div>
                            <p class="text-gray-400 text-xs uppercase">Fases de:</p>
                            <p class="text-white font-semibold">${escaparHTML(proyecto.nombre)}</p>
                        </div>
                    </div>
                    <i id="flecha-${proyecto.id}" class="ti ${proyectoAbierto ? "ti-chevron-up" : "ti-chevron-down"} text-gray-400"></i>
                </div>

                <div id="fases-${proyecto.id}" class="${proyectoAbierto ? "" : "hidden"} px-4 pb-4">
                    ${contenidoFases}
                </div>
            </div>
        `;
    }).join("");

    contenedorGuia.scrollTop = posicionScroll;
    autoajustarCampos();
    requestAnimationFrame(autoajustarCampos);
    actualizarBarra();
}

// Fase en vista normal: título, flecha y menú ⋮
function htmlFaseNormal(fase, tareas, etiqueta, bloqueada) {
    const abierta = abiertos.has(fase.id);

    const htmlTareas = tareas.map(function (tarea) {
        return `
            <div class="flex items-center gap-2 py-1">
                <input type="checkbox" ${tarea.completada ? "checked" : ""} onchange="toggleTareaCompletada('${tarea.id}', this.checked)" class="w-4 h-4 accent-red-500 shrink-0">
                <span class="flex-1 break-words text-sm ${tarea.completada ? "text-gray-500 line-through" : "text-white"}">${escaparHTML(tarea.descripcion)}</span>
            </div>
        `;
    }).join("");

    return `
        <div class="bg-gray-900 rounded-lg mb-2 overflow-hidden ${bloqueada ? "opacity-40 pointer-events-none" : ""}">
            <div class="flex items-center justify-between pl-3 pr-1 cursor-pointer" onclick="toggleTareasFase('${fase.id}')">
                <p class="text-white text-sm font-medium py-2">${etiqueta}: ${escaparHTML(fase.nombre)}</p>
                <div class="flex items-center">
                    <i id="flecha-fase-${fase.id}" class="ti ${abierta ? "ti-chevron-up" : "ti-chevron-down"} text-gray-400 text-sm px-1"></i>
                    <button onclick="event.stopPropagation(); abrirMenuFase('${fase.id}', this)" class="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white" aria-label="Opciones de la fase" aria-haspopup="true">
                        <i class="ti ti-dots-vertical text-lg"></i>
                    </button>
                </div>
            </div>
            <div id="tareas-${fase.id}" class="${abierta ? "" : "hidden"} px-3 pb-3">
                ${htmlTareas || '<p class="text-gray-500 text-xs mb-2">Sin tareas todavía</p>'}
                <button onclick="abrirModalTarea('${fase.id}')" class="text-red-500 hover:text-red-400 text-xs font-semibold uppercase tracking-wide mt-2">+ Agregar tarea</button>
            </div>
        </div>
    `;
}

// Encabezado del modo: etiqueta del modo + contador
function htmlEncabezadoModo() {
    const esRenombrar = modo.accion === "renombrar";
    return `
        <div class="flex items-center justify-between mb-2">
            <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${esRenombrar ? "bg-slate-700 text-slate-200" : "bg-red-900 text-red-200"}">
                <i class="ti ${esRenombrar ? "ti-pencil" : "ti-trash"}"></i>${esRenombrar ? "Renombrando" : "Eliminando"}
            </span>
            <span id="contadorModo" class="text-[11px] ${esRenombrar ? "text-gray-400" : "text-red-300"}">${textoContador()}</span>
        </div>
    `;
}

// Modo renombrar: todos los nombres son campos editables
function htmlFaseRenombrar(fase, tareas, etiqueta) {
    const campos = tareas.map(function (tarea) {
        const valor = borradores[tarea.id] !== undefined ? borradores[tarea.id] : tarea.descripcion;
        return `
            <div class="flex items-start gap-2 py-1">
                <input type="checkbox" disabled ${tarea.completada ? "checked" : ""} class="w-4 h-4 accent-red-500 shrink-0 mt-3 opacity-40">
                <textarea data-id="${tarea.id}" rows="1" maxlength="120" class="${claseCampo(tarea.id)}" style="${ESTILO_CAMPO}" aria-label="Nombre de la tarea">${escaparCampo(valor)}</textarea>
            </div>
        `;
    }).join("");

    const valorFase = borradores[fase.id] !== undefined ? borradores[fase.id] : fase.nombre;

    return `
        <div class="bg-gray-900 rounded-lg mb-2 p-3 border border-slate-400">
            ${htmlEncabezadoModo()}
            <p class="text-gray-400 text-[11px] uppercase mb-1">${etiqueta}</p>
            <textarea data-id="${fase.id}" rows="1" maxlength="120" class="${claseCampo(fase.id)} font-medium" style="${ESTILO_CAMPO}font-weight:500;" aria-label="Nombre de la fase">${escaparCampo(valorFase)}</textarea>
            <div class="mt-2">${campos}</div>
        </div>
    `;
}

// Modo eliminar: tocar la papelera solo marca, no borra
function htmlFaseEliminar(fase, tareas, etiqueta) {
    const faseMarcada = marcadas.has(fase.id);

    const filas = tareas.map(function (tarea) {
        const marcadaDirecta = marcadas.has(tarea.id);
        const marcada = faseMarcada || marcadaDirecta;
        const etiquetaBoton = marcadaDirecta ? "Deshacer" : "Marcar para eliminar";
        const iconoBoton = marcadaDirecta ? "ti-arrow-back-up text-red-300" : "ti-trash text-red-400";

        const boton = faseMarcada ? "" : `
            <button onclick="toggleMarca('${tarea.id}')" class="w-10 h-10 flex items-center justify-center shrink-0" aria-label="${etiquetaBoton}">
                <i class="ti ${iconoBoton} text-lg"></i>
            </button>
        `;

        return `
            <div class="flex items-center gap-2 pl-2 rounded-lg mb-1 ${marcada ? "bg-red-900/40 text-red-300" : "text-white"} ${faseMarcada ? "py-2 pr-2" : ""}">
                <input type="checkbox" disabled ${tarea.completada ? "checked" : ""} class="w-4 h-4 accent-red-500 shrink-0 opacity-40">
                <span class="flex-1 break-words text-sm ${marcada ? "line-through" : ""}">${escaparHTML(tarea.descripcion)}</span>
                ${boton}
            </div>
        `;
    }).join("");

    return `
        <div class="bg-gray-900 rounded-lg mb-2 p-3 border border-red-500">
            ${htmlEncabezadoModo()}
            <div class="flex items-center gap-2 pl-2 rounded-lg mb-2 ${faseMarcada ? "bg-red-900/40 text-red-300" : "text-white"}">
                <span class="flex-1 break-words text-sm font-medium ${faseMarcada ? "line-through" : ""}">${etiqueta}: ${escaparHTML(fase.nombre)}</span>
                <button onclick="toggleMarca('${fase.id}')" class="w-10 h-10 flex items-center justify-center shrink-0" aria-label="${faseMarcada ? "Deshacer" : "Marcar fase para eliminar"}">
                    <i class="ti ${faseMarcada ? "ti-arrow-back-up text-red-300" : "ti-trash text-red-400"} text-lg"></i>
                </button>
            </div>
            ${filas}
        </div>
    `;
}

// ---------- Campos editables (modo renombrar) ----------
// Estilos que afectan el tamaño, en línea para que no dependan de las clases de Tailwind
// (el CDN las genera un instante después y la primera medición salía mal)
const ESTILO_CAMPO = "display:block;width:100%;box-sizing:border-box;padding:6px 8px;border-width:2px;border-style:solid;font-family:inherit;font-size:14px;line-height:20px;";

const BASE_CAMPO = "w-full bg-gray-800 text-white text-sm rounded-lg px-2 py-1.5 outline-none resize-none overflow-hidden border-2 ";

function claseCampo(id) {
    const valor = borradores[id] !== undefined ? borradores[id] : "";
    let estado = "border-gray-700 focus:border-gray-500";

    if (valor.trim() === "" || fallidos.has(id)) {
        estado = "border-red-500";
    } else if (valor.trim() !== (textos[id] || "").trim()) {
        estado = "border-blue-400";
    }

    return BASE_CAMPO + estado;
}

function ajustarAltura(campo) {
    campo.style.height = "auto";
    const bordes = campo.offsetHeight - campo.clientHeight;
    campo.style.height = (campo.scrollHeight + bordes) + "px";
}

function autoajustarCampos() {
    document.querySelectorAll("#contenedorGuia textarea[data-id]").forEach(ajustarAltura);
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

    const resultados = await Promise.all(ids.map(async function (id) {
        const esFase = id === modo.faseId;
        try {
            const { data, error } = await clienteSupabase
                .from(esFase ? "fases" : "tareas")
                .update({ [esFase ? "nombre" : "descripcion"]: borradores[id].trim() })
                .eq("id", id)
                .select("id");

            if (error) return { id: id, ok: false, motivo: error.message };
            // Si no se actualizó ninguna fila, el elemento ya no existe (borrado en otro dispositivo)
            if (!data || data.length === 0) return { id: id, ok: false, motivo: "ya no existe" };
            return { id: id, ok: true };
        } catch {
            // Un fallo individual no impide intentar guardar los demás cambios.
            return { id: id, ok: false, motivo: "sin conexión" };
        }
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
    const completas = ids.filter(id => completadas.has(id)).length;
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

    let error = null;

    try {
        if (eliminarFase) {
            const resTareas = await clienteSupabase.from("tareas").delete().eq("fase_id", faseId);
            error = resTareas.error;

            if (!error) {
                const resFase = await clienteSupabase.from("fases").delete().eq("id", faseId);
                error = resFase.error;
            }
        } else if (ids.length > 0) {
            const resTareas = await clienteSupabase.from("tareas").delete().in("id", ids);
            error = resTareas.error;
        }
    } catch (e) {
        error = e;
    }

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

    const { error } = await clienteSupabase
        .from("tareas")
        .update({ completada: completada })
        .eq("id", id);

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

    // El orden de la nueva fase = el último orden del proyecto + 1
    // (así no se repite aunque después se borren fases)
    const { data: ultimaFase } = await clienteSupabase
        .from("fases")
        .select("orden")
        .eq("proyecto_id", proyectoIdNuevaFase)
        .order("orden", { ascending: false })
        .limit(1);

    const siguienteOrdenFase = ultimaFase && ultimaFase.length > 0 ? ultimaFase[0].orden + 1 : 0;

    const { error } = await clienteSupabase.from("fases").insert({
        proyecto_id: proyectoIdNuevaFase,
        nombre: nombre,
        orden: siguienteOrdenFase
    });

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

    // El orden de la nueva tarea = el último orden de la fase + 1
    // (así no se repite aunque después se borren tareas)
    const { data: ultima } = await clienteSupabase
        .from("tareas")
        .select("orden")
        .eq("fase_id", faseIdNuevaTarea)
        .order("orden", { ascending: false })
        .limit(1);

    const siguienteOrden = ultima && ultima.length > 0 ? ultima[0].orden + 1 : 0;

    const { error } = await clienteSupabase.from("tareas").insert({
        fase_id: faseIdNuevaTarea,
        descripcion: descripcion,
        completada: false,
        orden: siguienteOrden
    });

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
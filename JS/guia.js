// Ids de tarjetas y fases que están abiertas (para no colapsarlas al redibujar)
const abiertos = new Set();
let proyectoIdNuevaFase = null;
let faseIdNuevaTarea = null;

// Textos actuales de fases y tareas (id -> texto), para mostrarlos en los modales
let textos = {};
// Elemento que se está renombrando o eliminando: { tipo: "fase" | "tarea", id }
let elementoEditando = null;
let elementoEliminando = null;

// Dibuja una tarjeta por proyecto, tenga fases o no
async function actualizarVistaGuia() {
    const contenedorGuia = document.getElementById("contenedorGuia");
    if (!contenedorGuia) return;

    const { data: proyectos, error  } = await clienteSupabase
        .from("proyectos")
        .select("id, nombre, fases(id, nombre, orden, tareas(id, descripcion, completada, orden))")
        .order("creado_en", { ascending: false });

    if (error) {
        contenedorGuia.innerHTML = '<p class="text-red-400 text-sm">No se pudieron cargar los proyectos.</p>';
        return;
    }

    textos = {};

    contenedorGuia.innerHTML = proyectos.map(function (proyecto) {
        const fases = (proyecto.fases || []).sort((a, b) => a.orden - b.orden);

        const htmlFases = fases.map(function (fase, indice) {
            const tareas = (fase.tareas || []).sort((a, b) => a.orden - b.orden);
            const faseAbierta = abiertos.has(fase.id);
            textos[fase.id] = fase.nombre;

            const htmlTareas = tareas.map(function (tarea) {
                textos[tarea.id] = tarea.descripcion;
                return `
                    <div class="flex items-center gap-2 py-1">
                        <input type="checkbox" ${tarea.completada ? "checked" : ""} onchange="toggleTareaCompletada('${tarea.id}', this.checked)" class="w-4 h-4 accent-red-500 shrink-0">
                        <span class="flex-1 break-words text-sm ${tarea.completada ? "text-gray-500 line-through" : "text-white"}">${escaparHTML(tarea.descripcion)}</span>
                        <button onclick="abrirModalRenombrar('tarea', '${tarea.id}')" class="text-gray-500 hover:text-white p-1" aria-label="Renombrar tarea"><i class="ti ti-pencil text-base"></i></button>
                        <button onclick="abrirModalEliminar('tarea', '${tarea.id}')" class="text-gray-500 hover:text-red-500 p-1" aria-label="Eliminar tarea"><i class="ti ti-trash text-base"></i></button>
                    </div>
                `;
            }).join("");

            return `
                <div class="bg-gray-900 rounded-lg mb-2 overflow-hidden">
                    <div class="flex items-center justify-between px-3 py-2 cursor-pointer" onclick="toggleTareasFase('${fase.id}')">
                        <p class="text-white text-sm font-medium">Fase ${indice + 1}: ${escaparHTML(fase.nombre)}</p>
                        <div class="flex items-center gap-2">
                            <button onclick="event.stopPropagation(); abrirModalRenombrar('fase', '${fase.id}')" class="text-gray-500 hover:text-white p-1" aria-label="Renombrar fase"><i class="ti ti-pencil text-base"></i></button>
                            <button onclick="event.stopPropagation(); abrirModalEliminar('fase', '${fase.id}')" class="text-gray-500 hover:text-red-500 p-1" aria-label="Eliminar fase"><i class="ti ti-trash text-base"></i></button>
                            <i id="flecha-fase-${fase.id}" class="ti ${faseAbierta ? "ti-chevron-up" : "ti-chevron-down"} text-gray-400 text-sm"></i>
                        </div>
                    </div>
                    <div id="tareas-${fase.id}" class="${faseAbierta ? "" : "hidden"} px-3 pb-3">
                        ${htmlTareas || '<p class="text-gray-500 text-xs mb-2">Sin tareas todavía</p>'}
                        <button onclick="abrirModalTarea('${fase.id}')" class="text-red-500 hover:text-red-400 text-xs font-semibold uppercase tracking-wide mt-2">+ Agregar tarea</button>
                    </div>
                </div>
            `;
        }).join("");

        const proyectoAbierto = abiertos.has(proyecto.id);

        const contenidoFases = fases.length === 0
            ? `
                <p class="text-gray-500 text-sm mb-3">Aún no tiene fases, crea una</p>
                <button onclick="abrirModalFase('${proyecto.id}')" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm">Crear primera fase</button>
            `
            : `
                ${htmlFases}
                <button onclick="abrirModalFase('${proyecto.id}')" class="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm mt-1">+ Agregar fase</button>
            `;

        return `
            <div class="bg-gray-800 rounded-2xl mb-3 overflow-hidden">
                <div class="flex items-center justify-between p-4 cursor-pointer" onclick="toggleFasesProyecto('${proyecto.id}')">
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
}

// Abre o cierra la tarjeta de un proyecto
function toggleFasesProyecto(id) {
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

// Abre o cierra las tareas de una fase
function toggleTareasFase(id) {
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
    const { error } = await clienteSupabase
        .from("tareas")
        .update({ completada: completada })
        .eq("id", id);

    if (error) {
        alert("No se pudo actualizar la tarea.");
    }
    actualizarVistaGuia();
}

// Modal de nueva fase
function abrirModalFase(proyectoId) {
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
    actualizarVistaGuia();
});

// Modal de nueva tarea
function abrirModalTarea(faseId) {
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
    actualizarVistaGuia();
}

document.getElementById("btnCancelarTarea").addEventListener("click", cerrarModalTarea);
document.getElementById("btnGuardarTarea").addEventListener("click", guardarTarea);
document.getElementById("inputNombreTarea").addEventListener("keydown", function (e) {
    if (e.key === "Enter") guardarTarea();
});

// ---------- Renombrar fases y tareas ----------
function abrirModalRenombrar(tipo, id) {
    elementoEditando = { tipo: tipo, id: id };
    document.getElementById("tituloRenombrar").textContent = tipo === "fase" ? "Renombrar fase" : "Renombrar tarea";

    const input = document.getElementById("inputRenombrar");
    input.value = textos[id] || "";

    const modal = document.getElementById("modalRenombrar");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    input.focus();
    input.select();
}

function cerrarModalRenombrar() {
    const modal = document.getElementById("modalRenombrar");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    elementoEditando = null;
}

async function guardarRenombrar() {
    if (!elementoEditando) return;

    const nuevoTexto = document.getElementById("inputRenombrar").value.trim();
    if (nuevoTexto === "") {
        alert("El nombre no puede estar vacío");
        return;
    }

    const tipo = elementoEditando.tipo;
    const id = elementoEditando.id;
    const tabla = tipo === "fase" ? "fases" : "tareas";
    const columna = tipo === "fase" ? "nombre" : "descripcion";

    const btnGuardar = document.getElementById("btnGuardarRenombrar");
    btnGuardar.disabled = true;

    const { error } = await clienteSupabase
        .from(tabla)
        .update({ [columna]: nuevoTexto })
        .eq("id", id);

    btnGuardar.disabled = false;

    if (error) {
        alert("No se pudo renombrar: " + error.message);
        return;
    }

    cerrarModalRenombrar();
    actualizarVistaGuia();
}

document.getElementById("btnCancelarRenombrar").addEventListener("click", cerrarModalRenombrar);
document.getElementById("btnGuardarRenombrar").addEventListener("click", guardarRenombrar);
document.getElementById("inputRenombrar").addEventListener("keydown", function (e) {
    if (e.key === "Enter") guardarRenombrar();
});

// ---------- Eliminar fases y tareas ----------
function abrirModalEliminar(tipo, id) {
    elementoEliminando = { tipo: tipo, id: id };

    const nombre = textos[id] || "";
    document.getElementById("mensajeEliminar").textContent = tipo === "fase"
        ? '¿Eliminar la fase "' + nombre + '" y todas sus tareas?'
        : '¿Eliminar la tarea "' + nombre + '"?';

    const modal = document.getElementById("modalEliminar");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarModalEliminar() {
    const modal = document.getElementById("modalEliminar");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    elementoEliminando = null;
}

async function confirmarEliminar() {
    if (!elementoEliminando) return;

    const tipo = elementoEliminando.tipo;
    const id = elementoEliminando.id;

    const btnConfirmar = document.getElementById("btnConfirmarEliminar");
    btnConfirmar.disabled = true;

    let error = null;

    if (tipo === "fase") {
        // Primero se borran las tareas de la fase y luego la fase
        // (funciona con o sin ON DELETE CASCADE)
        const resultadoTareas = await clienteSupabase.from("tareas").delete().eq("fase_id", id);
        error = resultadoTareas.error;

        if (!error) {
            const resultadoFase = await clienteSupabase.from("fases").delete().eq("id", id);
            error = resultadoFase.error;
        }
    } else {
        const resultadoTarea = await clienteSupabase.from("tareas").delete().eq("id", id);
        error = resultadoTarea.error;
    }

    btnConfirmar.disabled = false;

    if (error) {
        alert("No se pudo eliminar: " + error.message);
        return;
    }

    abiertos.delete(id);
    cerrarModalEliminar();
    actualizarVistaGuia();
}

document.getElementById("btnCancelarEliminar").addEventListener("click", cerrarModalEliminar);
document.getElementById("btnConfirmarEliminar").addEventListener("click", confirmarEliminar);

actualizarVistaGuia();
// Ids de tarjetas y fases que están abiertas (para no colapsarlas al redibujar)
const abiertos = new Set();
let proyectoIdNuevaFase = null;

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

    contenedorGuia.innerHTML = proyectos.map(function (proyecto) {
        const fases = (proyecto.fases || []).sort((a, b) => a.orden - b.orden);

        const htmlFases = fases.map(function (fase, indice) {
            const tareas = (fase.tareas || []).sort((a, b) => a.orden - b.orden);
            const faseAbierta = abiertos.has(fase.id);

            const htmlTareas = tareas.map(function (tarea) {
                return `
                    <div class="flex items-center gap-2 py-1">
                        <input type="checkbox" ${tarea.completada ? "checked" : ""} onchange="toggleTareaCompletada('${tarea.id}', this.checked)" class="w-4 h-4 accent-red-500">
                        <span class="text-sm ${tarea.completada ? "text-gray-500 line-through" : "text-white"}">${escaparHTML(tarea.descripcion)}</span>
                    </div>
                `;
            }).join("");

            return `
                <div class="bg-gray-900 rounded-lg mb-2 overflow-hidden">
                    <div class="flex items-center justify-between px-3 py-2 cursor-pointer" onclick="toggleTareasFase('${fase.id}')">
                        <p class="text-white text-sm font-medium">Fase ${indice + 1}: ${escaparHTML(fase.nombre)}</p>
                        <i id="flecha-fase-${fase.id}" class="ti ${faseAbierta ? "ti-chevron-up" : "ti-chevron-down"} text-gray-400 text-sm"></i>
                    </div>
                    <div id="tareas-${fase.id}" class="${faseAbierta ? "" : "hidden"} px-3 pb-3">
                        ${htmlTareas || '<p class="text-gray-500 text-xs mb-2">Sin tareas todavía</p>'}
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

    // El orden de la nueva fase = cuántas fases tiene ya el proyecto
    const { count } = await clienteSupabase
        .from("fases")
        .select("id", { count: "exact", head: true })
        .eq("proyecto_id", proyectoIdNuevaFase);

    const { error } = await clienteSupabase.from("fases").insert({
        proyecto_id: proyectoIdNuevaFase,
        nombre: nombre,
        orden: count || 0
    });

    if (error) {
        alert("No se pudo crear la fase: " + error.message);
        return;
    }

    abiertos.add(proyectoIdNuevaFase);
    cerrarModalFase();
    actualizarVistaGuia();
});

actualizarVistaGuia();
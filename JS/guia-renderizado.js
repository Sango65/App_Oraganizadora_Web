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
                            <p class="text-white font-semibold">${escaparHTML(proyecto.nombre)}${proyecto.visto_en_guia ? "" : `<span id="nuevo-${proyecto.id}" class="ml-2 align-middle text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">NUEVO</span>`}</p>
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

// Círculo de la tarea: verde con palomita si está completada, vacío si no
function htmlCirculoTarea(completada) {
    if (completada) {
        return '<span class="w-5 h-5 rounded-full bg-green-500/20 border-2 border-green-500/70 flex items-center justify-center"><i class="ti ti-check text-green-400 text-xs"></i></span>';
    }
    return '<span class="w-5 h-5 rounded-full border-2 border-gray-500 block"></span>';
}

// Fase en vista normal: título, etiqueta "Completa", flecha y menú ⋮
function htmlFaseNormal(fase, tareas, etiqueta, bloqueada) {
    const abierta = abiertos.has(fase.id);
    const faseCompleta = tareas.length > 0 && tareas.every(function (tarea) { return tarea.completada; });

    const htmlTareas = tareas.map(function (tarea) {
        return `
            <div class="flex items-center gap-2 py-1">
                <button onclick="toggleTareaCompletada('${tarea.id}', ${!tarea.completada})" class="w-8 h-8 -ml-1 flex items-center justify-center shrink-0" role="checkbox" aria-checked="${tarea.completada}" aria-label="Marcar tarea como completada">
                    ${htmlCirculoTarea(tarea.completada)}
                </button>
                <span class="flex-1 break-words text-sm ${tarea.completada ? "text-gray-500 line-through" : "text-white"}">${escaparHTML(tarea.descripcion)}</span>
            </div>
        `;
    }).join("");

    const etiquetaCompleta = faseCompleta
        ? '<span class="inline-flex items-center gap-1 shrink-0 whitespace-nowrap text-[10px] px-2 py-0.5 rounded-full border border-green-500 text-green-400"><i class="ti ti-check"></i> Completa</span>'
        : "";

    return `
        <div class="bg-gray-900 rounded-lg mb-2 overflow-hidden ${bloqueada ? "opacity-40 pointer-events-none" : ""}">
            <div class="flex items-center justify-between pl-3 pr-1 cursor-pointer" onclick="toggleTareasFase('${fase.id}')">
                <p class="min-w-0 break-words pr-2 text-sm font-medium py-2 ${faseCompleta ? "text-gray-500 line-through" : "text-white"}">${etiqueta}: ${escaparHTML(fase.nombre)}</p>
                <div class="flex items-center shrink-0">
                    ${etiquetaCompleta}
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
                <span class="shrink-0 mt-3 opacity-40">${htmlCirculoTarea(tarea.completada)}</span>
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
                <span class="shrink-0 opacity-40">${htmlCirculoTarea(tarea.completada)}</span>
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

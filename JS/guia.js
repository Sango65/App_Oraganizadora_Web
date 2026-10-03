// Dibuja los proyectos como rectángulos desplegables en Guía de tareas
function actualizarVistaGuia() {
    const contenedorGuia = document.getElementById("contenedorGuia");
    if (!contenedorGuia) return;

    let proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];
    let fases = JSON.parse(localStorage.getItem("fases")) || [];

    contenedorGuia.innerHTML = proyectos.map(function (proyecto) {
        const fasesDeEsteProyecto = fases
            .filter(f => f.proyectoId === proyecto.id)
            .sort((a, b) => a.orden - b.orden);

        let tareas = JSON.parse(localStorage.getItem("tareas")) || [];

        const htmlFases = fasesDeEsteProyecto.map(function (fase, indice) {
            const tareasDeEstaFase = tareas.filter(t => t.faseId === fase.id);

            const htmlTareas = tareasDeEstaFase.map(function (tarea) {
                return `
                    <div class="flex items-center gap-2 py-1">
                        <input type="checkbox" ${tarea.completada ? "checked" : ""} onchange="toggleTareaCompletada(${tarea.id})" class="w-4 h-4 accent-red-500">
                        <span class="text-sm ${tarea.completada ? "text-gray-500 line-through" : "text-white"}">${escaparHTML(tarea.descripcion)}</span>
                    </div>
                `;
            }).join("");

            return `
                <div class="bg-gray-900 rounded-lg mb-2 overflow-hidden">
                    <div class="flex items-center justify-between px-3 py-2 cursor-pointer" onclick="toggleTareasFase(${fase.id})">
                        <p class="text-white text-sm font-medium">Fase ${indice + 1}: ${escaparHTML(fase.nombre)}</p>
                        <i id="flecha-fase-${fase.id}" class="ti ti-chevron-down text-gray-400 text-sm"></i>
                    </div>
                    <div id="tareas-${fase.id}" class="hidden px-3 pb-3">
                        ${htmlTareas || '<p class="text-gray-500 text-xs mb-2">Sin tareas todavía</p>'}
                    </div>
                </div>
            `;
        }).join("");

        return `
            <div class="bg-gray-800 rounded-2xl mb-3 overflow-hidden">
                <div class="flex items-center justify-between p-4 cursor-pointer" onclick="toggleFasesProyecto(${proyecto.id})">
                    <div class="flex items-center gap-2">
                        <i class="ti ti-folder text-red-500"></i>
                        <div>
                            <p class="text-gray-400 text-xs uppercase">Ver fases de:</p>
                            <p class="text-white font-semibold">${escaparHTML(proyecto.nombre)}</p>
                        </div>
                    </div>
                    <i id="flecha-${proyecto.id}" class="ti ti-chevron-down text-gray-400"></i>
                </div>

                <div id="fases-${proyecto.id}" class="hidden px-4 pb-4">
                    ${htmlFases || '<p class="text-gray-500 text-xs">Este proyecto no tiene fases todavía</p>'}
                </div>
            </div>
        `;
    }).join("");
}

// Expande/colapsa las fases de un proyecto específico
function toggleFasesProyecto(id) {
    const fases = document.getElementById("fases-" + id);
    const flecha = document.getElementById("flecha-" + id);

    fases.classList.toggle("hidden");
    flecha.classList.toggle("ti-chevron-down");
    flecha.classList.toggle("ti-chevron-up");
}

// Expande/colapsa las tareas de una fase específica
function toggleTareasFase(id) {
    const tareas = document.getElementById("tareas-" + id);
    const flecha = document.getElementById("flecha-fase-" + id);

    tareas.classList.toggle("hidden");
    flecha.classList.toggle("ti-chevron-down");
    flecha.classList.toggle("ti-chevron-up");
}

actualizarVistaGuia();

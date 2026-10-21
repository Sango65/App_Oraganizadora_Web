async function actualizarVistaProyectos() {
    const estadoVacio = document.getElementById("estadoVacio");
    if (!estadoVacio) return;

    // RLS ya filtra: solo llegan los proyectos del usuario con sesión activa
    const { data: proyectos, error } = await clienteSupabase
        .from("proyectos")
        .select("*")
        .order("creado_en", { ascending: false });

    if (error) {
        alert("No se pudieron cargar los proyectos: " + error.message);
        return;
    }

    const listaProyectos = document.getElementById("listaProyectos");

    const terminados = proyectos.filter(p => p.terminado === true).length;
    const enCurso = proyectos.length - terminados;
    document.getElementById("contadorTerminados").textContent = terminados;
    document.getElementById("contadorEnCurso").textContent = enCurso;

    if (proyectos.length === 0) {
        estadoVacio.classList.remove("hidden");
        listaProyectos.classList.add("hidden");
        return;
    }

    estadoVacio.classList.add("hidden");
    listaProyectos.classList.remove("hidden");

    const grupos = {};
    proyectos.forEach(function (proyecto) {
        const grupo = obtenerGrupoTiempo(proyecto);
        if (!grupos[grupo]) grupos[grupo] = [];
        grupos[grupo].push(proyecto);
    });

    const ordenGrupos = ["RECIENTES", "HACE 1 DÍA", "HACE 2 DÍAS", "HACE 3 DÍAS", "HACE 4 DÍAS", "HACE 5 DÍAS", "HACE 6 DÍAS", "HACE 1 SEMANA"];

    function posicionDeGrupo(nombreGrupo) {
        const posicionFija = ordenGrupos.indexOf(nombreGrupo);
        if (posicionFija !== -1) return posicionFija;
        return ordenGrupos.length + 1;
    }

    let html = "";
    const nombresDeGrupos = Object.keys(grupos).sort((a, b) => posicionDeGrupo(a) - posicionDeGrupo(b));

    nombresDeGrupos.forEach(function (nombreGrupo) {
        html += `<p class="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3 mt-4">${nombreGrupo}</p>`;

        html += grupos[nombreGrupo].map(function (proyecto) {
            return `
                <div class="bg-gray-800 rounded-2xl p-4 relative mb-3">
                    <div class="flex items-start justify-between">
                        <div>
                            <h3 class="text-white font-semibold">${escaparHTML(proyecto.nombre)}</h3>
                            <p class="text-gray-400 text-xs">${escaparHTML(proyecto.materia)}</p>
                        </div>
                        <i class="ti ti-dots-vertical text-gray-400 cursor-pointer" onclick="toggleMenuProyecto('${proyecto.id}')"></i>
                    </div>
                    <div id="menu-${proyecto.id}" class="hidden absolute right-4 top-10 bg-gray-700 rounded-xl shadow-lg overflow-hidden z-10">
                        <button onclick="editarProyecto('${proyecto.id}')" class="block w-full text-left px-4 py-2 text-white text-sm hover:bg-gray-600">Editar</button>
                        <button onclick="eliminarProyecto('${proyecto.id}')" class="block w-full text-left px-4 py-2 text-red-400 text-sm hover:bg-gray-600">Eliminar</button>
                    </div>
                    <p class="text-gray-500 text-xs mt-1">Creado: ${new Date(proyecto.creado_en).toLocaleDateString()}</p>
                    <p class="text-amber-400 text-xs mt-2"><i class="ti ti-calendar"></i> Vencimiento: ${formatearFechaLimite(proyecto.fecha_limite)}</p>
                </div>
            `;
        }).join("");
    });

    listaProyectos.innerHTML = html;
}

// Dibuja la lista al cargar la página
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", actualizarVistaProyectos);
} else {
    actualizarVistaProyectos();
}

// Abre/cierra el menu de tres puntos de un proyecto especifico
function toggleMenuProyecto(id) {
    const menu = document.getElementById("menu-" + id);
    menu.classList.toggle("hidden");
}

// Cierra cualquier menú de tres puntos abierto si se hace clic fuera de él
document.addEventListener("click", function (evento) {
    const esBotonTresPuntos = evento.target.classList.contains("ti-dots-vertical");
    const menuAbierto = evento.target.closest("[id^='menu-']");

    if (!esBotonTresPuntos && !menuAbierto) {
        document.querySelectorAll("[id^='menu-']").forEach(function (menu) {
            menu.classList.add("hidden");
        });
    }
});

// Guarda temporalmente que proyecto se esta renombrando
let idProyectoAEditar = null;
let fechaLimiteOriginal = "";

async function editarProyecto(id) {
    const { data: proyecto, error } = await clienteSupabase
        .from("proyectos")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        alert("No se pudo cargar el proyecto: " + error.message);
        return;
    }

    idProyectoAEditar = id;
    document.getElementById("inputEditarNombre").value = proyecto.nombre;
    document.getElementById("inputEditarDesarrolladoPor").value = proyecto.desarrollado_por;
    document.getElementById("inputEditarMateria").value = proyecto.materia;
    fechaLimiteOriginal = proyecto.fecha_limite || "";
    document.getElementById("inputEditarFechaLimite").value = fechaLimiteOriginal;

    const modal = document.getElementById("modalEditar");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function cerrarModalEditar() {
    const modal = document.getElementById("modalEditar");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    idProyectoAEditar = null;
}

const btnCerrarModalEditar = document.getElementById("btnCerrarModalEditar");

if (btnCerrarModalEditar) {
    btnCerrarModalEditar.addEventListener("click", cerrarModalEditar);
    document.getElementById("btnCancelarEditar").addEventListener("click", cerrarModalEditar);

        document.getElementById("btnConfirmarEditar").addEventListener("click", async function () {
        const nombre = document.getElementById("inputEditarNombre").value.trim();
        const desarrolladoPor = document.getElementById("inputEditarDesarrolladoPor").value.trim();
        const materia = document.getElementById("inputEditarMateria").value.trim();
        const fechaLimite = document.getElementById("inputEditarFechaLimite").value;

        if (nombre === "" || desarrolladoPor === "" || materia === "" || fechaLimite === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        // Solo se valida contra hoy si el usuario cambió la fecha
        const hoy = new Date().toLocaleDateString("en-CA");
        if (fechaLimite !== fechaLimiteOriginal && fechaLimite < hoy) {
            alert("La fecha límite no puede ser anterior a hoy");
            return;
        }

        const { error } = await clienteSupabase
            .from("proyectos")
            .update({
                nombre: nombre,
                desarrollado_por: desarrolladoPor,
                materia: materia,
                fecha_limite: fechaLimite
            })
            .eq("id", idProyectoAEditar);

        if (error) {
            if (error.code === "23505") {
                alert("Ya tienes un proyecto con ese nombre. Elige otro.");
            } else {
                alert("No se pudo guardar: " + error.message);
            }
            return;
        }

        cerrarModalEditar();
        actualizarVistaProyectos();
    });
}

// Elimina un proyecto con confirmacion previa
async function eliminarProyecto(id) {
    const confirmar = confirm("Este proyecto se eliminará permanentemente. ¿Continuar?");
    if (!confirmar) return;

    const { error } = await clienteSupabase.from("proyectos").delete().eq("id", id);

    if (error) {
        alert("No se pudo eliminar: " + error.message);
        return;
    }

    actualizarVistaProyectos();
}

// Modal Nuevo Proyecto (abrir/cerrar) ---
const btnNuevoProyecto = document.getElementById("btnNuevoProyecto");
const modalNuevoProyecto = document.getElementById("modalNuevoProyecto");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarProyecto = document.getElementById("btnCancelarProyecto");

if (btnNuevoProyecto) {
    const clavePosicionBoton = "posicionBotonNuevoProyecto";
    let inicioArrastre = null;
    let arrastreReciente = false;

    function limitarPosicionBoton(x, y) {
        const maxX = window.innerWidth - btnNuevoProyecto.offsetWidth;
        const maxY = window.innerHeight - btnNuevoProyecto.offsetHeight;

        return {
            x: Math.max(0, Math.min(x, maxX)),
            y: Math.max(0, Math.min(y, maxY))
        };
    }

    function colocarBoton(x, y) {
        const posicion = limitarPosicionBoton(x, y);
        btnNuevoProyecto.style.left = posicion.x + "px";
        btnNuevoProyecto.style.top = posicion.y + "px";
        btnNuevoProyecto.style.right = "auto";
        btnNuevoProyecto.style.bottom = "auto";
        return posicion;
    }

    const posicionGuardada = localStorage.getItem(clavePosicionBoton);

    if (posicionGuardada) {
        const [xGuardado, yGuardado] = posicionGuardada.split(",").map(Number);

        if (Number.isFinite(xGuardado) && Number.isFinite(yGuardado)) {
            colocarBoton(xGuardado, yGuardado);
        }
    }

    btnNuevoProyecto.addEventListener("pointerdown", function (evento) {
        if (evento.button !== 0) return;

        const rect = btnNuevoProyecto.getBoundingClientRect();
        inicioArrastre = {
            pointerId: evento.pointerId,
            startX: evento.clientX,
            startY: evento.clientY,
            left: rect.left,
            top: rect.top,
            seMovio: false
        };
        btnNuevoProyecto.setPointerCapture(evento.pointerId);
    });

    btnNuevoProyecto.addEventListener("pointermove", function (evento) {
        if (!inicioArrastre || evento.pointerId !== inicioArrastre.pointerId) return;

        const deltaX = evento.clientX - inicioArrastre.startX;
        const deltaY = evento.clientY - inicioArrastre.startY;

        if (!inicioArrastre.seMovio && Math.hypot(deltaX, deltaY) < 5) return;

        inicioArrastre.seMovio = true;
        evento.preventDefault();

        const posicion = colocarBoton(inicioArrastre.left + deltaX, inicioArrastre.top + deltaY);
        localStorage.setItem(clavePosicionBoton, posicion.x + "," + posicion.y);
    });

    function terminarArrastre(evento) {
        if (!inicioArrastre || evento.pointerId !== inicioArrastre.pointerId) return;

        arrastreReciente = inicioArrastre.seMovio;
        inicioArrastre = null;
    }

    btnNuevoProyecto.addEventListener("pointerup", terminarArrastre);
    btnNuevoProyecto.addEventListener("pointercancel", terminarArrastre);

    btnNuevoProyecto.addEventListener("click", function (evento) {
        if (!arrastreReciente) return;

        evento.preventDefault();
        evento.stopImmediatePropagation();
        arrastreReciente = false;
    }, true);

    window.addEventListener("resize", function () {
        const rect = btnNuevoProyecto.getBoundingClientRect();
        const posicion = colocarBoton(rect.left, rect.top);
        localStorage.setItem(clavePosicionBoton, posicion.x + "," + posicion.y);
    });

    btnNuevoProyecto.addEventListener("click", function () {
        modalNuevoProyecto.classList.remove("hidden");
        modalNuevoProyecto.classList.add("flex");
    });

    function cerrarModal() {
        modalNuevoProyecto.classList.add("hidden");
        modalNuevoProyecto.classList.remove("flex");
    }

    btnCerrarModal.addEventListener("click", cerrarModal);
    btnCancelarProyecto.addEventListener("click", cerrarModal);
}

const btnCrearProyecto = document.getElementById("btnCrearProyecto");

if (btnCrearProyecto) {
    btnCrearProyecto.addEventListener("click", async function () {
        // .trim() en los tres campos de texto
        const nombre = document.getElementById("inputNombreProyecto").value.trim();
        const desarrolladoPor = document.getElementById("inputDesarrolladoPor").value.trim();
        const materia = document.getElementById("inputMateria").value.trim();
        const fechaLimite = document.getElementById("inputFechaLimite").value;

        if (nombre === "" || desarrolladoPor === "" || materia === "" || fechaLimite === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        const hoy = new Date().toLocaleDateString("en-CA");
        if (fechaLimite < hoy) {
            alert("La fecha límite no puede ser anterior a hoy");
            return;
        }

        const { error } = await clienteSupabase.from("proyectos").insert({
            nombre: nombre,
            desarrollado_por: desarrolladoPor,
            materia: materia,
            fecha_limite: fechaLimite
        });

        // Mensaje si el nombre se repite
        if (error) {
            if (error.code === "23505") {
                alert("Ya tienes un proyecto con ese nombre. Elige otro.");
            } else {
                alert("No se pudo crear el proyecto: " + error.message);
            }
            return;
        }

        document.getElementById("inputNombreProyecto").value = "";
        document.getElementById("inputDesarrolladoPor").value = "";
        document.getElementById("inputMateria").value = "";
        document.getElementById("inputFechaLimite").value = "";

        cerrarModal();
        actualizarVistaProyectos();
    });
}

function obtenerGrupoTiempo(proyecto) {
    const fecha = new Date(proyecto.creado_en);
    const hoy = new Date();

    // Se compara a nivel de día del calendario, ignorando la hora
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const diffDias = Math.max(0, Math.round((inicioHoy - inicioFecha) / (1000 * 60 * 60 * 24)));

    if (diffDias === 0) return "RECIENTES";
    if (diffDias < 7) return "HACE " + diffDias + " DÍA" + (diffDias === 1 ? "" : "S");

    const diffSemanas = Math.floor(diffDias / 7);
    if (diffDias < 30) return diffSemanas === 1 ? "HACE 1 SEMANA" : "HACE " + diffSemanas + " SEMANAS";

    const diffMeses = Math.floor(diffDias / 30);
    if (diffDias < 365) return diffMeses === 1 ? "HACE 1 MES" : "HACE " + diffMeses + " MESES";

    const diffAnios = Math.floor(diffDias / 365);
    return diffAnios === 1 ? "HACE 1 AÑO" : "HACE " + diffAnios + " AÑOS";
}

// Convierte formato de fecha a n/n/nnn
function formatearFechaLimite(fecha) {
    if (!fecha) return "Sin fecha";
    const partes = fecha.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}
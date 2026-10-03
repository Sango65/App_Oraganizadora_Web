// Muestra/oculta la contraseña y cambia el ícono del ojo
function toggleContraseña(idInput, idIcono) {
  const input = document.getElementById(idInput);
  const icono = document.getElementById(idIcono);

  if (input.type === "password") {
    input.type = "text";
    icono.classList.remove("ti-eye");
    icono.classList.add("ti-eye-off");
  } else {
    input.type = "password";
    icono.classList.remove("ti-eye-off");
    icono.classList.add("ti-eye");
  }
}

// Mínimo 8 caracteres, con letras y números
function validarContraseña(contraseña) {
    const tieneLetras = /[a-zA-Z]/.test(contraseña);
    const tieneNumeros = /[0-9]/.test(contraseña);
    return contraseña.length >= 8 && tieneLetras && tieneNumeros;
}

// Actualiza los requirimientos de la contraseña en tiempo real
const inputPassRegistro = document.getElementById("inputContraseña");

if (inputPassRegistro) {
    inputPassRegistro.addEventListener("input", function () {
        const valor = inputPassRegistro.value;
        const cumpleLongitud = valor.length >= 8;
        const cumpleLetras = /[a-zA-Z]/.test(valor);
        const cumpleNumeros = /[0-9]/.test(valor);

        marcarRequisito("reqLongitud", cumpleLongitud);
        marcarRequisito("reqLetras", cumpleLetras);
        marcarRequisito("reqNumeros", cumpleNumeros);
    })
}

// Cambia el color y el ícono de un requisito según se cumpla o no
function marcarRequisito(id, cumplido) {
    const elemento = document.getElementById(id);
    const icono = elemento.querySelector("i");

    if (cumplido) {
        elemento.classList.remove("text-gray-500");
        elemento.classList.add("text-green-500");
        icono.classList.remove("ti-circle");
        icono.classList.add("ti-circle-check-filled");
    } else {
        elemento.classList.remove("text-green-500");
        elemento.classList.add("text-gray-500");
        icono.classList.remove("ti-circle-check-filled");
        icono.classList.add("ti-circle");
    }
}

// Registro (sign-up.html)
const btnRegistrarse = document.getElementById("btnRegistrarse");

if (btnRegistrarse) { // Se usa este if porque no existe en log-in.html
    btnRegistrarse.addEventListener("click", function () {
        const correo = document.querySelector('input[type="email"]').value;
        const nombre = document.querySelector('input[type="text"]').value;
        const contraseña = document.getElementById("inputContraseña").value;

        if (correo === "" || nombre === "" || contraseña === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        if (!validarContraseña(contraseña)) {
            alert("La contraseña debe tener mínimo 8 caracteres con letras y números");
            return;
        }

        let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

        const yaExiste = usuarios.some(u => u.correo === correo); // evita duplicados
        if (yaExiste) {
            alert("Ese correo ya esta registrado");
            return;
        }

        usuarios.push({correo: correo, nombre: nombre, contraseña: contraseña});
        localStorage.setItem("usuarios", JSON.stringify(usuarios));

        alert("Registro exitoso");
        window.location.href = "log-in.html";
    });
}

// --- Login (log-in.html) ---
const btnIniciarSesion = document.getElementById("btnIniciarSesion");

if (btnIniciarSesion) { // Se usa este if porque no existe en sign-up.html
    btnIniciarSesion.addEventListener("click", function () {
        const correo = document.querySelector('input[type="email"]').value;
        const contraseña = document.getElementById("inputContraseñaLogin").value;

        if (correo === "" || contraseña === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
        const usuarioEncontrado = usuarios.find(u => u.correo === correo && u.contraseña === contraseña);

        if (!usuarioEncontrado) {
            alert("Correo o contraseña incorrectos");
            return;
        }

        localStorage.setItem("sesionActiva", correo); // usuario logueado
        window.location.href = "mis-proyectos.html"
    });
}

const nombreHeader = document.getElementById("nombreUsuarioHeader");

if (nombreHeader) {
    const correoActivo = localStorage.getItem("sesionActiva");
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    const usuario = usuarios.find(u => u.correo === correoActivo);

    if (usuario) {
        nombreHeader.textContent = usuario.nombre;
    }
}

// Convierte texto en HTML seguro, evitando que se ejecute código malicioso
function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function actualizarVistaProyectos() {
    const estadoVacio = document.getElementById("estadoVacio");
    if (!estadoVacio) return;

    let proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];
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

    // Ordena del más nuevo al más viejo, para que los grupos salgan en orden lógico
    proyectos.sort((a, b) => (b.fechaCreacionTimestamp || 0) - (a.fechaCreacionTimestamp || 0));

    // Agrupa los proyectos por su etiqueta de tiempo
    const grupos = {};
    proyectos.forEach(function (proyecto) {
        const grupo = obtenerGrupoTiempo(proyecto);
        if (!grupos[grupo]) grupos[grupo] = [];
        grupos[grupo].push(proyecto);
    });

    // Define el orden correcto en que deben aparecer los grupos
    const ordenGrupos = ["RECIENTES", "HACE 1 DÍA", "HACE 2 DÍAS", "HACE 3 DÍAS", "HACE 4 DÍAS", "HACE 5 DÍAS", "HACE 6 DÍAS", "HACE 1 SEMANA"];

    function posicionDeGrupo(nombreGrupo) {
        const posicionFija = ordenGrupos.indexOf(nombreGrupo);
        if (posicionFija !== -1) return posicionFija;
        return ordenGrupos.length + 1; // semanas/meses/años van después, en el orden en que aparezcan
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
                        <i class="ti ti-dots-vertical text-gray-400 cursor-pointer" onclick="toggleMenuProyecto(${proyecto.id})"></i>
                    </div>
                    <div id="menu-${proyecto.id}" class="hidden absolute right-4 top-10 bg-gray-700 rounded-xl shadow-lg overflow-hidden z-10">
                        <button onclick="editarProyecto(${proyecto.id})" class="block w-full text-left px-4 py-2 text-white text-sm hover:bg-gray-600">Editar</button>
                        <button onclick="eliminarProyecto(${proyecto.id})" class="block w-full text-left px-4 py-2 text-red-400 text-sm hover:bg-gray-600">Eliminar</button>
                    </div>
                    <p class="text-gray-500 text-xs mt-2">Creado: ${proyecto.fechaCreacion}</p>
                </div>
            `;
        }).join("");
    });

    listaProyectos.innerHTML = html;
    }

actualizarVistaProyectos();

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

function editarProyecto(id) {
    let proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];
    const proyecto = proyectos.find(p => p.id === id);

    idProyectoAEditar = id;
    document.getElementById("inputEditarNombre").value = proyecto.nombre;
    document.getElementById("inputEditarDesarrolladoPor").value = proyecto.desarrolladoPor;
    document.getElementById("inputEditarMateria").value = proyecto.materia;

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

document.getElementById("btnCerrarModalEditar").addEventListener("click", cerrarModalEditar);
document.getElementById("btnCancelarEditar").addEventListener("click", cerrarModalEditar);

document.getElementById("btnConfirmarEditar").addEventListener("click", function () {
    const nombre = document.getElementById("inputEditarNombre").value;
    const desarrolladoPor = document.getElementById("inputEditarDesarrolladoPor").value;
    const materia = document.getElementById("inputEditarMateria").value;

    if (nombre.trim() === "" || desarrolladoPor.trim() === "" || materia.trim() === "") {
        alert("Por favor, llena todos los campos");
        return;
    }

    let proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];
    const proyecto = proyectos.find(p => p.id === idProyectoAEditar);

    proyecto.nombre = nombre;
    proyecto.desarrolladoPor = desarrolladoPor;
    proyecto.materia = materia;

    localStorage.setItem("proyectos", JSON.stringify(proyectos));
    cerrarModalEditar();
    actualizarVistaProyectos();
});


// Elimina un proyecto con confirmacion previa
function eliminarProyecto(id) {
    const confirmar = confirm("Este proyecto se eliminará permanentemente. ¿Continuar?");

    if (confirmar) {
        let proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];
        proyectos = proyectos.filter(p => p.id !== id);
        localStorage.setItem("proyectos", JSON.stringify(proyectos));
        actualizarVistaProyectos();
    }
}

// Modal Nuevo Proyecto (abrir/cerrar) ---
const btnNuevoProyecto = document.getElementById("btnNuevoProyecto");
const modalNuevoProyecto = document.getElementById("modalNuevoProyecto");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnCancelarProyecto = document.getElementById("btnCancelarProyecto");

if (btnNuevoProyecto) {
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
    btnCrearProyecto.addEventListener("click", function () {
        const nombre = document.getElementById("inputNombreProyecto").value;
        const desarrolladoPor = document.getElementById("inputDesarrolladoPor").value;
        const materia = document.getElementById("inputMateria").value;

        if (nombre === "" || desarrolladoPor === "" || materia === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        let proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];

        const nuevoProyecto = {
            id: Date.now(),
            nombre: nombre,
            desarrolladoPor: desarrolladoPor,
            materia: materia,
            fechaCreacion: new Date().toLocaleDateString(),
            fechaCreacionTimestamp: Date.now()
        };

        proyectos.push(nuevoProyecto);
        localStorage.setItem("proyectos", JSON.stringify(proyectos));

        // Limpiar los campos para la próxima vez que abran el modal
        document.getElementById("inputNombreProyecto").value = "";
        document.getElementById("inputDesarrolladoPor").value = "";
        document.getElementById("inputMateria").value = "";

        cerrarModal();
        actualizarVistaProyectos();
    });
}

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

    document.getElementById("btnConfirmarCerrarSesion").addEventListener("click", function () {
        localStorage.removeItem("sesionActiva");
        window.location.href = "log-in.html";
    });
}

function obtenerGrupoTiempo(proyecto) {
    const timestamp = proyecto.fechaCreacionTimestamp || convertirFechaAntigua(proyecto.fechaCreacion);
    const diffDias = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return "RECIENTES";
    if (diffDias < 7) return "HACE " + diffDias + " DÍA" + (diffDias === 1 ? "" : "S");

    const diffSemanas = Math.floor(diffDias / 7);
    if (diffDias < 30) return diffSemanas === 1 ? "HACE 1 SEMANA" : "HACE " + diffSemanas + " SEMANAS";

    const diffMeses = Math.floor(diffDias / 30);
    if (diffDias < 365) return diffMeses === 1 ? "HACE 1 MES" : "HACE " + diffMeses + " MESES";

    const diffAnios = Math.floor(diffDias / 365);
    return diffAnios === 1 ? "HACE 1 AÑO" : "HACE " + diffAnios + " AÑOS";
}

// Para proyectos creados antes de que existiera fechaCreacionTimestamp
function convertirFechaAntigua(fechaTexto) {
    const partes = fechaTexto.split("/");
    return new Date(partes[2], partes[1] - 1, partes[0]).getTime();
}

// Dibuja los proyectos como rectángulos desplegables en Guía de tareas
function actualizarVistaGuia() {
    const contenedorGuia = document.getElementById("contenedorGuia");
    if (!contenedorGuia) return;

    let proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];

    contenedorGuia.innerHTML = proyectos.map(function (proyecto) {
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
                    <p class="text-gray-500 text-xs">Aquí irán las fases del proyecto</p>
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

actualizarVistaGuia();
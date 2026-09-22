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

// // Muestra el estado vacío o la lista, según si hay proyectos guardados
function actualizarVistaProyectos() {
    const estadoVacio = document.getElementById("estadoVacio");
    if (!estadoVacio) return;

    let proyectos = JSON.parse(localStorage.getItem("proyectos")) || [];
    const listaProyectos = document.getElementById("listaProyectos");

    if (proyectos.length === 0) {
        estadoVacio.classList.remove("hidden");
        listaProyectos.classList.add("hidden");
    } else {
        estadoVacio.classList.add("hidden");
        listaProyectos.classList.remove("hidden");
    }
}

actualizarVistaProyectos();

// --- Modal Nuevo Proyecto (abrir/cerrar) ---
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
            fechaCreacion: new Date().toLocaleDateString()
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
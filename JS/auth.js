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
    const tieneNumeros = /\d/.test(contraseña);
    return contraseña.length >= 8 && tieneLetras && tieneNumeros;
}

// Actualiza los requirimientos de la contraseña en tiempo real
const inputPassRegistro = document.getElementById("inputContraseña");

if (inputPassRegistro) {
    inputPassRegistro.addEventListener("input", function () {
        const valor = inputPassRegistro.value;
        const cumpleLongitud = valor.length >= 8;
        const cumpleLetras = /[a-zA-Z]/.test(valor);
        const cumpleNumeros = /\d/.test(valor);

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

// --- Validación del dominio del correo (solo en el registro) ---
// Dominios permitidos: correos generales y el de la universidad.
// Para permitir otro dominio, agrégalo a esta lista (en minúsculas).
const DOMINIOS_PERMITIDOS = [
    "gmail.com", "googlemail.com",
    "outlook.com", "hotmail.com",
    "ute.edu.mx"
];

// Limpia el correo (espacios y mayúsculas) y revisa formato y dominio.
// Devuelve { valido, mensaje, correo } con el correo ya limpio.
function validarCorreoRegistro(texto) {
    const correo = texto.trim().toLowerCase();

    if (correo === "") {
        return { valido: false, mensaje: "Escribe tu correo electrónico", correo: correo };
    }

    // Formato: algo + @ + dominio con punto, sin espacios y con un solo @
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return { valido: false, mensaje: "Escribe un correo válido, por ejemplo nombre@gmail.com", correo: correo };
    }

    const dominio = correo.split("@")[1];

    if (!DOMINIOS_PERMITIDOS.includes(dominio)) {
        return {
            valido: false,
            mensaje: "Ese dominio no está permitido. Usa un correo de Gmail, Outlook, Hotmail o @ute.edu.mx",
            correo: correo
        };
    }

    return { valido: true, mensaje: "", correo: correo };
}

// El aviso de error va debajo del campo de correo (existe solo en sign-up.html)
const inputCorreoRegistro = document.getElementById("inputCorreoRegistro");
const errorCorreo = document.getElementById("errorCorreo");

function mostrarErrorCorreo(mensaje) {
    errorCorreo.textContent = mensaje;
    errorCorreo.classList.remove("hidden");
    inputCorreoRegistro.setAttribute("aria-invalid", "true");
    inputCorreoRegistro.parentElement.classList.add("ring-1", "ring-red-500");
}

function ocultarErrorCorreo() {
    errorCorreo.classList.add("hidden");
    errorCorreo.textContent = "";
    inputCorreoRegistro.removeAttribute("aria-invalid");
    inputCorreoRegistro.parentElement.classList.remove("ring-1", "ring-red-500");
}

if (inputCorreoRegistro && errorCorreo) {
    // El aviso desaparece cuando la persona vuelve a escribir
    inputCorreoRegistro.addEventListener("input", ocultarErrorCorreo);
}

// Registro (sign-up.html)
const btnRegistrarse = document.getElementById("btnRegistrarse")

if (btnRegistrarse) {
    btnRegistrarse.addEventListener("click", async function () {
        const correo = document.querySelector('input[type="email"]').value.trim();
        const nombre = document.querySelector('input[type="text"]').value.trim();
        const contraseña = document.getElementById("inputContraseña").value;

        if (correo === "" || nombre === "" || contraseña === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        const resultadoCorreo = validarCorreoRegistro(correo);

        if (!resultadoCorreo.valido) {
            mostrarErrorCorreo(resultadoCorreo.mensaje);
            inputCorreoRegistro.focus();
            return;
        }

        ocultarErrorCorreo();

        if (!validarContraseña(contraseña)) {
            alert("La contraseña debe tener mínimo 8 caracteres con letras y números");
            return;
        }

        const { error } = await clienteSupabase.auth.signUp({
            email: resultadoCorreo.correo,
            password: contraseña,
            options: { data: { nombre: nombre, display_name: nombre } }
        });

        if (error) {
            alert("No se pudo registrar: " + error.message);
            return;
        }

        alert("Registro exitoso");
        window.location.href = "log-in.html";
    });
}

// --- Login (log-in.html) ---
const btnIniciarSesion = document.getElementById("btnIniciarSesion");

if (btnIniciarSesion) { // Se usa este if porque no existe en sign-up.html
    btnIniciarSesion.addEventListener("click", async function () {
        const correo = document.querySelector('input[type="email"]').value;
        const contraseña = document.getElementById("inputContraseñaLogin").value;

        if (correo === "" || contraseña === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        const { error } = await clienteSupabase.auth.signInWithPassword({
            email: correo,
            password: contraseña
        })

        if (error) {
            alert("Correo o contraseña incorrectos");
            return;
        }

        window.location.href = "mis-proyectos.html"
    });
}
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
if (btnRegistrarse) {
    btnRegistrarse.addEventListener("click", async function () {
        const correo = document.querySelector('input[type="email"]').value.trim();
        const nombre = document.querySelector('input[type="text"]').value.trim();
        const contraseña = document.getElementById("inputContraseña").value;

        if (correo === "" || nombre === "" || contraseña === "") {
            alert("Por favor, llena todos los campos");
            return;
        }

        if (!validarContraseña(contraseña)) {
            alert("La contraseña debe tener mínimo 8 caracteres con letras y números");
            return;
        }

        const { data, error } = await clienteSupabase.auth.signUp({
            email: correo,
            password: contraseña,
            options: { data: { nombre: nombre } }
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

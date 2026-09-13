function toggleConstraseña(){
    const input = document.getElementById("inputContraseña");
    const icono = document.getElementById("iconoOjo");

    if (input.type == "password"){
        input.type = "text";
        icono.classList.remove("ti-eye");
        icono.classList.add("ti-eye-off");
    } else {
        input.type = "password";
        icono.classList.remove("ti-eye-off");
        icono.classList.add("ti-eye");
    }
}
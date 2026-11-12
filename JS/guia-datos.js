// Datos e índices
let datosProyectos = [];
let textos = {};
let fasesInfo = {};
let completadas = new Set();

function reconstruirIndices() {
    textos = {};
    fasesInfo = {};
    completadas = new Set();

    datosProyectos.forEach(function (proyecto) {
        (proyecto.fases || []).forEach(function (fase) {
            const tareas = fase.tareas || [];
            textos[fase.id] = fase.nombre;
            fasesInfo[fase.id] = { proyectoId: proyecto.id, tareaIds: tareas.map(t => t.id) };

            tareas.forEach(function (tarea) {
                textos[tarea.id] = tarea.descripcion;
                if (tarea.completada) completadas.add(tarea.id);
            });
        });
    });
}

// Trae proyectos con fases y tareas anidadas. Devuelve true si salió bien
async function cargarDatos() {
    const { data, error } = await clienteSupabase
        .from("proyectos")
        .select("id, nombre, avisado_en_guia, visto_en_guia, fases(id, nombre, orden, tareas(id, descripcion, completada, orden))")
        .order("creado_en", { ascending: false });

    if (error) return false;

    datosProyectos = data;
    reconstruirIndices();
    return true;
}

async function actualizarAvisoProyectosEnSupabase() {
    return clienteSupabase
        .from("proyectos")
        .update({ avisado_en_guia: true })
        .eq("avisado_en_guia", false);
}

async function guardarProyectoVisto(id) {
    const { error } = await clienteSupabase
        .from("proyectos")
        .update({ visto_en_guia: true })
        .eq("id", id);

    if (error) {
        console.error("No se pudo guardar que el proyecto ya se vio:", error);
    }
}

// Cambios locales en la caché (para que la pantalla no parpadee con datos viejos)
function aplicarNombreEnCache(id, texto) {
    datosProyectos.forEach(function (proyecto) {
        (proyecto.fases || []).forEach(function (fase) {
            if (fase.id === id) fase.nombre = texto;
            (fase.tareas || []).forEach(function (tarea) {
                if (tarea.id === id) tarea.descripcion = texto;
            });
        });
    });
    textos[id] = texto;
}

function quitarDeCache(faseId, eliminarFase, ids) {
    datosProyectos.forEach(function (proyecto) {
        if (eliminarFase) {
            proyecto.fases = (proyecto.fases || []).filter(f => f.id !== faseId);
        } else {
            (proyecto.fases || []).forEach(function (fase) {
                fase.tareas = (fase.tareas || []).filter(t => !ids.includes(t.id));
            });
        }
    });
    reconstruirIndices();
}

function contarTareasCompletadas(ids) {
    return ids.filter(id => completadas.has(id)).length;
}

// Persistencia
async function guardarNombreEnSupabase(id, texto, esFase) {
    try {
        const { data, error } = await clienteSupabase
            .from(esFase ? "fases" : "tareas")
            .update({ [esFase ? "nombre" : "descripcion"]: texto })
            .eq("id", id)
            .select("id");

        if (error) return { id: id, ok: false, motivo: error.message };
        // Si no se actualizó ninguna fila, el elemento ya no existe (borrado en otro dispositivo)
        if (!data || data.length === 0) return { id: id, ok: false, motivo: "ya no existe" };
        return { id: id, ok: true };
    } catch {
        // Un fallo individual no impide intentar guardar los demás cambios.
        return { id: id, ok: false, motivo: "sin conexión" };
    }
}

async function eliminarEnSupabase(faseId, eliminarFase, ids) {
    let error = null;

    try {
        if (eliminarFase) {
            const resTareas = await clienteSupabase.from("tareas").delete().eq("fase_id", faseId);
            error = resTareas.error;

            if (!error) {
                const resFase = await clienteSupabase.from("fases").delete().eq("id", faseId);
                error = resFase.error;
            }
        } else if (ids.length > 0) {
            const resTareas = await clienteSupabase.from("tareas").delete().in("id", ids);
            error = resTareas.error;
        }
    } catch (e) {
        error = e;
    }

    return error;
}

async function guardarEstadoTareaEnSupabase(id, completada) {
    return clienteSupabase
        .from("tareas")
        .update({
            completada: completada,
            completada_en: completada ? new Date().toISOString() : null
        })
        .eq("id", id);
}

async function crearFaseEnSupabase(proyectoId, nombre) {
    // El orden de la nueva fase = el último orden del proyecto + 1
    // (así no se repite aunque después se borren fases)
    const { data: ultimaFase } = await clienteSupabase
        .from("fases")
        .select("orden")
        .eq("proyecto_id", proyectoId)
        .order("orden", { ascending: false })
        .limit(1);

    const siguienteOrdenFase = ultimaFase && ultimaFase.length > 0 ? ultimaFase[0].orden + 1 : 0;

    return clienteSupabase.from("fases").insert({
        proyecto_id: proyectoId,
        nombre: nombre,
        orden: siguienteOrdenFase
    });
}

async function crearTareaEnSupabase(faseId, descripcion) {
    // El orden de la nueva tarea = el último orden de la fase + 1
    // (así no se repite aunque después se borren tareas)
    const { data: ultima } = await clienteSupabase
        .from("tareas")
        .select("orden")
        .eq("fase_id", faseId)
        .order("orden", { ascending: false })
        .limit(1);

    const siguienteOrden = ultima && ultima.length > 0 ? ultima[0].orden + 1 : 0;

    return clienteSupabase.from("tareas").insert({
        fase_id: faseId,
        descripcion: descripcion,
        completada: false,
        orden: siguienteOrden
    });
}

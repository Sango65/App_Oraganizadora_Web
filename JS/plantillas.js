const PLANTILLAS = {
    // tipos generales
    resumen: {
        nombre:"Resumen",
        fases: [
            {nombre: "Lectura", tareas: ["Leer el texto completo", "Subrayar las ideas principales"]},
            {nombre: "Redacción", tareas: ["Escribir el borrador con tus propias palabras", "Revisar ortografía y extensión"]}
        ]
    },

    exposicion: {
        nombre: "Exposición",
        fases: [
            {nombre: "Planeación", tareas: ["Definir los puntos clave", "Repartir los temas entre el equipo"]},
            {nombre: "Material", tareas: ["Hacer las diapositivas", "Preparar notas de apoyo"]},
            {nombre: "Presentación", tareas: ["Ensayar con tiempo", "Revisar equipo y materiales", "Exponer"]}
        ]
    },

    reporte_tecnico: {
        nombre: "Reporte tecnico",
        fases: [
            {nombre: "Planeación", tareas: ["Definir el objetivo del reporte", "Reunir datos y fuentes"]},
            {nombre: "Desarrollo", tareas: ["Redactar el marco teórico", "Describir la metodología", "Presentar los resultados"]},
            {nombre: "Cierre", tareas: ["Redactar las conclusiones", "Revisar formato y entregar"]}
        ]
    },

    // Submenu de proyecto integrador
    integrador_tecnologico: {
        nombre: "Tecnológico",
        fases: [
            {nombre: "Análisis", tareas: ["Definir el problema", "Identificar a los usuarios", "Acordar el alcance"]},
            {nombre: "Diseño", tareas: ["Hacer bocetos o diagramas", "Elegir las herramientas"]},
            {nombre: "Desarrollo", tareas: ["Construir el prototipo", "Probar y corregir errores"]},
            {nombre: "Entrega", tareas: ["Redactar la documentación", "Preparar la presentación"]}
        ]
    },

    integrador_automatizacion: {
        nombre: "Automatización e ingeniería",
        fases: [
            { nombre: "Diseño", tareas: ["Definir los requerimientos", "Hacer planos o diagramas", "Seleccionar componentes"] },
            { nombre: "Prototipo o simulación", tareas: ["Construir o simular el prototipo", "Integrar los componentes"] },
            { nombre: "Pruebas", tareas: ["Probar el funcionamiento", "Corregir fallas y ajustar"] },
            { nombre: "Documentación", tareas: ["Elaborar el manual o reporte", "Preparar la presentación"] }
        ]
    },

    integrador_mejora_procesos: {
        nombre: "Mejora de procesos",
        fases: [
            { nombre: "Diagnóstico", tareas: ["Describir el proceso actual", "Recolectar datos", "Identificar el problema y su causa"] },
            { nombre: "Propuesta", tareas: ["Plantear alternativas de mejora", "Elegir la mejor propuesta"] },
            { nombre: "Implementación", tareas: ["Aplicar la mejora o una prueba piloto"] },
            { nombre: "Resultados", tareas: ["Comparar antes y después", "Redactar conclusiones y recomendaciones"] }
        ]
    },

    integrador_plan_negocios: {
        nombre: "Plan de negocios",
        fases: [
            { nombre: "Idea", tareas: ["Definir el problema y el cliente", "Investigar a la competencia"] },
            { nombre: "Estudio de mercado", tareas: ["Aplicar encuestas o entrevistas", "Analizar los resultados"] },
            { nombre: "Plan financiero", tareas: ["Calcular costos y precio", "Estimar ingresos y punto de equilibrio"] },
            { nombre: "Presentación", tareas: ["Armar el pitch", "Preparar el prototipo o la muestra"] }
        ]
    },

    integrador_experimental: {
        nombre: "Experimental / laboratorio",
        fases: [
            { nombre: "Planteamiento", tareas: ["Formular la hipótesis", "Definir variables y materiales"] },
            { nombre: "Experimento", tareas: ["Realizar el experimento", "Registrar los datos"] },
            { nombre: "Resultados", tareas: ["Analizar los datos", "Comparar con la hipótesis"] },
            { nombre: "Conclusiones", tareas: ["Redactar las conclusiones", "Elaborar el reporte final"] }
        ]
    }
}

// NUBELO APP · VORTEX WEB
"use strict";

/* =====================================================================
   CONFIGURACIÓN
   ===================================================================== */
const API_GEOCODIFICACION = "https://geocoding-api.open-meteo.com/v1/search";
const API_CLIMA = "https://api.open-meteo.com/v1/forecast";
const API_AIRE = "https://air-quality-api.open-meteo.com/v1/air-quality";

const CLAVES = {
    ultima: "nubelo:ultima-ciudad",
    unidades: "nubelo:unidades",
    favoritos: "nubelo:favoritos"
};

const REFRESCO_MS = 10 * 60 * 1000; // actualización automática cada 10 min
const HORAS_PRONOSTICO = 24;
const HORAS_ALERTAS = 48;
const ANCHO_COLUMNA = 64; // debe coincidir con .hora en el CSS
const MAX_FAVORITOS = 6;

// Códigos WMO de Open-Meteo: [descripción, icono de día, icono de noche]
const CODIGOS_CLIMA = {
    0: ["Despejado", "☀️", "🌙"],
    1: ["Mayormente despejado", "🌤️", "🌙"],
    2: ["Parcialmente nublado", "⛅", "☁️"],
    3: ["Nublado", "☁️", "☁️"],
    45: ["Niebla", "🌫️", "🌫️"],
    48: ["Niebla con escarcha", "🌫️", "🌫️"],
    51: ["Llovizna ligera", "🌦️", "🌧️"],
    53: ["Llovizna moderada", "🌦️", "🌧️"],
    55: ["Llovizna intensa", "🌧️", "🌧️"],
    56: ["Llovizna helada ligera", "🌧️", "🌧️"],
    57: ["Llovizna helada intensa", "🌧️", "🌧️"],
    61: ["Lluvia ligera", "🌦️", "🌧️"],
    63: ["Lluvia moderada", "🌧️", "🌧️"],
    65: ["Lluvia fuerte", "🌧️", "🌧️"],
    66: ["Lluvia helada ligera", "🌧️", "🌧️"],
    67: ["Lluvia helada fuerte", "🌧️", "🌧️"],
    71: ["Nevada ligera", "🌨️", "🌨️"],
    73: ["Nevada moderada", "🌨️", "🌨️"],
    75: ["Nevada fuerte", "❄️", "❄️"],
    77: ["Granizo fino", "🌨️", "🌨️"],
    80: ["Chubascos ligeros", "🌦️", "🌧️"],
    81: ["Chubascos moderados", "🌧️", "🌧️"],
    82: ["Chubascos violentos", "⛈️", "⛈️"],
    85: ["Chubascos de nieve ligeros", "🌨️", "🌨️"],
    86: ["Chubascos de nieve fuertes", "❄️", "❄️"],
    95: ["Tormenta eléctrica", "⛈️", "⛈️"],
    96: ["Tormenta con granizo ligero", "⛈️", "⛈️"],
    99: ["Tormenta con granizo fuerte", "⛈️", "⛈️"]
};

const CODIGOS_TORMENTA = [95, 96, 99];
const CODIGOS_NIEVE = [71, 73, 75, 77, 85, 86];
const CODIGOS_LLUVIA_HELADA = [56, 57, 66, 67];
const ETIQUETAS_NIVEL = { 1: "Precaución", 2: "Alerta", 3: "Peligro" };

/* =====================================================================
   ESTADO Y ELEMENTOS DEL DOM
   ===================================================================== */
const $ = (selector) => document.querySelector(selector);

const ui = {
    formulario: $("#formulario-busqueda"),
    campoCiudad: $("#ciudad"),
    botonBuscar: $("#boton-buscar"),
    botonUbicacion: $("#boton-ubicacion"),
    botonUnidades: $("#boton-unidades"),
    sugerencias: $("#sugerencias"),
    favoritos: $("#favoritos"),

    mensaje: $("#mensaje"),
    mensajeIcono: $("#mensaje-icono"),
    mensajeTitulo: $("#mensaje-titulo"),
    mensajeTexto: $("#mensaje-texto"),
    panelClima: $("#panel-clima"),

    alertasResumen: $("#alertas-resumen"),
    listaAlertas: $("#lista-alertas"),

    nombreCiudad: $("#nombre-ciudad"),
    ubicacion: $("#ubicacion"),
    botonFavorito: $("#boton-favorito"),
    botonActualizar: $("#boton-actualizar"),
    iconoClima: $("#icono-clima"),
    temperatura: $("#temperatura"),
    unidadTemp: $("#unidad-temp"),
    descripcion: $("#descripcion-clima"),
    sensacion: $("#sensacion"),
    maxMin: $("#maxmin"),
    resumenLluvia: $("#resumen-lluvia"),
    estadoActualizacion: $("#estado-actualizacion"),

    horasInterior: $("#horas-interior"),
    listaDias: $("#lista-dias"),
    detalles: $("#detalles")
};

const estado = {
    ciudad: null,
    datos: null,
    aire: null,
    consultadoEn: 0,
    unidades: "metric",
    controlador: null
};

/* =====================================================================
   UTILIDADES
   ===================================================================== */
function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined && texto !== null) elemento.textContent = texto; // textContent: seguro ante datos externos
    return elemento;
}

function leerJSON(clave, porDefecto) {
    try {
        const valor = localStorage.getItem(clave);
        return valor === null ? porDefecto : JSON.parse(valor);
    } catch (_) {
        return porDefecto;
    }
}

function guardarJSON(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch (_) {
        // Modo privado o almacenamiento bloqueado: se ignora
    }
}

function num(valor, decimales = 0) {
    if (valor === null || valor === undefined || !Number.isFinite(valor)) return "--";
    const redondeado = Number(valor.toFixed(decimales));
    return String(Object.is(redondeado, -0) ? 0 : redondeado);
}

function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* ----- Unidades (los datos siempre se piden en métrico y se convierten al mostrarlos) ----- */
const esMetrico = () => estado.unidades === "metric";

const conv = {
    temp: (c) => (esMetrico() ? c : (c * 9) / 5 + 32),
    viento: (kmh) => (esMetrico() ? kmh : kmh * 0.621371),
    lluvia: (mm) => (esMetrico() ? mm : mm / 25.4),
    distancia: (m) => (esMetrico() ? m / 1000 : m / 1609.344)
};

const uni = {
    temp: () => (esMetrico() ? "°C" : "°F"),
    viento: () => (esMetrico() ? "km/h" : "mph"),
    lluvia: () => (esMetrico() ? "mm" : "in"),
    distancia: () => (esMetrico() ? "km" : "mi")
};

const fmtTemp = (c) => `${num(conv.temp(c))}°`;
const fmtViento = (kmh) => `${num(conv.viento(kmh))} ${uni.viento()}`;
const fmtLluvia = (mm) => `${num(conv.lluvia(mm), esMetrico() ? (mm >= 10 ? 0 : 1) : 2)} ${uni.lluvia()}`;
const fmtDistancia = (m) => `${num(conv.distancia(m), 1)} ${uni.distancia()}`;

/* ----- Tiempo ----- */
function horaDe(iso) {
    return iso ? iso.slice(11, 16) : "--:--";
}

function diasEntre(fechaA, fechaB) {
    const [ya, ma, da] = fechaA.split("-").map(Number);
    const [yb, mb, db] = fechaB.split("-").map(Number);
    return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

function nombreDia(fecha, formato) {
    const [a, m, d] = fecha.split("-").map(Number);
    return capitalizar(new Date(a, m - 1, d).toLocaleDateString("es", { weekday: formato }));
}

// Devuelve una frase como "hoy a las 17:00" o "mañana a las 03:00"
function cuandoTexto(iso, datos) {
    const ahora = datos.current.time;
    if (iso.slice(0, 13) === ahora.slice(0, 13)) return "en este momento";
    const diferencia = diasEntre(ahora.slice(0, 10), iso.slice(0, 10));
    let dia;
    if (diferencia <= 0) dia = "hoy";
    else if (diferencia === 1) dia = "mañana";
    else dia = `el ${nombreDia(iso.slice(0, 10), "long").toLowerCase()}`;
    return `${dia} a las ${horaDe(iso)}`;
}

// Posición de la hora actual dentro de los arreglos "hourly"
function indiceHoraActual(datos) {
    const clave = datos.current.time.slice(0, 13);
    const indice = datos.hourly.time.findIndex((t) => t.startsWith(clave));
    return indice >= 0 ? indice : 0;
}

/* ----- Etiquetas de clasificación ----- */
function infoClima(codigo, esDia) {
    const [descripcion, iconoDia, iconoNoche] = CODIGOS_CLIMA[codigo] || ["Condición desconocida", "🌡️", "🌡️"];
    return { descripcion, icono: esDia ? iconoDia : iconoNoche };
}

function temaClima(codigo, esDia) {
    if (CODIGOS_TORMENTA.includes(codigo)) return "tormenta";
    if (CODIGOS_NIEVE.includes(codigo)) return "nieve";
    if (codigo === 45 || codigo === 48) return "niebla";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return "lluvia";
    if (codigo === 3) return "nublado";
    return esDia ? (codigo === 2 ? "nublado" : "despejado") : "noche";
}

function direccionViento(grados) {
    if (!Number.isFinite(grados)) return "--";
    return ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(grados / 45) % 8];
}

function etiquetaUV(valor) {
    if (valor < 3) return "Bajo";
    if (valor < 6) return "Moderado";
    if (valor < 8) return "Alto";
    if (valor < 11) return "Muy alto";
    return "Extremo";
}

function etiquetaAQI(valor) {
    if (valor <= 50) return "Buena";
    if (valor <= 100) return "Moderada";
    if (valor <= 150) return "Dañina para sensibles";
    if (valor <= 200) return "Dañina";
    if (valor <= 300) return "Muy dañina";
    return "Peligrosa";
}

/* =====================================================================
   RED
   ===================================================================== */
async function pedirJSON(url, senal, mensajeError) {
    const respuesta = await fetch(url, { signal: senal });
    if (!respuesta.ok) {
        throw new Error(mensajeError);
    }
    return respuesta.json();
}

function normalizarCiudad(resultado) {
    return {
        name: resultado.name,
        admin1: resultado.admin1 || "",
        country: resultado.country || "",
        latitude: resultado.latitude,
        longitude: resultado.longitude
    };
}

async function buscarCiudades(nombre, cantidad, senal) {
    const url = `${API_GEOCODIFICACION}?name=${encodeURIComponent(nombre)}&count=${cantidad}&language=es&format=json`;
    const datos = await pedirJSON(url, senal, "No fue posible consultar la ciudad.");
    // Open-Meteo omite "results" cuando no hay coincidencias
    return (datos.results || []).map(normalizarCiudad);
}

async function pedirClima(ciudad, senal) {
    const parametros = new URLSearchParams({
        latitude: ciudad.latitude,
        longitude: ciudad.longitude,
        current: [
            "temperature_2m", "relative_humidity_2m", "apparent_temperature", "is_day",
            "precipitation", "weather_code", "cloud_cover", "pressure_msl",
            "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"
        ].join(","),
        hourly: [
            "temperature_2m", "apparent_temperature", "precipitation_probability", "precipitation",
            "weather_code", "wind_gusts_10m", "cape", "visibility", "uv_index", "is_day"
        ].join(","),
        daily: [
            "weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum",
            "precipitation_probability_max", "wind_gusts_10m_max", "uv_index_max", "sunrise", "sunset"
        ].join(","),
        forecast_days: 7,
        timezone: "auto"
    });
    const datos = await pedirJSON(`${API_CLIMA}?${parametros}`, senal, "No fue posible consultar el clima.");
    if (!datos.current || !datos.hourly || !datos.daily) {
        throw new Error("La respuesta del clima llegó incompleta.");
    }
    return datos;
}

// La calidad del aire es complementaria: si falla, la app sigue funcionando
async function pedirAire(ciudad, senal) {
    try {
        const parametros = new URLSearchParams({
            latitude: ciudad.latitude,
            longitude: ciudad.longitude,
            current: "us_aqi,pm2_5,pm10",
            timezone: "auto"
        });
        return await pedirJSON(`${API_AIRE}?${parametros}`, senal, "Sin datos de calidad del aire.");
    } catch (error) {
        if (error.name === "AbortError") throw error;
        return null;
    }
}

/* =====================================================================
   MOTOR DE ALERTAS
   Reglas heurísticas sobre las próximas 48 h del modelo de pronóstico.
   No sustituyen a los avisos oficiales.
   ===================================================================== */
function extremo(arreglo, inicio, fin, modo) {
    let mejor = null;
    let indice = -1;
    for (let i = inicio; i < fin; i++) {
        const valor = arreglo[i];
        if (valor === null || valor === undefined) continue;
        if (mejor === null || (modo === "max" ? valor > mejor : valor < mejor)) {
            mejor = valor;
            indice = i;
        }
    }
    return { valor: mejor, indice };
}

function generarAlertas(datos, aire) {
    const h = datos.hourly;
    const d = datos.daily;
    const inicio = indiceHoraActual(datos);
    const fin = Math.min(inicio + HORAS_ALERTAS, h.time.length);
    const alertas = [];

    const agregar = (nivel, icono, titulo, detalle) => alertas.push({ nivel, icono, titulo, detalle });
    const cuando = (i) => cuandoTexto(h.time[i], datos);
    const primero = (condicion) => {
        for (let i = inicio; i < fin; i++) if (condicion(i)) return i;
        return -1;
    };

    // 1) Tormentas eléctricas: código del modelo o atmósfera inestable (CAPE) con lluvia probable
    const iTormenta = primero((i) => CODIGOS_TORMENTA.includes(h.weather_code[i]));
    if (iTormenta >= 0) {
        const conGranizo = h.weather_code[iTormenta] >= 96;
        agregar(
            conGranizo ? 3 : 2,
            "⛈️",
            conGranizo ? "Tormenta con granizo prevista" : "Tormenta eléctrica prevista",
            `El modelo anticipa tormenta ${cuando(iTormenta)}. Evita zonas abiertas, árboles aislados y cuerpos de agua, y busca refugio seguro.`
        );
    } else {
        let mejorCape = 0;
        let iCape = -1;
        for (let i = inicio; i < fin; i++) {
            const cape = h.cape?.[i] ?? 0;
            const prob = h.precipitation_probability?.[i] ?? 0;
            if (cape >= 1000 && prob >= 40 && cape > mejorCape) {
                mejorCape = cape;
                iCape = i;
            }
        }
        if (iCape >= 0) {
            agregar(
                mejorCape >= 2500 ? 2 : 1,
                "🌩️",
                "Riesgo de tormentas eléctricas",
                `Atmósfera inestable (CAPE ≈ ${num(mejorCape)} J/kg) con ${num(h.precipitation_probability[iCape])}% de probabilidad de lluvia ${cuando(iCape)}. Podrían formarse tormentas repentinas.`
            );
        }
    }

    // 2) Lluvia intensa por hora
    const lluvia = extremo(h.precipitation, inicio, fin, "max");
    if (lluvia.valor !== null && lluvia.valor >= 7.6) {
        agregar(
            lluvia.valor >= 30 ? 3 : lluvia.valor >= 15 ? 2 : 1,
            "🌧️",
            "Lluvia intensa",
            `Se esperan hasta ${fmtLluvia(lluvia.valor)} por hora ${cuando(lluvia.indice)}. Hay riesgo de encharcamientos y visibilidad reducida al conducir.`
        );
    }

    // 3) Lluvia acumulada alta en el día (riesgo de inundaciones locales)
    const acumulada = Math.max(d.precipitation_sum?.[0] ?? 0, d.precipitation_sum?.[1] ?? 0);
    if (acumulada >= 50) {
        agregar(
            acumulada >= 100 ? 3 : 2,
            "🌊",
            "Lluvias acumuladas elevadas",
            `Podrían acumularse hasta ${fmtLluvia(acumulada)} en un día. Riesgo de inundaciones locales, deslaves y crecidas de arroyos.`
        );
    }

    // 4) Viento fuerte (rachas)
    const viento = extremo(h.wind_gusts_10m, inicio, fin, "max");
    if (viento.valor !== null && viento.valor >= 50) {
        agregar(
            viento.valor >= 100 ? 3 : viento.valor >= 75 ? 2 : 1,
            "💨",
            "Rachas de viento fuertes",
            `Rachas de hasta ${fmtViento(viento.valor)} ${cuando(viento.indice)}. Asegura objetos sueltos y evita zonas con árboles o anuncios.`
        );
    }

    // 5) Calor extremo (sensación térmica)
    const calor = extremo(h.apparent_temperature, inicio, fin, "max");
    if (calor.valor !== null && calor.valor >= 35) {
        agregar(
            calor.valor >= 45 ? 3 : calor.valor >= 40 ? 2 : 1,
            "🥵",
            "Calor intenso",
            `Sensación térmica de hasta ${fmtTemp(calor.valor)} ${cuando(calor.indice)}. Hidrátate, evita el sol directo y cuida a niños, mayores y mascotas.`
        );
    }

    // 6) Frío extremo / heladas
    const frio = extremo(h.temperature_2m, inicio, fin, "min");
    if (frio.valor !== null && frio.valor <= 0) {
        agregar(
            frio.valor <= -15 ? 3 : frio.valor <= -5 ? 2 : 1,
            "🥶",
            frio.valor <= -5 ? "Frío intenso" : "Riesgo de helada",
            `Temperatura mínima de ${fmtTemp(frio.valor)} ${cuando(frio.indice)}. Protege plantas, tuberías y personas vulnerables.`
        );
    }

    // 7) Nieve y lluvia helada
    const iNieve = primero((i) => CODIGOS_NIEVE.includes(h.weather_code[i]));
    if (iNieve >= 0) {
        const fuerte = [75, 86].includes(h.weather_code[iNieve]);
        agregar(
            fuerte ? 2 : 1,
            "❄️",
            fuerte ? "Nevada fuerte" : "Nevada prevista",
            `Se espera nieve ${cuando(iNieve)}. Puede haber carreteras resbalosas y menor visibilidad.`
        );
    }
    const iHielo = primero((i) => CODIGOS_LLUVIA_HELADA.includes(h.weather_code[i]));
    if (iHielo >= 0) {
        agregar(2, "🧊", "Lluvia helada", `Posible lluvia helada ${cuando(iHielo)}. Las superficies pueden cubrirse de hielo y volverse muy peligrosas.`);
    }

    // 8) Radiación UV
    const uv = extremo(h.uv_index, inicio, fin, "max");
    if (uv.valor !== null && uv.valor >= 8) {
        agregar(
            uv.valor >= 11 ? 2 : 1,
            "🕶️",
            uv.valor >= 11 ? "Radiación UV extrema" : "Radiación UV muy alta",
            `Índice UV de hasta ${num(uv.valor)} ${cuando(uv.indice)}. Usa protector solar, sombrero y evita el sol entre las 11 y las 16 h.`
        );
    }

    // 9) Visibilidad reducida (niebla)
    const visibilidad = extremo(h.visibility, inicio, fin, "min");
    if (visibilidad.valor !== null && visibilidad.valor < 1000) {
        agregar(
            visibilidad.valor < 200 ? 2 : 1,
            "🌫️",
            "Visibilidad reducida",
            `Visibilidad de solo ${fmtDistancia(visibilidad.valor)} ${cuando(visibilidad.indice)}. Conduce con precaución y luces bajas.`
        );
    }

    // 10) Calidad del aire
    const aqi = aire?.current?.us_aqi;
    if (Number.isFinite(aqi) && aqi > 150) {
        agregar(
            aqi > 300 ? 3 : aqi > 200 ? 2 : 1,
            "😷",
            `Calidad del aire ${etiquetaAQI(aqi).toLowerCase()}`,
            `Índice AQI actual de ${num(aqi)}. Reduce la actividad física al aire libre y considera usar cubrebocas.`
        );
    }

    return alertas.sort((a, b) => b.nivel - a.nivel);
}

// ¿Cuándo llueve a corto plazo?
function resumenLluvia(datos) {
    const h = datos.hourly;
    const inicio = indiceHoraActual(datos);
    const fin = Math.min(inicio + 12, h.time.length);

    if ((datos.current.precipitation ?? 0) >= 0.1) {
        return `🌧️ Lloviendo ahora (${fmtLluvia(datos.current.precipitation)})`;
    }
    for (let i = inicio; i < fin; i++) {
        const prob = h.precipitation_probability?.[i] ?? 0;
        if (prob >= 50 || (h.precipitation?.[i] ?? 0) >= 0.3) {
            return `🌧️ Lluvia probable ${cuandoTexto(h.time[i], datos)} (${num(prob)}%)`;
        }
    }
    return "☂️ Sin lluvia prevista en las próximas 12 h";
}

/* =====================================================================
   RENDERIZADO
   ===================================================================== */
function mostrarMensaje(icono, titulo, texto, tipo = "") {
    ui.mensajeIcono.textContent = icono;
    ui.mensajeTitulo.textContent = titulo;
    ui.mensajeTexto.textContent = texto;
    ui.mensaje.className = `mensaje-inicial ${tipo}`.trim();
    ui.mensaje.hidden = false;
    ui.panelClima.hidden = true;
}

function fijarCargando(cargando) {
    ui.botonBuscar.disabled = cargando;
    ui.botonBuscar.textContent = cargando ? "Buscando..." : "Buscar";
}

function renderAlertas(alertas) {
    ui.listaAlertas.replaceChildren();

    const nivelMaximo = alertas.length ? alertas[0].nivel : 0;
    ui.alertasResumen.className = `insignia ${nivelMaximo ? `nivel-${nivelMaximo}` : ""}`.trim();
    ui.alertasResumen.textContent = alertas.length
        ? `${alertas.length} ${alertas.length === 1 ? "aviso" : "avisos"}`
        : "Sin amenazas";

    if (!alertas.length) {
        const ok = crear("article", "alerta nivel-0");
        ok.append(crear("span", "alerta-icono", "✅"));
        const cuerpo = crear("div");
        cuerpo.append(
            crear("div", "alerta-titulo", "Sin amenazas detectadas"),
            crear("p", "alerta-detalle", "El modelo no prevé tormentas, lluvias intensas, vientos fuertes ni temperaturas extremas en las próximas 48 horas.")
        );
        ok.append(cuerpo);
        ui.listaAlertas.append(ok);
        return;
    }

    alertas.forEach((alerta) => {
        const item = crear("article", `alerta nivel-${alerta.nivel}`);
        item.append(crear("span", "alerta-icono", alerta.icono));

        const cuerpo = crear("div");
        const titulo = crear("div", "alerta-titulo");
        titulo.append(crear("span", "", alerta.titulo), crear("span", "alerta-etiqueta", ETIQUETAS_NIVEL[alerta.nivel]));
        cuerpo.append(titulo, crear("p", "alerta-detalle", alerta.detalle));

        item.append(cuerpo);
        ui.listaAlertas.append(item);
    });
}

function renderTarjeta(ciudad, datos) {
    const actual = datos.current;
    const diario = datos.daily;
    const esDia = actual.is_day === 1;
    const clima = infoClima(actual.weather_code, esDia);

    ui.nombreCiudad.textContent = ciudad.name;
    ui.ubicacion.textContent = ciudad.subtitulo || [ciudad.admin1, ciudad.country].filter(Boolean).join(", ");
    ui.iconoClima.textContent = clima.icono;
    ui.temperatura.textContent = num(conv.temp(actual.temperature_2m));
    ui.unidadTemp.textContent = uni.temp();
    ui.descripcion.textContent = clima.descripcion;
    ui.sensacion.textContent = fmtTemp(actual.apparent_temperature);
    ui.maxMin.textContent = `${fmtTemp(diario.temperature_2m_max[0])} / ${fmtTemp(diario.temperature_2m_min[0])}`;
    ui.resumenLluvia.textContent = resumenLluvia(datos);

    document.body.dataset.tema = temaClima(actual.weather_code, esDia);
    actualizarBotonFavorito();
    actualizarTextoConsulta();
}

function renderHoras(datos) {
    const h = datos.hourly;
    const inicio = indiceHoraActual(datos);
    const fin = Math.min(inicio + HORAS_PRONOSTICO, h.time.length);
    const indices = [];
    for (let i = inicio; i < fin; i++) indices.push(i);

    const ancho = indices.length * ANCHO_COLUMNA;
    ui.horasInterior.replaceChildren();
    ui.horasInterior.style.width = `${ancho}px`;

    // Curva de temperatura (SVG alineado con las columnas)
    let previa = 0;
    const temps = indices.map((i) => {
        const valor = h.temperature_2m[i];
        previa = valor === null || valor === undefined ? previa : valor;
        return conv.temp(previa);
    });
    const minimo = Math.min(...temps);
    const rango = Math.max(...temps) - minimo || 1;
    const alto = 64;
    const margen = 12;
    const puntos = temps.map((t, k) => [
        k * ANCHO_COLUMNA + ANCHO_COLUMNA / 2,
        margen + (1 - (t - minimo) / rango) * (alto - margen * 2)
    ]);

    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "grafico-temp");
    svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
    svg.setAttribute("width", ancho);
    svg.setAttribute("height", alto);
    svg.setAttribute("aria-hidden", "true");

    const linea = document.createElementNS(NS, "polyline");
    linea.setAttribute("class", "linea-temp");
    linea.setAttribute("points", puntos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" "));
    svg.append(linea);

    puntos.forEach(([x, y]) => {
        const punto = document.createElementNS(NS, "circle");
        punto.setAttribute("class", "punto-grafico");
        punto.setAttribute("cx", x.toFixed(1));
        punto.setAttribute("cy", y.toFixed(1));
        punto.setAttribute("r", "3.5");
        svg.append(punto);
    });
    ui.horasInterior.append(svg);

    // Columnas por hora
    const lista = crear("ol", "horas-lista");
    indices.forEach((i, k) => {
        const clima = infoClima(h.weather_code[i], h.is_day[i] === 1);
        const prob = Math.min(100, Math.max(0, h.precipitation_probability?.[i] ?? 0));

        const columna = crear("li", "hora");
        columna.append(
            crear("span", "hora-nombre", k === 0 ? "Ahora" : horaDe(h.time[i])),
            crear("span", "hora-icono", clima.icono),
            crear("span", "hora-temp", `${num(temps[k])}°`)
        );
        columna.querySelector(".hora-icono").title = clima.descripcion;

        const barra = crear("div", "barra-lluvia");
        const relleno = crear("div");
        relleno.style.height = `${prob}%`;
        barra.append(relleno);
        columna.append(barra, crear("span", "hora-prob", `${num(prob)}%`));

        lista.append(columna);
    });
    ui.horasInterior.append(lista);
}

function renderDias(datos) {
    const d = datos.daily;
    const minimos = d.temperature_2m_min.map((v) => conv.temp(v));
    const maximos = d.temperature_2m_max.map((v) => conv.temp(v));
    const globalMin = Math.min(...minimos);
    const rango = Math.max(...maximos) - globalMin || 1;

    ui.listaDias.replaceChildren();
    d.time.forEach((fecha, i) => {
        const clima = infoClima(d.weather_code[i], true);
        const fila = crear("div", "dia");

        const etiqueta = i === 0 ? "Hoy" : i === 1 ? "Mañana" : nombreDia(fecha, "short");
        const icono = crear("span", "dia-icono", clima.icono);
        icono.title = clima.descripcion;

        const rangoBarra = crear("div", "dia-rango");
        const barra = crear("div", "dia-barra");
        barra.style.left = `${((minimos[i] - globalMin) / rango) * 100}%`;
        barra.style.width = `${Math.max(6, ((maximos[i] - minimos[i]) / rango) * 100)}%`;
        rangoBarra.append(barra);

        fila.append(
            crear("span", "dia-nombre", etiqueta),
            icono,
            crear("span", "dia-lluvia", `💧 ${num(d.precipitation_probability_max?.[i] ?? 0)}%`),
            crear("span", "dia-min", `${num(minimos[i])}°`),
            rangoBarra,
            crear("span", "dia-max", `${num(maximos[i])}°`)
        );
        ui.listaDias.append(fila);
    });
}

function renderDetalles(datos, aire) {
    const actual = datos.current;
    const h = datos.hourly;
    const d = datos.daily;
    const i = indiceHoraActual(datos);
    const tarjetas = [];

    // Viento con flecha que apunta hacia donde sopla
    tarjetas.push({
        icono: "🌬️", etiqueta: "Viento", valor: fmtViento(actual.wind_speed_10m),
        nota: `${direccionViento(actual.wind_direction_10m)} · rachas ${fmtViento(actual.wind_gusts_10m)}`,
        grados: actual.wind_direction_10m
    });
    tarjetas.push({ icono: "💧", etiqueta: "Humedad", valor: `${num(actual.relative_humidity_2m)}%`, nota: `Nubosidad ${num(actual.cloud_cover)}%` });
    tarjetas.push({ icono: "🧭", etiqueta: "Presión", valor: `${num(actual.pressure_msl)} hPa`, nota: "Nivel del mar" });

    const uvAhora = h.uv_index?.[i];
    tarjetas.push({
        icono: "☀️", etiqueta: "Índice UV", valor: num(uvAhora, 1),
        nota: `${Number.isFinite(uvAhora) ? etiquetaUV(uvAhora) : "--"} · máx. hoy ${num(d.uv_index_max?.[0], 1)}`
    });

    const visibilidad = h.visibility?.[i];
    tarjetas.push({
        icono: "👁️", etiqueta: "Visibilidad",
        valor: Number.isFinite(visibilidad) ? fmtDistancia(visibilidad) : "--",
        nota: Number.isFinite(visibilidad) && visibilidad < 1000 ? "Reducida" : "Buena"
    });

    const aqi = aire?.current?.us_aqi;
    tarjetas.push({
        icono: "🍃", etiqueta: "Calidad del aire", valor: Number.isFinite(aqi) ? `AQI ${num(aqi)}` : "No disponible",
        nota: Number.isFinite(aqi) ? `${etiquetaAQI(aqi)} · PM2.5 ${num(aire.current.pm2_5)} µg/m³` : "Sin estación cercana"
    });

    tarjetas.push({
        icono: "🌅", etiqueta: "Amanecer / Atardecer",
        valor: `${horaDe(d.sunrise?.[0])} / ${horaDe(d.sunset?.[0])}`, nota: "Hora local"
    });

    ui.detalles.replaceChildren();
    tarjetas.forEach((t) => {
        const tarjeta = crear("div", "detalle");
        tarjeta.append(crear("span", "detalle-icono", t.icono), crear("span", "etiqueta", t.etiqueta));

        const valor = crear("strong");
        if (Number.isFinite(t.grados)) {
            const flecha = crear("span", "flecha-viento", "↑");
            flecha.style.transform = `rotate(${t.grados + 180}deg)`; // el viento "viene de" t.grados
            flecha.setAttribute("aria-hidden", "true");
            valor.append(flecha, ` ${t.valor}`);
        } else {
            valor.textContent = t.valor;
        }
        tarjeta.append(valor, crear("span", "detalle-nota", t.nota));
        ui.detalles.append(tarjeta);
    });
}

function render() {
    const { ciudad, datos, aire } = estado;
    if (!ciudad || !datos) return;

    renderAlertas(generarAlertas(datos, aire));
    renderTarjeta(ciudad, datos);
    renderHoras(datos);
    renderDias(datos);
    renderDetalles(datos, aire);

    ui.mensaje.hidden = true;
    ui.panelClima.hidden = false;
}

function actualizarTextoConsulta() {
    if (!estado.datos) return;
    const minutos = Math.floor((Date.now() - estado.consultadoEn) / 60000);
    const hace = minutos < 1 ? "hace un momento" : `hace ${minutos} min`;
    ui.estadoActualizacion.textContent = `Actualizado ${hace} · Hora local del lugar: ${horaDe(estado.datos.current.time)}`;
}

/* =====================================================================
   FLUJO PRINCIPAL
   ===================================================================== */
async function cargarCiudad(ciudad, { silencioso = false } = {}) {
    if (estado.controlador) estado.controlador.abort();
    estado.controlador = new AbortController();
    const { signal } = estado.controlador;

    if (!silencioso) {
        mostrarMensaje("☁️", "Consultando el cielo...", `Analizando el clima y las alertas de ${ciudad.name}`, "es-cargando");
        fijarCargando(true);
    } else {
        ui.botonActualizar.classList.add("girando");
    }

    try {
        const [datos, aire] = await Promise.all([pedirClima(ciudad, signal), pedirAire(ciudad, signal)]);

        estado.ciudad = ciudad;
        estado.datos = datos;
        estado.aire = aire;
        estado.consultadoEn = Date.now();

        render();
        guardarJSON(CLAVES.ultima, ciudad);
    } catch (error) {
        if (error.name === "AbortError") return; // Una consulta más reciente tomó el control

        if (silencioso && estado.datos) {
            ui.estadoActualizacion.textContent = "No se pudo actualizar. Se muestran los últimos datos disponibles.";
            return;
        }
        const sinConexion = error instanceof TypeError;
        mostrarMensaje("⚠️", "Algo salió mal", sinConexion ? "Revisa tu conexión a internet e intenta de nuevo." : error.message, "es-error");
        console.error("Nubelo:", error);
    } finally {
        if (!signal.aborted) {
            fijarCargando(false);
            ui.botonActualizar.classList.remove("girando");
        }
    }
}

async function buscarPorNombre(nombre) {
    ocultarSugerencias();

    if (estado.controlador) estado.controlador.abort();
    estado.controlador = new AbortController();
    const { signal } = estado.controlador;

    mostrarMensaje("🔍", "Buscando ciudad...", `Localizando "${nombre}"`, "es-cargando");
    fijarCargando(true);

    try {
        const ciudades = await buscarCiudades(nombre, 5, signal);
        if (!ciudades.length) {
            mostrarMensaje("🔍", "Ciudad no encontrada", `No encontramos "${nombre}". Revisa el nombre e intenta de nuevo.`, "es-error");
            fijarCargando(false);
            return;
        }
        await cargarCiudad(ciudades[0]);
    } catch (error) {
        if (error.name === "AbortError") return;
        const sinConexion = error instanceof TypeError;
        mostrarMensaje("⚠️", "Algo salió mal", sinConexion ? "Revisa tu conexión a internet e intenta de nuevo." : error.message, "es-error");
        fijarCargando(false);
        console.error("Nubelo:", error);
    }
}

function usarMiUbicacion() {
    if (!("geolocation" in navigator)) {
        mostrarMensaje("📍", "Ubicación no disponible", "Tu navegador no permite obtener la ubicación.", "es-error");
        return;
    }
    mostrarMensaje("📍", "Buscando tu ubicación...", "Acepta el permiso del navegador para continuar.", "es-cargando");

    navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
            cargarCiudad({
                name: "Mi ubicación",
                admin1: "",
                country: "",
                subtitulo: `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
                latitude: coords.latitude,
                longitude: coords.longitude
            });
            ui.campoCiudad.value = "";
        },
        (error) => {
            const textos = {
                1: "Permiso denegado. Actívalo en tu navegador o busca la ciudad por nombre.",
                2: "No se pudo determinar tu ubicación. Busca la ciudad por nombre.",
                3: "Se agotó el tiempo para obtener tu ubicación. Intenta de nuevo."
            };
            mostrarMensaje("📍", "No pudimos ubicarte", textos[error.code] || textos[2], "es-error");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
}

/* =====================================================================
   SUGERENCIAS DE CIUDADES
   ===================================================================== */
let temporizadorSugerencias = null;
let controladorSugerencias = null;

function ocultarSugerencias() {
    ui.sugerencias.hidden = true;
    ui.sugerencias.replaceChildren();
    ui.campoCiudad.setAttribute("aria-expanded", "false");
}

function mostrarSugerencias(ciudades) {
    ui.sugerencias.replaceChildren();
    if (!ciudades.length) {
        ocultarSugerencias();
        return;
    }
    ciudades.forEach((ciudad) => {
        const item = crear("li");
        item.setAttribute("role", "presentation");

        const boton = crear("button", "sugerencia");
        boton.type = "button";
        boton.setAttribute("role", "option");
        boton.append(
            crear("span", "", ciudad.name),
            crear("small", "", [ciudad.admin1, ciudad.country].filter(Boolean).join(", "))
        );
        boton.addEventListener("click", () => seleccionarCiudad(ciudad));

        item.append(boton);
        ui.sugerencias.append(item);
    });
    ui.sugerencias.hidden = false;
    ui.campoCiudad.setAttribute("aria-expanded", "true");
}

async function pedirSugerencias(texto) {
    if (controladorSugerencias) controladorSugerencias.abort();
    controladorSugerencias = new AbortController();
    try {
        const ciudades = await buscarCiudades(texto, 6, controladorSugerencias.signal);
        mostrarSugerencias(ciudades);
    } catch (error) {
        if (error.name !== "AbortError") ocultarSugerencias();
    }
}

function seleccionarCiudad(ciudad) {
    ui.campoCiudad.value = ciudad.name;
    ocultarSugerencias();
    cargarCiudad(ciudad);
}

/* =====================================================================
   FAVORITOS Y UNIDADES
   ===================================================================== */
const idCiudad = (c) => `${Number(c.latitude).toFixed(2)},${Number(c.longitude).toFixed(2)}`;
const leerFavoritos = () => leerJSON(CLAVES.favoritos, []).filter((c) => c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
const esFavorita = (c) => leerFavoritos().some((f) => idCiudad(f) === idCiudad(c));

function actualizarBotonFavorito() {
    const activa = estado.ciudad ? esFavorita(estado.ciudad) : false;
    ui.botonFavorito.textContent = activa ? "★" : "☆";
    ui.botonFavorito.setAttribute("aria-pressed", String(activa));
    ui.botonFavorito.title = activa ? "Quitar de favoritos" : "Guardar en favoritos";
    ui.botonFavorito.setAttribute("aria-label", ui.botonFavorito.title);
}

function alternarFavorito() {
    if (!estado.ciudad) return;
    let favoritos = leerFavoritos();
    if (esFavorita(estado.ciudad)) {
        favoritos = favoritos.filter((f) => idCiudad(f) !== idCiudad(estado.ciudad));
    } else {
        favoritos.push(estado.ciudad);
        favoritos = favoritos.slice(-MAX_FAVORITOS);
    }
    guardarJSON(CLAVES.favoritos, favoritos);
    renderFavoritos();
    actualizarBotonFavorito();
}

function renderFavoritos() {
    const favoritos = leerFavoritos();
    ui.favoritos.replaceChildren();
    ui.favoritos.hidden = favoritos.length === 0;

    favoritos.forEach((ciudad) => {
        const chip = crear("span", "chip");

        const abrir = crear("button", "chip-ciudad", `⭐ ${ciudad.name}`);
        abrir.type = "button";
        abrir.addEventListener("click", () => {
            ui.campoCiudad.value = ciudad.name === "Mi ubicación" ? "" : ciudad.name;
            cargarCiudad(ciudad);
        });

        const quitar = crear("button", "chip-quitar", "×");
        quitar.type = "button";
        quitar.setAttribute("aria-label", `Quitar ${ciudad.name} de favoritos`);
        quitar.addEventListener("click", () => {
            guardarJSON(CLAVES.favoritos, leerFavoritos().filter((f) => idCiudad(f) !== idCiudad(ciudad)));
            renderFavoritos();
            actualizarBotonFavorito();
        });

        chip.append(abrir, quitar);
        ui.favoritos.append(chip);
    });
}

function actualizarEtiquetaUnidades() {
    ui.botonUnidades.textContent = esMetrico() ? "°C · km/h" : "°F · mph";
}

function alternarUnidades() {
    estado.unidades = esMetrico() ? "imperial" : "metric";
    guardarJSON(CLAVES.unidades, estado.unidades);
    actualizarEtiquetaUnidades();
    render(); // solo se reformatea: no hace falta volver a consultar la API
}

/* =====================================================================
   EVENTOS
   ===================================================================== */
ui.formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nombre = ui.campoCiudad.value.trim();

    if (nombre === "") {
        mostrarMensaje("✍️", "Falta la ciudad", "¡Por favor, escribe el nombre de una ciudad!", "es-error");
        ui.campoCiudad.focus();
        return;
    }
    buscarPorNombre(nombre);
});

ui.campoCiudad.addEventListener("input", () => {
    clearTimeout(temporizadorSugerencias);
    const texto = ui.campoCiudad.value.trim();
    if (texto.length < 2) {
        ocultarSugerencias();
        return;
    }
    temporizadorSugerencias = setTimeout(() => pedirSugerencias(texto), 300);
});

ui.campoCiudad.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowDown") {
        const primera = ui.sugerencias.querySelector(".sugerencia");
        if (primera) {
            evento.preventDefault();
            primera.focus();
        }
    } else if (evento.key === "Escape") {
        ocultarSugerencias();
    }
});

ui.sugerencias.addEventListener("keydown", (evento) => {
    const actual = document.activeElement;
    if (evento.key === "ArrowDown") {
        evento.preventDefault();
        actual.parentElement.nextElementSibling?.querySelector(".sugerencia")?.focus();
    } else if (evento.key === "ArrowUp") {
        evento.preventDefault();
        const anterior = actual.parentElement.previousElementSibling?.querySelector(".sugerencia");
        (anterior || ui.campoCiudad).focus();
    } else if (evento.key === "Escape") {
        ocultarSugerencias();
        ui.campoCiudad.focus();
    }
});

document.addEventListener("click", (evento) => {
    if (!evento.target.closest(".buscador-caja")) ocultarSugerencias();
});

ui.botonUbicacion.addEventListener("click", usarMiUbicacion);
ui.botonUnidades.addEventListener("click", alternarUnidades);
ui.botonFavorito.addEventListener("click", alternarFavorito);
ui.botonActualizar.addEventListener("click", () => {
    if (estado.ciudad) cargarCiudad(estado.ciudad, { silencioso: true });
});

// Actualización automática y contador de "hace X min"
setInterval(() => {
    if (!estado.ciudad || document.hidden) return;
    actualizarTextoConsulta();
    if (Date.now() - estado.consultadoEn >= REFRESCO_MS) {
        cargarCiudad(estado.ciudad, { silencioso: true });
    }
}, 60000);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && estado.ciudad && Date.now() - estado.consultadoEn >= REFRESCO_MS) {
        cargarCiudad(estado.ciudad, { silencioso: true });
    }
});

/* =====================================================================
   INICIO
   ===================================================================== */
estado.unidades = leerJSON(CLAVES.unidades, "metric") === "imperial" ? "imperial" : "metric";
actualizarEtiquetaUnidades();
renderFavoritos();

const ultimaCiudad = leerJSON(CLAVES.ultima, null);
if (ultimaCiudad && Number.isFinite(ultimaCiudad.latitude) && Number.isFinite(ultimaCiudad.longitude)) {
    ui.campoCiudad.value = ultimaCiudad.name === "Mi ubicación" ? "" : ultimaCiudad.name;
    cargarCiudad(ultimaCiudad);
}

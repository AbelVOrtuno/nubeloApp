# Nubelo App

Aplicación web de consulta del clima desarrollada con HTML, CSS y JavaScript puro. Permite buscar ciudades, ver condiciones actuales, pronósticos y alertas meteorológicas usando las APIs públicas de [Open-Meteo](https://open-meteo.com/).

## Características

- **Búsqueda de ciudades** con autocompletado/sugerencias mediante la API de geocodificación de Open-Meteo.
- **Uso de ubicación actual** del navegador (Geolocation API).
- **Clima actual**: temperatura, descripción, icono, sensación térmica, máximas/mínimas y probabilidad/acumulado de lluvia.
- **Pronóstico por hora** (24 horas) con gráfico de temperatura y barras de probabilidad de lluvia.
- **Pronóstico diario** (7 días) con rango térmico visual.
- **Alertas meteorológicas** generadas a partir de condiciones previstas (tormentas, lluvia intensa, viento, calor, frío, nieve, heladas, visibilidad, UV, etc.).
- **Detalles adicionales**: humedad, punto de rocío, viento y rachas, presión, visibilidad, índice UV y calidad del aire (cuando hay datos disponibles).
- **Temas visuales** según condición climática y día/noche.
- **Unidades configurables**: métrico (°C, km/h, mm, km) e imperial (°F, mph, in, mi).
- **Favoritos** y persistencia local (`localStorage`) de última ciudad consultada, unidades y ciudades guardadas.
- **Actualización automática** periódica (cada 10 minutos, con refresco al volver a la pestaña) y actualización manual.

## Tecnologías utilizadas

- **HTML5**: estructura semántica de la interfaz.
- **CSS3**: estilos de la interfaz principal (`css/app.css`), diseño responsive y animaciones.
- **JavaScript (Vanilla)**: lógica de la aplicación (`js/app.js`), consumo de APIs, renderizado dinámico y persistencia en `localStorage`.
- **Sass/SCSS**: estructura de estilos base en `scss/` (variables, reset y layout), como base/organización de una versión modular de estilos.
- **APIs de Open-Meteo**:
  - Geocoding API: búsqueda y normalización de ciudades.
  - Forecast API: clima actual, horario y diario.
  - Air Quality API: índice de calidad del aire (AQI).

## Estructura del proyecto

```text
nubeloApp/
├─ index.html               # Página principal de la aplicación
├─ js/
│  └─ app.js                # Lógica principal: búsqueda, APIs, renderizado, alertas y estado
├─ css/
│  ├─ app.css               # Hoja de estilos principal utilizada por la app
│  └─ app.css.map           # Source map de estilos
├─ scss/
│  ├─ app.scss              # Punto de entrada SCSS
│  ├─ base/
│  │  ├─ _reset.scss        # Reset/base
│  │  └─ _variables.scss    # Variables de color y tema
│  └─ layout/
│     ├─ _components.scss   # Archivo de componentes (actualmente vacío)
│     └─ _estructura.scss   # Estructura/layout base en SCSS
├─ assets/
│  └─ nubeloUI.jpg          # Recurso gráfico del proyecto
├─ app(1).css               # Hoja de estilos previa/alternativa conservada en la raíz
├─ .gitignore               # Exclusiones para control de versiones
└─ README.md                # Documentación del proyecto
```

## Cómo ejecutar el proyecto

Al ser una aplicación estática, no requiere instalación de dependencias ni proceso de compilación para funcionar.

1. Clona o descarga este repositorio.
2. Abre el archivo `index.html` en un navegador moderno.
3. (Opcional, recomendado) Usa un servidor local estático (por ejemplo, la extensión *Live Server* de VS Code) para una mejor experiencia de desarrollo.

> Nota: la aplicación consume APIs externas de Open-Meteo y puede solicitar permiso de ubicación para la función "Usar mi ubicación". Se requiere conexión a internet.

## Cambios realizados en el proyecto

Resumen de los cambios e implementación reflejados en el estado actual del repositorio:

- **Interfaz principal de Nubelo**: estructura en `index.html` con encabezado, buscador, sugerencias, favoritos, panel de resultados, bloques de alertas, pronóstico horario/diario y detalles del clima.
- **Lógica de aplicación en `js/app.js`**:
  - Integración con Open-Meteo (geocodificación, pronóstico y calidad del aire).
  - Búsqueda de ciudades con sugerencias y selección.
  - Obtención de clima por geolocalización del navegador.
  - Renderizado dinámico del estado actual, pronóstico por horas (24 h), pronóstico por días (7 días) y detalles ampliados.
  - Generación de alertas meteorológicas basadas en datos horarios/actuales.
  - Gestión de favoritos, última ciudad consultada y preferencia de unidades con `localStorage`.
  - Alternancia de unidades métrico/imperial y actualización automática/manual de datos.
  - Tematización visual según condiciones climáticas y momento del día.
- **Estilos y organización visual**:
  - Hoja de estilos principal `css/app.css` (y `css/app.css.map`) con diseño responsive, componentes de interfaz, estados, animaciones y temas atmosféricos.
  - Estructura SCSS en `scss/` (`app.scss`, `base/_variables.scss`, `base/_reset.scss`, `layout/_estructura.scss`) correspondiente a una base modular de estilos; `layout/_components.scss` se encuentra preparado para futuros componentes.
  - Archivo `app(1).css` en la raíz conservado como versión previa/alternativa de estilos.
- **Recursos del proyecto**: inclusión de recurso gráfico en `assets/nubeloUI.jpg`.
- **Preparación para repositorio**: incorporación de `README.md` y `.gitignore` para documentar el proyecto y facilitar su publicación en GitHub.

## Autoría y créditos

- **Proyecto:** Nubelo
- **Desarrollo:** dev joaquin vivar (VORTEX WEB)
- **Datos meteorológicos:** [Open-Meteo](https://open-meteo.com/)

© 2026 Nubelo.

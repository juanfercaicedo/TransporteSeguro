# TransporteSeguro

Prototipo interactivo para acompañar los viajes de estudiantes que utilizan el transporte público en Quito.

**Demo:** [Abrir TransporteSeguro en GitHub Pages](http://juanfercaicedo.github.io/TransporteSeguro/)

## Problema

Los padres de familia se preocupan por la seguridad de sus hijos cuando estos se trasladan en transporte público. Para confirmar que llegaron a salvo a sus destinos, algunos deben interrumpir su jornada laboral al menos tres veces por semana. Esto dificulta tanto el trabajo de las familias como el seguimiento del viaje de los estudiantes.

## Objetivo

Explorar una herramienta que ayude a estudiantes y familias a organizar y acompañar sus recorridos. La vista del estudiante permite consultar opciones de transporte público y compartir su ubicación desde el mismo navegador; la vista familiar muestra la información compartida.

## Equipo

Proyecto TransporteSeguro. Responsable del repositorio: **Juan Fernando Caicedo Escobar**. Los integrantes adicionales del equipo son: **Juan Esteban Caicedo, Esteban García y Anthony Rosero**.

## Tecnologías

- **HTML5** para la estructura de la landing y las vistas de la aplicación.
- **CSS3** para los estilos adaptables y la presentación de las vistas en formato móvil.
- **JavaScript (ES modules)** para la lógica organizada en `src/models`, `src/views`, `src/controllers`, `src/services` y `src/config`.
- **Bootstrap 5.3.7** para componentes de navegación de la landing.
- **Google Maps Platform** (Maps JavaScript API, Places y Directions) para sugerir direcciones y consultar rutas de transporte público cuando se configura una clave válida.
- **Leaflet 1.9.4 y OpenStreetMap** para el mapa alternativo y la visualización de las paradas cuando Google Maps no está disponible.
- **GeoJSON** para el catálogo de 2.448 paradas almacenado en [`src/json/busStop.json`](src/json/busStop.json).
- **Web Storage y Geolocation APIs** del navegador para conservar perfiles y el último viaje en el dispositivo y, con permiso explícito, compartir la ubicación.
- **GitHub Pages y GitHub Actions** para publicar el prototipo.

## Funcionalidades del prototipo

- Landing page con acceso a la demo interactiva.
- Vista estudiante para ingresar origen y destino, comparar alternativas de transporte público y consultar indicaciones cuando Google Maps está habilitado.
- Mapa de Quito con las paradas de bus como puntos verdes interactivos; al seleccionar un punto se muestra su nombre y tipo.
- Vista familiar para consultar el último viaje y la ubicación que se compartió desde el mismo navegador.
- Perfiles locales de estudiantes y controles para iniciar o pausar el uso compartido de ubicación.

## Alcance y limitaciones

Este prototipo no tiene backend, inicio de sesión, sincronización entre dispositivos ni notificaciones reales. Los perfiles y el último viaje se almacenan en el navegador; para que las vistas compartan esa información, deben abrirse en el mismo dispositivo, navegador y origen. La ubicación solo se solicita cuando el estudiante pulsa el botón para compartir.

El catálogo GeoJSON permite ubicar paradas, pero no contiene recorridos completos, secuencias de paradas, horarios ni servicios por línea. Para calcular rutas propias de la aplicación hace falta integrar datos estructurados de transporte, como GTFS. Sin una clave válida de Google Maps, el mapa alternativo puede mostrar las paradas, pero el cálculo integrado de alternativas no está disponible; se puede abrir la búsqueda en Google Maps.

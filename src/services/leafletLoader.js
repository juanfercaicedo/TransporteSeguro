let leafletPromise;

export function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;

    const version = "1.9.4";
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = `https://unpkg.com/leaflet@${version}/dist/leaflet.css`;

    const script = document.createElement("script");
    script.src = `https://unpkg.com/leaflet@${version}/dist/leaflet.js`;
    script.async = true;

    leafletPromise = Promise.all([
        new Promise((resolve, reject) => {
            stylesheet.onload = resolve;
            stylesheet.onerror = () => reject(new Error("No se pudieron cargar los estilos del mapa alternativo."));
        }),
        new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error("No se pudo cargar la biblioteca del mapa alternativo."));
        })
    ]).then(() => {
        if (!window.L) throw new Error("La biblioteca del mapa alternativo no se inicializó.");
        return window.L;
    }).catch((error) => {
        leafletPromise = null;
        throw error;
    });

    document.head.append(stylesheet, script);
    return leafletPromise;
}

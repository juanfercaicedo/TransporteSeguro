import { CONFIG } from "../config/config.js";

let mapsScriptPromise;
let mapsCallbackId = 0;

function loadMapsScript() {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (!CONFIG.GOOGLE_MAPS_API_KEY) {
        return Promise.reject(new Error("Falta configurar GOOGLE_MAPS_API_KEY para calcular rutas dentro de la aplicación."));
    }
    if (mapsScriptPromise) return mapsScriptPromise;

    mapsScriptPromise = new Promise((resolve, reject) => {
        const callbackName = `__transporteSeguroMapsLoaded${++mapsCallbackId}`;
        const timeoutId = window.setTimeout(() => {
            delete window[callbackName];
            mapsScriptPromise = null;
            reject(new Error("Google Maps tardó demasiado en cargar. Revisa la conexión e inténtalo de nuevo."));
        }, 15000);

        window[callbackName] = () => {
            window.clearTimeout(timeoutId);
            resolve(window.google.maps);
            delete window[callbackName];
        };

        const script = document.createElement("script");
        const source = new URL("https://maps.googleapis.com/maps/api/js");
        source.searchParams.set("key", CONFIG.GOOGLE_MAPS_API_KEY);
        source.searchParams.set("loading", "async");
        source.searchParams.set("callback", callbackName);
        script.src = source.toString();
        script.async = true;
        script.onerror = () => {
            window.clearTimeout(timeoutId);
            delete window[callbackName];
            mapsScriptPromise = null;
            reject(new Error("No se pudo cargar Google Maps. Comprueba la conexión y las restricciones de la clave."));
        };
        document.head.append(script);
    });

    return mapsScriptPromise;
}

export class GoogleMapsService {
    async createTransitMap(element) {
        const maps = await loadMapsScript();
        element.replaceChildren();
        const map = new maps.Map(element, {
            center: CONFIG.DEFAULT_LOCATION,
            zoom: 13,
            mapTypeControl: false,
            streetViewControl: false
        });
        const renderer = new maps.DirectionsRenderer({
            map,
            preserveViewport: false,
            suppressMarkers: false
        });

        return { maps, map, renderer };
    }

    renderTransitStopMarkers(maps, map, route, currentMarkers = []) {
        currentMarkers.forEach((marker) => marker.setMap(null));

        const markersByPosition = new Map();
        route.legs
            .flatMap((leg) => leg.steps || [])
            .filter((step) => step.travel_mode === "TRANSIT" && step.transit)
            .flatMap((step) => [step.transit.departure_stop, step.transit.arrival_stop])
            .forEach((stop) => {
                const location = stop?.location;
                if (!location) return;

                const latitude = typeof location.lat === "function" ? location.lat() : location.lat;
                const longitude = typeof location.lng === "function" ? location.lng() : location.lng;
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

                const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
                if (markersByPosition.has(key)) return;

                const marker = new maps.Marker({
                    map,
                    position: { lat: latitude, lng: longitude },
                    title: `Parada: ${stop.name || "Transporte público"}`,
                    icon: {
                        path: maps.SymbolPath.CIRCLE,
                        fillColor: "#1b9b5a",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                        scale: 6
                    }
                });
                markersByPosition.set(key, marker);
            });

        return [...markersByPosition.values()];
    }

    async getTransitRoutes(maps, origin, destination) {
        const service = new maps.DirectionsService();
        const response = await service.route({
            origin,
            destination,
            travelMode: maps.TravelMode.TRANSIT,
            transitOptions: { departureTime: new Date() },
            region: "ec",
            provideRouteAlternatives: true
        });

        if (!response.routes?.length) {
            throw new Error("Google Maps no encontró alternativas para este recorrido.");
        }

        return response;
    }
}

import { CONFIG } from "../config/config.js";

let mapsScriptPromise;
let mapsCallbackId = 0;
let leafletPromise;

function loadLeaflet() {
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

function loadMapsScript() {
    if (window.google?.maps) {
        if (window.google.maps.places?.Autocomplete) return Promise.resolve(window.google.maps);
        return Promise.reject(new Error("Google Maps ya se cargó sin Places; recarga la página para habilitar las sugerencias de direcciones."));
    }
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
        source.searchParams.set("libraries", "places");
        source.searchParams.set("language", "es");
        source.searchParams.set("region", "EC");
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
    async createTransitMap(element, directionsPanel) {
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
            panel: directionsPanel,
            preserveViewport: false,
            suppressMarkers: false
        });

        return { maps, map, renderer };
    }

    async fetchBusStops() {
        const busStopsUrl = new URL("../json/busStop.json", import.meta.url);
        const response = await fetch(busStopsUrl);
        if (!response.ok) {
            throw new Error(`No se pudieron cargar las paradas de bus (HTTP ${response.status}).`);
        }

        const busStops = await response.json();
        if (busStops.type !== "FeatureCollection" || !Array.isArray(busStops.features)) {
            throw new Error("El archivo busStop.json no contiene una colección de paradas válida.");
        }
        const hasInvalidFeature = busStops.features.some((feature) =>
            feature.type !== "Feature" ||
            feature.geometry?.type !== "Point" ||
            !Array.isArray(feature.geometry.coordinates) ||
            feature.geometry.coordinates.length !== 2 ||
            !feature.geometry.coordinates.every(Number.isFinite)
        );
        if (hasInvalidFeature) {
            throw new Error("El archivo busStop.json contiene coordenadas de paradas no válidas.");
        }

        return busStops;
    }

    addBusStopsToMap(maps, map, busStops) {
        map.data.setStyle({
            clickable: true,
            icon: {
                path: maps.SymbolPath.CIRCLE,
                fillColor: "#1b9b5a",
                fillOpacity: 0.9,
                strokeColor: "#ffffff",
                strokeWeight: 1,
                scale: 5
            },
            title: "Parada de bus"
        });
        map.data.addGeoJson(busStops);

        const infoWindow = new maps.InfoWindow();
        map.data.addListener("click", (event) => {
            const name = event.feature.getProperty("name") || "Parada sin nombre";
            const type = event.feature.getProperty("public_transport");
            const content = document.createElement("div");
            const heading = document.createElement("strong");
            heading.textContent = name;
            content.append(heading);
            if (type) {
                const detail = document.createElement("p");
                detail.textContent = type;
                content.append(detail);
            }
            infoWindow.setContent(content);
            infoWindow.setPosition(event.latLng);
            infoWindow.open({ map });
        });

        return busStops.features.length;
    }

    async createFallbackMap(element, busStops) {
        const leaflet = await loadLeaflet();
        const container = element.querySelector(".map-fallback-leaflet");
        if (!container) throw new Error("No se encontró el contenedor del mapa alternativo.");

        const map = leaflet.map(container, { preferCanvas: true })
            .setView([CONFIG.DEFAULT_LOCATION.lat, CONFIG.DEFAULT_LOCATION.lng], 13);
        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(map);
        leaflet.geoJSON(busStops, {
            pointToLayer: (_feature, location) => leaflet.circleMarker(location, {
                radius: 4,
                fillColor: "#1b9b5a",
                fillOpacity: 0.9,
                color: "#ffffff",
                weight: 1
            }),
            onEachFeature: (feature, layer) => {
                const content = document.createElement("div");
                const heading = document.createElement("strong");
                heading.textContent = feature.properties?.name || "Parada sin nombre";
                content.append(heading);
                if (feature.properties?.public_transport) {
                    const detail = document.createElement("p");
                    detail.textContent = feature.properties.public_transport;
                    content.append(detail);
                }
                layer.bindPopup(content);
            }
        }).addTo(map);
        window.requestAnimationFrame(() => map.invalidateSize());
    }

    createAddressAutocomplete(maps, input) {
        if (!maps.places?.Autocomplete) {
            throw new Error("No se pudo iniciar el autocompletado. Habilita Places API en Google Cloud.");
        }

        const autocomplete = new maps.places.Autocomplete(input, {
            componentRestrictions: { country: "ec" },
            bounds: {
                south: CONFIG.QUITO_BOUNDS.south,
                west: CONFIG.QUITO_BOUNDS.west,
                north: CONFIG.QUITO_BOUNDS.north,
                east: CONFIG.QUITO_BOUNDS.east
            },
            fields: ["formatted_address", "geometry", "name"],
            strictBounds: true,
            types: ["geocode"]
        });
        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const selectedAddress = place.formatted_address || place.name;
            if (selectedAddress) input.value = selectedAddress;
        });
        return autocomplete;
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

        const routesWithinQuito = response.routes.filter((route) => {
            const firstLeg = route.legs?.[0];
            const lastLeg = route.legs?.[route.legs.length - 1];
            return firstLeg && lastLeg &&
                this.isWithinQuito(firstLeg.start_location) &&
                this.isWithinQuito(lastLeg.end_location);
        });
        if (!routesWithinQuito.length) {
            throw new Error("El origen y el destino deben estar dentro del área de Quito. Revisa las direcciones e inténtalo de nuevo.");
        }
        return { ...response, routes: routesWithinQuito };
    }

    isWithinQuito(location) {
        if (!location) return false;
        const latitude = typeof location.lat === "function" ? location.lat() : location.lat;
        const longitude = typeof location.lng === "function" ? location.lng() : location.lng;
        const bounds = CONFIG.QUITO_BOUNDS;
        return Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            latitude >= bounds.south &&
            latitude <= bounds.north &&
            longitude >= bounds.west &&
            longitude <= bounds.east;
    }
}

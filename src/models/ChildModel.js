import { CONFIG } from "../config/config.js";
import { GoogleMapsService } from "../services/GoogleMapsService.js";
import { buildDemoRoute } from "./DemoSeed.js";

export class ChildModel {
    constructor(mapsService = new GoogleMapsService()) {
        this.mapsService = mapsService;
        this.maps = null;
        this.map = null;
        this.renderer = null;
        this.transitStopMarkers = [];
        this.addressAutocompletes = [];
        this.currentTrip = null;
        this.childProfile = null;
        this.mapInitializationError = null;
        this.fallbackMap = null;
        this.demoRouteLayers = [];
    }

    setChildProfile(profile) {
        this.childProfile = profile;
        if (this.currentTrip && profile) {
            this.currentTrip = { ...this.currentTrip, childId: profile.id, childName: profile.name };
        }
    }

    loadSavedTrip() {
        let savedTrip;
        try {
            savedTrip = localStorage.getItem(CONFIG.TRIP_STORAGE_KEY);
        } catch (error) {
            throw new Error(`No se pudo leer el viaje guardado: ${error.message}`);
        }
        if (!savedTrip) return null;

        try {
            this.currentTrip = JSON.parse(savedTrip);
        } catch (error) {
            throw new Error(`El viaje guardado no es válido: ${error.message}`);
        }
        return this.currentTrip;
    }

    async initializeMap(element, directionsPanel) {
        try {
            const mapData = await this.mapsService.createTransitMap(element, directionsPanel);
            this.maps = mapData.maps;
            this.map = mapData.map;
            this.renderer = mapData.renderer;
        } catch (error) {
            this.mapInitializationError = error;
            throw error;
        }
    }

    initializeAddressAutocomplete(input) {
        if (!this.maps) {
            throw this.mapInitializationError || new Error("Google Maps todavía se está inicializando.");
        }
        const autocomplete = this.mapsService.createAddressAutocomplete(this.maps, input);
        this.addressAutocompletes.push(autocomplete);
        return autocomplete;
    }

    async loadBusStops() {
        return this.mapsService.fetchBusStops();
    }

    displayBusStops(busStops) {
        if (!this.maps || !this.map) {
            throw this.mapInitializationError || new Error("El mapa todavía se está inicializando.");
        }
        return this.mapsService.addBusStopsToMap(this.maps, this.map, busStops);
    }

    async initializeFallbackMap(element, busStops) {
        this.fallbackMap = await this.mapsService.createFallbackMap(element, busStops);
        return this.fallbackMap;
    }

    displayDemoRoute(route) {
        if (!this.fallbackMap || !route?.coordinates?.length) return false;
        const { map, leaflet } = this.fallbackMap;

        this.demoRouteLayers.forEach((layer) => layer.remove());
        this.demoRouteLayers = [];

        const line = leaflet.polyline(route.coordinates, {
            color: "#1c6fd8",
            weight: 4,
            opacity: 0.85,
            dashArray: "2 8",
            lineCap: "round"
        }).addTo(map);
        this.demoRouteLayers.push(line);

        route.stops.forEach((stop, index) => {
            const isBoarding = index === route.boarding.index;
            const isDropOff = index === route.dropOff.index;
            const marker = leaflet.circleMarker([stop.latitude, stop.longitude], {
                radius: isBoarding || isDropOff ? 8 : 6,
                fillColor: isBoarding ? "#1b9b5a" : isDropOff ? "#d9534f" : "#1c6fd8",
                fillOpacity: 1,
                color: "#ffffff",
                weight: 2
            }).bindPopup(stop.name).addTo(map);
            this.demoRouteLayers.push(marker);
        });

        map.fitBounds(line.getBounds().pad(0.15));
        return true;
    }

    getDemoRoute() {
        return buildDemoRoute();
    }

    async getTransitRoutes(origin, destination) {
        if (!this.maps) {
            throw this.mapInitializationError || new Error("El mapa todavía se está inicializando.");
        }

        const response = await this.mapsService.getTransitRoutes(this.maps, origin, destination);
        this.currentTrip = {
            ...(this.childProfile ? { childId: this.childProfile.id, childName: this.childProfile.name } : {}),
            origin,
            destination,
            status: "Ruta planificada",
            selectedRoute: 0,
            duration: response.routes[0].legs
                .reduce((total, leg) => total + (leg.duration?.value || 0), 0),
            updatedAt: new Date().toISOString()
        };
        return response;
    }

    selectRoute(response, routeIndex) {
        const route = response.routes[routeIndex];
        if (!route || !this.renderer) {
            throw new Error("No se encontró la alternativa seleccionada.");
        }

        this.renderer.setDirections(response);
        this.renderer.setRouteIndex(routeIndex);
        this.transitStopMarkers = this.mapsService.renderTransitStopMarkers(
            this.maps,
            this.map,
            route,
            this.transitStopMarkers
        );
        const trip = {
            ...this.currentTrip,
            selectedRoute: routeIndex,
            duration: route.legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0),
            updatedAt: new Date().toISOString()
        };
        this.saveTrip(trip);
        this.currentTrip = trip;
        return this.transitStopMarkers.length;
    }

    async shareCurrentLocation() {
        if (!navigator.geolocation) {
            throw new Error("Este navegador no permite compartir la ubicación.");
        }

        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 15000
            });
        });
        const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            updatedAt: new Date().toISOString()
        };

        const trip = {
            ...this.currentTrip,
            ...(this.childProfile ? { childId: this.childProfile.id, childName: this.childProfile.name } : {}),
            location,
            status: "Ubicación compartida",
            updatedAt: location.updatedAt
        };
        this.saveTrip(trip);
        this.currentTrip = trip;
        return location;
    }

    stopLocationSharing() {
        if (this.currentTrip?.location) {
            const { location, ...trip } = this.currentTrip;
            const updatedTrip = { ...trip, status: "Compartición pausada", updatedAt: new Date().toISOString() };
            this.saveTrip(updatedTrip);
            this.currentTrip = updatedTrip;
        }
    }

    saveTrip(trip = this.currentTrip) {
        try {
            localStorage.setItem(CONFIG.TRIP_STORAGE_KEY, JSON.stringify(trip));
        } catch (error) {
            throw new Error(`No se pudo actualizar la vista familiar: ${error.message}`);
        }
    }
}
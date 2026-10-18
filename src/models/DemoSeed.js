import { CONFIG } from "../config/config.js";
import { ChildProfilesModel } from "./ChildProfilesModel.js";
import { distanceInMeters } from "./SafeZoneModel.js";

const DEMO_PAIRING_CODE = "482913";

export function buildDemoRoute() {
    const { number, name, stops, boardingStop } = CONFIG.DEMO_BUS_ROUTE;
    const list = stops.map((stop) => ({ ...stop }));
    const boardingIndex = Math.max(0, list.findIndex((stop) => stop.name === boardingStop));

    let totalLength = 0;
    let boardingLength = 0;
    for (let index = 1; index < list.length; index++) {
        const legLength = distanceInMeters(list[index - 1], list[index]);
        if (index <= boardingIndex) boardingLength += legLength;
        totalLength += legLength;
    }

    return {
        number,
        name,
        stops: list,
        coordinates: list.map((stop) => [stop.latitude, stop.longitude]),
        boarding: { name: list[boardingIndex].name, index: boardingIndex },
        dropOff: { name: list[list.length - 1].name, index: list.length - 1 },
        boardingProgress: totalLength === 0 ? 0 : boardingLength / totalLength
    };
}

function demoTripFields() {
    const route = buildDemoRoute();
    const boardingStop = route.stops[route.boarding.index];
    const now = new Date().toISOString();
    return {
        status: `En ruta #${route.number} · demo`,
        location: {
            latitude: boardingStop.latitude,
            longitude: boardingStop.longitude,
            updatedAt: now
        },
        route,
        sim: { progress: route.boardingProgress },
        updatedAt: now
    };
}

export function ensureDemoData() {
    try {
        if (!localStorage.getItem(CONFIG.DEMO_SEED_KEY)) {
            seedFirstRun();
            localStorage.setItem(CONFIG.DEMO_SEED_KEY, "1");
        }
        ensureDemoTripShape();
    } catch (error) {
        console.warn("No se pudieron preparar los datos de demostración:", error);
    }
}

function seedFirstRun() {
    const profilesModel = new ChildProfilesModel();
    const profiles = profilesModel.getProfiles();
    if (!profiles.some((profile) => profile.id === CONFIG.DEMO_CHILD_ID)) {
        profilesModel.saveProfiles([
            { id: CONFIG.DEMO_CHILD_ID, name: "Mateo" },
            ...profiles
        ]);
    }
    if (!profilesModel.getActiveProfileId()) {
        profilesModel.setActiveProfile(CONFIG.DEMO_CHILD_ID);
    }

    if (!localStorage.getItem(CONFIG.TRIP_STORAGE_KEY)) {
        localStorage.setItem(CONFIG.TRIP_STORAGE_KEY, JSON.stringify({
            childId: CONFIG.DEMO_CHILD_ID,
            childName: "Mateo",
            origin: "Parque La Carolina, Quito",
            destination: "De Los Shyris y El Comercio, Quito",
            selectedRoute: 0,
            duration: 900,
            ...demoTripFields()
        }));
    }

    if (!localStorage.getItem(CONFIG.PAIRING_STORAGE_KEY)) {
        localStorage.setItem(CONFIG.PAIRING_STORAGE_KEY, DEMO_PAIRING_CODE);
    }
}

function ensureDemoTripShape() {
    const savedTrip = localStorage.getItem(CONFIG.TRIP_STORAGE_KEY);
    if (!savedTrip) return;

    let trip;
    try {
        trip = JSON.parse(savedTrip);
    } catch {
        return;
    }
    if (!trip || typeof trip !== "object" || Array.isArray(trip)) return;

    const hasStops = Array.isArray(trip.route?.stops) && trip.route.stops.length > 0;
    const hasLocation = Boolean(trip.location);
    const isDemoRoute = trip.route?.number === CONFIG.DEMO_BUS_ROUTE.number;

    let nextTrip = trip;

    if (isDemoRoute && hasStops && hasLocation) {
        return;
    }

    const demoFields = demoTripFields();

    if (isDemoRoute || (!trip.route && !hasLocation)) {
        nextTrip = {
            origin: "Parque La Carolina, Quito",
            destination: "De Los Shyris y El Comercio, Quito",
            childId: CONFIG.DEMO_CHILD_ID,
            childName: "Mateo",
            selectedRoute: 0,
            duration: 900,
            ...trip,
            ...demoFields
        };
    } else if (!trip.route) {
        nextTrip = { ...trip, route: demoFields.route, sim: trip.sim || demoFields.sim };
    }

    if (nextTrip === trip) return;

    try {
        localStorage.setItem(CONFIG.TRIP_STORAGE_KEY, JSON.stringify(nextTrip));
    } catch {
        // el modelo del viaje mostrará su propio mensaje de error
    }
}

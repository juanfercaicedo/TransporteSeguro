import { CONFIG } from "../config/config.js";
import { ChildProfilesModel } from "./ChildProfilesModel.js";
import { distanceInMeters } from "./SafeZoneModel.js";

const DEMO_PAIRING_CODE = "482913";
const ON_ROUTE_TOLERANCE_METERS = 25;

function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
}

function projectFraction(from, to, point) {
    const latScale = 111320;
    const lngScale = 111320 * Math.cos((from.latitude * Math.PI) / 180);
    const segmentX = (to.longitude - from.longitude) * lngScale;
    const segmentY = (to.latitude - from.latitude) * latScale;
    const pointX = (point.longitude - from.longitude) * lngScale;
    const pointY = (point.latitude - from.latitude) * latScale;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    if (segmentLengthSquared === 0) return 0;
    return clamp01((pointX * segmentX + pointY * segmentY) / segmentLengthSquared);
}

function snapToRoute(route, location) {
    const points = route.coordinates.map(([latitude, longitude]) => ({ latitude, longitude }));
    if (!location || points.length === 0) {
        return { distance: Infinity, progress: clamp01(route.boardingProgress) };
    }
    if (points.length === 1) {
        return { distance: distanceInMeters(points[0], location), progress: 0 };
    }

    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index++) {
        const length = distanceInMeters(points[index - 1], points[index]);
        lengths.push(length);
        total += length;
    }

    let best = { distance: Infinity, progress: 0 };
    let passed = 0;
    for (let index = 0; index < lengths.length; index++) {
        const from = points[index];
        const to = points[index + 1];
        const fraction = projectFraction(from, to, location);
        const nearest = {
            latitude: from.latitude + (to.latitude - from.latitude) * fraction,
            longitude: from.longitude + (to.longitude - from.longitude) * fraction
        };
        const distance = distanceInMeters(nearest, location);
        const progress = total === 0 ? 0 : (passed + lengths[index] * fraction) / total;
        if (distance < best.distance) best = { distance, progress };
        passed += lengths[index];
    }
    return best;
}

function positionAtProgress(route, progress) {
    const points = route.coordinates.map(([latitude, longitude]) => ({ latitude, longitude }));
    if (points.length === 0) return null;
    if (points.length === 1) return points[0];

    const lengths = [];
    let total = 0;
    for (let index = 1; index < points.length; index++) {
        const length = distanceInMeters(points[index - 1], points[index]);
        lengths.push(length);
        total += length;
    }

    let remaining = clamp01(progress) * total;
    for (let index = 0; index < lengths.length; index++) {
        if (remaining <= lengths[index] || index === lengths.length - 1) {
            const fraction = lengths[index] === 0 ? 0 : Math.min(1, remaining / lengths[index]);
            const from = points[index];
            const to = points[index + 1];
            return {
                latitude: from.latitude + (to.latitude - from.latitude) * fraction,
                longitude: from.longitude + (to.longitude - from.longitude) * fraction
            };
        }
        remaining -= lengths[index];
    }
    return points[points.length - 1];
}

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

    const demoFields = demoTripFields();
    let nextTrip = trip;

    if (isDemoRoute && hasStops && hasLocation) {
        nextTrip = trip;
    } else if (isDemoRoute || (!trip.route && !hasLocation)) {
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

    // Mateo siempre se muestra sobre la calle de su ruta, nunca dentro del parque u otro lugar
    if (nextTrip.route?.coordinates?.length) {
        const snap = snapToRoute(nextTrip.route, nextTrip.location);
        if (!nextTrip.location) {
            const progress = Number.isFinite(nextTrip.sim?.progress)
                ? nextTrip.sim.progress
                : (nextTrip.route.boardingProgress ?? 0);
            const position = positionAtProgress(nextTrip.route, progress);
            if (position) {
                nextTrip = {
                    ...nextTrip,
                    location: { ...position, updatedAt: new Date().toISOString() },
                    sim: { progress: clamp01(progress) }
                };
            }
        } else if (snap.distance > ON_ROUTE_TOLERANCE_METERS) {
            const position = positionAtProgress(nextTrip.route, snap.progress);
            if (position) {
                nextTrip = {
                    ...nextTrip,
                    location: { ...position, updatedAt: new Date().toISOString() },
                    sim: { progress: clamp01(snap.progress) }
                };
            }
        }
    }

    if (nextTrip === trip) return;

    try {
        localStorage.setItem(CONFIG.TRIP_STORAGE_KEY, JSON.stringify(nextTrip));
    } catch {
        // el modelo del viaje mostrará su propio mensaje de error
    }
}

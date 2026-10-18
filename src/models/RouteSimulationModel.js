import { CONFIG } from "../config/config.js";
import { distanceInMeters } from "./SafeZoneModel.js";

const TICK_MS = 1200;
const TOTAL_STEPS = 40;

export class RouteSimulationModel {
    constructor() {
        this.timerId = null;
        this.progress = 0;
        this.coordinates = null;
        this.routeNumber = null;
    }

    get isRunning() {
        return this.timerId !== null;
    }

    start(onUpdate, onFinished, onError) {
        if (this.timerId !== null) return;

        const trip = this.readTrip();
        if (!trip?.route?.coordinates?.length) {
            onError?.(new Error("Este viaje no tiene una ruta de bus ficticia asociada."));
            return;
        }
        this.coordinates = trip.route.coordinates.map(([latitude, longitude]) => ({ latitude, longitude }));
        this.routeNumber = trip.route.number ?? "?";
        const savedProgress = Number.isFinite(trip.sim?.progress) ? trip.sim.progress : 0;
        this.progress = savedProgress >= 1 ? 0 : savedProgress;

        this.timerId = globalThis.setInterval(
            () => this.tick(onUpdate, onFinished, onError),
            TICK_MS
        );
    }

    stop() {
        if (this.timerId === null) return;
        globalThis.clearInterval(this.timerId);
        this.timerId = null;
    }

    tick(onUpdate, onFinished, onError) {
        try {
            this.progress = Math.min(1, this.progress + 1 / TOTAL_STEPS);
            const position = this.computePosition(this.progress);
            const now = new Date().toISOString();
            const finished = this.progress >= 1;
            const trip = {
                ...this.readTrip(),
                location: {
                    latitude: position.latitude,
                    longitude: position.longitude,
                    updatedAt: now
                },
                status: finished
                    ? `Llegó al destino · ruta #${this.routeNumber} · demo`
                    : `En ruta #${this.routeNumber} · en camino · demo`,
                sim: { progress: this.progress },
                updatedAt: now
            };
            this.writeTrip(trip);
            onUpdate?.(trip);
            if (finished) {
                this.stop();
                onFinished?.(trip);
            }
        } catch (error) {
            this.stop();
            onError?.(error);
        }
    }

    computePosition(progress) {
        const points = this.coordinates;
        if (points.length === 1) return points[0];

        const segmentLengths = [];
        let totalLength = 0;
        for (let index = 1; index < points.length; index++) {
            const length = distanceInMeters(points[index - 1], points[index]);
            segmentLengths.push(length);
            totalLength += length;
        }

        let remaining = progress * totalLength;
        for (let index = 0; index < segmentLengths.length; index++) {
            const segmentLength = segmentLengths[index];
            if (remaining <= segmentLength || index === segmentLengths.length - 1) {
                const fraction = segmentLength === 0 ? 0 : Math.min(1, remaining / segmentLength);
                const from = points[index];
                const to = points[index + 1];
                return {
                    latitude: from.latitude + (to.latitude - from.latitude) * fraction,
                    longitude: from.longitude + (to.longitude - from.longitude) * fraction
                };
            }
            remaining -= segmentLength;
        }
        return points[points.length - 1];
    }

    readTrip() {
        let savedTrip;
        try {
            savedTrip = localStorage.getItem(CONFIG.TRIP_STORAGE_KEY);
        } catch (error) {
            throw new Error(`No se pudo leer el viaje para la simulación: ${error.message}`);
        }
        if (!savedTrip) throw new Error("No hay un viaje para simular.");
        try {
            return JSON.parse(savedTrip);
        } catch (error) {
            throw new Error(`El viaje guardado no es válido: ${error.message}`);
        }
    }

    writeTrip(trip) {
        try {
            localStorage.setItem(CONFIG.TRIP_STORAGE_KEY, JSON.stringify(trip));
        } catch (error) {
            throw new Error(`No se pudo actualizar la simulación del viaje: ${error.message}`);
        }
    }
}

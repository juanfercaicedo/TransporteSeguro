import { CONFIG } from "../config/config.js";

export class ParentModel {
    getCurrentTrip() {
        let savedTrip;
        try {
            savedTrip = localStorage.getItem(CONFIG.TRIP_STORAGE_KEY);
        } catch (error) {
            throw new Error(`No se pudo leer el estado del viaje: ${error.message}`);
        }

        if (!savedTrip) return null;
        try {
            const trip = JSON.parse(savedTrip);
            if (!trip || typeof trip !== "object" || Array.isArray(trip)) {
                throw new Error("el contenido debe ser un objeto de viaje");
            }
            if (trip.location && (
                !Number.isFinite(trip.location.latitude) ||
                !Number.isFinite(trip.location.longitude) ||
                trip.location.latitude < -90 ||
                trip.location.latitude > 90 ||
                trip.location.longitude < -180 ||
                trip.location.longitude > 180
            )) {
                throw new Error("las coordenadas guardadas no son válidas");
            }
            return trip;
        } catch (error) {
            throw new Error(`El estado local del viaje no es válido: ${error.message}`);
        }
    }

    subscribeToTripUpdates(onUpdate, onError) {
        const handleStorage = (event) => {
            if (event.key !== CONFIG.TRIP_STORAGE_KEY) return;
            try {
                onUpdate(event.newValue ? JSON.parse(event.newValue) : null);
            } catch (error) {
                onError(new Error(`No se pudo leer la actualización del viaje: ${error.message}`));
            }
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }
}

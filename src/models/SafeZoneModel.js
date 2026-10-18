import { CONFIG } from "../config/config.js";

const EARTH_RADIUS_METERS = 6371000;

export function distanceInMeters(first, second) {
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const deltaLat = toRadians(second.latitude - first.latitude);
    const deltaLng = toRadians(second.longitude - first.longitude);
    const firstLat = toRadians(first.latitude);
    const secondLat = toRadians(second.latitude);
    const haversine =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(deltaLng / 2) ** 2;
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export class SafeZoneModel {
    getDefaultZone() {
        const { center, radiusMeters } = CONFIG.DEFAULT_SAFE_ZONE;
        return { center: { lat: center.lat, lng: center.lng }, radiusMeters };
    }

    getZone() {
        let savedZone;
        try {
            savedZone = localStorage.getItem(CONFIG.SAFE_ZONE_STORAGE_KEY);
        } catch (error) {
            throw new Error(`No se pudo leer la zona segura: ${error.message}`);
        }
        if (!savedZone) return this.getDefaultZone();

        try {
            const zone = JSON.parse(savedZone);
            if (!zone || typeof zone !== "object") {
                throw new Error("el contenido debe ser un objeto con centro y radio");
            }
            return this.normalizeZone(zone);
        } catch (error) {
            throw new Error(`La zona segura guardada no es válida: ${error.message}`);
        }
    }

    normalizeZone(zone) {
        const centerLat = zone.center?.lat;
        const centerLng = zone.center?.lng;
        if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng) ||
            centerLat < -90 || centerLat > 90 || centerLng < -180 || centerLng > 180) {
            throw new Error("El centro de la zona segura no es válido.");
        }
        if (!Number.isFinite(zone.radiusMeters)) {
            throw new Error("El radio de la zona segura debe ser un número.");
        }
        const { min, max } = CONFIG.SAFE_ZONE_RADIUS_LIMITS;
        return {
            center: { lat: centerLat, lng: centerLng },
            radiusMeters: Math.min(max, Math.max(min, Math.round(zone.radiusMeters)))
        };
    }

    saveZone(zone) {
        const normalized = this.normalizeZone(zone);
        try {
            localStorage.setItem(CONFIG.SAFE_ZONE_STORAGE_KEY, JSON.stringify(normalized));
        } catch (error) {
            throw new Error(`No se pudo guardar la zona segura: ${error.message}`);
        }
        return normalized;
    }

    isInside(location, zone = this.getZone()) {
        if (!location) return null;
        return distanceInMeters(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: zone.center.lat, longitude: zone.center.lng }
        ) <= zone.radiusMeters;
    }

    subscribe(onUpdate, onError) {
        const handleStorage = (event) => {
            if (event.key !== CONFIG.SAFE_ZONE_STORAGE_KEY) return;
            try {
                onUpdate(event.newValue ? this.getZone() : this.getDefaultZone());
            } catch (error) {
                onError?.(error);
            }
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }
}

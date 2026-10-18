import { CONFIG } from "../config/config.js";
import { loadLeaflet } from "../services/leafletLoader.js";
import { distanceInMeters } from "../models/SafeZoneModel.js";

export class ParentView {
    constructor(documentRef = document) {
        this.document = documentRef;
        this.emptyState = this.document.getElementById("parent-empty");
        this.tripPanel = this.document.getElementById("parent-trip");
        this.status = this.document.getElementById("parent-status");
        this.tripStatus = this.document.getElementById("parent-trip-status");
        this.origin = this.document.getElementById("parent-origin");
        this.destination = this.document.getElementById("parent-destination");
        this.duration = this.document.getElementById("parent-duration");
        this.updatedAt = this.document.getElementById("parent-updated");
        this.location = this.document.getElementById("parent-location");
        this.locationMap = this.document.getElementById("parent-location-map");
        this.routeLegend = this.document.getElementById("parent-route-legend");
        this.routeDetails = this.document.getElementById("parent-route-details");
        this.routeSummary = this.document.getElementById("parent-route-summary");
        this.routeStopsText = this.document.getElementById("parent-route-stops-text");
        this.locationLink = this.document.getElementById("parent-location-link");
        this.zoneStatus = this.document.getElementById("parent-zone-status");
        this.zoneRadiusInput = this.document.getElementById("parent-zone-radius");
        this.zoneRadiusValue = this.document.getElementById("parent-zone-radius-value");
        this.zoneResetButton = this.document.getElementById("parent-zone-reset");
        this.simToggle = this.document.getElementById("parent-sim-toggle");
        this.simProgress = this.document.getElementById("parent-sim-progress");
        this.simulationRunning = false;
        this.pairingForm = this.document.getElementById("parent-pairing-form");
        this.pairingInput = this.document.getElementById("parent-pairing-code");
        this.pairingStatus = this.document.getElementById("parent-pairing-status");
        this.pairingUnpairButton = this.document.getElementById("parent-unpair");
        this.childName = this.document.getElementById("parent-child-name");
        this.childPresence = this.document.getElementById("parent-child-presence");
        this.connectionBadge = this.document.getElementById("parent-connection-badge");
        this.childCount = this.document.getElementById("parent-child-count");
        this.childCountLabel = this.document.getElementById("parent-child-count-label");
        this.childList = this.document.getElementById("parent-child-list");
        this.settingsDialog = this.document.getElementById("parent-settings");
        this.settingsChildCount = this.document.getElementById("parent-settings-child-count");
        this.settingsChildList = this.document.getElementById("parent-settings-child-list");
        this.settingsStatus = this.document.getElementById("parent-settings-status");
        this.refreshButton = this.document.getElementById("refresh-trip");
        this.leaflet = null;
        this.zoneMap = null;
        this.zoneMapInit = null;
        this.zoneCircle = null;
        this.centerHandle = null;
        this.radiusHandle = null;
        this.childMarker = null;
        this.routeLine = null;
        this.currentZone = null;
        this.onZoneChange = null;
    }

    bindSettings({ onAddChild, onRemoveChild, onResetDemo }) {
        this.document.getElementById("open-parent-settings").addEventListener("click", () => {
            this.settingsStatus.textContent = "";
            this.settingsDialog.showModal();
        });
        this.document.getElementById("close-parent-settings").addEventListener("click", () => {
            this.settingsDialog.close();
        });
        this.document.getElementById("add-parent-child-form").addEventListener("submit", (event) => {
            event.preventDefault();
            const input = this.document.getElementById("parent-new-child-name");
            onAddChild(input.value.trim());
        });
        this.document.getElementById("parent-reset-demo").addEventListener("click", onResetDemo);
        this.onRemoveChild = onRemoveChild;
    }

    bindSafeZone({ onZoneChange, onReset }) {
        this.onZoneChange = onZoneChange;
        this.zoneRadiusInput.addEventListener("input", () => {
            if (!this.currentZone) return;
            this.applyZone({ ...this.currentZone, radiusMeters: Number(this.zoneRadiusInput.value) });
        });
        this.zoneRadiusInput.addEventListener("change", () => {
            if (!this.currentZone || !this.onZoneChange) return;
            this.onZoneChange({ ...this.currentZone, radiusMeters: Number(this.zoneRadiusInput.value) });
        });
        this.zoneResetButton.addEventListener("click", onReset);
    }

    bindSimulation({ onToggle }) {
        this.simToggle.addEventListener("click", onToggle);
    }

    setSimulationRunning(isRunning, routeNumber) {
        this.simulationRunning = isRunning;
        this.simToggle.textContent = isRunning
            ? "Detener simulación"
            : `Simular viaje en la ruta #${routeNumber}`;
    }

    setSimulationProgress(message) {
        this.simProgress.textContent = message;
        this.simProgress.hidden = !message;
    }

    bindPairing({ onPair, onUnpair }) {
        this.pairingForm.addEventListener("submit", (event) => {
            event.preventDefault();
            onPair(this.pairingInput.value);
        });
        this.pairingUnpairButton.addEventListener("click", onUnpair);
    }

    renderPairingState(code, pairedChildName) {
        this.pairingStatus.classList.remove("is-error");
        this.pairingStatus.textContent = pairedChildName
            ? `Vinculado con ${pairedChildName} · sincronización simulada en este navegador.`
            : "Aún no hay ningún dispositivo vinculado.";
        this.pairingUnpairButton.hidden = !pairedChildName;
        this.pairingInput.value = "";
    }

    renderChildProfiles(profiles) {
        this.childCount.textContent = String(profiles.length);
        this.childCountLabel.textContent = profiles.length === 1 ? "hijo/a en la app" : "hijos/as en la app";
        this.settingsChildCount.textContent = String(profiles.length);
        this.childList.replaceChildren();
        this.settingsChildList.replaceChildren();
        if (!profiles.length) {
            const emptyMessage = this.document.createElement("p");
            emptyMessage.className = "profile-empty-note";
            emptyMessage.textContent = "Aún no has añadido perfiles.";
            this.childList.append(emptyMessage);
            this.settingsChildList.append(emptyMessage.cloneNode(true));
            return;
        }

        profiles.forEach((profile) => {
            const summary = this.document.createElement("div");
            summary.className = "family-child-item";
            const avatar = this.document.createElement("span");
            avatar.className = "child-avatar";
            avatar.setAttribute("aria-hidden", "true");
            avatar.textContent = profile.name.trim().charAt(0).toLocaleUpperCase("es-EC");
            const details = this.document.createElement("span");
            details.className = "family-child-name";
            details.textContent = profile.name;
            summary.append(avatar, details);
            this.childList.append(summary);

            const settingItem = summary.cloneNode(true);
            const removeButton = this.document.createElement("button");
            removeButton.className = "profile-remove-button";
            removeButton.type = "button";
            removeButton.textContent = "Quitar";
            removeButton.setAttribute("aria-label", `Quitar perfil de ${profile.name}`);
            removeButton.addEventListener("click", () => this.onRemoveChild(profile.id));
            settingItem.append(removeButton);
            this.settingsChildList.append(settingItem);
        });
    }

    showSettingsStatus(message, isError = false) {
        this.settingsStatus.textContent = message;
        this.settingsStatus.classList.toggle("is-error", isError);
    }

    bindRefresh(handler) {
        this.refreshButton.addEventListener("click", handler);
    }

    renderTrip(trip, profiles = []) {
        this.emptyState.hidden = Boolean(trip);
        this.tripPanel.hidden = !trip;
        if (!trip) return;

        this.tripStatus.textContent = trip.status || "Viaje actualizado";
        this.childName.textContent = profiles.find((profile) => profile.id === trip.childId)?.name || trip.childName || "Mi hijo/a";
        this.origin.textContent = trip.origin || "No indicado";
        this.destination.textContent = trip.destination || "No indicado";
        this.duration.textContent = Number.isFinite(trip.duration)
            ? `${Math.round(trip.duration / 60)} min aprox.`
            : "No disponible";
        const updatedAt = new Date(trip.updatedAt);
        this.updatedAt.textContent = Number.isNaN(updatedAt.getTime())
            ? "Hora no disponible"
            : updatedAt.toLocaleString("es-EC");
        this.childPresence.textContent = trip.location ? "Compartió su ubicación" : "Sin ubicación compartida";
        this.connectionBadge.textContent = trip.location ? "Ubicación activa" : "Sin ubicación";
        this.renderRouteDetails(trip.route);
    }

    renderRouteDetails(route) {
        if (!route?.number) {
            this.routeDetails.hidden = true;
            return;
        }
        this.routeDetails.hidden = false;
        const summaryParts = [`Ruta #${route.number}${route.name ? ` · ${route.name}` : ""} (demo ficticio)`];
        if (route.boarding?.name) summaryParts.push(`Sube en: ${route.boarding.name}`);
        if (route.dropOff?.name) summaryParts.push(`Baja en: ${route.dropOff.name}`);
        this.routeSummary.textContent = summaryParts.join(" · ");

        const stops = Array.isArray(route.stops) ? route.stops : [];
        if (stops.length) {
            this.routeStopsText.textContent = `Paradas: ${stops
                .map((stop, index) => `${index + 1}. ${stop.name}`)
                .join(" → ")}`;
            this.routeStopsText.hidden = false;
        } else {
            this.routeStopsText.hidden = true;
        }
    }

    async renderLocationPanel(trip, zone, profiles = []) {
        this.currentZone = zone;
        const location = trip?.location ?? null;
        const childName = profiles.find((profile) => profile.id === trip?.childId)?.name || trip?.childName || "Tu hijo/a";

        if (location) {
            this.location.textContent = `Última ubicación compartida${location.updatedAt
                ? ` · ${this.formatDate(location.updatedAt)}`
                : ""}`;
            const googleMapsUrl = new URL("https://www.google.com/maps/search/");
            googleMapsUrl.searchParams.set("api", "1");
            googleMapsUrl.searchParams.set("query", `${location.latitude},${location.longitude}`);
            this.locationLink.href = googleMapsUrl.toString();
            this.locationLink.hidden = false;
        } else {
            this.location.textContent = "Aún no ha compartido su ubicación.";
            this.locationLink.hidden = true;
        }

        try {
            await this.ensureZoneMap(zone);
        } catch (error) {
            this.locationMap.hidden = true;
            this.zoneStatus.textContent = `No se pudo cargar el mapa de la zona segura: ${error.message}`;
            this.zoneStatus.className = "zone-status is-outside";
            return;
        }

        this.applyZone(zone);
        this.updateRouteLayer(trip?.route);
        this.simToggle.hidden = !trip?.route?.number && !this.simulationRunning;
        if (trip?.route?.number && !this.simulationRunning) {
            this.setSimulationRunning(false, trip.route.number);
        }
        this.updateChildMarker(location);
        this.updateZoneStatus(trip, location, zone, childName);
        window.requestAnimationFrame(() => this.zoneMap?.invalidateSize());
    }

    async ensureZoneMap(zone) {
        if (this.zoneMap) return;
        if (this.zoneMapInit) return this.zoneMapInit;

        this.zoneMapInit = (async () => {
            const leaflet = await loadLeaflet();
            this.leaflet = leaflet;
            this.locationMap.hidden = false;
            const center = zone.center;
            this.zoneMap = leaflet.map(this.locationMap)
                .setView([center.lat, center.lng], 15);
            leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
            }).addTo(this.zoneMap);

            this.zoneCircle = leaflet.circle([center.lat, center.lng], {
                radius: zone.radiusMeters,
                color: "#357150",
                weight: 2,
                fillColor: "#1b9b5a",
                fillOpacity: 0.12
            }).addTo(this.zoneMap);

            this.centerHandle = leaflet.marker([center.lat, center.lng], {
                draggable: true,
                keyboard: true,
                title: "Arrastra para mover el centro de la zona segura",
                icon: leaflet.divIcon({
                    className: "",
                    html: '<span class="zone-handle zone-handle-center" aria-hidden="true"></span>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(this.zoneMap);
            this.centerHandle.on("dragend", () => this.handleCenterDragEnd());

            this.radiusHandle = leaflet.marker(this.getRadiusHandlePosition(center, zone.radiusMeters), {
                draggable: true,
                title: "Arrastra para cambiar el radio de la zona segura",
                icon: leaflet.divIcon({
                    className: "",
                    html: '<span class="zone-handle zone-handle-radius" aria-hidden="true"></span>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(this.zoneMap);
            this.radiusHandle.on("drag", () => this.handleRadiusDrag());
            this.radiusHandle.on("dragend", () => this.handleRadiusDragEnd());
        })();

        try {
            await this.zoneMapInit;
        } catch (error) {
            this.zoneMapInit = null;
            throw error;
        }
    }

    handleCenterDragEnd() {
        if (!this.currentZone) return;
        const position = this.centerHandle.getLatLng();
        const nextZone = {
            center: { lat: position.lat, lng: position.lng },
            radiusMeters: Math.round(this.zoneCircle.getRadius())
        };
        this.applyZone(nextZone);
        this.onZoneChange?.(nextZone);
    }

    handleRadiusDrag() {
        const radiusMeters = this.readRadiusFromHandles();
        this.zoneCircle.setRadius(radiusMeters);
        this.zoneRadiusInput.value = String(radiusMeters);
        this.zoneRadiusValue.textContent = this.formatRadius(radiusMeters);
    }

    handleRadiusDragEnd() {
        if (!this.currentZone) return;
        const centerPosition = this.centerHandle.getLatLng();
        const nextZone = {
            center: { lat: centerPosition.lat, lng: centerPosition.lng },
            radiusMeters: this.readRadiusFromHandles()
        };
        this.applyZone(nextZone);
        this.onZoneChange?.(nextZone);
    }

    readRadiusFromHandles() {
        const rawRadius = this.zoneMap.distance(this.centerHandle.getLatLng(), this.radiusHandle.getLatLng());
        const { min, max } = CONFIG.SAFE_ZONE_RADIUS_LIMITS;
        return Math.min(max, Math.max(min, Math.round(rawRadius)));
    }

    getRadiusHandlePosition(center, radiusMeters) {
        return [center.lat + radiusMeters / 111320, center.lng];
    }

    formatRadius(radiusMeters) {
        return radiusMeters >= 1000
            ? `${(radiusMeters / 1000).toLocaleString("es-EC", { maximumFractionDigits: 1 })} km`
            : `${radiusMeters} m`;
    }

    applyZone(zone) {
        this.currentZone = zone;
        if (!this.zoneMap) return;
        const position = [zone.center.lat, zone.center.lng];
        this.zoneCircle.setLatLng(position);
        this.zoneCircle.setRadius(zone.radiusMeters);
        this.centerHandle.setLatLng(position);
        this.radiusHandle.setLatLng(this.getRadiusHandlePosition(zone.center, zone.radiusMeters));
        this.zoneRadiusInput.value = String(zone.radiusMeters);
        this.zoneRadiusValue.textContent = this.formatRadius(zone.radiusMeters);
    }

    updateRouteLayer(route) {
        if (this.routeLine) {
            this.routeLine.remove();
            this.routeLine = null;
        }
        this.routeLegend.replaceChildren();
        this.routeLegend.hidden = true;
        if (!route?.coordinates?.length) return;

        this.routeLine = this.leaflet.polyline(route.coordinates, {
            color: "#e03131",
            weight: 5,
            opacity: 0.9,
            lineCap: "round"
        }).addTo(this.zoneMap);

        const dot = this.document.createElement("span");
        dot.className = "route-legend-dot";
        dot.setAttribute("aria-hidden", "true");
        const label = this.document.createElement("span");
        label.textContent = `Ruta #${route.number}${route.name ? ` · ${route.name}` : ""} (demo)`;
        this.routeLegend.append(dot, label);
        this.routeLegend.hidden = false;
    }

    updateChildMarker(location) {
        if (!location) {
            this.childMarker?.remove();
            this.childMarker = null;
            return;
        }

        const position = [location.latitude, location.longitude];
        const markerWasCreated = !this.childMarker;
        if (markerWasCreated) {
            this.childMarker = this.leaflet.marker(position, {
                title: "Última ubicación compartida",
                icon: this.leaflet.divIcon({
                    className: "",
                    html: '<span class="zone-child-pin" aria-hidden="true"></span>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(this.zoneMap);
            this.childMarker.bindPopup("Última ubicación compartida");
        } else {
            this.childMarker.setLatLng(position);
        }
        const isVisible = this.zoneMap.getBounds().pad(-0.15).contains(position);
        if (markerWasCreated || !isVisible) {
            this.zoneMap.setView(position, Math.max(this.zoneMap.getZoom(), 15));
        }
    }

    updateZoneStatus(trip, location, zone, childName) {
        this.zoneStatus.className = "zone-status";
        if (!location) {
            this.zoneStatus.textContent = `${childName} aún no comparte su ubicación. Zona segura activa de ${this.formatRadius(zone.radiusMeters)}.`;
            this.zoneStatus.classList.add("is-idle");
            return;
        }

        const meters = Math.round(distanceInMeters(
            { latitude: location.latitude, longitude: location.longitude },
            { latitude: zone.center.lat, longitude: zone.center.lng }
        ));
        const inside = meters <= zone.radiusMeters;
        const distanceText = `a ${this.formatRadius(meters)} del centro · ${inside ? "dentro" : "fuera"} de la zona segura`;
        this.zoneStatus.textContent = trip?.route?.number
            ? `${childName} está en la ruta #${trip.route.number} · ${distanceText}.`
            : `${childName} está ${distanceText}.`;
        this.zoneStatus.classList.add(inside ? "is-inside" : "is-outside");
    }

    formatDate(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "hora no disponible" : date.toLocaleString("es-EC");
    }

    showError(message) {
        this.status.textContent = message;
        this.status.classList.add("is-error");
        this.status.hidden = false;
    }

    clearError() {
        this.status.classList.remove("is-error");
        this.status.hidden = true;
    }
}

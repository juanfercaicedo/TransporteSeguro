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
        this.locationLink = this.document.getElementById("parent-location-link");
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
    }

    bindSettings({ onAddChild, onRemoveChild }) {
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
        this.onRemoveChild = onRemoveChild;
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
        this.renderLocation(trip.location);
        this.childPresence.textContent = trip.location ? "Compartió su ubicación" : "Sin ubicación compartida";
        this.connectionBadge.textContent = trip.location ? "Ubicación activa" : "Sin ubicación";
    }

    renderLocation(location) {
        this.locationMap.replaceChildren();
        if (!location) {
            this.location.textContent = "Aún no ha compartido su ubicación.";
            this.locationMap.hidden = true;
            this.locationLink.hidden = true;
            return;
        }

        const { latitude, longitude } = location;
        this.location.textContent = `Última ubicación compartida${location.updatedAt
            ? ` · ${this.formatDate(location.updatedAt)}`
            : ""}`;
        this.locationMap.hidden = false;
        this.locationLink.hidden = false;

        const longitudeDelta = Math.min(180, 0.02 / Math.max(Math.cos(latitude * Math.PI / 180), 0.2));
        const mapUrl = new URL("https://www.openstreetmap.org/export/embed.html");
        mapUrl.searchParams.set("bbox", [
            longitude - longitudeDelta,
            latitude - 0.012,
            longitude + longitudeDelta,
            latitude + 0.012
        ].join(","));
        mapUrl.searchParams.set("layer", "mapnik");
        mapUrl.searchParams.set("marker", `${latitude},${longitude}`);

        const frame = this.document.createElement("iframe");
        frame.className = "parent-location-frame";
        frame.title = "Mapa de la última ubicación compartida por el estudiante";
        frame.loading = "lazy";
        frame.src = mapUrl.toString();
        this.locationMap.append(frame);

        const googleMapsUrl = new URL("https://www.google.com/maps/search/");
        googleMapsUrl.searchParams.set("api", "1");
        googleMapsUrl.searchParams.set("query", `${latitude},${longitude}`);
        this.locationLink.href = googleMapsUrl.toString();
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

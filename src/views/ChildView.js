export class ChildView {
    constructor(documentRef = document) {
        this.document = documentRef;
        this.mapElement = this.document.getElementById("map");
        this.originInput = this.document.getElementById("origen");
        this.destinationInput = this.document.getElementById("destino");
        this.calculateButton = this.document.getElementById("btnCalcular");
        this.locationButton = this.document.getElementById("btnShareLocation");
        this.stopSharingButton = this.document.getElementById("btnStopSharing");
        this.statusElement = this.document.getElementById("child-status");
        this.mapsLink = this.document.getElementById("open-in-google-maps");
        this.routesPanel = this.document.getElementById("route-options");
        this.instructionsPanel = this.document.getElementById("instructions");
        this.directionsPanel = this.document.getElementById("directions-text-panel");
        this.stopSummaryPanel = this.document.getElementById("route-stop-summary");
        this.stopMarkerLegend = this.document.getElementById("map-stop-legend");
        this.busStopCount = this.document.getElementById("bus-stop-count");
        this.settingsDialog = this.document.getElementById("child-settings");
        this.profileSelect = this.document.getElementById("active-child-profile");
        this.profileName = this.document.getElementById("active-child-name");
        this.settingsStatus = this.document.getElementById("child-settings-status");
        this.pairingCode = this.document.getElementById("child-pairing-code");
        this.currentResponse = null;
    }

    renderPairingCode(code) {
        if (this.pairingCode) this.pairingCode.textContent = code;
    }

    bindSettings({ onSelectProfile, onAddProfile }) {
        this.document.getElementById("open-child-settings").addEventListener("click", () => {
            this.settingsStatus.textContent = "";
            this.settingsDialog.showModal();
        });
        this.document.getElementById("close-child-settings").addEventListener("click", () => {
            this.settingsDialog.close();
        });
        this.document.getElementById("save-active-child-profile").addEventListener("click", () => {
            onSelectProfile(this.profileSelect.value);
        });
        this.document.getElementById("add-child-profile-form").addEventListener("submit", (event) => {
            event.preventDefault();
            const input = this.document.getElementById("new-child-name");
            onAddProfile(input.value.trim());
        });
    }

    renderChildProfiles(profiles, activeProfileId) {
        this.profileSelect.replaceChildren();
        const placeholder = this.document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = profiles.length ? "Selecciona un perfil" : "Aún no hay perfiles";
        this.profileSelect.append(placeholder);
        profiles.forEach((profile) => {
            const option = this.document.createElement("option");
            option.value = profile.id;
            option.textContent = profile.name;
            this.profileSelect.append(option);
        });
        this.profileSelect.value = activeProfileId || "";
        this.profileName.textContent = profiles.find((profile) => profile.id === activeProfileId)?.name || "Estudiante";
    }

    showSettingsStatus(message, isError = false) {
        this.settingsStatus.textContent = message;
        this.settingsStatus.classList.toggle("is-error", isError);
    }

    bindCalculateRoute(handler) {
        this.calculateButton.addEventListener("click", () => {
            handler(this.originInput.value.trim(), this.destinationInput.value.trim());
        });
        [this.originInput, this.destinationInput].forEach((input) => {
            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    handler(this.originInput.value.trim(), this.destinationInput.value.trim());
                }
            });
        });
    }

    bindShareLocation(handler) {
        this.locationButton.addEventListener("click", handler);
    }

    bindStopSharing(handler) {
        this.stopSharingButton.addEventListener("click", () => {
            this.stopSharingButton.disabled = true;
            handler();
        });
    }

    setRouteSearchLink(origin, destination) {
        const url = new URL("https://www.google.com/maps/dir/");
        url.searchParams.set("api", "1");
        url.searchParams.set("origin", origin);
        url.searchParams.set("destination", destination);
        url.searchParams.set("travelmode", "transit");
        this.mapsLink.href = url.toString();
        this.mapsLink.hidden = false;
    }

    setLoading(isLoading) {
        this.calculateButton.disabled = isLoading;
        this.calculateButton.textContent = isLoading ? "Buscando parada y ruta…" : "Buscar parada y ruta";
    }

    showStatus(message, isError = false) {
        this.statusElement.textContent = message;
        this.statusElement.classList.toggle("is-error", isError);
    }

    showStopMarkerLegend(isVisible) {
        this.stopMarkerLegend.hidden = !isVisible;
    }

    showBusStopCount(count) {
        this.busStopCount.textContent = `${count.toLocaleString("es-EC")} paradas de bus`;
    }

    showBusStopError() {
        this.busStopCount.textContent = "No se pudieron cargar las paradas";
    }

    showMapFallback(message) {
        const map = this.document.createElement("div");
        map.className = "map-fallback-leaflet";
        map.setAttribute("aria-label", "Mapa de Quito con paradas de bus");

        const note = this.document.createElement("p");
        note.className = "map-fallback-note";
        note.textContent = message;
        this.mapElement.replaceChildren(map, note);
    }

    renderDemoRoute(route) {
        this.currentResponse = null;
        this.routesPanel.replaceChildren();
        const button = this.document.createElement("button");
        button.className = "route-option";
        button.type = "button";
        button.setAttribute("aria-pressed", "true");
        const title = this.document.createElement("strong");
        title.textContent = `Ruta #${route.number} · ${route.name} (demo ficticio)`;
        const summary = this.document.createElement("span");
        summary.textContent = `${route.stops.length} paradas · baja en ${route.dropOff.name}`;
        const boarding = this.document.createElement("span");
        boarding.textContent = `Sube en: ${route.boarding.name}`;
        button.append(title, summary, boarding);
        button.addEventListener("click", () => this.showDemoRouteDetails(route));
        this.routesPanel.append(button);
        this.showDemoRouteDetails(route);
    }

    showDemoRouteDetails(route) {
        this.instructionsPanel.hidden = false;

        const stopSummary = this.document.createElement("section");
        stopSummary.className = "route-stop-summary";

        const boarding = this.document.createElement("p");
        const boardingLabel = this.document.createElement("strong");
        boardingLabel.textContent = "Parada sugerida para subir";
        const boardingName = this.document.createElement("span");
        boardingName.textContent = `${route.boarding.name} (parada ${route.boarding.index + 1} de ${route.stops.length})`;
        boarding.append(boardingLabel, boardingName);

        const dropOff = this.document.createElement("p");
        const dropOffLabel = this.document.createElement("strong");
        dropOffLabel.textContent = "Parada para bajar";
        const dropOffName = this.document.createElement("span");
        dropOffName.textContent = `${route.dropOff.name} (parada ${route.dropOff.index + 1} de ${route.stops.length})`;
        dropOff.append(dropOffLabel, dropOffName);

        stopSummary.append(boarding, dropOff);
        this.stopSummaryPanel.replaceChildren(stopSummary);

        const stopsPanel = this.document.createElement("div");
        stopsPanel.className = "demo-route-stops";
        const stopsLabel = this.document.createElement("strong");
        stopsLabel.textContent = "Paradas de la ruta";
        const stopsText = this.document.createElement("span");
        stopsText.textContent = route.stops
            .map((stop, index) => `${index + 1}. ${stop.name}`)
            .join(" → ");
        const demoNote = this.document.createElement("small");
        demoNote.textContent = "Ruta ficticia para el prototipo; los nombres y coordenadas de las paradas provienen de OpenStreetMap.";
        stopsPanel.append(stopsLabel, stopsText, demoNote);
        this.directionsPanel.replaceChildren(stopsPanel);
    }

    renderRoutes(response, onSelectRoute) {
        this.currentResponse = response;
        this.routesPanel.replaceChildren();
        const routesByDuration = response.routes
            .map((route, index) => ({ route, index, seconds: route.legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0) }))
            .sort((first, second) => first.seconds - second.seconds);
        routesByDuration.forEach(({ route, index }, rank) => {
                const button = this.document.createElement("button");
                button.className = "route-option";
                button.type = "button";
                button.setAttribute("aria-pressed", String(rank === 0));
                const title = this.document.createElement("strong");
                title.textContent = rank === 0 ? "Más rápida · recomendada" : `Alternativa ${rank + 1}`;
                const summary = this.document.createElement("span");
                const stops = this.getTransitStops(route);
                summary.textContent = this.describeRoute(route);
                button.append(title, summary);
                if (stops.first) {
                    const boardingStop = this.document.createElement("span");
                    boardingStop.textContent = `Sube en: ${stops.first.transit.departure_stop?.name || "Parada cercana"}`;
                    button.append(boardingStop);
                }
                button.addEventListener("click", () => {
                    this.routesPanel.querySelectorAll("button").forEach((option) => {
                        option.setAttribute("aria-pressed", String(option === button));
                    });
                    onSelectRoute(index);
                });
                this.routesPanel.append(button);
            });
        return routesByDuration[0]?.index ?? 0;
    }

    getTransitStops(route) {
        const steps = route.legs.flatMap((leg) => leg.steps || []);
        const transitSteps = steps.filter((step) => step.travel_mode === "TRANSIT" && step.transit);
        return {
            first: transitSteps[0] || null,
            last: transitSteps[transitSteps.length - 1] || null,
            accessSteps: transitSteps.length
                ? steps.slice(0, steps.indexOf(transitSteps[0])).filter((step) => step.travel_mode === "WALKING")
                : []
        };
    }

    describeWalkingAccess(steps) {
        if (!steps.length) return "";
        const meters = steps.reduce((total, step) => total + (step.distance?.value || 0), 0);
        const seconds = steps.reduce((total, step) => total + (step.duration?.value || 0), 0);
        const details = [];
        if (meters > 0) {
            details.push(meters >= 1000
                ? `${(meters / 1000).toLocaleString("es-EC", { maximumFractionDigits: 1 })} km`
                : `${meters} m`);
        }
        if (seconds > 0) details.push(`${Math.round(seconds / 60)} min`);
        return `Camina${details.length ? ` ${details.join(" · ")}` : ""} hasta la parada`;
    }

    describeRoute(route) {
        const duration = route.legs.reduce((total, leg) => total + (leg.duration?.value || 0), 0);
        const distance = route.legs.reduce((total, leg) => total + (leg.distance?.value || 0), 0);
        const transfers = route.legs.reduce((total, leg) =>
            total + leg.steps.filter((step) => step.travel_mode === "TRANSIT").length, 0
        );
        const minutes = Math.round(duration / 60);
        const transferCount = Math.max(0, transfers - 1);
        const distanceLabel = distance > 0
            ? `${(distance / 1000).toLocaleString("es-EC", { maximumFractionDigits: 1 })} km`
            : "Distancia no disponible";
        return `${minutes} min aprox. · ${distanceLabel} · ${transferCount} transbordo${transferCount === 1 ? "" : "s"}`;
    }

    showRouteDetails(response, routeIndex) {
        const route = response.routes[routeIndex];
        const stops = this.getTransitStops(route);
        this.instructionsPanel.hidden = false;
        if (stops.first) {
            const stopSummary = this.document.createElement("section");
            stopSummary.className = "route-stop-summary";
            const boarding = this.document.createElement("p");
            const boardingLabel = this.document.createElement("strong");
            boardingLabel.textContent = "Parada sugerida para subir";
            const boardingName = this.document.createElement("span");
            boardingName.textContent = stops.first.transit.departure_stop?.name || "Parada no disponible";
            boarding.append(boardingLabel, boardingName);

            const access = this.describeWalkingAccess(stops.accessSteps);
            if (access) {
                const accessNote = this.document.createElement("small");
                accessNote.textContent = access;
                boarding.append(accessNote);
            }

            const arrival = this.document.createElement("p");
            const arrivalLabel = this.document.createElement("strong");
            arrivalLabel.textContent = "Parada para bajar";
            const arrivalName = this.document.createElement("span");
            arrivalName.textContent = stops.last.transit.arrival_stop?.name || "Parada no disponible";
            arrival.append(arrivalLabel, arrivalName);
            stopSummary.append(boarding, arrival);
            this.stopSummaryPanel.replaceChildren(stopSummary);
        } else {
            this.stopSummaryPanel.replaceChildren();
        }
    }

    showShareStatus(isSharing) {
        this.locationButton.disabled = isSharing;
        this.stopSharingButton.disabled = !isSharing;
    }
}

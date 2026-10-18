import { ChildModel } from "../models/ChildModel.js";
import { ChildProfilesModel } from "../models/ChildProfilesModel.js";
import { PairingModel } from "../models/PairingModel.js";
import { ensureDemoData } from "../models/DemoSeed.js";
import { ChildView } from "../views/ChildView.js";

function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

export class ChildController {
    constructor(model = new ChildModel(), view = new ChildView(), profilesModel = new ChildProfilesModel(), pairingModel = new PairingModel()) {
        ensureDemoData();
        this.model = model;
        this.view = view;
        this.profilesModel = profilesModel;
        this.pairingModel = pairingModel;
        this.demoRoute = this.model.getDemoRoute();
        this.currentRoutes = null;
        this.view.bindCalculateRoute(this.handleCalculateRoute.bind(this));
        this.view.bindShareLocation(this.handleShareLocation.bind(this));
        this.view.bindStopSharing(this.handleStopSharing.bind(this));
        this.view.bindSettings({
            onSelectProfile: this.handleSelectProfile.bind(this),
            onAddProfile: this.handleAddProfile.bind(this)
        });
        this.unsubscribeProfiles = this.profilesModel.subscribe(
            this.handleProfilesUpdate.bind(this),
            (error) => this.view.showSettingsStatus(getErrorMessage(error), true)
        );
        window.addEventListener("pagehide", () => this.unsubscribeProfiles?.(), { once: true });
        this.initialize();
    }

    async initialize() {
        let savedTripError = "";
        try {
            this.view.renderDemoRoute(this.demoRoute);
            this.view.renderPairingCode(this.pairingModel.getCode());
            const profiles = this.profilesModel.getProfiles();
            let activeProfileId = this.profilesModel.getActiveProfileId();
            let activeProfile = profiles.find((profile) => profile.id === activeProfileId) || null;
            if (activeProfileId && !activeProfile) {
                this.profilesModel.setActiveProfile(null);
                activeProfileId = null;
            }
            this.model.setChildProfile(activeProfile);
            this.view.renderChildProfiles(profiles, activeProfileId);
            this.view.showShareStatus(Boolean(this.model.loadSavedTrip()?.location));
        } catch (error) {
            savedTripError = getErrorMessage(error);
        }

        let busStops = null;
        let busStopsWarning = "";
        try {
            busStops = await this.model.loadBusStops();
            this.view.showBusStopCount(busStops.features.length);
        } catch (error) {
            busStopsWarning = `No se cargó el catálogo de paradas: ${getErrorMessage(error)}`;
            this.view.showBusStopError();
        }

        try {
            await this.model.initializeMap(this.view.mapElement, this.view.directionsPanel);
        } catch (error) {
            const mapError = `${getErrorMessage(error)} Al buscar, podrás abrir el recorrido en Google Maps.`;
            this.view.showMapFallback("Mapa de Quito · OpenStreetMap. El cálculo de rutas dentro de la app requiere configurar Google Maps.");
            let fallbackMapWarning = "";
            try {
                await this.model.initializeFallbackMap(
                    this.view.mapElement,
                    busStops || { type: "FeatureCollection", features: [] }
                );
            } catch (fallbackError) {
                fallbackMapWarning = `No se pudieron mostrar las paradas en el mapa: ${getErrorMessage(fallbackError)}`;
            }
            if (this.demoRoute) {
                try {
                    this.model.displayDemoRoute(this.demoRoute);
                } catch {
                    // la línea de la ruta en el mapa es decorativa
                }
            }
            this.view.showStatus([
                savedTripError,
                mapError,
                busStopsWarning,
                fallbackMapWarning
            ].filter(Boolean).join(" "), true);
            return;
        }

        let autocompleteWarning = "";
        try {
            this.model.initializeAddressAutocomplete(this.view.originInput);
            this.model.initializeAddressAutocomplete(this.view.destinationInput);
        } catch (error) {
            autocompleteWarning = `No se pudieron activar las sugerencias: ${getErrorMessage(error)} Puedes escribir las direcciones manualmente.`;
        }
        if (busStops) {
            try {
                this.model.displayBusStops(busStops);
            } catch (error) {
                busStopsWarning = `No se pudieron mostrar las paradas en el mapa: ${getErrorMessage(error)}`;
            }
        }
        this.view.showStatus([
            savedTripError,
            autocompleteWarning,
            busStopsWarning,
            !savedTripError && !autocompleteWarning && !busStopsWarning
                ? "Escribe o selecciona una dirección de Quito para el origen y el destino."
                : ""
        ].filter(Boolean).join(" "), Boolean(savedTripError || autocompleteWarning || busStopsWarning));
    }

    handleProfilesUpdate(profiles, activeProfileId) {
        const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || null;
        this.model.setChildProfile(activeProfile);
        this.view.renderChildProfiles(profiles, activeProfileId);
    }

    handleSelectProfile(profileId) {
        try {
            if (!profileId) throw new Error("Selecciona o añade un perfil de estudiante.");
            this.profilesModel.setActiveProfile(profileId);
            const profiles = this.profilesModel.getProfiles();
            this.handleProfilesUpdate(profiles, profileId);
            this.view.showSettingsStatus("Perfil actualizado para este dispositivo.");
        } catch (error) {
            this.view.showSettingsStatus(getErrorMessage(error), true);
        }
    }

    handleAddProfile(name) {
        try {
            const profile = this.profilesModel.addProfile(name);
            this.profilesModel.setActiveProfile(profile.id);
            this.handleProfilesUpdate(this.profilesModel.getProfiles(), profile.id);
            this.view.showSettingsStatus(`Se añadió el perfil de ${profile.name}.`);
            this.view.document.getElementById("new-child-name").value = "";
        } catch (error) {
            this.view.showSettingsStatus(getErrorMessage(error), true);
        }
    }

    async handleCalculateRoute(origin, destination) {
        if (!origin || !destination) {
            this.view.showStatus("Escribe tanto el origen como el destino.", true);
            return;
        }

        this.view.setRouteSearchLink(origin, destination);
        this.view.setLoading(true);
        this.view.showStatus("Buscando rutas de transporte público…");
        try {
            this.currentRoutes = await this.model.getTransitRoutes(origin, destination);
            const fastestRouteIndex = this.view.renderRoutes(this.currentRoutes, this.handleSelectRoute.bind(this));
            if (this.handleSelectRoute(fastestRouteIndex)) {
                this.view.showStatus("Alternativas ordenadas por duración; la más rápida está recomendada.");
            }
        } catch (error) {
            if (this.demoRoute) {
                this.view.renderDemoRoute(this.demoRoute);
                this.view.showStatus(
                    `Google Maps no está configurado para calcular rutas dentro de la app; ` +
                    `se muestra la ruta ficticia #${this.demoRoute.number} con paradas reales de Quito (demo).`
                );
            } else {
                this.view.showStatus(getErrorMessage(error), true);
            }
        } finally {
            this.view.setLoading(false);
        }
    }

    handleSelectRoute(routeIndex) {
        if (!this.currentRoutes) return false;
        try {
            this.view.showRouteDetails(this.currentRoutes, routeIndex);
            const stopMarkerCount = this.model.selectRoute(this.currentRoutes, routeIndex);
            this.view.showStopMarkerLegend(stopMarkerCount > 0);
            return true;
        } catch (error) {
            this.view.showStatus(getErrorMessage(error), true);
            return false;
        }
    }

    async handleShareLocation() {
        if (this.model.currentTrip?.location) {
            this.view.showStatus("La ubicación ya está compartida en este navegador. Paúsala antes de volver a compartir.");
            return;
        }
        const confirmed = window.confirm("¿Permites compartir tu ubicación actual con la vista familiar en este navegador? No se enviará a un servidor.");
        if (!confirmed) return;

        this.view.locationButton.disabled = true;
        this.view.showStatus("Solicitando permiso de ubicación…");
        try {
            await this.model.shareCurrentLocation();
            this.view.showShareStatus(true);
            this.view.showStatus("Ubicación compartida en este navegador. Puedes pausarla cuando quieras.");
        } catch (error) {
            this.view.showStatus(`No se pudo compartir la ubicación: ${getErrorMessage(error)}`, true);
        } finally {
            this.view.locationButton.disabled = Boolean(this.model.currentTrip?.location);
        }
    }

    handleStopSharing() {
        try {
            this.model.stopLocationSharing();
            this.view.showShareStatus(false);
            this.view.showStatus("Se quitó la ubicación compartida de este navegador.");
        } catch (error) {
            this.view.stopSharingButton.disabled = false;
            this.view.showStatus(getErrorMessage(error), true);
        }
    }
}

if (document.getElementById("child-dashboard")) {
    new ChildController();
}

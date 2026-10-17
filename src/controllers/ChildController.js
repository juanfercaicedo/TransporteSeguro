import { ChildModel } from "../models/ChildModel.js";
import { ChildProfilesModel } from "../models/ChildProfilesModel.js";
import { ChildView } from "../views/ChildView.js";

function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

export class ChildController {
    constructor(model = new ChildModel(), view = new ChildView(), profilesModel = new ChildProfilesModel()) {
        this.model = model;
        this.view = view;
        this.profilesModel = profilesModel;
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
        try {
            await this.model.initializeMap(this.view.mapElement);
            this.view.showStatus(savedTripError || "Escribe origen y destino para buscar rutas.", Boolean(savedTripError));
        } catch (error) {
            const mapError = `${getErrorMessage(error)} Al buscar, podrás abrir el recorrido en Google Maps.`;
            this.view.showMapFallback("Mapa de Quito · OpenStreetMap. El cálculo de rutas dentro de la app requiere configurar Google Maps.");
            this.view.showStatus([savedTripError, mapError].filter(Boolean).join(" "), true);
        }
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
            this.view.showStatus(getErrorMessage(error), true);
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

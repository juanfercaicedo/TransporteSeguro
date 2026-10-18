import { ParentModel } from "../models/parentModel.js";
import { ChildProfilesModel } from "../models/ChildProfilesModel.js";
import { SafeZoneModel } from "../models/SafeZoneModel.js";
import { PairingModel } from "../models/PairingModel.js";
import { RouteSimulationModel } from "../models/RouteSimulationModel.js";
import { ensureDemoData } from "../models/DemoSeed.js";
import { CONFIG } from "../config/config.js";
import { ParentView } from "../views/ParentView.js";

function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

export class ParentController {
    constructor(
        model = new ParentModel(),
        view = new ParentView(),
        profilesModel = new ChildProfilesModel(),
        safeZoneModel = new SafeZoneModel(),
        pairingModel = new PairingModel(),
        simulationModel = new RouteSimulationModel()
    ) {
        ensureDemoData();
        this.model = model;
        this.view = view;
        this.profilesModel = profilesModel;
        this.safeZoneModel = safeZoneModel;
        this.pairingModel = pairingModel;
        this.simulationModel = simulationModel;
        this.profiles = [];
        this.currentTrip = null;
        this.currentZone = this.safeZoneModel.getZone();
        this.view.bindRefresh(this.refresh.bind(this));
        this.view.bindSettings({
            onAddChild: this.handleAddChild.bind(this),
            onRemoveChild: this.handleRemoveChild.bind(this),
            onResetDemo: this.handleResetDemo.bind(this)
        });
        this.view.bindSafeZone({
            onZoneChange: this.handleZoneChange.bind(this),
            onReset: this.handleZoneReset.bind(this)
        });
        this.view.bindPairing({
            onPair: this.handlePair.bind(this),
            onUnpair: this.handleUnpair.bind(this)
        });
        this.view.bindSimulation({
            onToggle: this.handleSimulationToggle.bind(this)
        });
        this.unsubscribe = this.model.subscribeToTripUpdates(
            (trip) => {
                this.view.clearError();
                this.currentTrip = trip;
                this.updateView();
            },
            (error) => this.view.showError(getErrorMessage(error))
        );
        this.unsubscribeProfiles = this.profilesModel.subscribe(
            (profiles) => {
                this.profiles = profiles;
                this.view.renderChildProfiles(profiles);
                this.currentTrip = this.model.getCurrentTrip();
                this.updateView();
                this.updatePairingView();
            },
            (error) => this.view.showError(getErrorMessage(error))
        );
        this.unsubscribeZone = this.safeZoneModel.subscribe(
            (zone) => {
                this.currentZone = zone;
                this.updateView();
            },
            (error) => this.view.showError(getErrorMessage(error))
        );
        window.addEventListener("pagehide", this.handlePageHide, { once: true });
        this.refresh();
    }

    handlePageHide = () => {
        this.simulationModel.stop();
        this.unsubscribe?.();
        this.unsubscribeProfiles?.();
        this.unsubscribeZone?.();
    };

    refresh() {
        try {
            this.view.clearError();
            this.profiles = this.profilesModel.getProfiles();
            this.view.renderChildProfiles(this.profiles);
            this.currentTrip = this.model.getCurrentTrip();
            this.currentZone = this.safeZoneModel.getZone();
            this.updateView();
            this.updatePairingView();
        } catch (error) {
            this.view.showError(getErrorMessage(error));
        }
    }

    updateView() {
        this.view.renderTrip(this.currentTrip, this.profiles);
        this.view.renderLocationPanel(this.currentTrip, this.currentZone, this.profiles)
            .catch((error) => this.view.showError(getErrorMessage(error)));
    }

    updatePairingView() {
        try {
            const pairedChildId = this.pairingModel.getPairedChildId();
            const pairedChild = this.profiles.find((profile) => profile.id === pairedChildId) || null;
            this.view.renderPairingState(this.pairingModel.getCode(), pairedChild?.name || null);
        } catch (error) {
            this.view.showSettingsStatus(getErrorMessage(error), true);
        }
    }

    handleZoneChange(zone) {
        try {
            this.currentZone = this.safeZoneModel.saveZone(zone);
            this.updateView();
        } catch (error) {
            this.view.showError(getErrorMessage(error));
        }
    }

    handleZoneReset() {
        try {
            this.currentZone = this.safeZoneModel.saveZone(this.safeZoneModel.getDefaultZone());
            this.updateView();
        } catch (error) {
            this.view.showError(getErrorMessage(error));
        }
    }

    handlePair(code) {
        try {
            const childId = this.pairingModel.pair(code);
            this.updatePairingView();
            const child = this.profiles.find((profile) => profile.id === childId);
            this.view.showSettingsStatus(`Vinculación simulada con ${child?.name || "tu hijo/a"}.`);
        } catch (error) {
            this.view.showSettingsStatus(getErrorMessage(error), true);
        }
    }

    handleUnpair() {
        try {
            this.pairingModel.unpair();
            this.updatePairingView();
            this.view.showSettingsStatus("Se quitó la vinculación simulada.");
        } catch (error) {
            this.view.showSettingsStatus(getErrorMessage(error), true);
        }
    }

    handleSimulationToggle() {
        if (this.simulationModel.isRunning) {
            this.simulationModel.stop();
            this.view.setSimulationRunning(false, this.currentTrip?.route?.number);
            this.view.setSimulationProgress("Simulación pausada.");
            return;
        }

        const routeNumber = this.currentTrip?.route?.number;
        if (!routeNumber) {
            this.view.showError("Este viaje no tiene una ruta de bus ficticia asociada.");
            return;
        }

        try {
            this.view.clearError();
            this.simulationModel.start(
                (trip) => {
                    this.currentTrip = trip;
                    this.updateView();
                    const percent = Math.round((trip.sim?.progress ?? 0) * 100);
                    this.view.setSimulationProgress(`Simulación en curso: ${percent}% del recorrido de la ruta #${routeNumber}.`);
                },
                () => {
                    this.view.setSimulationRunning(false, routeNumber);
                    this.view.setSimulationProgress(`Mateo llegó al final de la ruta #${routeNumber}.`);
                },
                (error) => {
                    this.view.setSimulationRunning(false, routeNumber);
                    this.view.showError(getErrorMessage(error));
                }
            );
            this.view.setSimulationRunning(true, routeNumber);
            this.view.setSimulationProgress(`Simulación en curso: 0% del recorrido de la ruta #${routeNumber}.`);
        } catch (error) {
            this.view.showError(getErrorMessage(error));
        }
    }

    handleAddChild(name) {
        try {
            const profile = this.profilesModel.addProfile(name);
            this.refresh();
            this.view.showSettingsStatus(`Se añadió el perfil de ${profile.name}.`);
            this.view.document.getElementById("parent-new-child-name").value = "";
        } catch (error) {
            this.view.showSettingsStatus(getErrorMessage(error), true);
        }
    }

    handleRemoveChild(profileId) {
        const profile = this.profiles.find((child) => child.id === profileId);
        if (!profile || !window.confirm(`¿Quieres quitar el perfil de ${profile.name}?`)) return;
        try {
            this.profilesModel.removeProfile(profileId);
            this.refresh();
            this.view.showSettingsStatus(`Se quitó el perfil de ${profile.name}.`);
        } catch (error) {
            this.view.showSettingsStatus(getErrorMessage(error), true);
        }
    }

    handleResetDemo() {
        if (!window.confirm("¿Restablecer los datos de demostración (Mateo, ruta #10 y su ubicación)? Se borrará el viaje guardado en este navegador.")) return;
        try {
            this.simulationModel.stop();
            localStorage.removeItem(CONFIG.TRIP_STORAGE_KEY);
            localStorage.removeItem(CONFIG.DEMO_SEED_KEY);
            ensureDemoData();
            this.view.setSimulationRunning(false, CONFIG.DEMO_BUS_ROUTE.number);
            this.view.setSimulationProgress("");
            this.refresh();
            this.view.showSettingsStatus("Datos de demostración restablecidos: Mateo está en la ruta #10.");
        } catch (error) {
            this.view.showSettingsStatus(getErrorMessage(error), true);
        }
    }
}

if (document.getElementById("parent-dashboard")) {
    new ParentController();
}

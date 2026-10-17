import { ParentModel } from "../models/ParentModel.js";
import { ChildProfilesModel } from "../models/ChildProfilesModel.js";
import { ParentView } from "../views/ParentView.js";

function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

export class ParentController {
    constructor(model = new ParentModel(), view = new ParentView(), profilesModel = new ChildProfilesModel()) {
        this.model = model;
        this.view = view;
        this.profilesModel = profilesModel;
        this.profiles = [];
        this.view.bindRefresh(this.refresh.bind(this));
        this.view.bindSettings({
            onAddChild: this.handleAddChild.bind(this),
            onRemoveChild: this.handleRemoveChild.bind(this)
        });
        this.unsubscribe = this.model.subscribeToTripUpdates(
            (trip) => {
                this.view.clearError();
                this.updateView(trip);
            },
            (error) => this.view.showError(getErrorMessage(error))
        );
        this.unsubscribeProfiles = this.profilesModel.subscribe(
            (profiles) => {
                this.profiles = profiles;
                this.view.renderChildProfiles(profiles);
                this.updateView(this.model.getCurrentTrip());
            },
            (error) => this.view.showError(getErrorMessage(error))
        );
        window.addEventListener("pagehide", this.handlePageHide, { once: true });
        this.refresh();
    }

    handlePageHide = () => {
        this.unsubscribe?.();
        this.unsubscribeProfiles?.();
    };

    refresh() {
        try {
            this.view.clearError();
            this.profiles = this.profilesModel.getProfiles();
            this.view.renderChildProfiles(this.profiles);
            this.updateView(this.model.getCurrentTrip());
        } catch (error) {
            this.view.showError(getErrorMessage(error));
        }
    }

    updateView(trip) {
        this.view.renderTrip(trip, this.profiles);
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
}

if (document.getElementById("parent-dashboard")) {
    new ParentController();
}

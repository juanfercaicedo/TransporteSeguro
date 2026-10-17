import { CONFIG } from "../config/config.js";

export class ChildProfilesModel {
    getProfiles() {
        let savedProfiles;
        try {
            savedProfiles = localStorage.getItem(CONFIG.CHILD_PROFILES_STORAGE_KEY);
        } catch (error) {
            throw new Error(`No se pudieron leer los perfiles de estudiantes: ${error.message}`);
        }
        if (!savedProfiles) return [];

        try {
            const profiles = JSON.parse(savedProfiles);
            if (!Array.isArray(profiles) || profiles.some((profile) =>
                !profile ||
                typeof profile.id !== "string" ||
                typeof profile.name !== "string" ||
                !profile.name.trim()
            )) {
                throw new Error("la lista de perfiles no tiene un formato válido");
            }
            return profiles;
        } catch (error) {
            throw new Error(`Los perfiles guardados no son válidos: ${error.message}`);
        }
    }

    getActiveProfileId() {
        try {
            return localStorage.getItem(CONFIG.ACTIVE_CHILD_PROFILE_KEY);
        } catch (error) {
            throw new Error(`No se pudo leer el perfil activo: ${error.message}`);
        }
    }

    setActiveProfile(profileId) {
        if (profileId && !this.getProfiles().some((profile) => profile.id === profileId)) {
            throw new Error("No se encontró el perfil seleccionado.");
        }
        try {
            if (profileId) {
                localStorage.setItem(CONFIG.ACTIVE_CHILD_PROFILE_KEY, profileId);
            } else {
                localStorage.removeItem(CONFIG.ACTIVE_CHILD_PROFILE_KEY);
            }
        } catch (error) {
            throw new Error(`No se pudo guardar el perfil activo: ${error.message}`);
        }
    }

    addProfile(name) {
        const normalizedName = name.trim();
        if (!normalizedName) throw new Error("Escribe el nombre del estudiante.");

        const profiles = this.getProfiles();
        const profile = {
            id: globalThis.crypto.randomUUID(),
            name: normalizedName
        };
        this.saveProfiles([...profiles, profile]);
        return profile;
    }

    removeProfile(profileId) {
        const profiles = this.getProfiles();
        if (!profiles.some((profile) => profile.id === profileId)) {
            throw new Error("No se encontró el perfil que quieres quitar.");
        }
        this.saveProfiles(profiles.filter((profile) => profile.id !== profileId));
        if (this.getActiveProfileId() === profileId) this.setActiveProfile(null);
    }

    subscribe(onUpdate, onError) {
        const handleStorage = (event) => {
            if (
                event.key !== CONFIG.CHILD_PROFILES_STORAGE_KEY &&
                event.key !== CONFIG.ACTIVE_CHILD_PROFILE_KEY
            ) return;
            try {
                onUpdate(this.getProfiles(), this.getActiveProfileId());
            } catch (error) {
                onError(error);
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }

    saveProfiles(profiles) {
        try {
            localStorage.setItem(CONFIG.CHILD_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
        } catch (error) {
            throw new Error(`No se pudieron guardar los perfiles: ${error.message}`);
        }
    }
}

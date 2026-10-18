import { CONFIG } from "../config/config.js";

function generateCode() {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return String(values[0] % 1000000).padStart(6, "0");
}

export class PairingModel {
    getCode() {
        let code;
        try {
            code = localStorage.getItem(CONFIG.PAIRING_STORAGE_KEY);
        } catch (error) {
            throw new Error(`No se pudo leer el código de emparejamiento: ${error.message}`);
        }
        if (code && /^\d{6}$/.test(code)) return code;

        const newCode = generateCode();
        try {
            localStorage.setItem(CONFIG.PAIRING_STORAGE_KEY, newCode);
        } catch (error) {
            throw new Error(`No se pudo generar el código de emparejamiento: ${error.message}`);
        }
        return newCode;
    }

    getPairedChildId() {
        try {
            return localStorage.getItem(CONFIG.PAIRED_CHILD_KEY);
        } catch (error) {
            throw new Error(`No se pudo leer la vinculación: ${error.message}`);
        }
    }

    pair(code, childId = CONFIG.DEMO_CHILD_ID) {
        const normalized = String(code ?? "").replace(/\D/g, "");
        if (!normalized) throw new Error("Escribe el código de emparejamiento.");
        if (normalized !== this.getCode()) {
            throw new Error("El código no coincide. Verifícalo en la vista estudiante.");
        }
        try {
            localStorage.setItem(CONFIG.PAIRED_CHILD_KEY, childId);
        } catch (error) {
            throw new Error(`No se pudo guardar la vinculación: ${error.message}`);
        }
        return childId;
    }

    unpair() {
        try {
            localStorage.removeItem(CONFIG.PAIRED_CHILD_KEY);
        } catch (error) {
            throw new Error(`No se pudo quitar la vinculación: ${error.message}`);
        }
    }
}

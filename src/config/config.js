export const CONFIG = Object.freeze({
    GOOGLE_MAPS_API_KEY: "",
    DEFAULT_LOCATION: Object.freeze({ lat: -0.180653, lng: -78.467838 }),
    QUITO_BOUNDS: Object.freeze({
        south: -0.50,
        west: -78.80,
        north: 0.10,
        east: -78.25
    }),
    TRIP_STORAGE_KEY: "transporte-seguro:trip",
    CHILD_PROFILES_STORAGE_KEY: "transporte-seguro:children",
    ACTIVE_CHILD_PROFILE_KEY: "transporte-seguro:active-child",
    SAFE_ZONE_STORAGE_KEY: "transporte-seguro:safe-zone",
    PAIRING_STORAGE_KEY: "transporte-seguro:pairing-code",
    PAIRED_CHILD_KEY: "transporte-seguro:paired-child",
    DEMO_SEED_KEY: "transporte-seguro:demo-seeded",
    DEMO_CHILD_ID: "demo-mateo",
    DEFAULT_SAFE_ZONE: Object.freeze({
        center: Object.freeze({ lat: -0.181, lng: -78.484 }),
        radiusMeters: 300
    }),
    SAFE_ZONE_RADIUS_LIMITS: Object.freeze({ min: 50, max: 2000 }),
    DEMO_BUS_ROUTE: Object.freeze({
        number: 10,
        name: "Av. De Los Shyris",
        boardingStop: "Portugal",
        stops: Object.freeze([
            Object.freeze({ name: "Shyris - República del Salvador", latitude: -0.18553, longitude: -78.48269 }),
            Object.freeze({ name: "Portugal", latitude: -0.18173, longitude: -78.48182 }),
            Object.freeze({ name: "De Los Shyris Y Portugal", latitude: -0.18123, longitude: -78.48198 }),
            Object.freeze({ name: "Carolina 2", latitude: -0.17862, longitude: -78.48148 }),
            Object.freeze({ name: "De Los Shyris Y Naciones Unidas", latitude: -0.17746, longitude: -78.48099 }),
            Object.freeze({ name: "De Los Shyris Y El Comercio", latitude: -0.17571, longitude: -78.48071 })
        ])
    })
});

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
    ACTIVE_CHILD_PROFILE_KEY: "transporte-seguro:active-child"
});

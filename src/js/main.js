document.documentElement.classList.add("js");

const phoneScreens = {
  route: {
    title: "Ruta planificada",
    chip: "2 tramos",
    footnote: "Ejemplo visual · sin datos en tiempo real",
    alertTitle: "Aviso a la familia",
    alertCopy: "Notificación al llegar · idea en desarrollo",
    recipientTitle: "Mateo está en camino",
    recipientCopy: "Ubicación compartida · demo",
    marker: { x: 122, y: 99 }
  },
  trip: {
    title: "En camino",
    chip: "En trayecto",
    footnote: "Seguimiento ilustrativo · no es ubicación real",
    alertTitle: "Viaje organizado",
    alertCopy: "Pasos del recorrido en una sola vista",
    recipientTitle: "Mateo salió de casa",
    recipientCopy: "Ubicación compartida · demo",
    marker: { x: 122, y: 99 }
  },
  sharing: {
    title: "Ubicación compartida",
    chip: "Con familia",
    footnote: "Punto de ubicación simulado · sin GPS real",
    alertTitle: "María recibió el enlace",
    alertCopy: "Vista compartida ilustrativa",
    recipientTitle: "Mateo comparte su viaje",
    recipientCopy: "Vista familiar · demostración",
    marker: { x: 291, y: 40 }
  }
};

const phoneTabs = [...document.querySelectorAll(".phone-tab")];
const phonePanel = document.querySelector("#phone-panel");
const mapMarker = document.querySelector("#map-user-marker");
const mapMarkerHalo = document.querySelector("#map-user-halo");
const mapMarkerLabelBackground = document.querySelector("#map-user-label-bg");
const mapMarkerLabel = document.querySelector("#map-user-label");
const recipientRoute = document.querySelector("#recipient-route-line");
const recipientMarker = document.querySelector("#recipient-marker");
const recipientMarkerHalo = document.querySelector("#recipient-marker-halo");
const recipientMarkerLabelBackground = document.querySelector("#recipient-marker-label-bg");
const recipientMarkerLabel = document.querySelector("#recipient-marker-label");
const recipientMap = document.querySelector("#recipient-map");
const recipientMapSvg = document.querySelector("#recipient-map-svg");
const recipientMapLayer = document.querySelector("#recipient-map-layer");
const mapZoomInButton = document.querySelector("#map-zoom-in");
const mapZoomOutButton = document.querySelector("#map-zoom-out");
const mapResetButton = document.querySelector("#map-reset");
const routeMap = document.querySelector(".route-map");
const routeFilterButtons = [...document.querySelectorAll(".route-filter")];
const routeFilterStatus = document.querySelector("#route-filter-status");
const advanceTripButton = document.querySelector("#advance-trip");
const sharingButton = document.querySelector("#toggle-sharing");
const recipientPreview = document.querySelector(".recipient-preview");
const tripStops = [
  { marker: { x: 122, y: 99 }, label: "Mateo salió de casa", recipient: "Mateo está en camino" },
  { marker: { x: 200, y: 85 }, label: "Mateo hizo el transbordo", recipient: "Mateo está cerca del transbordo" },
  { marker: { x: 291, y: 40 }, label: "Mateo llegó a su destino", recipient: "Mateo llegó a su destino" }
];
let currentTripStop = 0;
let isLocationSharing = true;
let activeMarker = phoneScreens.route.marker;
let activeRecipientMessage = phoneScreens.route.recipientTitle;
let mapZoom = 1;
let draggingPointerId = null;

function getRecipientCoordinates(marker) {
  return {
    x: marker.x * 220 / 320,
    y: marker.y * 110 / 176
  };
}

function moveLocationFromRecipientMap(x, y) {
  const mapX = Math.min(212, Math.max(8, x));
  const mapY = Math.min(102, Math.max(8, y));
  const marker = { x: mapX * 320 / 220, y: mapY * 176 / 110 };
  const insideSafeZone = ((mapX - 184) / 32) ** 2 + ((mapY - 30) / 21) ** 2 <= 1;
  updateLocation(
    marker,
    insideSafeZone ? "Mateo está en la zona segura · demo" : "Ubicación simulada actualizada"
  );
}

function getMapPointFromPointer(event) {
  const transform = recipientMapLayer.getScreenCTM();
  if (!transform) return null;

  const point = recipientMapSvg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(transform.inverse());
}

function setMapZoom(nextZoom) {
  mapZoom = Math.min(2.2, Math.max(1, nextZoom));
  recipientMap.style.setProperty("--map-zoom", mapZoom);
  mapZoomInButton.disabled = mapZoom >= 2.2;
  mapZoomOutButton.disabled = mapZoom <= 1;
}

function updateRecipientLocation(marker, recipientMessage) {
  const recipientLocation = getRecipientCoordinates(marker);
  [recipientMarker, recipientMarkerHalo].forEach((recipientMapMarker) => {
    recipientMapMarker.setAttribute("cx", recipientLocation.x);
    recipientMapMarker.setAttribute("cy", recipientLocation.y);
  });
  const recipientLabelOffset = recipientLocation.x > 160 ? -49 : 10;
  recipientMarkerLabelBackground.setAttribute("x", recipientLocation.x + recipientLabelOffset);
  recipientMarkerLabelBackground.setAttribute("y", recipientLocation.y - 8);
  recipientMarkerLabel.setAttribute("x", recipientLocation.x + recipientLabelOffset + 21.5);
  recipientMarkerLabel.setAttribute("y", recipientLocation.y + 3);
  recipientRoute.setAttribute(
    "d",
    `M30 83C69 67 75 45 109 48S${recipientLocation.x - 20} ${recipientLocation.y + 15} ${recipientLocation.x} ${recipientLocation.y}`
  );
  const insideSafeZone = ((recipientLocation.x - 184) / 32) ** 2 +
    ((recipientLocation.y - 30) / 21) ** 2 <= 1;
  document.querySelector("#recipient-status-title").textContent = insideSafeZone
    ? "Mateo está en la zona segura · demo"
    : recipientMessage;
}

function updateLocation(marker, recipientMessage) {
  activeMarker = marker;
  activeRecipientMessage = recipientMessage;
  mapMarker.setAttribute("cx", marker.x);
  mapMarker.setAttribute("cy", marker.y);
  mapMarkerHalo.setAttribute("cx", marker.x);
  mapMarkerHalo.setAttribute("cy", marker.y);
  const labelOffset = marker.x > 245 ? -62 : 10;
  mapMarkerLabelBackground.setAttribute("x", marker.x + labelOffset);
  mapMarkerLabelBackground.setAttribute("y", marker.y - 10);
  mapMarkerLabel.setAttribute("x", marker.x + labelOffset + 26);
  mapMarkerLabel.setAttribute("y", marker.y + 3);

  if (isLocationSharing) updateRecipientLocation(marker, recipientMessage);
}

function setLocationSharing(isEnabled) {
  isLocationSharing = isEnabled;
  if (isEnabled) updateRecipientLocation(activeMarker, activeRecipientMessage);
  sharingButton.setAttribute("aria-pressed", String(isEnabled));
  sharingButton.innerHTML = isEnabled
    ? 'Pausar ubicación compartida <span aria-hidden="true">Ⅱ</span>'
    : 'Reanudar ubicación compartida <span aria-hidden="true">▶</span>';
  recipientPreview.classList.toggle("is-paused", !isEnabled);
  document.querySelector("#recipient-status-copy").textContent = isEnabled
    ? phoneScreens[phonePanel.dataset.screen].recipientCopy
    : "Compartición pausada · demo";
}

function showPhoneScreen(screenName, focusTab = false) {
  const screen = phoneScreens[screenName];
  const selectedTab = phoneTabs.find((tab) => tab.dataset.phoneScreen === screenName);

  phoneTabs.forEach((tab) => {
    const isSelected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  });

  if (focusTab) selectedTab.focus();

  document.querySelector("#phone-card-title").textContent = screen.title;
  document.querySelector("#phone-chip").textContent = screen.chip;
  document.querySelector("#phone-footnote").textContent = screen.footnote;
  document.querySelector("#phone-alert-title").textContent = screen.alertTitle;
  document.querySelector("#phone-alert-copy").textContent = screen.alertCopy;
  advanceTripButton.hidden = screenName !== "trip";
  sharingButton.hidden = screenName !== "sharing";
  phonePanel.dataset.screen = screenName;
  updateLocation(screen.marker, screen.recipientTitle);
  setLocationSharing(isLocationSharing);

  phonePanel.setAttribute("aria-labelledby", selectedTab.id);
  phonePanel.classList.remove("phone-panel");
  void phonePanel.offsetWidth;
  phonePanel.classList.add("phone-panel");
}

routeFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const route = button.dataset.routeFilter;
    routeMap.dataset.activeRoute = route;
    routeFilterButtons.forEach((filterButton) => {
      filterButton.setAttribute("aria-pressed", String(filterButton === button));
    });
    routeFilterStatus.textContent = route === "all"
      ? "Viendo todas las rutas ilustrativas"
      : `Ruta seleccionada: ${button.textContent.trim()} · ejemplo`;
  });
});

advanceTripButton.addEventListener("click", () => {
  currentTripStop = (currentTripStop + 1) % tripStops.length;
  const stop = tripStops[currentTripStop];
  updateLocation(stop.marker, stop.recipient);
  document.querySelector("#phone-alert-title").textContent = stop.label;
  document.querySelector("#phone-chip").textContent = `Parada ${currentTripStop + 1} de ${tripStops.length}`;
});

sharingButton.addEventListener("click", () => {
  setLocationSharing(!isLocationSharing);
});

recipientMarker.addEventListener("pointerdown", (event) => {
  if (!isLocationSharing || event.button !== 0) return;
  event.preventDefault();
  draggingPointerId = event.pointerId;
  recipientMap.classList.add("is-dragging");
  recipientMapSvg.setPointerCapture(event.pointerId);
});

recipientMapSvg.addEventListener("pointermove", (event) => {
  if (event.pointerId !== draggingPointerId) return;
  const point = getMapPointFromPointer(event);
  if (point) moveLocationFromRecipientMap(point.x, point.y);
});

function stopDraggingLocation(event) {
  if (event.pointerId !== draggingPointerId) return;
  draggingPointerId = null;
  recipientMap.classList.remove("is-dragging");
}

recipientMapSvg.addEventListener("pointerup", stopDraggingLocation);
recipientMapSvg.addEventListener("pointercancel", stopDraggingLocation);

recipientMarker.addEventListener("keydown", (event) => {
  const directions = {
    ArrowUp: [0, -4],
    ArrowDown: [0, 4],
    ArrowLeft: [-4, 0],
    ArrowRight: [4, 0]
  };
  const direction = directions[event.key];
  if (!direction || !isLocationSharing) return;

  event.preventDefault();
  const coordinates = getRecipientCoordinates(activeMarker);
  moveLocationFromRecipientMap(
    coordinates.x + direction[0],
    coordinates.y + direction[1]
  );
});

mapZoomInButton.addEventListener("click", () => setMapZoom(mapZoom + 0.2));
mapZoomOutButton.addEventListener("click", () => setMapZoom(mapZoom - 0.2));
mapResetButton.addEventListener("click", () => {
  currentTripStop = 0;
  setMapZoom(1);
  const screen = phoneScreens[phonePanel.dataset.screen];
  updateLocation(screen.marker, screen.recipientTitle);
});

phoneTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => showPhoneScreen(tab.dataset.phoneScreen));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const nextIndex = event.key === "Home" ? 0 :
      event.key === "End" ? phoneTabs.length - 1 :
        (index + (event.key === "ArrowRight" ? 1 : -1) + phoneTabs.length) % phoneTabs.length;
    showPhoneScreen(phoneTabs[nextIndex].dataset.phoneScreen, true);
  });
});

const revealItems = document.querySelectorAll(
  ".intro, .benefit, .research-copy, .research-details, .route-copy, .route-demo, .audience article, .signup-copy, .signup-form"
);
revealItems.forEach((item) => item.classList.add("reveal"));

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const navigation = document.querySelector("#primary-navigation");
navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    const collapse = bootstrap.Collapse.getOrCreateInstance(navigation);
    const isOpening = navigation.classList.contains("collapsing") &&
      document.querySelector(".navbar-toggler").getAttribute("aria-expanded") === "true";

    if (isOpening) {
      navigation.addEventListener("shown.bs.collapse", () => collapse.hide(), { once: true });
    } else {
      collapse.hide();
    }
  });
});

const modeDescriptions = {
  bus: "Bus urbano: una opción para recorrer Quito. Las rutas y frecuencias reales requerirían datos actualizados.",
  trolebus: "Trolebús: un corredor de transporte de Quito. Las paradas y frecuencias reales requerirían datos actualizados.",
  metro: "Metro de Quito: una alternativa para conectar distintos sectores. Las rutas y tiempos reales requerirían datos actualizados."
};
const modeFeedback = document.querySelector("#mode-feedback");

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mode-button").forEach((option) => {
      const isSelected = option === button;
      option.classList.toggle("active", isSelected);
      option.setAttribute("aria-pressed", String(isSelected));
    });
    modeFeedback.textContent = modeDescriptions[button.dataset.mode];
  });
});

const interestForm = document.querySelector("#interest-form");
const formResult = document.querySelector("#form-result");

interestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!interestForm.reportValidity()) return;
  formResult.textContent = "Gracias por tu interés. Este prototipo todavía no envía ni almacena correos.";
  interestForm.reset();
});

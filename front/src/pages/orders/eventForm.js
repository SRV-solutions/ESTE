export const EMPTY_EVENT = {
  eventName: "",
  dateEvent: "",
  locationId: "",
  organizer: "",
  producer: "",
  finalClient: "",
};

/** El evento tiene todos los datos obligatorios. */
export const eventComplete = (form) =>
  Object.keys(EMPTY_EVENT).every((k) => String(form[k] ?? "").trim());

// Haptic feedback usando Web Vibration API
// Android Chrome: funciona nativamente
// iOS Safari: API no soportada — falla silenciosamente, sin errores

const ok = typeof navigator !== "undefined" && "vibrate" in navigator;

export const haptico = {
  /** Selección ligera — toggle de chip, checkbox */
  seleccion: () => ok && navigator.vibrate(6),
  /** Tap de botón secundario */
  ligero: () => ok && navigator.vibrate(10),
  /** Botón primario, confirmar acción */
  medio: () => ok && navigator.vibrate(18),
  /** Éxito — transacción guardada, importación completada */
  exito: () => ok && navigator.vibrate([8, 60, 14]),
  /** Error — validación fallida */
  error: () => ok && navigator.vibrate([70, 40, 70]),
  /** Destructivo — eliminar, borrar */
  peligro: () => ok && navigator.vibrate([30, 60, 30, 60, 60]),
};

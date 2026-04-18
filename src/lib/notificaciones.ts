// ── Service Worker & Push Notifications ────────────────────────────────────

export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permiso = await Notification.requestPermission();
  return permiso === "granted";
}

// ── Push Subscription (Web Push API + VAPID) ────────────────────────────────

// Convierte la clave VAPID pública de base64url a Uint8Array para el navegador
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

// Suscribe al usuario a push notifications y registra la suscripción en el servidor.
// Retorna true si tuvo éxito, false si no hay permiso o el browser no lo soporta.
export async function suscribirAPush(): Promise<boolean> {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY no está configurada");
      return false;
    }

    const permiso = await pedirPermisoNotificaciones();
    if (!permiso) return false;

    const registro = await registrarServiceWorker();
    if (!registro) return false;

    // Verificar si ya hay una suscripción activa
    const suscripcionExistente = await registro.pushManager.getSubscription();
    if (suscripcionExistente) {
      // Ya está suscrito — sincronizar con el servidor por si acaso
      await enviarSuscripcionAlServidor(suscripcionExistente);
      return true;
    }

    // Crear nueva suscripción
    const suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    await enviarSuscripcionAlServidor(suscripcion);
    return true;
  } catch (err) {
    console.error("Error al suscribirse a push:", err);
    return false;
  }
}

async function enviarSuscripcionAlServidor(suscripcion: PushSubscription): Promise<void> {
  await fetch("/api/push/suscribir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suscripcion: suscripcion.toJSON() }),
  });
}

// Cancela la suscripción push del dispositivo actual
export async function cancelarPush(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return;
    const suscripcion = await reg.pushManager.getSubscription();
    if (!suscripcion) return;
    await fetch("/api/push/suscribir", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: suscripcion.endpoint }),
    });
    await suscripcion.unsubscribe();
  } catch { /* ok */ }
}

// Verifica si el dispositivo actual tiene push activo
export async function tienePushActivo(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return false;
    const suscripcion = await reg.pushManager.getSubscription();
    return !!suscripcion;
  } catch { return false; }
}

// ── Notificaciones locales (in-app, no push) ────────────────────────────────

export function notificarLocal(titulo: string, cuerpo: string, url = "/dashboard") {
  if (Notification.permission !== "granted") return;
  const n = new Notification(titulo, {
    body: cuerpo,
    icon: "/icon-192.png",
    data: { url },
  });
  n.onclick = () => { window.focus(); n.close(); };
}

export function verificarPresupuestos(
  presupuestos: { categoria: string; limite: number }[],
  gastosPorCat: Record<string, number>
) {
  for (const p of presupuestos) {
    const gastado = gastosPorCat[p.categoria] || 0;
    const pct = (gastado / p.limite) * 100;

    if (pct >= 100) {
      notificarLocal(
        `⚠️ Límite excedido: ${p.categoria}`,
        `Gastaste ${formatMXN(gastado)} de ${formatMXN(p.limite)} este mes.`,
        "/presupuestos"
      );
    } else if (pct >= 80) {
      notificarLocal(
        `🐑 Lani: Casi en el límite`,
        `${p.categoria}: llevas ${pct.toFixed(0)}% de tu presupuesto mensual.`,
        "/presupuestos"
      );
    }
  }
}

function formatMXN(n: number) {
  return "$" + new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(n);
}

export async function registrarServiceWorker() {
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

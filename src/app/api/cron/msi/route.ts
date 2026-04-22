import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron: se ejecuta diariamente a las 10am UTC (4am México)
// Detecta compromisos MSI con pago vencido, crea la transacción
// correspondiente y avanza el contador.

function crearSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Suma un mes exacto a una fecha ISO (YYYY-MM-DD) respetando fin de mes
function sumarUnMes(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const nueva = new Date(anio, mes, dia); // mes en Date es 0-based, por eso mes (no mes-1)
  // Date(anio, mes, dia) ya apunta al mes siguiente porque mes es 1-based en la cadena
  // pero Date() usa 0-based → mes aquí equivale a mes+1 del calendario
  // Corrección: usamos Date(anio, mes-1+1, dia) = Date(anio, mes, dia) ✓
  // Si el día no existe en el mes destino, Date lo redondea al siguiente mes
  const diaFinal = Math.min(dia, new Date(anio, mes + 1, 0).getDate()); // días del mes destino
  return new Date(anio, mes, diaFinal).toISOString().split("T")[0];
}

interface CompromisoMSI {
  id: string;
  usuario_id: string;
  descripcion: string;
  categoria: string;
  mensualidad: number;
  meses_total: number;
  meses_pagados: number;
  fecha_proximo_pago: string;
}

export async function GET(req: NextRequest) {
  // Verificar secreto del cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const supabase = crearSupabaseAdmin();

  // Fecha de hoy en México (UTC-6)
  const ahoraUTC = new Date();
  const ahoraMX = new Date(ahoraUTC.getTime() - 6 * 60 * 60 * 1000);
  const hoyMX = ahoraMX.toISOString().split("T")[0];

  // Obtener todos los compromisos activos con pago vencido o de hoy
  const { data: compromisos, error } = await supabase
    .from("compromisos_msi")
    .select("id, usuario_id, descripcion, categoria, mensualidad, meses_total, meses_pagados, fecha_proximo_pago")
    .eq("activo", true)
    .lte("fecha_proximo_pago", hoyMX);

  if (error) {
    console.error("Error obteniendo compromisos MSI:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!compromisos?.length) {
    return Response.json({ ok: true, procesados: 0, hoyMX });
  }

  let procesados = 0;
  const errores: string[] = [];

  for (const c of compromisos as CompromisoMSI[]) {
    try {
      const nuevosMesesPagados = c.meses_pagados + 1;
      const estaCompleto = nuevosMesesPagados >= c.meses_total;
      const siguienteFecha = sumarUnMes(c.fecha_proximo_pago);

      // 1. Crear transacción del pago mensual
      const { error: errTx } = await supabase.from("transacciones").insert({
        usuario_id: c.usuario_id,
        monto: Number(c.mensualidad),
        descripcion: `${c.descripcion} (${nuevosMesesPagados}/${c.meses_total} MSI)`,
        categoria: c.categoria,
        tipo: "gasto",
        fecha: c.fecha_proximo_pago, // fecha en que debía pagarse
      });

      if (errTx) {
        errores.push(`${c.id}: ${errTx.message}`);
        continue;
      }

      // 2. Actualizar el compromiso
      const { error: errUpd } = await supabase
        .from("compromisos_msi")
        .update({
          meses_pagados: nuevosMesesPagados,
          fecha_proximo_pago: estaCompleto ? c.fecha_proximo_pago : siguienteFecha,
          activo: !estaCompleto,
        })
        .eq("id", c.id);

      if (errUpd) {
        errores.push(`update ${c.id}: ${errUpd.message}`);
        continue;
      }

      procesados++;
    } catch (e) {
      errores.push(`${c.id}: excepción`);
      console.error("Error procesando compromiso MSI:", c.id, e);
    }
  }

  return Response.json({ ok: true, procesados, errores, hoyMX });
}

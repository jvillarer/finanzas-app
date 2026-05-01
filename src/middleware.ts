import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PUBLICAS = [
  "/",
  "/login",
  "/registro",
  "/auth/callback",
  "/api/whatsapp",   // webhook de Meta (sin sesión)
  "/api/push",       // endpoints de push notifications
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esPublica = RUTAS_PUBLICAS.some((r) => ruta.startsWith(r));

  // Sin sesión y ruta no pública → login
  if (!user && !esPublica) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Con sesión y en login/registro/home → dashboard
  if (user && (ruta === "/login" || ruta === "/registro" || ruta === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // Excluir: assets de Next.js, archivos estáticos (png/jpg/svg/webp), sw.js y manifest
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};

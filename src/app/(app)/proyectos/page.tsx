"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProyectosRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/planificacion"); }, [router]);
  return null;
}

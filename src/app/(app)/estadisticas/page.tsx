"use client";

import OnboardingStep1 from "@/components/OnboardingStep1";

export default function EstadisticasPage() {
  // Reutilizamos el onboarding como tour permanente en la pestaña.
  // Al llegar al final, onContinuar no hace nada — el componente
  // muestra su pantalla "¡Todo listo! / Ver de nuevo" por sí solo.
  return <OnboardingStep1 />;
}

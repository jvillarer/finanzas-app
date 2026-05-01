"use client";

import { useRouter } from "next/navigation";
import OnboardingStep1 from "@/components/OnboardingStep1";

export default function OnboardingPage() {
  const router = useRouter();

  const handleContinuar = () => {
    router.push("/bienvenida");
  };

  return <OnboardingStep1 onContinuar={handleContinuar} />;
}

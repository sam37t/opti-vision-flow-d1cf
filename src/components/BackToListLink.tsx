import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getListLocation } from "@/lib/last-list-location";

export function BackToListLink({ label = "Retour à la liste" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.navigate({ href: getListLocation() })}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}

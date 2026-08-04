import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getListLocation } from "@/lib/last-list-location";

export function BackToListLink({ label = "Retour à la liste" }: { label?: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="link"
      onClick={() => router.history.push(getListLocation())}
      className="h-auto gap-1 p-0 text-sm font-normal text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </Button>
  );
}

import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getListSearch } from "@/lib/last-list-location";

export function BackToListLink({ label = "Retour à la liste" }: { label?: string }) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="link"
      onClick={() => navigate({ to: "/dossiers", search: getListSearch() })}
      className="h-auto gap-1 p-0 text-sm font-normal text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </Button>
  );
}

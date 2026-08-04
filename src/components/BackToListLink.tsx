import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getListSearch } from "@/lib/last-list-location";

type Props = {
  label?: string;
  variant?: "link" | "ghost" | "outline";
  size?: "default" | "sm";
  showIcon?: boolean;
};

export function BackToListLink({
  label = "Retour à la liste",
  variant = "link",
  size = "default",
  showIcon = true,
}: Props) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => navigate({ to: "/dossiers", search: getListSearch() })}
      className={
        variant === "link"
          ? "h-auto gap-1 p-0 text-sm font-normal text-muted-foreground hover:text-foreground"
          : "gap-1"
      }
    >
      {showIcon && <ArrowLeft className="h-4 w-4" />} {label}
    </Button>
  );
}

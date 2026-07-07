import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS, type PaymentMethod } from "@/lib/payment-methods";
import { Badge } from "@/components/ui/badge";

interface PaymentMethodBadgeProps {
  method: PaymentMethod | null | undefined;
  className?: string;
}

export function PaymentMethodBadge({ method, className }: PaymentMethodBadgeProps) {
  if (!method) {
    return (
      <Badge variant="outline" className={`text-muted-foreground ${className || ""}`}>
        Non renseigné
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      <span className="mr-1">{PAYMENT_METHOD_ICONS[method]}</span>
      {PAYMENT_METHOD_LABELS[method]}
    </Badge>
  );
}

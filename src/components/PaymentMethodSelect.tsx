import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS, type PaymentMethod } from "@/lib/payment-methods";

interface PaymentMethodSelectProps {
  value: PaymentMethod | null | undefined;
  onChange: (value: PaymentMethod | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function PaymentMethodSelect({
  value,
  onChange,
  placeholder = "Sélectionner un mode de paiement",
  disabled = false,
  required = false,
}: PaymentMethodSelectProps) {
  return (
    <Select
      value={value ?? ""}
      onValueChange={(newValue) => {
        onChange(newValue === "" ? null : (newValue as PaymentMethod));
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {!required && (
          <SelectItem value="">
            <span className="text-muted-foreground">Non renseigné</span>
          </SelectItem>
        )}
        {Object.entries(PAYMENT_METHOD_LABELS).map(([method, label]) => (
          <SelectItem key={method} value={method}>
            <span>
              {PAYMENT_METHOD_ICONS[method as PaymentMethod]} {label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

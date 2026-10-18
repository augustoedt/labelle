import { PhoneOff } from "lucide-react";
import { hasPhone } from "@/lib/phonePending";
export default function PhonePendingBadge({phone}) {
  return hasPhone(phone) ? null : <span className="phone-pending-badge" title="Celular pendente — pode ser preenchido depois"><PhoneOff size={13}/><span>Sem celular</span></span>;
}

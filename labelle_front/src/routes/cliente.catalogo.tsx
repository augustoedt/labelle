import { createFileRoute } from "@tanstack/react-router";
import ClientApp from "~/pages/ClientApp";

export const Route = createFileRoute("/cliente/catalogo")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" && /^[\w-]+$/.test(search.category) ? search.category : undefined,
    q: typeof search.q === "string" ? search.q.slice(0, 100) : undefined,
    service: typeof search.service === "string" && search.service.length <= 100 ? search.service : undefined,
    variant: typeof search.variant === "string" && search.variant.length <= 100 ? search.variant : undefined,
  }),
  component: ClientApp,
});

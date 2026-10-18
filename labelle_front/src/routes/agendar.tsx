import { createFileRoute, redirect } from "@tanstack/react-router";
import ClientApp from "~/pages/ClientApp";
export const Route = createFileRoute("/agendar")({
  validateSearch: (search: Record<string, unknown>) => ({
    serviceId: typeof search.serviceId === "string" ? search.serviceId : undefined,
    variantId: typeof search.variantId === "string" ? search.variantId : undefined,
  }),
  beforeLoad: ({ location }) => {
    const search = location.search as Record<string, unknown>
    const safe = {
      serviceId: typeof search.serviceId === 'string' && search.serviceId.length <= 100 ? search.serviceId : undefined,
      variantId: typeof search.variantId === 'string' && search.variantId.length <= 100 ? search.variantId : undefined,
    }
    throw redirect({ to: '/cliente/agendar' as never, search: safe as never })
  },
  component: ClientApp,
});

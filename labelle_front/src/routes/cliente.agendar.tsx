import { createFileRoute } from "@tanstack/react-router";
import ClientApp from "~/pages/ClientApp";

export const Route = createFileRoute("/cliente/agendar")({
  validateSearch: (search: Record<string, unknown>) => ({
    serviceId: typeof search.serviceId === "string" ? search.serviceId : undefined,
    variantId: typeof search.variantId === "string" ? search.variantId : undefined,
    professionalId: typeof search.professionalId === "string" ? search.professionalId : undefined,
    date: typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date) ? search.date : undefined,
    time: typeof search.time === "string" && /^\d{2}:\d{2}$/.test(search.time) ? search.time : undefined,
    step: [1, 2, 3, 4].includes(Number(search.step)) ? Number(search.step) : undefined,
  }),
  component: ClientApp,
});

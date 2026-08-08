import { useRouteContext } from "@tanstack/react-router";

/** Usuário logado (admin ou profissional) a partir do contexto da raiz. */
export function useUser() {
  return useRouteContext({ from: "__root__" }).user;
}

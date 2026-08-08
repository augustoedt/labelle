import { Link } from "@tanstack/react-router";
import LaBelleLogo from "~/components/ui/LaBelleLogo";

export default function NotFound() {
  return (
    <div className="min-h-dvh page-background flex flex-col items-center justify-center p-6 text-center">
      <LaBelleLogo size="lg" />
      <h1 className="font-heading text-2xl font-semibold mt-8">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-6 text-sm font-medium transition-all duration-150 active:scale-[0.98] hover:bg-primary/90"
      >
        Voltar ao início
      </Link>
    </div>
  );
}

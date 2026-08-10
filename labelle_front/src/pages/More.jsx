import { Link } from "@tanstack/react-router";
import { Scissors, Users2, Package, Tag, BarChart3, Crown, BellRing, Settings2, LogOut } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useUser } from "@/lib/auth";

// Itens visíveis por papel: admin gerencia tudo; profissional vê apenas o
// que o backend libera em leitura (serviços e promoções) + sair.
const menuItems = {
  admin: [
    { path: "/servicos", icon: Scissors, label: "Serviços", desc: "Gerenciar serviços e preços" },
    { path: "/profissionais", icon: Users2, label: "Profissionais", desc: "Equipe e comissões" },
    { path: "/produtos", icon: Package, label: "Estoque", desc: "Controle de produtos" },
    { path: "/promocoes", icon: Tag, label: "Promoções", desc: "Ofertas e descontos" },
    { path: "/fidelidade", icon: Crown, label: "Fidelidade", desc: "Programa de pontos" },
    { path: "/lembretes", icon: BellRing, label: "Lembretes", desc: "Retorno de clientes (20/45 dias)" },
    { path: "/relatorios", icon: BarChart3, label: "Relatórios", desc: "Análises e métricas" },
    { path: "/configuracoes", icon: Settings2, label: "Configurações", desc: "Telefone, endereço e mensagens" },
  ],
  profissional: [
    { path: "/servicos", icon: Scissors, label: "Serviços", desc: "Catálogo e preços" },
    { path: "/promocoes", icon: Tag, label: "Promoções", desc: "Ofertas e descontos ativos" },
  ],
};

export default function More() {
  const user = useUser();
  const items = menuItems[user?.role] || menuItems.admin;

  return (
    <div className="space-y-4">
      <PageHeader title="Mais" subtitle="Configurações e gestão" />

      <div className="px-5 space-y-2">
        {items.map(({ path, icon: Icon, label, desc }) => (
          <Link
            key={path}
            to={path}
            className="flex items-center gap-4 p-4 bg-card/90 rounded-2xl border border-border/60 hover:border-primary/30 transition-all duration-200 active:scale-[0.99]"
          >
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}

        <Link
          to="/logout"
          className="flex items-center gap-4 p-4 bg-card/90 rounded-2xl border border-border/60 hover:border-destructive/30 transition-all duration-200 active:scale-[0.99] text-destructive"
        >
          <div className="p-2.5 rounded-xl bg-destructive/10">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Sair</p>
            <p className="text-xs text-muted-foreground">Encerrar sessão</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

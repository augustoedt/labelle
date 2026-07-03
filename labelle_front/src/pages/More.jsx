import { Link } from "@tanstack/react-router";
import { Scissors, Users2, Package, Tag, BarChart3, Crown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

const menuItems = [
  { path: "/servicos", icon: Scissors, label: "Serviços", desc: "Gerenciar serviços e preços" },
  { path: "/profissionais", icon: Users2, label: "Profissionais", desc: "Equipe e comissões" },
  { path: "/produtos", icon: Package, label: "Estoque", desc: "Controle de produtos" },
  { path: "/promocoes", icon: Tag, label: "Promoções", desc: "Ofertas e descontos" },
  { path: "/fidelidade", icon: Crown, label: "Fidelidade", desc: "Programa de pontos" },
  { path: "/relatorios", icon: BarChart3, label: "Relatórios", desc: "Análises e métricas" },
];

export default function More() {
  return (
    <div className="space-y-4">
      <PageHeader title="Mais" subtitle="Configurações e gestão" />

      <div className="px-5 space-y-2">
        {menuItems.map(({ path, icon: Icon, label, desc }) => (
          <Link
            key={path}
            to={path}
            className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all"
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
      </div>
    </div>
  );
}

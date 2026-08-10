import { Droplets, Eye, Palette, Scissors, Sparkles, Star } from "lucide-react";

export const categoryLabels = {
  cabelo: "Cabelo",
  unha: "Unhas",
  estetica: "Estética",
  sobrancelha: "Sobrancelha",
  maquiagem: "Maquiagem",
  outros: "Outros",
};

const categoryIcons = {
  cabelo: Scissors,
  unha: Sparkles,
  estetica: Droplets,
  sobrancelha: Eye,
  maquiagem: Palette,
  outros: Star,
};

export default function ServiceCategoryIcon({ category, className = "w-5 h-5" }) {
  const Icon = categoryIcons[category] || Star;
  return <Icon className={className} aria-hidden="true" />;
}

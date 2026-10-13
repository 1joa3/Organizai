/** Conta e categorias com que todo usuário novo começa. */
export const DEFAULT_ACCOUNT = { name: "Conta Principal", type: "corrente" };

export const DEFAULT_CATEGORIES = [
  { name: "Moradia", type: "despesa", color: "#F87171", icon: "🏠" },
  { name: "Alimentação", type: "despesa", color: "#FB923C", icon: "🍔" },
  { name: "Transporte", type: "despesa", color: "#FBBF24", icon: "🚗" },
  { name: "Saúde", type: "despesa", color: "#34D399", icon: "💊" },
  { name: "Educação", type: "despesa", color: "#60A5FA", icon: "📚" },
  { name: "Lazer", type: "despesa", color: "#A78BFA", icon: "🎮" },
  { name: "Vestuário", type: "despesa", color: "#F472B6", icon: "👕" },
  { name: "Serviços", type: "despesa", color: "#818CF8", icon: "📱" },
  { name: "Outros", type: "despesa", color: "#6B7280", icon: "📦" },
  { name: "Salário", type: "receita", color: "#34D399", icon: "💰" },
  { name: "Freelance", type: "receita", color: "#60A5FA", icon: "💻" },
  { name: "Rendimentos", type: "receita", color: "#FBBF24", icon: "📈" },
  { name: "Outros", type: "receita", color: "#6B7280", icon: "💵" },
];

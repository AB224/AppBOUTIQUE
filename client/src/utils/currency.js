export const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-GN", {
    style: "currency",
    currency: "GNF",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

export const formatCurrency = (val: number | null, currency = "USD") => {
  if (val == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `${val.toLocaleString()} ${currency}`;
  }
};

export const formatDate = (val: string | null) => {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (val: string | null) => {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const daysUntil = (val: string | null): number | null => {
  if (!val) return null;
  const diff = new Date(val).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const INVOICE_STATUS_BADGES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-700",
  VOID: "bg-gray-100 text-gray-500",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  BENEFIT: "Benefit",
  BANK_TRANSFER: "Bank transfer",
  INSURANCE: "Insurance",
};

export const CLAIM_STATUS_BADGES: Record<string, string> = {
  PREPARING: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  PARTIALLY_APPROVED: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-green-100 text-green-700",
};

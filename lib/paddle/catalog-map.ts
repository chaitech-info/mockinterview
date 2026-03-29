/**
 * Normalize Paddle Billing list-prices API responses for the marketing page.
 * Supports flat and JSON:API-style payloads (`attributes` + `included` products).
 */

export type PaddleCatalogItem = {
  priceId: string;
  title: string;
  priceDisplay: string;
  features: string[];
};

type UnitPrice = { amount: string; currency_code: string };

type BillingCycle = { interval?: string; frequency?: number } | null;

type PaddlePriceEntity = {
  id?: string;
  status?: string;
  name?: string | null;
  description?: string | null;
  product_id?: string;
  unit_price?: UnitPrice;
  billing_cycle?: BillingCycle;
  product?: {
    id?: string;
    name?: string | null;
    description?: string | null;
  };
};

function productNamesFromIncluded(included: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(included)) return map;
  for (const ent of included) {
    if (!ent || typeof ent !== "object") continue;
    const e = ent as Record<string, unknown>;
    if (e.type !== "product") continue;
    const id = typeof e.id === "string" ? e.id : "";
    if (!id.startsWith("pro_")) continue;
    const attrs = e.attributes as { name?: string | null } | undefined;
    const name = attrs?.name?.trim();
    if (name) map.set(id, name);
  }
  return map;
}

function unwrapPrice(row: unknown): PaddlePriceEntity | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (r.attributes && typeof r.attributes === "object") {
    const attrs = r.attributes as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : (typeof attrs.id === "string" ? attrs.id : undefined);
    return { ...(attrs as PaddlePriceEntity), id };
  }
  return row as PaddlePriceEntity;
}

function formatMoney(unit: UnitPrice | undefined, billing: BillingCycle): string {
  if (!unit?.amount) return "—";
  const minor = Number(unit.amount);
  if (Number.isNaN(minor)) return "—";
  const currency = unit.currency_code || "USD";
  const major = minor / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(major);

  if (billing?.interval) {
    const i = billing.interval;
    if (i === "month") return `${formatted}/mo`;
    if (i === "year") return `${formatted}/yr`;
    return `${formatted}/${i}`;
  }
  return formatted;
}

function featuresFromTitle(title: string): string[] {
  const m = title.match(/(\d+)\s*interview/i);
  const n = m?.[1];
  if (n) {
    return [
      `${n} mock interview sessions`,
      "Voice practice & AI feedback",
      "Secure checkout via Paddle",
    ];
  }
  return ["Mock interview access", "Voice coach & feedback", "Secure checkout via Paddle"];
}

export function mapPaddleListPricesResponse(json: unknown): PaddleCatalogItem[] {
  const root = json as { data?: unknown[]; included?: unknown };
  const rawRows = Array.isArray(root.data) ? root.data : [];
  const productMap = productNamesFromIncluded(root.included);

  const parsed: { minor: number; item: PaddleCatalogItem }[] = [];

  for (const raw of rawRows) {
    const row = unwrapPrice(raw);
    if (!row?.id?.startsWith("pri_")) continue;

    const productName =
      row.product?.name?.trim() ??
      (row.product_id ? productMap.get(row.product_id) : undefined) ??
      undefined;
    const priceName = row.name?.trim();
    const title =
      productName || priceName || row.description?.trim() || "Plan";

    const minor = Number(row.unit_price?.amount ?? 0);
    parsed.push({
      minor: Number.isNaN(minor) ? 0 : minor,
      item: {
        priceId: row.id,
        title,
        priceDisplay: formatMoney(row.unit_price, row.billing_cycle ?? null),
        features: featuresFromTitle(title),
      },
    });
  }

  parsed.sort((a, b) => a.minor - b.minor);
  return parsed.map((p) => p.item);
}

/**
 * Sandbox vs production for Paddle **server** config (webhooks, price ID mapping).
 * Matches how `app/api/paddle/prices` picks the API host from `PADDLE_API_KEY`.
 */
export function isPaddleSandboxServer(): boolean {
  const key = process.env.PADDLE_API_KEY?.trim() ?? "";
  if (key.includes("sdbx_")) return true;
  if (key.includes("live_")) return false;
  return process.env.PADDLE_USE_SANDBOX === "true";
}

/**
 * In sandbox: `PADDLE_SANDBOX_PRICE_ID_*` first, then legacy single `PADDLE_PRICE_ID_*`.
 * In production: `PADDLE_PRICE_ID_*` only (live catalog).
 */
export function paddlePlanPriceId3(): string | undefined {
  if (isPaddleSandboxServer()) {
    return (
      process.env.PADDLE_SANDBOX_PRICE_ID_PLAN_3?.trim() ||
      process.env.PADDLE_PRICE_ID_PLAN_3?.trim()
    );
  }
  return process.env.PADDLE_PRICE_ID_PLAN_3?.trim();
}

export function paddlePlanPriceId5(): string | undefined {
  if (isPaddleSandboxServer()) {
    return (
      process.env.PADDLE_SANDBOX_PRICE_ID_PLAN_5?.trim() ||
      process.env.PADDLE_PRICE_ID_PLAN_5?.trim()
    );
  }
  return process.env.PADDLE_PRICE_ID_PLAN_5?.trim();
}

export function paddleCreditsPriceId3(): string | undefined {
  if (isPaddleSandboxServer()) {
    return (
      process.env.PADDLE_SANDBOX_PRICE_ID_CREDITS_3?.trim() ||
      process.env.PADDLE_PRICE_ID_CREDITS_3?.trim()
    );
  }
  return process.env.PADDLE_PRICE_ID_CREDITS_3?.trim();
}

export function paddleCreditsPriceId5(): string | undefined {
  if (isPaddleSandboxServer()) {
    return (
      process.env.PADDLE_SANDBOX_PRICE_ID_CREDITS_5?.trim() ||
      process.env.PADDLE_PRICE_ID_CREDITS_5?.trim()
    );
  }
  return process.env.PADDLE_PRICE_ID_CREDITS_5?.trim();
}

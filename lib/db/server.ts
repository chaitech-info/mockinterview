import { neon } from "@neondatabase/serverless";

type Row = Record<string, unknown>;

let sql: ReturnType<typeof neon> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Parameterised query over Neon's HTTP driver. Server-only (never import from client components). */
export async function query<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!sql) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error("DATABASE_URL is not set on the server.");
    sql = neon(url);
  }
  return (await sql.query(text, params)) as T[];
}

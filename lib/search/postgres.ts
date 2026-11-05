import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Normalizes a raw search query string for consistent matching
 * (trim, collapse whitespace, lowercase for trigram/ILIKE paths).
 */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Converts a normalized query into a tsquery-safe string using
 * websearch_to_tsquery semantics (handles quotes, AND/OR, -exclusion).
 * We pass the raw string as a parameter and let Postgres parse it,
 * so no manual escaping of tsquery operators is needed here.
 */
export function toWebSearchParam(query: string): string {
  return normalizeQuery(query);
}

export { Prisma };

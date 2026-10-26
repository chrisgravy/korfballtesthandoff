import { Pool } from "pg";
import { poolConfig } from "./pgconfig";

// Reuse one pool across hot reloads in development.
const g = globalThis as unknown as { pgPool?: Pool };
export const pool = g.pgPool ?? new Pool(poolConfig());
if (process.env.NODE_ENV !== "production") g.pgPool = pool;

import type { PoolConfig } from "pg";

// Supabase requires SSL. Certificate checking is relaxed here for simplicity;
// for production, load Supabase's CA certificate and verify it instead.
export function poolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  const local = !connectionString || /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  return { connectionString, ssl: local ? undefined : { rejectUnauthorized: false } };
}

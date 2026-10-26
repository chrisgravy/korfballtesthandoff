# Scorer app sketch (Expo / React Native)

An untested outline of the offline-first part. Every tap is saved on the phone first, then uploaded when there is signal.

```ts
import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);
const dbPromise = SQLite.openDatabaseAsync("outbox.db");

type NewEvent = {
  match_id: number; team_id: number; type: "goal" | "own_goal" | "shot";
  player_id: number; assist_player_id?: number | null; minute: number;
};

export async function recordEvent(ev: NewEvent) {
  const db = await dbPromise;
  await db.execAsync("create table if not exists outbox (id text primary key, payload text not null)");
  const id = Crypto.randomUUID();
  await db.runAsync("insert into outbox (id, payload) values (?, ?)", [id, JSON.stringify({ id, ...ev })]);
  void flushOutbox(); // fire and forget; also call on app start and when connectivity returns
}

export async function flushOutbox() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<{ id: string; payload: string }>("select id, payload from outbox order by rowid");
  for (const row of rows) {
    const { error } = await supabase
      .from("match_events")
      .upsert(JSON.parse(row.payload), { onConflict: "id", ignoreDuplicates: true });
    if (error) break; // offline or rejected: keep it and retry later
    await db.runAsync("delete from outbox where id = ?", [row.id]);
  }
}
```

Show `select count(*) from outbox` in the UI as "n events waiting to upload". Sign scorers in with a Supabase Auth
account whose `app_metadata.role` is `scorer`.

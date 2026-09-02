import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import path from "path";
import * as schema from "./schema";

// libsql instead of better-sqlite3: ships prebuilt native binaries for every
// major platform/arch (napi-rs), so `npm install` never needs Python or a
// C++ compiler — the #1 install-blocker this project used to hit on Windows.
const dbPath = path.join(process.cwd(), "data", "educore.db");
const client = createClient({ url: `file:${dbPath}` });

export const db = drizzle(client, { schema });
export { client };

import { getPool } from "@/lib/db";
import { noStoreJson } from "@/lib/http";

export async function GET() {
  try {
    await getPool().query("SELECT 1");
    return noStoreJson({ status: "ok", database: "ok" });
  } catch {
    return noStoreJson({ status: "unavailable", database: "unavailable" }, { status: 503 });
  }
}

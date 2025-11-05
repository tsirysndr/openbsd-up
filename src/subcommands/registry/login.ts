import { setupOrasBinary } from "../../oras.ts";

export default async function () {
  await setupOrasBinary(Deno.env.get("ORAS_VERSION") ?? "1.3.0");
}

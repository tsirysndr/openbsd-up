import { setupOrasBinary } from "../oras.ts";

export default async function (name: string): Promise<void> {
  await setupOrasBinary();
}

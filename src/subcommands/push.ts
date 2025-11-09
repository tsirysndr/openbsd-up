import { setupOrasBinary } from "../oras.ts";

export default async function (image: string): Promise<void> {
  await setupOrasBinary();
}

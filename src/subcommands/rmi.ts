import { Effect } from "effect";
import { deleteImage } from "../images.ts";

export default async function (id: string) {
  await Effect.runPromise(deleteImage(id));
}

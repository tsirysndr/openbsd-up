import { Data, Effect } from "effect";
import type { DeleteResult, InsertResult } from "kysely";
import { ctx } from "./context.ts";
import type { Image } from "./db.ts";

export class DbError extends Data.TaggedError("DatabaseError")<{
  message?: string;
}> {}

export const listImages = (): Effect.Effect<Image[], DbError, never> =>
  Effect.tryPromise({
    try: () => ctx.db.selectFrom("images").selectAll().execute(),
    catch: (error) =>
      new DbError({
        message: error instanceof Error ? error.message : String(error),
      }),
  });

export const getImage = (
  id: string,
): Effect.Effect<Image | undefined, DbError, never> =>
  Effect.tryPromise({
    try: () =>
      ctx.db
        .selectFrom("images")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst(),
    catch: (error) =>
      new DbError({
        message: error instanceof Error ? error.message : String(error),
      }),
  });

export const saveImage = (
  image: Image,
): Effect.Effect<InsertResult[], DbError, never> =>
  Effect.tryPromise({
    try: () =>
      ctx.db.insertInto("images")
        .values(image)
        .onConflict((oc) =>
          oc
            .column("repository")
            .column("tag")
            .doUpdateSet({
              size: image.size,
              path: image.path,
              format: image.format,
            })
        )
        .execute(),
    catch: (error) =>
      new DbError({
        message: error instanceof Error ? error.message : String(error),
      }),
  });

export const deleteImage = (
  id: string,
): Effect.Effect<DeleteResult[], DbError, never> =>
  Effect.tryPromise({
    try: () => ctx.db.deleteFrom("images").where("id", "=", id).execute(),
    catch: (error) =>
      new DbError({
        message: error instanceof Error ? error.message : String(error),
      }),
  });

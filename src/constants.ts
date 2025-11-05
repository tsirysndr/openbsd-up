export const CONFIG_DIR = `${Deno.env.get("HOME")}/.openbsd-up`;
export const DB_PATH = `${CONFIG_DIR}/state.sqlite`;
export const LOGS_DIR: string = `${CONFIG_DIR}/logs`;

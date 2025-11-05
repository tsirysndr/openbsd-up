import chalk from "chalk";
import { getInstanceState, updateInstanceState } from "../state.ts";
import { safeKillQemu } from "../utils.ts";

export default async function (name: string) {
  const vm = await getInstanceState(name);
  if (!vm) {
    console.error(
      `Virtual machine with name or ID ${chalk.greenBright(name)} not found.`,
    );
    Deno.exit(1);
  }

  console.log(
    `Stopping virtual machine ${chalk.greenBright(vm.name)} (ID: ${
      chalk.greenBright(vm.id)
    })...`,
  );

  const success = await safeKillQemu(vm.pid, Boolean(vm.bridge));

  if (!success) {
    console.error(
      `Failed to stop virtual machine ${chalk.greenBright(vm.name)}.`,
    );
    Deno.exit(1);
  }

  await updateInstanceState(vm.name, "STOPPED");

  console.log(`Virtual machine ${chalk.greenBright(vm.name)} stopped.`);
}

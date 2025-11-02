import { createId } from "@paralleldrive/cuid2";
import chalk from "chalk";
import _ from "lodash";
import Moniker from "moniker";
import { generateRandomMacAddress } from "./network.ts";
import { saveInstanceState, updateInstanceState } from "./state.ts";

const DEFAULT_VERSION = "7.8";

export interface Options {
  output?: string;
  cpu: string;
  cpus: number;
  memory: string;
  drive?: string;
  diskFormat: string;
  size: string;
  bridge?: string;
}

async function du(path: string): Promise<number> {
  const cmd = new Deno.Command("du", {
    args: [path],
    stdout: "piped",
    stderr: "inherit",
  });

  const { stdout } = await cmd.spawn().output();
  const output = new TextDecoder().decode(stdout).trim();
  const size = parseInt(output.split("\t")[0], 10);
  return size;
}

export async function emptyDiskImage(path: string): Promise<boolean> {
  if (!await Deno.stat(path).catch(() => false)) {
    return true;
  }

  const size = await du(path);
  return size < 10;
}

export async function downloadIso(
  url: string,
  options: Options,
): Promise<string | null> {
  const filename = url.split("/").pop()!;
  const outputPath = options.output ?? filename;

  if (options.drive && await Deno.stat(options.drive).catch(() => false)) {
    const driveSize = await du(options.drive);
    if (driveSize > 10) {
      console.log(
        chalk.yellowBright(
          `Drive image ${options.drive} is not empty (size: ${driveSize} KB), skipping ISO download to avoid overwriting existing data.`,
        ),
      );
      return null;
    }
  }

  if (await Deno.stat(outputPath).catch(() => false)) {
    console.log(
      chalk.yellowBright(
        `File ${outputPath} already exists, skipping download.`,
      ),
    );
    return outputPath;
  }

  const cmd = new Deno.Command("curl", {
    args: ["-L", "-o", outputPath, url],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const status = await cmd.spawn().status;
  if (!status.success) {
    console.error(chalk.redBright("Failed to download ISO image."));
    Deno.exit(status.code);
  }

  console.log(chalk.greenBright(`Downloaded ISO to ${outputPath}`));
  return outputPath;
}

function constructDownloadUrl(version: string): string {
  return `https://cdn.openbsd.org/pub/OpenBSD/${version}/amd64/install${
    version.replace(/\./g, "")
  }.iso`;
}

export async function runQemu(
  isoPath: string | null,
  options: Options,
): Promise<void> {
  const macAddress = generateRandomMacAddress();
  const cmd = new Deno.Command(options.bridge ? "sudo" : "qemu-system-x86_64", {
    args: [
      ..._.compact([options.bridge && "qemu-system-x86_64"]),
      "-enable-kvm",
      "-cpu",
      options.cpu,
      "-m",
      options.memory,
      "-smp",
      options.cpus.toString(),
      ..._.compact([isoPath && "-cdrom", isoPath]),
      "-netdev",
      options.bridge
        ? `bridge,id=net0,br=${options.bridge}`
        : "user,id=net0,hostfwd=tcp::2222-:22",
      "-device",
      `e1000,netdev=net0,mac=${macAddress}`,
      "-nographic",
      "-monitor",
      "none",
      "-chardev",
      "stdio,id=con0,signal=off",
      "-serial",
      "chardev:con0",
      ..._.compact(
        options.drive && [
          "-drive",
          `file=${options.drive},format=${options.diskFormat},if=virtio`,
        ],
      ),
    ],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
    .spawn();

  const name = Moniker.choose();
  await saveInstanceState({
    id: createId(),
    name,
    bridge: options.bridge,
    macAddress,
    memory: options.memory,
    cpus: options.cpus,
    cpu: options.cpu,
    diskSize: options.size,
    diskFormat: options.diskFormat,
    isoPath: isoPath ? Deno.realPathSync(isoPath) : undefined,
    drivePath: options.drive ? Deno.realPathSync(options.drive) : undefined,
    version: DEFAULT_VERSION,
    status: "RUNNING",
    pid: cmd.pid,
  });

  const status = await cmd.status;

  await updateInstanceState(name, "STOPPED",);

  if (!status.success) {
    Deno.exit(status.code);
  }
}

export function handleInput(input?: string): string {
  if (!input) {
    console.log(
      `No ISO path provided, defaulting to ${chalk.cyan("OpenBSD")} ${
        chalk.cyan(DEFAULT_VERSION)
      }...`,
    );
    return constructDownloadUrl(DEFAULT_VERSION);
  }

  const versionRegex = /^\d{1,2}\.\d{1,2}$/;

  if (versionRegex.test(input)) {
    console.log(
      `Detected version ${chalk.cyan(input)}, constructing download URL...`,
    );
    return constructDownloadUrl(input);
  }

  return input;
}

export async function createDriveImageIfNeeded(
  {
    drive: path,
    diskFormat: format,
    size,
  }: Options,
): Promise<void> {
  if (await Deno.stat(path!).catch(() => false)) {
    console.log(
      chalk.yellowBright(
        `Drive image ${path} already exists, skipping creation.`,
      ),
    );
    return;
  }

  const cmd = new Deno.Command("qemu-img", {
    args: ["create", "-f", format, path!, size!],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const status = await cmd.spawn().status;
  if (!status.success) {
    console.error(chalk.redBright("Failed to create drive image."));
    Deno.exit(status.code);
  }

  console.log(chalk.greenBright(`Created drive image at ${path}`));
}

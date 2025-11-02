#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env

import { Command } from "@cliffy/command";
import chalk from "chalk";
import _ from "lodash";

const DEFAULT_VERSION = "7.8";

interface Options {
  output?: string;
  cpu: string;
  cpus: number;
  memory: string;
  drive?: string;
  diskFormat: string;
  size: string;
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

async function downloadIso(
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

async function runQemu(
  isoPath: string | null,
  options: Options,
): Promise<void> {
  const cmd = new Deno.Command("qemu-system-x86_64", {
    args: [
      "-enable-kvm",
      "-cpu",
      options.cpu,
      "-m",
      options.memory,
      "-smp",
      options.cpus.toString(),
      ..._.compact([isoPath && "-cdrom", isoPath]),
      "-netdev",
      "user,id=net0,hostfwd=tcp::2222-:22",
      "-device",
      "e1000,netdev=net0",
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
  });

  const status = await cmd.spawn().status;

  if (!status.success) {
    Deno.exit(status.code);
  }
}

function handleInput(input?: string): string {
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

async function createDriveImageIfNeeded(
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

if (import.meta.main) {
  await new Command()
    .name("openbsd-up")
    .version("0.1.0")
    .description("Start a OpenBSD virtual machine using QEMU")
    .arguments(
      "[path-or-url-to-iso-or-version:string]",
    )
    .option("-o, --output <path:string>", "Output path for downloaded ISO")
    .option("-c, --cpu <type:string>", "Type of CPU to emulate", {
      default: "host",
    })
    .option("-C, --cpus <number:number>", "Number of CPU cores", {
      default: 2,
    })
    .option("-m, --memory <size:string>", "Amount of memory for the VM", {
      default: "2G",
    })
    .option("-d, --drive <path:string>", "Path to VM disk image")
    .option(
      "--disk-format <format:string>",
      "Disk image format (e.g., qcow2, raw)",
      {
        default: "raw",
      },
    )
    .option(
      "--size <size:string>",
      "Size of the VM disk image to create if it doesn't exist (e.g., 20G)",
      {
        default: "20G",
      },
    )
    .example(
      "Default usage",
      "openbsd-up",
    )
    .example(
      "Specific version",
      "openbsd-up 7.8",
    )
    .example(
      "Local ISO file",
      "openbsd-up /path/to/openbsd.iso",
    )
    .example(
      "Download URL",
      "openbsd-up https://cdn.openbsd.org/pub/OpenBSD/7.8/amd64/install78.iso",
    )
    .action(async (options: Options, input?: string) => {
      const resolvedInput = handleInput(input);
      let isoPath: string | null = resolvedInput;

      if (
        resolvedInput.startsWith("https://") ||
        resolvedInput.startsWith("http://")
      ) {
        isoPath = await downloadIso(resolvedInput, options);
      }

      if (options.drive) {
        await createDriveImageIfNeeded(options);
      }

      if (!input && options.drive) {
        isoPath = null;
      }

      await runQemu(isoPath, {
        cpu: options.cpu,
        memory: options.memory,
        cpus: options.cpus,
        drive: options.drive,
        diskFormat: options.diskFormat,
        size: options.size,
      });
    })
    .parse(Deno.args);
}

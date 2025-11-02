#!/usr/bin/env -S deno run --allow-run --allow-read --allow-env

import { Command } from "@cliffy/command";
import { createBridgeNetworkIfNeeded } from "./src/network.ts";
import {
  createDriveImageIfNeeded,
  downloadIso,
  emptyDiskImage,
  handleInput,
  Options,
  runQemu,
} from "./src/utils.ts";

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
    .option(
      "-b, --bridge <name:string>",
      "Name of the network bridge to use for networking (e.g., br0)",
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

      if (!input && options.drive && !await emptyDiskImage(options.drive)) {
        isoPath = null;
      }

      if (options.bridge) {
        await createBridgeNetworkIfNeeded(options.bridge);
      }

      await runQemu(isoPath, options);
    })
    .parse(Deno.args);
}

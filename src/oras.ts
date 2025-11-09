import chalk from "chalk";
import { CONFIG_DIR } from "./mod.ts";

const DEFAULT_ORAS_VERSION = "1.3.0";

export async function setupOrasBinary(): Promise<void> {
  Deno.env.set(
    "PATH",
    `${CONFIG_DIR}/bin:${Deno.env.get("PATH")}`,
  );

  const oras = new Deno.Command("which", {
    args: ["oras"],
    stdout: "null",
    stderr: "null",
  })
    .spawn();

  const orasStatus = await oras.status;
  if (orasStatus.success) {
    return;
  }

  const version = Deno.env.get("ORAS_VERSION") || DEFAULT_ORAS_VERSION;

  console.log(`Downloading ORAS version ${version}...`);

  const os = Deno.build.os;
  let arch = "amd64";

  if (Deno.build.arch === "aarch64") {
    arch = "arm64";
  }

  if (os !== "linux" && os !== "darwin") {
    console.error("Unsupported OS. Please download ORAS manually.");
    Deno.exit(1);
  }

  // https://github.com/oras-project/oras/releases/download/v1.3.0/oras_1.3.0_darwin_amd64.tar.gz
  const downloadUrl =
    `https://github.com/oras-project/oras/releases/download/v${version}/oras_${version}_${os}_${arch}.tar.gz`;

  console.log(`Downloading ORAS from ${chalk.greenBright(downloadUrl)}`);

  const downloadProcess = new Deno.Command("curl", {
    args: ["-L", downloadUrl, "-o", `oras_${version}_${os}_${arch}.tar.gz`],
    stdout: "inherit",
    stderr: "inherit",
    cwd: "/tmp",
  })
    .spawn();

  const status = await downloadProcess.status;
  if (!status.success) {
    console.error("Failed to download ORAS binary.");
    Deno.exit(1);
  }

  console.log("Extracting ORAS binary...");

  const extractProcess = new Deno.Command("tar", {
    args: [
      "-xzf",
      `oras_${version}_${os}_${arch}.tar.gz`,
      "-C",
      "./",
    ],
    stdout: "inherit",
    stderr: "inherit",
    cwd: "/tmp",
  })
    .spawn();

  const extractStatus = await extractProcess.status;
  if (!extractStatus.success) {
    console.error("Failed to extract ORAS binary.");
    Deno.exit(1);
  }

  await Deno.remove(`/tmp/oras_${version}_${os}_${arch}.tar.gz`);

  await Deno.mkdir(`${CONFIG_DIR}/bin`, { recursive: true });

  await Deno.rename(
    `/tmp/oras`,
    `${CONFIG_DIR}/bin/oras`,
  );
  await Deno.chmod(`${CONFIG_DIR}/bin/oras`, 0o755);

  console.log(
    `ORAS binary installed at ${
      chalk.greenBright(
        `${CONFIG_DIR}/bin/oras`,
      )
    }`,
  );
}

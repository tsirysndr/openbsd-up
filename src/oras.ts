export async function setupOrasBinary(version: string): Promise<void> {
  const process = new Deno.Command("oras", {
    args: ["version"],
    stdout: "piped",
    stderr: "piped",
  })
    .spawn();

  const { code } = await process.output();
  if (code === 0) {
    return;
  }

  console.log(`Downloading ORAS version ${version}...`);
}

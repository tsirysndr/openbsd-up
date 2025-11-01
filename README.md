# 🐡 openbsd-up

A simple CLI tool to spin up OpenBSD virtual machines using QEMU with minimal
fuss.

## ✨ Features

- 🚀 **Quick Start**: Launch OpenBSD VMs with a single command
- 📦 **Auto-Download**: Automatically fetches OpenBSD ISO images from official
  CDN
- 🔢 **Version Support**: Specify any OpenBSD version (e.g., `7.8`, `6.4`)
- 💾 **Flexible Storage**: Support for persistent disk images in multiple
  formats
- ⚙️ **Configurable**: Customize CPU, memory, cores, and more
- 🌐 **Network Ready**: Pre-configured SSH port forwarding (host:2222 →
  guest:22)
- 📝 **Serial Console**: Direct terminal access via `-nographic` mode

## 🛠️ Requirements

- [Deno](https://deno.com) runtime
- QEMU with KVM support (`qemu-system-x86_64`)
- `curl` for downloading ISOs

## 📥 Installation

```bash
deno install -A -g -r -f --config deno.json ./main.ts -n openbsd-up
```

## 🎯 Usage

### Basic Examples

```bash
# Launch latest default version (7.8)
openbsd-up

# Launch specific OpenBSD version
openbsd-up 7.6

# Use local ISO file
openbsd-up /path/to/openbsd.iso

# Download from custom URL
openbsd-up https://cdn.openbsd.org/pub/OpenBSD/7.8/amd64/install78.iso
```

### Advanced Options

```bash
# Custom VM configuration
openbsd-up 7.8 \
  --cpus 4 \
  --memory 4G \
  --cpu host \
  --drive disk.img \
  --disk-format qcow2

# Save downloaded ISO to specific location
openbsd-up 7.8 --output ~/isos/openbsd-78.iso
```

## 🎛️ Command Line Options

| Option          | Short | Description                    | Default        |
| --------------- | ----- | ------------------------------ | -------------- |
| `--output`      | `-o`  | Output path for downloaded ISO | Auto-generated |
| `--cpu`         | `-c`  | CPU type to emulate            | `host`         |
| `--cpus`        | `-C`  | Number of CPU cores            | `2`            |
| `--memory`      | `-m`  | RAM allocation                 | `2G`           |
| `--drive`       | `-d`  | Path to persistent disk image  | None           |
| `--disk-format` |       | Disk format (qcow2, raw, etc.) | `raw`          |

## 🖥️ Console Setup

When OpenBSD boots, you'll see the boot loader prompt, enter the following
command:

```
set tty com0
boot
```

## 🔌 Networking

The VM is automatically configured with:

- **SSH Port Forward**: `localhost:2222` → VM port `22`
- **Network Device**: Intel E1000 emulated NIC

Connect via SSH after installation:

```bash
ssh -p 2222 user@localhost
```

## 💡 Tips

- 🐏 Allocate at least 2GB RAM for smooth installation
- 💿 ISOs are cached - re-running with same version skips download
- 📀 Create a disk image before installation:
  ```bash
  qemu-img create -f qcow2 openbsd.qcow2 20G
  openbsd-up 7.8 --drive openbsd.qcow2 --disk-format qcow2
  ```

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Issues and pull requests welcome!

---

Made with 🐡 for OpenBSD enthusiasts

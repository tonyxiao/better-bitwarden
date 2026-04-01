# bbw — Better Bitwarden CLI

A TypeScript/Bun CLI that wraps the [`bw` Bitwarden CLI](https://bitwarden.com/help/cli/)
with enhanced workflows: flexible Sends, attachment handling, collection management.

## Requirements

- [Bitwarden CLI](https://bitwarden.com/help/cli/) — installed and unlocked (`bw unlock`)
- [Bun](https://bun.sh) ≥ 1.0

## Install

```sh
git clone https://github.com/tonyxiao/better-bitwarden
cd better-bitwarden
bun install
bun link          # makes `bbw` available globally
```

Or run directly without linking:

```sh
bun src/index.ts <command> [options]
```

---

## Commands

### `bbw send <query> [options]`

Create a Bitwarden Send from a vault item.

`<query>` is either an **exact item name** (case-insensitive) or a **UUID**.
If the name matches multiple items, the command aborts and shows the IDs to use instead.

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--mode` | `-m` | `auto` | Send mode (see below) |
| `--hidden` | `-H` | `false` | Hide text body by default (`body`/`both` modes) |
| `--days` | `-d` | `7` | Days until the Send is deleted |
| `--max` | `-a` | — | Max number of accesses |
| `--password` | `-p` | — | Password-protect the Send |

#### Send modes

| Mode | What gets sent |
|------|---------------|
| `body` | Text Send containing all item fields (username, password, notes, custom fields, …) |
| `attachments` | File Send: all attachments zipped together |
| `both` | File Send: attachments + item body exported as `<name>.txt`, all zipped |
| `auto` _(default)_ | `both` if the item has attachments, otherwise `body` |

#### Examples

```sh
# Auto — sends body+attachments for items that have them
bbw send "2003 Saturn Car"

# Body-only, hidden text, expires in 3 days
bbw send "Xfinity Router Password" --mode body --hidden --days 3

# Attachments only, password-protected
bbw send "Canadian Passport" --mode attachments --password hunter2

# Both body and attachments in one zip
bbw send "US Green Card" --mode both

# Look up by UUID (skips name resolution)
bbw send a1b2c3d4-e5f6-7890-abcd-ef1234567890 --mode body
```

---

### `bbw list`

List all vault items that have file attachments, with file names and sizes.

> For collections, use `bw list collections` directly.

---

### `bbw collection <collectionId> --org <orgId>`

Bulk-archive every item inside a collection.

```sh
bbw collection e0083b0c-47cf-4a16-a3a1-b3f50000e6b5 \
  --org 4443283a-1e59-4e2e-8ffb-b13b0154f92d
```

> To delete a collection afterwards, use `bw delete org-collection <id> --organizationid <orgId>` directly.

---

## Stack

- **Runtime**: [Bun](https://bun.sh)
- **CLI framework**: [citty](https://github.com/unjs/citty)
- **Validation**: [Zod v4](https://zod.dev)
- **Language**: TypeScript (`moduleResolution: NodeNext`)

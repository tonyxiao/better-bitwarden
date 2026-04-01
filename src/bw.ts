import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas — TypeScript types are derived from these
// ---------------------------------------------------------------------------

const BWUriSchema = z.object({
  uri: z.string(),
  match: z.number().optional(),
});

const BWFieldSchema = z.object({
  name: z.string(),
  value: z.string(),
  type: z.number(), // 0=text, 1=hidden, 2=boolean
});

export const BWAttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  size: z.string(),
  sizeName: z.string(),
  url: z.string(),
});

const BWLoginSchema = z.object({
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  totp: z.string().nullable().optional(),
  uris: z.array(BWUriSchema).optional(),
});

const BWCardSchema = z.object({
  cardholderName: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
  expMonth: z.string().nullable().optional(),
  expYear: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
});

const BWIdentitySchema = z.object({
  title: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  middleName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  address1: z.string().nullable().optional(),
  address2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  ssn: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
});

export const BWItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(), // 1=Login, 2=SecureNote, 3=Card, 4=Identity
  organizationId: z.string().nullable().optional(),
  collectionIds: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  login: BWLoginSchema.optional(),
  card: BWCardSchema.optional(),
  identity: BWIdentitySchema.optional(),
  fields: z.array(BWFieldSchema).optional(),
  attachments: z.array(BWAttachmentSchema).optional(),
});

export const BWCollectionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  externalId: z.string().nullable().optional(),
});

export const BWSendSchema = z.object({
  id: z.string(),
  accessId: z.string(),
  accessUrl: z.string(),
  name: z.string(),
  type: z.number(),
});

/** Send mode — validated by Zod at runtime */
export const SendModeSchema = z.enum(["auto", "body", "attachments", "both"]);

// Derived TypeScript types
export type BWItem = z.infer<typeof BWItemSchema>;
export type BWCollection = z.infer<typeof BWCollectionSchema>;
export type BWSend = z.infer<typeof BWSendSchema>;
export type BWAttachment = z.infer<typeof BWAttachmentSchema>;
export type SendMode = z.infer<typeof SendModeSchema>;

// ---------------------------------------------------------------------------
// Core runner
// ---------------------------------------------------------------------------

export async function bwRun(...args: string[]): Promise<string> {
  const proc = Bun.spawn(["bw", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`bw ${args[0]} failed (exit ${exitCode}): ${stderr.trim()}`);
  }

  return stdout.trim();
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function listItems(opts: {
  search?: string;
  collectionId?: string;
} = {}): Promise<BWItem[]> {
  const args = ["list", "items"];
  if (opts.search) args.push("--search", opts.search);
  if (opts.collectionId) args.push("--collectionid", opts.collectionId);
  return z.array(BWItemSchema).parse(JSON.parse(await bwRun(...args)));
}

export async function getItem(id: string): Promise<BWItem> {
  return BWItemSchema.parse(JSON.parse(await bwRun("get", "item", id)));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a vault item by UUID (direct lookup) or by exact name
 * (case-insensitive). Throws if the name is ambiguous or not found.
 */
export async function resolveItem(query: string): Promise<BWItem> {
  if (UUID_RE.test(query)) {
    return getItem(query);
  }

  const items = await listItems({ search: query });
  const exact = items.filter(
    (i) => i.name.toLowerCase() === query.toLowerCase()
  );

  if (exact.length === 1) return exact[0];

  if (exact.length === 0) {
    const hint = items
      .slice(0, 5)
      .map((i) => `  ${i.name}  (${i.id})`)
      .join("\n");
    throw new Error(
      `No exact name match for "${query}".` +
        (hint ? `\n\nPartial matches:\n${hint}` : "")
    );
  }

  throw new Error(
    `"${query}" matches ${exact.length} items. Specify by ID instead:\n` +
      exact.map((i) => `  ${i.id}`).join("\n")
  );
}

export async function archiveItem(itemId: string): Promise<void> {
  await bwRun("archive", "item", itemId);
}

export async function downloadAttachment(
  attachmentId: string,
  itemId: string,
  outputDir: string
): Promise<void> {
  await bwRun("get", "attachment", attachmentId, "--itemid", itemId, "--output", outputDir);
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export async function listCollections(): Promise<BWCollection[]> {
  return z
    .array(BWCollectionSchema)
    .parse(JSON.parse(await bwRun("list", "collections")));
}

export async function deleteCollection(collectionId: string, orgId: string): Promise<void> {
  await bwRun("delete", "org-collection", collectionId, "--organizationid", orgId);
}

// ---------------------------------------------------------------------------
// Sends
// ---------------------------------------------------------------------------

export async function createTextSend(opts: {
  name: string;
  text: string;
  hidden?: boolean;
  days?: number;
  maxAccessCount?: number;
  password?: string;
}): Promise<string> {
  const args = ["send", "-n", opts.name];
  if (opts.hidden) args.push("--hidden");
  if (opts.days) args.push("-d", String(opts.days));
  if (opts.maxAccessCount) args.push("-a", String(opts.maxAccessCount));
  if (opts.password) args.push("--password", opts.password);
  args.push(opts.text);
  return await bwRun(...args);
}

export async function createFileSend(opts: {
  name: string;
  filePath: string;
  days?: number;
  maxAccessCount?: number;
  password?: string;
}): Promise<string> {
  const args = ["send", "-f", "-n", opts.name];
  if (opts.days) args.push("-d", String(opts.days));
  if (opts.maxAccessCount) args.push("-a", String(opts.maxAccessCount));
  if (opts.password) args.push("--password", opts.password);
  args.push(opts.filePath);
  return await bwRun(...args);
}

export async function listSends(): Promise<BWSend[]> {
  return z.array(BWSendSchema).parse(JSON.parse(await bwRun("send", "list")));
}

export async function deleteSend(sendId: string): Promise<void> {
  await bwRun("send", "delete", sendId);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const ITEM_TYPE_NAMES: Record<number, string> = {
  1: "Login",
  2: "Secure Note",
  3: "Card",
  4: "Identity",
};

export function formatItemAsText(item: BWItem): string {
  const lines: string[] = [];

  lines.push(`Name: ${item.name}`);
  lines.push(`Type: ${ITEM_TYPE_NAMES[item.type] ?? "Unknown"}`);

  if (item.notes) lines.push(`Notes: ${item.notes}`);

  if (item.login) {
    const l = item.login;
    if (l.username) lines.push(`Username: ${l.username}`);
    if (l.password) lines.push(`Password: ${l.password}`);
    if (l.totp) lines.push(`TOTP Secret: ${l.totp}`);
    for (const u of l.uris ?? []) lines.push(`URL: ${u.uri}`);
  }

  if (item.card) {
    const c = item.card;
    if (c.cardholderName) lines.push(`Cardholder: ${c.cardholderName}`);
    if (c.brand) lines.push(`Brand: ${c.brand}`);
    if (c.number) lines.push(`Number: ${c.number}`);
    if (c.expMonth && c.expYear) lines.push(`Expiry: ${c.expMonth}/${c.expYear}`);
    if (c.code) lines.push(`CVV: ${c.code}`);
  }

  if (item.identity) {
    const id = item.identity;
    const fullName = [id.firstName, id.middleName, id.lastName].filter(Boolean).join(" ");
    if (fullName) lines.push(`Full Name: ${fullName}`);
    if (id.email) lines.push(`Email: ${id.email}`);
    if (id.phone) lines.push(`Phone: ${id.phone}`);
    if (id.company) lines.push(`Company: ${id.company}`);
    if (id.address1) lines.push(`Address: ${id.address1}`);
    if (id.address2) lines.push(`Address 2: ${id.address2}`);
    if (id.city) lines.push(`City: ${id.city}`);
    if (id.state) lines.push(`State: ${id.state}`);
    if (id.postalCode) lines.push(`Postal Code: ${id.postalCode}`);
    if (id.country) lines.push(`Country: ${id.country}`);
    if (id.ssn) lines.push(`SSN: ${id.ssn}`);
    if (id.passportNumber) lines.push(`Passport: ${id.passportNumber}`);
    if (id.licenseNumber) lines.push(`License: ${id.licenseNumber}`);
    if (id.username) lines.push(`Username: ${id.username}`);
  }

  for (const f of item.fields ?? []) {
    if (f.value != null) lines.push(`${f.name}: ${f.value}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function safeName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "_");
}

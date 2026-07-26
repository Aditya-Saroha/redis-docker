import net from "net";

// Mirrors the tags in server.cpp's `enum { TAG_NIL, TAG_ERR, TAG_STR, TAG_INT, TAG_DBL, TAG_ARR }`
export type KvValue =
  | { type: "nil" }
  | { type: "err"; code: number; message: string }
  | { type: "str"; value: string }
  | { type: "int"; value: number }
  | { type: "dbl"; value: number }
  | { type: "arr"; value: KvValue[] };

export class KvError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "KvError";
  }
}

// mirrors server.cpp's k_max_msg (32 << 20) -- sanity cap so a malformed
// length header can't make us try to buffer gigabytes
const K_MAX_MSG = 32 << 20;
const K_TIMEOUT_MS = 5000;

function buildRequest(cmd: string[]): Buffer {
  const strBufs = cmd.map((s) => Buffer.from(s, "utf8"));
  let bodyLen = 4; // nstr field
  for (const b of strBufs) bodyLen += 4 + b.length;

  const out = Buffer.alloc(4 + bodyLen);
  out.writeUInt32LE(bodyLen, 0);
  let cur = 4;
  out.writeUInt32LE(cmd.length, cur);
  cur += 4;
  for (const b of strBufs) {
    out.writeUInt32LE(b.length, cur);
    cur += 4;
    b.copy(out, cur);
    cur += b.length;
  }
  return out;
}

// Parses one tagged value starting at `offset`. Returns the value and the
// offset just past it. Recurses for TAG_ARR, matching the C++ client's
// print_response().
function parseValue(buf: Buffer, offset: number): [KvValue, number] {
  const tag = buf.readUInt8(offset);
  offset += 1;
  switch (tag) {
    case 0: // TAG_NIL
      return [{ type: "nil" }, offset];
    case 1: { // TAG_ERR: code(int32) + len(uint32) + msg
      const code = buf.readInt32LE(offset);
      offset += 4;
      const len = buf.readUInt32LE(offset);
      offset += 4;
      const message = buf.toString("utf8", offset, offset + len);
      offset += len;
      return [{ type: "err", code, message }, offset];
    }
    case 2: { // TAG_STR: len(uint32) + bytes
      const len = buf.readUInt32LE(offset);
      offset += 4;
      const value = buf.toString("utf8", offset, offset + len);
      offset += len;
      return [{ type: "str", value }, offset];
    }
    case 3: { // TAG_INT: int64
      const value = Number(buf.readBigInt64LE(offset));
      offset += 8;
      return [{ type: "int", value }, offset];
    }
    case 4: { // TAG_DBL: double
      const value = buf.readDoubleLE(offset);
      offset += 8;
      return [{ type: "dbl", value }, offset];
    }
    case 5: { // TAG_ARR: count(uint32) + that many flattened values
      const n = buf.readUInt32LE(offset);
      offset += 4;
      const items: KvValue[] = [];
      for (let i = 0; i < n; i++) {
        const [item, next] = parseValue(buf, offset);
        items.push(item);
        offset = next;
      }
      return [{ type: "arr", value: items }, offset];
    }
    default:
      throw new Error(`bad response tag: ${tag}`);
  }
}

// Opens a fresh TCP connection, sends one request, reads one full response,
// closes. Matches the server's request-response-per-message protocol --
// no persistent connection needed for the REST layer's usage pattern.
export function sendCommand(cmd: string[]): Promise<KvValue> {
  const host = process.env.KV_HOST || "127.0.0.1";
  const port = Number(process.env.KV_PORT || 1234);
  const req = buildRequest(cmd);

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buf = Buffer.alloc(0);
    let settled = false;

    const cleanup = () => socket.destroy();
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(err);
    };
    const succeed = (val: KvValue) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(val);
    };

    const timer = setTimeout(
      () => fail(new Error(`kv request timed out after ${K_TIMEOUT_MS}ms`)),
      K_TIMEOUT_MS
    );

    socket.on("connect", () => socket.write(req));
    socket.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length < 4) return;
      const bodyLen = buf.readUInt32LE(0);
      if (bodyLen > K_MAX_MSG) {
        fail(new Error("response too large"));
        return;
      }
      if (buf.length < 4 + bodyLen) return; // wait for more data
      try {
        const [value] = parseValue(buf, 4);
        succeed(value);
      } catch (e) {
        fail(e as Error);
      }
    });
    socket.on("error", (err) => fail(err));
  });
}

function unwrapErr(res: KvValue): void {
  if (res.type === "err") throw new KvError(res.code, res.message);
}

export async function kvGet(key: string): Promise<string | null> {
  const res = await sendCommand(["get", key]);
  unwrapErr(res);
  if (res.type === "nil") return null;
  if (res.type !== "str") throw new Error("unexpected response for get");
  return res.value;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const res = await sendCommand(["set", key, value]);
  unwrapErr(res);
}

export async function kvDel(key: string): Promise<boolean> {
  const res = await sendCommand(["del", key]);
  unwrapErr(res);
  return res.type === "int" && res.value === 1;
}

export async function kvKeys(): Promise<string[]> {
  const res = await sendCommand(["keys"]);
  unwrapErr(res);
  if (res.type !== "arr") throw new Error("unexpected response for keys");
  return res.value.map((v) => {
    if (v.type !== "str") throw new Error("bad keys entry");
    return v.value;
  });
}

export async function kvPExpire(key: string, ttlMs: number): Promise<boolean> {
  const res = await sendCommand(["pexpire", key, String(Math.trunc(ttlMs))]);
  unwrapErr(res);
  return res.type === "int" && res.value === 1;
}

// -2: key not found, -1: no TTL set, else: ms remaining
export async function kvPTTL(key: string): Promise<number> {
  const res = await sendCommand(["pttl", key]);
  unwrapErr(res);
  if (res.type !== "int") throw new Error("unexpected response for pttl");
  return res.value;
}

export async function kvZAdd(
  key: string,
  score: number,
  member: string
): Promise<boolean> {
  const res = await sendCommand(["zadd", key, String(score), member]);
  unwrapErr(res);
  return res.type === "int" && res.value === 1;
}

export async function kvZRem(key: string, member: string): Promise<boolean> {
  const res = await sendCommand(["zrem", key, member]);
  unwrapErr(res);
  return res.type === "int" && res.value === 1;
}

export async function kvZScore(
  key: string,
  member: string
): Promise<number | null> {
  const res = await sendCommand(["zscore", key, member]);
  unwrapErr(res);
  if (res.type === "nil") return null;
  if (res.type !== "dbl") throw new Error("unexpected response for zscore");
  return res.value;
}

export interface ZMember {
  name: string;
  score: number;
}

export async function kvZQuery(
  key: string,
  score: number,
  name: string,
  offset: number,
  limit: number
): Promise<ZMember[]> {
  const res = await sendCommand([
    "zquery",
    key,
    String(score),
    name,
    String(Math.trunc(offset)),
    String(Math.trunc(limit)),
  ]);
  unwrapErr(res);
  if (res.type !== "arr") throw new Error("unexpected response for zquery");
  const out: ZMember[] = [];
  for (let i = 0; i < res.value.length; i += 2) {
    const nameV = res.value[i];
    const scoreV = res.value[i + 1];
    if (nameV.type !== "str" || scoreV.type !== "dbl") {
      throw new Error("bad zquery entry");
    }
    out.push({ name: nameV.value, score: scoreV.value });
  }
  return out;
}

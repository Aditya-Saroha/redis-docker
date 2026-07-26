import asyncio
import struct

# in-memory state, mirroring server.cpp's g_data
strings: dict[str, str] = {}
zsets: dict[str, dict[str, float]] = {}   # key -> {member: score}
ttls: dict[str, int] = {}                 # key -> ms remaining (not decremented)

TAG_NIL, TAG_ERR, TAG_STR, TAG_INT, TAG_DBL, TAG_ARR = range(6)
ERR_UNKNOWN, ERR_TOO_BIG, ERR_BAD_TYP, ERR_BAD_ARG = 1, 2, 3, 4


def out_nil(buf: bytearray):
    buf.append(TAG_NIL)


def out_str(buf: bytearray, s: str):
    b = s.encode()
    buf.append(TAG_STR)
    buf += struct.pack("<I", len(b))
    buf += b


def out_int(buf: bytearray, v: int):
    buf.append(TAG_INT)
    buf += struct.pack("<q", v)


def out_dbl(buf: bytearray, v: float):
    buf.append(TAG_DBL)
    buf += struct.pack("<d", v)


def out_err(buf: bytearray, code: int, msg: str):
    b = msg.encode()
    buf.append(TAG_ERR)
    buf += struct.pack("<i", code)
    buf += struct.pack("<I", len(b))
    buf += b


def out_arr_header(buf: bytearray, n: int):
    buf.append(TAG_ARR)
    buf += struct.pack("<I", n)


def handle(cmd: list[str]) -> bytes:
    out = bytearray()
    if len(cmd) == 2 and cmd[0] == "get":
        key = cmd[1]
        if key in strings:
            out_str(out, strings[key])
        else:
            out_nil(out)
    elif len(cmd) == 3 and cmd[0] == "set":
        strings[cmd[1]] = cmd[2]
        out_nil(out)
    elif len(cmd) == 2 and cmd[0] == "del":
        existed = cmd[1] in strings or cmd[1] in zsets
        strings.pop(cmd[1], None)
        zsets.pop(cmd[1], None)
        ttls.pop(cmd[1], None)
        out_int(out, 1 if existed else 0)
    elif len(cmd) == 3 and cmd[0] == "pexpire":
        key = cmd[1]
        found = key in strings or key in zsets
        if found:
            ttls[key] = int(cmd[2])
        out_int(out, 1 if found else 0)
    elif len(cmd) == 2 and cmd[0] == "pttl":
        key = cmd[1]
        if key not in strings and key not in zsets:
            out_int(out, -2)
        elif key not in ttls:
            out_int(out, -1)
        else:
            out_int(out, ttls[key])
    elif len(cmd) == 1 and cmd[0] == "keys":
        all_keys = list(strings.keys()) + list(zsets.keys())
        out_arr_header(out, len(all_keys))
        for k in all_keys:
            out_str(out, k)
    elif len(cmd) == 4 and cmd[0] == "zadd":
        key, score, member = cmd[1], float(cmd[2]), cmd[3]
        z = zsets.setdefault(key, {})
        added = member not in z
        z[member] = score
        out_int(out, 1 if added else 0)
    elif len(cmd) == 3 and cmd[0] == "zrem":
        key, member = cmd[1], cmd[2]
        z = zsets.get(key, {})
        existed = member in z
        z.pop(member, None)
        out_int(out, 1 if existed else 0)
    elif len(cmd) == 3 and cmd[0] == "zscore":
        key, member = cmd[1], cmd[2]
        z = zsets.get(key, {})
        if member in z:
            out_dbl(out, z[member])
        else:
            out_nil(out)
    elif len(cmd) == 6 and cmd[0] == "zquery":
        key, score, name, offset, limit = (
            cmd[1], float(cmd[2]), cmd[3], int(cmd[4]), int(cmd[5]),
        )
        z = zsets.get(key, {})
        items = sorted(z.items(), key=lambda kv: (kv[1], kv[0]))
        items = [it for it in items if (it[1], it[0]) >= (score, name)]
        items = items[offset:offset + limit] if limit > 0 else []
        out_arr_header(out, len(items) * 2)
        for member, sc in items:
            out_str(out, member)
            out_dbl(out, sc)
    else:
        out_err(out, ERR_UNKNOWN, "unknown command.")

    return bytes(out)


async def handle_conn(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    try:
        while True:
            hdr = await reader.readexactly(4)
            (total_len,) = struct.unpack("<I", hdr)
            body = await reader.readexactly(total_len)
            (nstr,) = struct.unpack_from("<I", body, 0)
            cur = 4
            cmd = []
            for _ in range(nstr):
                (slen,) = struct.unpack_from("<I", body, cur)
                cur += 4
                cmd.append(body[cur:cur + slen].decode())
                cur += slen
            resp_body = handle(cmd)
            writer.write(struct.pack("<I", len(resp_body)) + resp_body)
            await writer.drain()
    except (asyncio.IncompleteReadError, ConnectionResetError):
        pass
    finally:
        writer.close()


async def main():
    server = await asyncio.start_server(handle_conn, "127.0.0.1", 1234)
    print("mock kv server listening on 127.0.0.1:1234")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())

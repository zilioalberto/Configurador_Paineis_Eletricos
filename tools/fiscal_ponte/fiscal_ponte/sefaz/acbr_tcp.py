"""Cliente TCP ACBrMonitor (comando + terminador)."""
from __future__ import annotations

import socket

_ACBR_TERMINATOR = b"\r\n.\r\n"


def enviar_comando_acbr(
    *,
    host: str,
    port: int,
    comando: str,
    timeout_sec: int,
) -> str:
    payload = (comando + "\r\n.\r\n").encode("utf-8")
    with socket.create_connection((host, port), timeout=timeout_sec) as sock:
        sock.sendall(payload)
        chunks: list[bytes] = []
        while True:
            try:
                parte = sock.recv(65536)
            except socket.timeout:
                break
            if not parte:
                break
            chunks.append(parte)
            if _ACBR_TERMINATOR in b"".join(chunks[-2:]):
                break
    raw = b"".join(chunks).decode("utf-8", errors="replace")
    if "ERRO:" in raw.upper() and "OK:" not in raw:
        raise RuntimeError(f"ACBrMonitor retornou erro: {raw[:800]}")
    return raw

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""汇智云码 敏感文件加解密工具

算法: AES-256-GCM + PBKDF2-HMAC-SHA256 (480000 迭代)
文件格式: b"HZY1" + salt(16B) + nonce(12B) + ciphertext+tag

用法:
    python secrets_tool.py enc  <file>            # -> <file>.enc
    python secrets_tool.py dec  <file.enc>        # -> 去掉 .enc
    python secrets_tool.py enc  <file> <out.enc>
    python secrets_tool.py dec  <file.enc> <out>
    python secrets_tool.py encdir <src_dir> <out_dir>
    python secrets_tool.py decdir <src_dir> <out_dir>
    python secrets_tool.py list  <dir>

密码来源优先级: --password xxx  >  环境变量 HZY_SECRET  >  交互式输入
密码不写入任何文件、不出现在命令行历史（推荐用环境变量或交互输入）。
"""
import os
import sys

MAGIC = b"HZY1"
SALT_LEN = 16
NONCE_LEN = 12
ITERATIONS = 480_000


def load_crypto():
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes
        return AESGCM, PBKDF2HMAC, hashes
    except ImportError:
        sys.exit("缺少依赖，请先执行: pip install cryptography")


def derive_key(password: str, salt: bytes) -> bytes:
    AESGCM, PBKDF2HMAC, hashes = load_crypto()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(password.encode("utf-8"))


def get_password(args):
    if "--password" in args:
        i = args.index("--password")
        pwd = args[i + 1]
        del args[i:i + 2]
        return pwd
    pwd = os.environ.get("HZY_SECRET")
    if pwd:
        return pwd
    import getpass
    pwd = getpass.getpass("请输入加密密码: ")
    if not pwd:
        sys.exit("密码为空，已取消")
    return pwd


def encrypt_bytes(data: bytes, password: str) -> bytes:
    AESGCM, _, _ = load_crypto()
    salt = os.urandom(SALT_LEN)
    nonce = os.urandom(NONCE_LEN)
    key = derive_key(password, salt)
    ct = AESGCM(key).encrypt(nonce, data, None)
    return MAGIC + salt + nonce + ct


def decrypt_bytes(blob: bytes, password: str) -> bytes:
    AESGCM, _, _ = load_crypto()
    if not blob.startswith(MAGIC):
        sys.exit("文件格式错误：不是本工具生成的加密文件")
    salt = blob[len(MAGIC):len(MAGIC) + SALT_LEN]
    nonce = blob[len(MAGIC) + SALT_LEN:len(MAGIC) + SALT_LEN + NONCE_LEN]
    ct = blob[len(MAGIC) + SALT_LEN + NONCE_LEN:]
    key = derive_key(password, salt)
    try:
        return AESGCM(key).decrypt(nonce, ct, None)
    except Exception:
        sys.exit("解密失败：密码错误或文件损坏")


def do_enc(src, dst, password):
    with open(src, "rb") as f:
        data = f.read()
    blob = encrypt_bytes(data, password)
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(blob)
    print(f"[enc] {src}  ->  {dst}  ({len(data)} -> {len(blob)} bytes)")


def do_dec(src, dst, password):
    with open(src, "rb") as f:
        blob = f.read()
    data = decrypt_bytes(blob, password)
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(data)
    print(f"[dec] {src}  ->  {dst}  ({len(blob)} -> {len(data)} bytes)")


def walk_pairs(src_dir, out_dir, suffix_from, suffix_to):
    for root, _dirs, files in os.walk(src_dir):
        for name in files:
            if suffix_from and not name.endswith(suffix_from):
                continue
            s = os.path.join(root, name)
            rel = os.path.relpath(s, src_dir)
            # suffix_to=None 表示保持原名；空字符串表示去掉 suffix_from
            if suffix_to is not None:
                if suffix_from:
                    rel = rel[: -len(suffix_from)] + suffix_to
                else:
                    rel = rel + suffix_to
            yield s, os.path.join(out_dir, rel)


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return
    cmd = args.pop(0)
    password = get_password(args)

    if cmd in ("enc", "dec"):
        if not args:
            sys.exit("缺少文件参数")
        src = args[0]
        if cmd == "enc":
            dst = args[1] if len(args) > 1 else src + ".enc"
            do_enc(src, dst, password)
        else:
            dst = args[1] if len(args) > 1 else (src[:-4] if src.endswith(".enc") else src + ".dec")
            do_dec(src, dst, password)

    elif cmd == "encdir":
        if len(args) < 2:
            sys.exit("用法: encdir <src_dir> <out_dir>")
        n = 0
        for s, d in walk_pairs(args[0], args[1], "", ".enc"):
            do_enc(s, d, password)
            n += 1
        print(f"共加密 {n} 个文件")

    elif cmd == "decdir":
        if len(args) < 2:
            sys.exit("用法: decdir <src_dir> <out_dir>")
        n = 0
        for s, d in walk_pairs(args[0], args[1], ".enc", ""):
            do_dec(s, d, password)
            n += 1
        print(f"共解密 {n} 个文件")

    elif cmd == "list":
        root = args[0] if args else "."
        for r, _d, files in os.walk(root):
            for name in sorted(files):
                if name.endswith(".enc"):
                    p = os.path.join(r, name)
                    print(f"{os.path.getsize(p):>10}  {os.path.relpath(p, root)}")

    else:
        sys.exit(f"未知命令: {cmd}")


if __name__ == "__main__":
    main()

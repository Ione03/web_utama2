# utils/base62.py
BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def base62_encode(data: bytes) -> str:
    """Encode bytes into a Base62 string."""
    num = int.from_bytes(data, "big")
    if num == 0:
        return BASE62_ALPHABET[0]
    chars = []
    while num > 0:
        num, rem = divmod(num, 62)
        chars.append(BASE62_ALPHABET[rem])
    return "".join(reversed(chars))

def base62_decode(s: str) -> bytes:
    """Decode a Base62 string into bytes."""
    num = 0
    for char in s:
        num = num * 62 + BASE62_ALPHABET.index(char)
    # Calculate minimum byte length
    length = (num.bit_length() + 7) // 8
    return num.to_bytes(length, "big")

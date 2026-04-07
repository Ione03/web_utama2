# utils/url_encryption.py
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from .base62 import base62_encode, base62_decode

# AES key must be 16, 24, or 32 bytes (we'll use 32 for AES-256)
AES_KEY = getattr(settings, "AES_KEY", None)
if not AES_KEY:
    raise ValueError("AES_KEY is not set in settings.py")

if isinstance(AES_KEY, str):
    # If stored as hex string in settings, convert to bytes
    import binascii
    AES_KEY = binascii.unhexlify(AES_KEY)

aesgcm = AESGCM(AES_KEY)

def encrypt_data(data: str) -> str:
    """Encrypts a string and returns a short Base62 string."""
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, data.encode(), None)
    return base62_encode(nonce + ciphertext)

def decrypt_data(token: str) -> str:
    """Decrypts a Base62 string back to a string."""
    try:
        data = base62_decode(token)
        nonce, ciphertext = data[:12], data[12:]
        data_str = aesgcm.decrypt(nonce, ciphertext, None).decode()
        return data_str
    except Exception:
        raise ValueError("Invalid or tampered data token")
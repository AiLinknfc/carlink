from __future__ import annotations

import boto3
from botocore.config import Config

from app.config import get_settings

settings = get_settings()


def get_r2_client():
    """Return a boto3 S3 client configured for Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=Config(
            signature_version="s3v4",
            region_name="auto",
            s3={"addressing_style": "virtual"},
        ),
    )


async def upload_file(file_bytes: bytes, key: str, content_type: str) -> str:
    """Upload a file to R2 and return the public URL."""
    client = get_r2_client()
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"{settings.r2_public_url}/{key}"


async def delete_file(key: str) -> None:
    """Delete a file from R2."""
    client = get_r2_client()
    client.delete_object(Bucket=settings.r2_bucket_name, Key=key)


def get_public_url(key: str) -> str:
    return f"{settings.r2_public_url}/{key}"


def key_from_url(url: str) -> str | None:
    """Recover the R2 object key from a public URL previously returned by upload_file."""
    prefix = f"{settings.r2_public_url}/"
    if url and url.startswith(prefix):
        return url[len(prefix):]
    return None


def get_file(key: str) -> tuple[bytes, str]:
    """Fetch a file's bytes and content-type from R2. Sync — call via run_in_threadpool."""
    client = get_r2_client()
    obj = client.get_object(Bucket=settings.r2_bucket_name, Key=key)
    return obj["Body"].read(), obj.get("ContentType") or "application/octet-stream"

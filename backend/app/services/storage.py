from __future__ import annotations

import boto3
from botocore.config import Config
from starlette.concurrency import run_in_threadpool

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
    """Upload a file to R2 and return the proxy URL."""
    client = get_r2_client()
    await run_in_threadpool(
        client.put_object,
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return get_public_url(key)


async def delete_file(key: str) -> None:
    """Delete a file from R2."""
    client = get_r2_client()
    await run_in_threadpool(
        client.delete_object, Bucket=settings.r2_bucket_name, Key=key
    )


def get_public_url(key: str) -> str:
    """Return a proxy URL that serves the file through the backend.
    Uses /api/upload/files/{key} so images work even if R2 public access is off."""
    return f"/api/upload/files/{key}"


def key_from_url(url: str) -> str | None:
    """Recover the R2 object key from a URL (supports both proxy and old R2 URLs)."""
    if not url:
        return None
    # New proxy URL format: /api/upload/files/{key}
    proxy_prefix = "/api/upload/files/"
    if url.startswith(proxy_prefix):
        return url[len(proxy_prefix):]
    # Legacy direct R2 URL: {r2_public_url}/{key}
    r2_prefix = f"{settings.r2_public_url}/"
    if url.startswith(r2_prefix):
        return url[len(r2_prefix):]
    return None


async def get_file(key: str) -> tuple[bytes, str]:
    """Fetch a file's bytes and content-type from R2."""
    client = get_r2_client()
    obj = await run_in_threadpool(
        client.get_object, Bucket=settings.r2_bucket_name, Key=key
    )
    body = await run_in_threadpool(obj["Body"].read)
    return body, obj.get("ContentType") or "application/octet-stream"

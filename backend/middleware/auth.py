"""
Firebase Auth middleware for FastAPI.

Verifies Firebase ID tokens on protected routes and injects the
authenticated UID into the request state.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import Request, HTTPException, status
from firebase_admin import auth

logger = logging.getLogger(__name__)


async def get_current_uid(request: Request) -> str:
    """
    FastAPI dependency: extract and verify Firebase ID token from Authorization header.

    Args:
        request: The incoming FastAPI Request.

    Returns:
        The verified Firebase Auth UID string.

    Raises:
        HTTPException 401: If the token is missing or invalid.
    """
    authorization: Optional[str] = request.headers.get("Authorization")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Expected: 'Bearer <id_token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    id_token = authorization.split("Bearer ")[1].strip()

    try:
        decoded_token = auth.verify_id_token(id_token)
        uid: str = decoded_token["uid"]
        logger.debug("Verified token for uid=%s", uid)
        return uid
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token has expired. Please sign in again.",
        )
    except auth.InvalidIdTokenError as exc:
        logger.warning("Invalid token: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token.",
        )
    except Exception as exc:
        logger.error("Token verification error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error.",
        )

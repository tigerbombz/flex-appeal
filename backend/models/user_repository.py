from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.db_models import User
from datetime import datetime, timedelta
from typing import Optional

async def get_or_create_user(
    db: AsyncSession,
    yahoo_id: str,
    display_name: str = None,
    email: str = None,
) -> User:
    """Get existing user or create new one"""
    result = await db.execute(
        select(User).where(User.yahoo_id == yahoo_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            yahoo_id     = yahoo_id,
            display_name = display_name,
            email        = email,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user

async def save_tokens(
    db: AsyncSession,
    yahoo_id: str,
    access_token: str,
    refresh_token: str,
    expires_in: int = 3600,
) -> User:
    """Save OAuth tokens for a user"""
    result = await db.execute(
        select(User).where(User.yahoo_id == yahoo_id)
    )
    user = result.scalar_one_or_none()

    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    if user:
        user.access_token     = access_token
        user.refresh_token    = refresh_token
        user.token_expires_at = expires_at
        await db.commit()
        await db.refresh(user)
    else:
        user = User(
            yahoo_id         = yahoo_id,
            access_token     = access_token,
            refresh_token    = refresh_token,
            token_expires_at = expires_at,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user

async def get_user_by_yahoo_id(
    db: AsyncSession,
    yahoo_id: str,
) -> Optional[User]:
    """Get user by Yahoo ID"""
    result = await db.execute(
        select(User).where(User.yahoo_id == yahoo_id)
    )
    return result.scalar_one_or_none()

async def get_active_token(
    db: AsyncSession,
    yahoo_id: str,
) -> Optional[str]:
    """Get access token if not expired"""
    result = await db.execute(
        select(User).where(User.yahoo_id == yahoo_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.access_token:
        return None

    if user.token_expires_at and user.token_expires_at < datetime.utcnow():
        return None

    return user.access_token

async def get_refresh_token(
    db: AsyncSession,
    yahoo_id: str,
) -> Optional[str]:
    """Get refresh token for a user"""
    result = await db.execute(
        select(User).where(User.yahoo_id == yahoo_id)
    )
    user = result.scalar_one_or_none()
    return user.refresh_token if user else None

async def update_user_preferences(
    db: AsyncSession,
    yahoo_id: str,
    scoring_format: str = None,
    scoring_mode: str = None,
) -> Optional[User]:
    """Update user scoring preferences"""
    result = await db.execute(
        select(User).where(User.yahoo_id == yahoo_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        return None

    if scoring_format:
        user.scoring_format = scoring_format
    if scoring_mode:
        user.scoring_mode = scoring_mode

    await db.commit()
    await db.refresh(user)
    return user

async def get_first_user(db: AsyncSession) -> Optional[User]:
    """
    Get the first user in the database.
    Used for single-user mode during development.
    """
    result = await db.execute(select(User).limit(1))
    return result.scalar_one_or_none()
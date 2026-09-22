from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import (
    hash_password, verify_password, create_access_token,
    generate_reset_token,
)
from app.deps import get_current_user
from app.config import settings
from app.utils.email import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = models.User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    return schemas.TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()

    # Same generic error whether the email doesn't exist or the password is wrong,
    # so attackers can't use this endpoint to enumerate registered emails.
    invalid_error = HTTPException(status_code=401, detail="Invalid email or password")

    if not user or not verify_password(payload.password, user.password_hash):
        raise invalid_error
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account has been disabled")

    token = create_access_token(subject=user.id, role=user.role.value)
    return schemas.TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()

    # Always return the same response, whether or not the email exists,
    # so this endpoint can't be used to check which emails are registered.
    generic_response = {"message": "If that email is registered, a reset link has been sent."}

    if not user:
        return generic_response

    token = generate_reset_token()
    reset_row = models.PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES),
    )
    db.add(reset_row)
    db.commit()

    reset_link = f"{settings.FRONTEND_ORIGIN}/reset-password?token={token}"
    send_password_reset_email(user.email, reset_link)

    return generic_response


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    row = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token == payload.token
    ).first()

    if not row or row.used or row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    user = db.query(models.User).filter(models.User.id == row.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    user.password_hash = hash_password(payload.new_password)
    row.used = True
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}

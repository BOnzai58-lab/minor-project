from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import AuthLog, User


class AuthService:
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.algorithm = "HS256"

    def hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_user_by_username(self, db: Session, username: str):
        return db.query(User).filter(User.username == username).first()

    def authenticate_user(self, db: Session, username: str, password: str):
        user = self.get_user_by_username(db, username)
        if not user or not user.is_active:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_user(self, db: Session, username: str, password: str, role: str = "user"):
        existing_user = self.get_user_by_username(db, username)
        if existing_user:
            raise ValueError("Username already exists")
        user = User(
            username=username,
            hashed_password=self.hash_password(password),
            role=role,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def create_access_token(self, username: str, role: str):
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {"sub": username, "role": role, "exp": expire}
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=self.algorithm)

    def decode_access_token(self, token: str):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None

    def log_auth_event(
        self,
        db: Session,
        username: str,
        event: str,
        success: bool,
        user_id: int = None,
        ip_address: str = None,
        user_agent: str = None,
    ):
        db.add(
            AuthLog(
                user_id=user_id,
                username=username,
                event=event,
                success=success,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )
        db.commit()

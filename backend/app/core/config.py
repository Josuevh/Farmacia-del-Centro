from pydantic import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/farmacia"
    SECRET_KEY: str = "CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    FIRST_SUPERUSER_EMAIL: str = "admin@example.com"
    STRIPE_API_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    GEMINI_API_KEY: str = ""
    # An alias Google keeps pointing at their current recommended flash model —
    # avoids needing a code change every time they retire a specific version
    # (gemini-2.0-flash and gemini-2.5-flash were both already gone as of testing).
    GEMINI_MODEL: str = "gemini-flash-latest"

    class Config:
        env_file = ".env"

settings = Settings()

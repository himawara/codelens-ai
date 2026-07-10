from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    gemini_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./codelens.db"
    environment: str = "development"
    cors_origins: str = '["http://localhost:5173","chrome-extension://*"]'

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.cors_origins)

    class Config:
        env_file = ".env"


settings = Settings()

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str = ""
    cognite_api_key: str = ""
    openai_chat_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    @property
    def api_root(self) -> Path:
        return Path(__file__).resolve().parent.parent

    @property
    def knowledge_dir(self) -> Path:
        return self.api_root / "knowledge"

    @property
    def chroma_dir(self) -> Path:
        return self.api_root / "data" / "chroma"


settings = Settings()

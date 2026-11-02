from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, password: str) -> str:
        if len(password.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, password: str) -> str:
        if len(password.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return password


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GenerateRequest(BaseModel):
    interests: list[str] = Field(min_length=1)
    duration_minutes: int = Field(alias="durationMinutes", ge=3, le=5)
    category: Optional[str] = Field(default=None, min_length=1, max_length=64)

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class Choice(BaseModel):
    id: str
    text: str


class Question(BaseModel):
    id: str
    prompt: str
    choices: list[Choice]


class GenerateResponse(BaseModel):
    id: str
    title: str
    passage_markdown: str = Field(alias="passageMarkdown")
    estimated_minutes: int = Field(alias="estimatedMinutes")
    questions: list[Question]

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class GradeRequest(BaseModel):
    answers: dict[str, str]
    completion_time_ms: Optional[int] = Field(default=None, alias="completionTimeMs", ge=0)

    model_config = ConfigDict(populate_by_name=True)


class InterventionLogCreate(BaseModel):
    category: str = Field(min_length=1, max_length=64)
    mode: str = Field(min_length=1, max_length=32)
    quiz_score: Optional[float] = Field(default=None, alias="quizScore", ge=0, le=100)
    completion_time_ms: int = Field(alias="completionTimeMs", ge=0)
    skipped: bool
    intervention_id: Optional[str] = Field(default=None, alias="interventionId", min_length=1)

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_score_for_completion(self):
        if self.skipped and self.quiz_score is not None:
            raise ValueError("Skipped interventions cannot have a quiz score")
        if not self.skipped and self.quiz_score is None:
            raise ValueError("Completed interventions require a quiz score")
        return self


class InterventionLogResponse(BaseModel):
    id: int
    user_id: int = Field(alias="userId")
    category: str
    mode: str
    quiz_score: Optional[float] = Field(alias="quizScore")
    completion_time_ms: int = Field(alias="completionTimeMs")
    skipped: bool

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class PerQuestion(BaseModel):
    question_id: str = Field(alias="questionId")
    correct: bool
    correct_choice_id: str = Field(alias="correctChoiceId")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class GradeResponse(BaseModel):
    score_pct: int = Field(alias="scorePct")
    correct_count: int = Field(alias="correctCount")
    total: int
    per_question: list[PerQuestion] = Field(alias="perQuestion")
    xp_awarded: int = Field(alias="xpAwarded")

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)
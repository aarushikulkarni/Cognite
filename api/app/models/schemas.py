from pydantic import BaseModel, ConfigDict, Field


class GenerateRequest(BaseModel):
    interests: list[str] = Field(min_length=1)
    duration_minutes: int = Field(alias="durationMinutes", ge=3, le=5)

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

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import InterventionLog, User
from app.schemas import (
    Choice,
    GenerateRequest,
    GenerateResponse,
    GradeRequest,
    GradeResponse,
    PerQuestion,
    Question,
)
from app.rag.generate import generate_intervention
from app.store import get

router = APIRouter(prefix="/v1/interventions", tags=["interventions"])
CLASSIC_FICTION_TAGS = {"mystery", "horror", "scifi", "fantasy"}
VALID_CATEGORIES = CLASSIC_FICTION_TAGS | {
    "romance",
    "technology",
    "science",
    "history",
    "philosophy",
    "arts",
}


@router.post("", response_model=GenerateResponse, response_model_by_alias=True)
def create_intervention(
    body: GenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GenerateResponse:
    try:
        item = generate_intervention(body.interests, body.duration_minutes)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Generation failed: {exc}") from exc

    category = next((interest for interest in body.interests if interest in VALID_CATEGORIES), body.interests[0])
    mode = "romance" if category == "romance" else "classic_fiction" if category in CLASSIC_FICTION_TAGS else "factual_rag"
    db.add(
        InterventionLog(
            user_id=user.id,
            category=category,
            mode=mode,
            intervention_id=item.id,
        )
    )
    db.commit()

    return GenerateResponse(
        id=item.id,
        title=item.title,
        passageMarkdown=item.passage_markdown,
        estimatedMinutes=item.estimated_minutes,
        questions=[
            Question(
                id=q.id,
                prompt=q.prompt,
                choices=[Choice(id=c["id"], text=c["text"]) for c in q.choices],
            )
            for q in item.questions
        ],
    )


@router.post("/{intervention_id}/grade", response_model=GradeResponse, response_model_by_alias=True)
def grade_intervention(
    intervention_id: str,
    body: GradeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GradeResponse:
    log = db.scalar(
        select(InterventionLog).where(
            InterventionLog.intervention_id == intervention_id,
            InterventionLog.user_id == user.id,
        )
    )
    if log is None:
        raise HTTPException(status_code=404, detail="Intervention expired or not found")

    item = get(intervention_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Intervention expired or not found")

    per: list[PerQuestion] = []
    for question in item.questions:
        chosen = body.answers.get(question.id)
        per.append(
            PerQuestion(
                questionId=question.id,
                correct=chosen == question.answer_id,
                correctChoiceId=question.answer_id,
            )
        )
    total = len(per)
    correct = sum(1 for row in per if row.correct)
    pct = round(100 * correct / total) if total else 0
    xp = 20 + round(15 * (correct / total)) if total else 20
    log.quiz_score = pct
    log.completion_time_ms = body.completion_time_ms
    db.commit()
    return GradeResponse(
        scorePct=pct,
        correctCount=correct,
        total=total,
        perQuestion=per,
        xpAwarded=xp,
    )

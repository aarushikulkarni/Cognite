import random
from collections import defaultdict

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import InterventionLog

EPSILON = 0.15


def select_optimal_category(
    db: Session,
    user_id: int,
    available_categories: list[str],
) -> str:
    categories = list(dict.fromkeys(category for category in available_categories if category))
    if not categories:
        raise ValueError("At least one available category is required")

    rows = db.execute(
        select(
            InterventionLog.category,
            InterventionLog.quiz_score,
            InterventionLog.skipped,
        ).where(
            InterventionLog.user_id == user_id,
            InterventionLog.category.in_(categories),
            or_(InterventionLog.skipped.is_(True), InterventionLog.quiz_score.is_not(None)),
        )
    )

    rewards: dict[str, list[float]] = defaultdict(list)
    for category, quiz_score, skipped in rows:
        reward = -0.2 if skipped else float(quiz_score or 0) / 100
        rewards[category].append(reward)

    if random.random() < EPSILON or not rewards:
        return random.choice(categories)

    averages = {
        category: sum(category_rewards) / len(category_rewards)
        for category, category_rewards in rewards.items()
    }
    best_reward = max(averages.values())
    best_categories = [category for category, reward in averages.items() if reward == best_reward]
    return random.choice(best_categories)
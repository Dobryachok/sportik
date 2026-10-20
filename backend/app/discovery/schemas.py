from pydantic import BaseModel, Field


class SwipeInput(BaseModel):
    target_type: str = Field(pattern='^(USER|TEAM)$')
    target_id: str = Field(min_length=2, max_length=80)
    action: str = Field(pattern='^(LIKE|SKIP)$')


class TeamRequestReviewInput(BaseModel):
    comment: str | None = Field(default=None, max_length=500)

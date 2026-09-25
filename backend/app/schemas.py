from datetime import datetime

from pydantic import BaseModel, Field


class StatusUpdate(BaseModel):
    status: str
    actor: str = "department"
    reason: str | None = None


class DecisionRequest(BaseModel):
    decision: str = Field(pattern="^(accept|reject)$")
    actor: str = "department"
    reason: str | None = None


class IssueResponse(BaseModel):
    id: str
    description: str
    category: str
    severity: str
    priority: str
    priority_score: int
    department: str
    status: str
    duplicate_count: int
    ai_confidence: float
    cctv_available: bool
    cctv_verified: bool
    needs_manual_review: bool
    yolo_detections: list
    evidence_reason: str | None
    latitude: float
    longitude: float
    location_accuracy_meters: float | None = None
    location_source: str
    address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FrameAnalysisResponse(BaseModel):
    yolo_detections: list
    cctv_verified: bool
    evidence_reason: str

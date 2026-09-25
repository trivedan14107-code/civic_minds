import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .schemas import DecisionRequest, FrameAnalysisResponse, IssueResponse, StatusUpdate
from .services import (
    DEPARTMENT_BY_CATEGORY,
    calculate_priority,
    classify_with_groq,
    distance_meters,
    image_fingerprint,
    mock_cctv_verification,
    mock_yolo_detection,
    reverse_geocode,
    validate_image,
    validate_location,
)
from .supabase_client import get_supabase
from .vanta_router import router as vanta_router

app = FastAPI(title="VANTA API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(vanta_router)


def issue_response(issue: dict) -> IssueResponse:
    return IssueResponse.model_validate(issue)


def upload_to_bucket(bucket: str, path: str, content: bytes) -> str:
    get_supabase().storage.from_(bucket).upload(
        path,
        content,
        {"content-type": "image/jpeg", "upsert": "false"},
    )
    return path


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "vanta-backend", "database": "supabase"}


@app.post("/api/issues", response_model=IssueResponse, status_code=201)
async def create_issue(
    description: str = Form(..., min_length=3),
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_accuracy_meters: float | None = Form(None),
    location_source: str = Form("gps"),
    address: str | None = Form(None),
    cctv_frame: UploadFile | None = File(None),
) -> IssueResponse:
    try:
        supabase = get_supabase()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        validate_location(latitude, longitude, location_accuracy_meters, location_source)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    image_bytes = await image.read()
    try:
        citizen_image = validate_image(image_bytes, image.filename)
        exact_hash, _ = image_fingerprint(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    idempotency_key = f"{exact_hash}:{round(latitude, 4)}:{round(longitude, 4)}"
    existing_result = (
        supabase.table("issues")
        .select("*")
        .eq("idempotency_key", idempotency_key)
        .limit(1)
        .execute()
    )
    if existing_result.data:
        existing = existing_result.data[0]
        updated = (
            supabase.table("issues")
            .update({"duplicate_count": existing["duplicate_count"] + 1})
            .eq("id", existing["id"])
            .select("*")
            .single()
            .execute()
        )
        return issue_response(updated.data)

    cctv_image = None
    cctv_bytes = None
    if cctv_frame is not None:
        cctv_bytes = await cctv_frame.read()
        try:
            cctv_image = validate_image(cctv_bytes, cctv_frame.filename)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid CCTV frame: {exc}") from exc

    issue_id = f"ISS-{uuid.uuid4().hex[:8].upper()}"
    yolo_detections = mock_yolo_detection(citizen_image)
    cctv_verified, cctv_reason = mock_cctv_verification(cctv_image)
    ai_result = classify_with_groq(description, citizen_image, cctv_image)
    nearby_result = supabase.table("issues").select("latitude,longitude,category").eq(
        "category", ai_result["category"]
    ).execute()
    similar_count = sum(
        1
        for candidate in nearby_result.data or []
        if candidate.get("latitude") is not None
        and candidate.get("longitude") is not None
        and distance_meters(
            latitude,
            longitude,
            candidate["latitude"],
            candidate["longitude"],
        )
        <= get_settings().duplicate_radius_meters
    )
    priority, score = calculate_priority(ai_result["severity"], similar_count, ai_result["confidence"])
    status = "under_review" if ai_result["needs_manual_review"] else "submitted"
    resolved_address = address.strip() if address and address.strip() else await reverse_geocode(latitude, longitude)

    image_path = upload_to_bucket("issue-images", f"{issue_id}/citizen.jpg", image_bytes)
    cctv_path = None
    if cctv_bytes is not None:
        cctv_path = upload_to_bucket("cctv-frames", f"{issue_id}/frame.jpg", cctv_bytes)

    issue_data = {
        "id": issue_id,
        "idempotency_key": idempotency_key,
        "description": description,
        "image_path": image_path,
        "cctv_frame_path": cctv_path,
        "latitude": latitude,
        "longitude": longitude,
        "location_accuracy_meters": location_accuracy_meters,
        "location_source": location_source,
        "address": resolved_address,
        "category": ai_result["category"],
        "severity": ai_result["severity"],
        "priority": priority,
        "priority_score": score,
        "department": DEPARTMENT_BY_CATEGORY[ai_result["category"]],
        "status": status,
        "duplicate_count": similar_count,
        "ai_confidence": ai_result["confidence"],
        "cctv_available": cctv_image is not None,
        "cctv_verified": cctv_verified and ai_result["cctv_confirmed"],
        "needs_manual_review": ai_result["needs_manual_review"],
        "yolo_detections": yolo_detections,
        "evidence_reason": ai_result["reason"] or cctv_reason,
    }
    created = supabase.table("issues").insert(issue_data).select("*").single().execute()
    supabase.table("status_events").insert({"issue_id": issue_id, "status": status, "actor": "system"}).execute()
    return issue_response(created.data)


@app.get("/api/issues", response_model=list[IssueResponse])
def list_issues() -> list[IssueResponse]:
    result = get_supabase().table("issues").select("*").order("created_at", desc=True).execute()
    return [issue_response(issue) for issue in result.data or []]


@app.get("/api/issues/{issue_id}", response_model=IssueResponse)
def get_issue(issue_id: str) -> IssueResponse:
    result = get_supabase().table("issues").select("*").eq("id", issue_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue_response(result.data[0])


@app.patch("/api/issues/{issue_id}/status", response_model=IssueResponse)
def update_status(issue_id: str, payload: StatusUpdate) -> IssueResponse:
    supabase = get_supabase()
    exists = supabase.table("issues").select("id").eq("id", issue_id).limit(1).execute()
    if not exists.data:
        raise HTTPException(status_code=404, detail="Issue not found")
    allowed = {"submitted", "under_review", "accepted", "rejected", "in_progress", "pending", "solved", "escalated"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    updated = supabase.table("issues").update({"status": payload.status}).eq("id", issue_id).select("*").single().execute()
    supabase.table("status_events").insert({"issue_id": issue_id, "status": payload.status, "actor": payload.actor, "reason": payload.reason}).execute()
    return issue_response(updated.data)


@app.post("/api/issues/{issue_id}/decision", response_model=IssueResponse)
def decide_issue(issue_id: str, payload: DecisionRequest) -> IssueResponse:
    supabase = get_supabase()
    exists = supabase.table("issues").select("id").eq("id", issue_id).limit(1).execute()
    if not exists.data:
        raise HTTPException(status_code=404, detail="Issue not found")
    status = "accepted" if payload.decision == "accept" else "rejected"
    updated = supabase.table("issues").update({"status": status}).eq("id", issue_id).select("*").single().execute()
    supabase.table("status_events").insert({"issue_id": issue_id, "status": status, "actor": payload.actor, "reason": payload.reason}).execute()
    return issue_response(updated.data)


@app.post("/api/analyze-frame", response_model=FrameAnalysisResponse)
async def analyze_frame(frame: UploadFile = File(...)) -> FrameAnalysisResponse:
    content = await frame.read()
    try:
        image = validate_image(content, frame.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    detections = mock_yolo_detection(image)
    verified, reason = mock_cctv_verification(image)
    return FrameAnalysisResponse(yolo_detections=detections, cctv_verified=verified, evidence_reason=reason)


@app.get("/api/departments")
def departments() -> list[dict]:
    result = get_supabase().table("departments").select("id,name,description").order("name").execute()
    return result.data or []


@app.get("/api/dashboard/metrics")
def dashboard_metrics() -> dict:
    issues = get_supabase().table("issues").select("status,department").execute().data or []
    by_status: dict[str, int] = {}
    by_department: dict[str, int] = {}
    for issue in issues:
        by_status[issue["status"]] = by_status.get(issue["status"], 0) + 1
        by_department[issue["department"]] = by_department.get(issue["department"], 0) + 1
    return {"total": len(issues), "by_status": by_status, "by_department": by_department}

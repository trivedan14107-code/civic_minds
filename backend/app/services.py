import hashlib
import io
import json

import imagehash
from PIL import Image

from .config import get_settings

ALLOWED_CATEGORIES = {
    "road_damage",
    "garbage",
    "drainage",
    "water_leak",
    "streetlight",
    "traffic_obstruction",
    "other",
}

DEPARTMENT_BY_CATEGORY = {
    "road_damage": "Public Works",
    "garbage": "Sanitation",
    "drainage": "Water and Drainage",
    "water_leak": "Water and Drainage",
    "streetlight": "Electrical Services",
    "traffic_obstruction": "Traffic Management",
    "other": "Municipal Review",
}


def validate_image(content: bytes, filename: str | None) -> Image.Image:
    settings = get_settings()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise ValueError(f"Image exceeds {settings.max_upload_mb} MB limit")
    try:
        image = Image.open(io.BytesIO(content))
        image.verify()
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as exc:
        raise ValueError("Uploaded file is not a valid image") from exc
    if image.width < 64 or image.height < 64:
        raise ValueError("Image must be at least 64x64 pixels")
    return image


def image_fingerprint(content: bytes) -> tuple[str, str]:
    exact_hash = hashlib.sha256(content).hexdigest()
    perceptual_hash = str(imagehash.phash(Image.open(io.BytesIO(content)).convert("RGB")))
    return exact_hash, perceptual_hash


def mock_yolo_detection(image: Image.Image) -> list[dict]:
    """Replace with Ultralytics inference when weights are available."""
    return []


def mock_cctv_verification(image: Image.Image | None) -> tuple[bool, str]:
    if image is None:
        return False, "No CCTV frame was provided."
    return True, "CCTV frame attached for corroboration; final classification uses the AI review."


def classify_with_groq(description: str, image: Image.Image, cctv_image: Image.Image | None = None) -> dict:
    settings = get_settings()
    if not settings.groq_api_key:
        return {
            "category": "other",
            "severity": "medium",
            "evidence_visible": True,
            "cctv_confirmed": cctv_image is not None,
            "confidence": 0.0,
            "needs_manual_review": True,
            "reason": "Groq is not configured; issue requires manual review.",
        }

    from groq import Groq

    import base64

    def data_url(source: Image.Image) -> str:
        buffer = io.BytesIO()
        source.save(buffer, format="JPEG", quality=80)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{encoded}"

    prompt = (
        "Classify this civic issue. Return only JSON with keys: category, severity, "
        "evidence_visible, cctv_confirmed, confidence, needs_manual_review, reason. "
        "Allowed categories: road_damage, garbage, drainage, water_leak, streetlight, "
        "traffic_obstruction, other. Severity must be low, medium, or high. "
        f"Citizen description: {description}"
    )
    content = [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": data_url(image)}}]
    if cctv_image is not None:
        content.append({"type": "image_url", "image_url": {"url": data_url(cctv_image)}})

    response = Groq(api_key=settings.groq_api_key).chat.completions.create(
        model=settings.groq_model,
        messages=[{"role": "user", "content": content}],
        response_format={"type": "json_object"},
        temperature=0,
        max_tokens=300,
    )
    raw = json.loads(response.choices[0].message.content)
    category = raw.get("category", "other")
    if category not in ALLOWED_CATEGORIES:
        category = "other"
    confidence = max(0.0, min(1.0, float(raw.get("confidence", 0.0))))
    return {
        "category": category,
        "severity": raw.get("severity", "medium") if raw.get("severity") in {"low", "medium", "high"} else "medium",
        "evidence_visible": bool(raw.get("evidence_visible", False)),
        "cctv_confirmed": bool(raw.get("cctv_confirmed", False)),
        "confidence": confidence,
        "needs_manual_review": bool(raw.get("needs_manual_review", confidence < 0.65)),
        "reason": str(raw.get("reason", "AI classification completed.")),
    }


def calculate_priority(severity: str, duplicate_count: int, confidence: float) -> tuple[str, int]:
    score = {"high": 50, "medium": 30, "low": 10}.get(severity, 10)
    score += min(duplicate_count, 3) * 10
    if confidence < 0.65:
        score += 10
    priority = "P1" if score >= 70 else "P2" if score >= 40 else "P3"
    return priority, score

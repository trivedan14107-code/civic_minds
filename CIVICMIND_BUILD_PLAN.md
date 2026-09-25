# CivicMind Build Plan

## 1. Objective

Build a working hackathon MVP for an autonomous civic issue resolution system:

```text
Citizen report + image/video frame
        ↓
YOLO visual detection
        ↓
Groq vision classification
        ↓
Duplicate grouping
        ↓
Priority and department routing
        ↓
Department resolution workflow
        ↓
Administrator dashboard
```

The MVP must demonstrate one complete issue from citizen submission to department resolution and administrator visibility.

## 2. Architecture Decision

### Orchestrator

Use a custom Python orchestrator built into the FastAPI backend.

Do not use multiple autonomous LLM agents. The workflow is mostly deterministic and must be fast, testable, explainable, and inexpensive.

CrewAI is optional only if the team already knows it. If used, use a single CrewAI Flow as a wrapper around the same Python functions. Do not create separate agents for validation, deduplication, routing, or priority.

### AI model

Use Groq with:

```text
Model: qwen/qwen3.8-27b
Purpose: one structured vision/classification call
```

The model receives the citizen description, citizen image, and an optional selected CCTV frame. It returns strict JSON containing category, severity, evidence, confidence, and manual-review status.

### Visual processing

- Use Pillow/OpenCV for image validation and preprocessing.
- Use YOLO as a replaceable detection service.
- Run YOLO on selected frames, not every video frame.
- Use a mock/sample CCTV provider when a real camera feed is unavailable.
- Never send a continuous live stream to Groq.

### Data store

Use the dedicated Supabase `civic-minds` project for Postgres and Storage. Keep backend access behind a small client module so the frontend never receives the service-role key.

Storage buckets:

```text
issue-images
cctv-frames
```

## 3. Team Ownership

### Developer A — Codex: Backend and AI

Branch:

```text
codex/backend-ai
```

Own these areas:

- FastAPI application setup
- Supabase client, schema, and migrations/init scripts
- Issue, department, user, decision, and status-history models
- Image upload and validation
- SHA-256 and perceptual-hash duplicate detection
- YOLO adapter/service interface
- Mock CCTV adapter and CCTV-frame endpoint
- Groq API integration
- Structured AI response validation
- Rule-based priority calculation
- Category-to-department routing
- Department status and admin override APIs
- Dashboard metrics APIs
- Backend tests
- Seed/demo data
- `.env.example` and backend README

Do not modify frontend files.

### Developer B — Antigravity IDE: Frontend and Camera UI

Branch:

```text
antigravity/frontend-camera
```

Own these areas:

- Citizen submission screen
- Image upload UI
- Phone camera preview and frame capture
- Citizen issue tracking screen
- Department dashboard
- Administrator dashboard
- Status timeline and decision UI
- Duplicate count, confidence, CCTV, and YOLO result display
- Loading, empty, error, and success states
- Frontend tests where practical

Use mock responses until the backend endpoints are available.

Do not modify backend files, database models, or AI logic.

## 4. Shared API Contract

The backend owns the contract. Any contract change must be communicated before implementation.

### Endpoints

```text
POST  /api/issues
GET   /api/issues
GET   /api/issues/{issue_id}
PATCH /api/issues/{issue_id}/status
POST  /api/issues/{issue_id}/decision
POST  /api/analyze-frame
GET   /api/departments
GET   /api/dashboard/metrics
GET   /api/health
```

### Create issue request

```text
POST /api/issues
Content-Type: multipart/form-data
```

Fields:

```text
description: string
latitude: number, optional
longitude: number, optional
image: file, required
cctv_frame: file, optional
```

### Issue response

```json
{
  "id": "ISS-001",
  "description": "Large pothole near the school",
  "category": "road_damage",
  "severity": "high",
  "priority": "P1",
  "priority_score": 82,
  "department": "Public Works",
  "status": "submitted",
  "duplicate_count": 4,
  "ai_confidence": 0.91,
  "cctv_available": true,
  "cctv_verified": true,
  "yolo_detections": [],
  "needs_manual_review": false,
  "created_at": "2026-09-25T12:00:00Z",
  "status_history": []
}
```

### Allowed values

Categories:

```text
road_damage
garbage
drainage
water_leak
streetlight
traffic_obstruction
other
```

Statuses:

```text
submitted
under_review
accepted
rejected
in_progress
pending
solved
escalated
```

Priorities:

```text
P1
P2
P3
```

## 5. Core Backend Workflow

```python
def process_issue(submission):
    validate_file(submission.image)
    idempotency_key = create_idempotency_key(submission)

    existing = find_existing_issue(idempotency_key)
    if existing:
        return add_reporter_to_existing_issue(existing)

    yolo_result = yolo.detect(submission.image)
    cctv_result = cctv.verify(submission.cctv_frame) if submission.cctv_frame else None

    similar_issues = find_similar_issues(
        image=submission.image,
        location=submission.location,
        description=submission.description,
    )

    ai_result = groq.classify_once(
        description=submission.description,
        citizen_image=submission.image,
        cctv_frame=submission.cctv_frame,
        yolo_result=yolo_result,
    )

    validate_ai_result(ai_result)
    priority = calculate_priority(ai_result, len(similar_issues), submission.location)
    department = route_category(ai_result.category)

    return save_issue(
        submission=submission,
        ai_result=ai_result,
        yolo_result=yolo_result,
        cctv_result=cctv_result,
        duplicates=similar_issues,
        priority=priority,
        department=department,
    )
```

## 6. AI Rules

The Groq call must return only structured data:

```json
{
  "category": "road_damage",
  "severity": "high",
  "evidence_visible": true,
  "cctv_confirmed": true,
  "confidence": 0.91,
  "needs_manual_review": false,
  "reason": "Visible road surface damage is consistent with the report."
}
```

Call Groq only once per new issue when possible.

Do not use the LLM for:

- Exact duplicate matching
- Department lookup
- Priority arithmetic
- Status transitions
- Permission checks
- Database writes
- Admin overrides

If confidence is below `0.65`, set `needs_manual_review` to `true` and route to an administrator review queue.

## 7. Duplicate Detection

Use these levels in order:

1. SHA-256 image hash for exact image duplicates.
2. Perceptual hash for visually similar images.
3. Location proximity, category, and time window for issue clustering.
4. Optional text similarity only if time permits.

Two simultaneous identical submissions must not create two master issues. Protect this with an idempotency key and a database uniqueness constraint.

## 8. Priority Rules

Use transparent rules instead of an LLM decision:

```text
High severity:       +50
Medium severity:     +30
Low severity:        +10
Each duplicate:      +10, maximum +30
Near school/hospital:+20
SLA overdue:         +10
```

Map the final score:

```text
70 or more: P1
40–69:      P2
below 40:   P3
```

## 9. CCTV and Phone Camera Scope

For the hackathon, the phone camera acts as a live camera source.

- Use browser camera access with `getUserMedia`.
- Capture one frame every 1–2 seconds only when the user starts verification.
- Run YOLO on selected frames.
- Send at most one selected frame to Groq with the citizen image.
- Store the evidence frame, not continuous video.
- Show camera unavailable as a valid non-error state.
- Do not use face recognition, license-plate recognition, or person identification.

If live camera streaming is unstable, fall back to uploading a recorded frame or short clip.

## 10. 24-Hour Execution Schedule

### Hours 0–2: Contract and skeleton

- Create branches.
- Agree on API response format.
- Create FastAPI and frontend skeletons.
- Add `.env.example`.

### Hours 2–7: Parallel core build

Codex:

- Supabase client and schema
- Issue creation endpoint
- Basic upload validation
- Rule-based routing and priority

Antigravity:

- Citizen form
- Image upload
- Basic issue list and details screen

### Hours 7–12: AI and workflow

Codex:

- Groq integration
- YOLO adapter
- Duplicate detection
- CCTV-frame endpoint
- Department status endpoints

Antigravity:

- Camera capture
- Department dashboard
- Admin dashboard

### Hours 12–16: Integration

- Merge backend branch into `main`.
- Connect frontend to real endpoints.
- Seed sample issues.
- Fix contract mismatches.

### Hours 16–20: Demo hardening

- Test duplicate submissions.
- Test low-confidence AI response.
- Test missing CCTV.
- Test department rejection and admin override.
- Test concurrent identical submissions.

### Hours 20–24: Presentation and fallback

- Deploy.
- Record backup demo data.
- Prepare architecture diagram.
- Prepare a two-minute walkthrough.
- Freeze new features.

## 11. GitHub Merge Rules

- Work only on your assigned branch.
- Pull `main` before opening a pull request.
- Keep commits small and descriptive.
- Do not commit API keys, uploads, or local databases containing personal data.
- Use `.env.example`, never `.env` in Git.
- Merge backend first, then frontend.
- After each merge, run the smoke test.

Suggested commits:

```text
feat: create FastAPI issue workflow
feat: add duplicate grouping
feat: integrate Groq classification
feat: add YOLO adapter
feat: add citizen submission UI
feat: add department dashboard
feat: add admin metrics dashboard
```

## 12. Definition of Done

The project is ready when:

- A citizen can submit a description and image.
- The backend validates and stores the issue.
- YOLO returns a detection result or a safe empty result.
- Groq returns valid structured classification data.
- Duplicate submissions are grouped.
- Priority and department are assigned automatically.
- A department can accept, reject, or update the issue.
- An administrator can see metrics and override a decision.
- CCTV evidence works with a phone frame or mock frame.
- Missing AI, YOLO, or CCTV does not crash the workflow.
- No API key is committed to GitHub.

## 13. Cut Scope If Blocked

Remove features in this order:

1. Live camera streaming; retain uploaded frames.
2. Custom YOLO training; retain mock or pretrained detection.
3. Text similarity; retain image hash and location/category grouping.
4. Real authentication; retain role selector for the demo.
5. Map visualization; retain location text and dashboard counts.

Never cut the core flow:

```text
submit → analyze → group → route → resolve → report
```

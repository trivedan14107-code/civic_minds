from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "vanta-backend", "database": "supabase"}

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import get_db
from .config import get_settings
from . import api_users, api_discovery, api_swipes, api_admin


app = FastAPI(title="AmanDate API")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health_check(db: Session = Depends(get_db)):
    """
    Simple healthcheck that also verifies database connectivity.
    """
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


app.include_router(api_users.router)
app.include_router(api_discovery.router)
app.include_router(api_swipes.router)
app.include_router(api_admin.router)


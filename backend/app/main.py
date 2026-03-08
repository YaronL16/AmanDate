from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db import get_db
from . import api_users, api_discovery, api_swipes


app = FastAPI(title="AmanDate API")


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


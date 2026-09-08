from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from api.routes import router
from core.db import init_db

load_dotenv()

logger.add("logs/app.log", rotation="10 MB", retention="7 days", level="INFO")

app = FastAPI(title="TripAssist Travel Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
async def startup() -> None:
    await init_db()
    logger.info("TripAssist API started")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

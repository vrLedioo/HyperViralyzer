from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db import create_db_and_tables
from routers.auth_router import router as auth_router
from routers.analyze_router import router as analyze_router
from routers.billing_router import router as billing_router
from routers.video_router import router as video_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="SaaS Video Analyzer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(analyze_router)
app.include_router(billing_router)
app.include_router(video_router)


@app.get("/")
def read_root():
    return {"message": "SaaS Video Analyzer API is running"}

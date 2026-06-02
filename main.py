from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "ConvertR backend is running"}

@app.post("/convert")
async def convert(file: UploadFile = File(...), target_format: str = "pdf", spec: str = ""):
    return {
        "filename": file.filename,
        "target_format": target_format,
        "spec": spec,
        "status": "received — conversion coming soon"
    }
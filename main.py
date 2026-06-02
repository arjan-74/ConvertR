from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import subprocess
import tempfile
import os
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED = {
    "pdf": "pandoc", "docx": "pandoc", "html": "pandoc",
    "txt": "pandoc", "md": "pandoc",
    "mp4": "ffmpeg", "mp3": "ffmpeg", "wav": "ffmpeg",
    "gif": "ffmpeg", "webm": "ffmpeg", "mov": "ffmpeg",
    "png": "ffmpeg", "jpg": "ffmpeg", "webp": "ffmpeg",
}

@app.get("/")
def root():
    return {"message": "ConvertR backend is running"}

@app.post("/convert")
async def convert(
    file: UploadFile = File(...),
    target_format: str = Form("pdf"),
    spec: str = Form("")
):
    ext = file.filename.split(".")[-1].lower()
    engine = SUPPORTED.get(target_format.lower())

    if not engine:
        return {"error": f"Target format '{target_format}' not supported yet"}

    tmp_dir = tempfile.mkdtemp()
    input_path = os.path.join(tmp_dir, file.filename)
    output_filename = file.filename.rsplit(".", 1)[0] + "." + target_format.lower()
    output_path = os.path.join(tmp_dir, output_filename)

    with open(input_path, "wb") as f:
        f.write(await file.read())

    try:
        if engine == "pandoc":
            subprocess.run(
                ["pandoc", input_path, "-o", output_path],
                check=True
            )
        elif engine == "ffmpeg":
            subprocess.run(
                ["ffmpeg", "-i", input_path, output_path, "-y"],
                check=True
            )

        return FileResponse(
            output_path,
            filename=output_filename,
            media_type="application/octet-stream"
        )

    except subprocess.CalledProcessError as e:
        return {"error": f"Conversion failed: {str(e)}"}
    finally:
        pass
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import subprocess
import tempfile
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://convert-r-web.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
FFMPEG = r"C:\Users\Dell\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"

LIBREOFFICE_FORMATS = {'pdf', 'docx', 'doc', 'odt', 'html', 'txt', 'pptx', 'xlsx'}
FFMPEG_FORMATS = {'mp4', 'mp3', 'wav', 'gif', 'webm', 'mov', 'avi', 'flac', 'ogg', 'm4a', 'png', 'jpg', 'jpeg', 'webp'}
PANDOC_FORMATS = {'md', 'rst', 'latex', 'epub'}

def get_engine(source_ext, target_ext):
    if target_ext in FFMPEG_FORMATS and source_ext in FFMPEG_FORMATS:
        return 'ffmpeg'
    if target_ext in PANDOC_FORMATS or source_ext in PANDOC_FORMATS:
        return 'pandoc'
    if target_ext in LIBREOFFICE_FORMATS or source_ext in LIBREOFFICE_FORMATS:
        return 'libreoffice'
    return None

@app.get("/")
def root():
    return {"message": "ConvertR backend is running"}

@app.post("/convert")
async def convert(
    file: UploadFile = File(...),
    target_format: str = Form("pdf"),
    spec: str = Form("")
):
    source_ext = file.filename.split(".")[-1].lower()
    target_ext = target_format.lower()
    engine = get_engine(source_ext, target_ext)

    if not engine:
        return {"error": f"Conversion from {source_ext} to {target_ext} not supported yet"}

    tmp_dir = tempfile.mkdtemp()
    input_path = os.path.join(tmp_dir, file.filename)
    base_name = file.filename.rsplit(".", 1)[0]
    output_filename = base_name + "." + target_ext
    output_path = os.path.join(tmp_dir, output_filename)

    with open(input_path, "wb") as f:
        f.write(await file.read())

    try:
        if engine == 'libreoffice':
            subprocess.run([
                SOFFICE, "--headless", "--convert-to", target_ext,
                "--outdir", tmp_dir, input_path
            ], check=True)

        elif engine == 'ffmpeg':
            subprocess.run([
                FFMPEG, "-i", input_path, output_path, "-y"
            ], check=True)

        elif engine == 'pandoc':
            subprocess.run([
                "pandoc", input_path, "-o", output_path
            ], check=True)

        if os.path.exists(output_path):
            return FileResponse(
                output_path,
                filename=output_filename,
                media_type="application/octet-stream"
            )
        else:
            return {"error": "Conversion failed - output file not created"}

    except subprocess.CalledProcessError as e:
        return {"error": f"Conversion failed: {str(e)}"}
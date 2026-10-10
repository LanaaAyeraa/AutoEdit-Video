import os
import uuid
import shutil
import asyncio
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.config import (
    UPLOAD_DIR, OUTPUT_DIR, CACHE_DIR, FRONTEND_DIR, FFMPEG_EXE
)
from backend.engine.downloader import download_media_reference
from backend.engine.capcut_templates import CAPCUT_TEMPLATES, generate_template_audio, get_template_by_id
from backend.engine.beat_detector import analyze_audio_beats, generate_cut_segments
from backend.engine.themes import THEMES
from backend.engine.video_editor import render_auto_edit, get_media_duration

app = FastAPI(title="Auto Video Editor API (CapCut & TikTok)", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job state tracker
jobs = {}

class URLReferenceRequest(BaseModel):
    url: str

class CapCutTemplateSelectRequest(BaseModel):
    template_id: str

class RenderRequest(BaseModel):
    clip_paths: List[str]
    audio_path: str
    theme: str = "tiktok_viral"


@app.get("/api/status")
def get_status():
    """Mengecek kesiapan sistem dan FFmpeg."""
    return {
        "status": "ready",
        "ffmpeg": FFMPEG_EXE,
        "ffmpeg_available": Path(FFMPEG_EXE).exists() or shutil.which(FFMPEG_EXE) is not None
    }


@app.get("/api/capcut/templates")
def get_capcut_templates():
    """Mengembalikan katalog template CapCut bawaan siap pakai."""
    return {"templates": CAPCUT_TEMPLATES}


@app.post("/api/capcut/select-template")
def select_capcut_template(req: CapCutTemplateSelectRequest):
    """
    Memilih template CapCut bawaan (JJ Mengkane, Cinematic, Vlog, Retro, dll)
    dan mengembalikan audio serta hasil beat-sync-nya.
    """
    tmpl = get_template_by_id(req.template_id)
    audio_path = generate_template_audio(tmpl["id"])
    beat_res = analyze_audio_beats(audio_path)

    return {
        "success": True,
        "source": "capcut_template",
        "template_id": tmpl["id"],
        "template_name": tmpl["name"],
        "theme_key": tmpl["theme_key"],
        "audio_path": audio_path,
        "title": tmpl["name"],
        "duration": beat_res.get("duration", tmpl["duration"]),
        "bpm": beat_res.get("bpm", tmpl["bpm"]),
        "beat_times": beat_res.get("beat_times", []),
        "drop_times": beat_res.get("drop_times", []),
        "total_beats": beat_res.get("total_beats", 0),
        "recommended_clips": tmpl.get("recommended_clips", "")
    }


@app.get("/api/themes")
def get_themes():
    """Mengembalikan daftar pilihan tema editing."""
    return {"themes": THEMES}


@app.post("/api/reference/tiktok-url")
def process_media_url(req: URLReferenceRequest):
    """
    Mengunduh audio dari link CapCut atau TikTok, lalu menganalisis titik beat serta BPM-nya.
    """
    if not req.url:
        raise HTTPException(status_code=400, detail="URL tidak boleh kosong.")
    
    download_res = download_media_reference(req.url)
    if not download_res.get("success"):
        raise HTTPException(status_code=400, detail=download_res.get("message", "Gagal memproses link template CapCut/TikTok."))

    audio_path = download_res["audio_path"]
    beat_res = analyze_audio_beats(audio_path)

    return {
        "success": True,
        "source": "url_reference",
        "audio_path": audio_path,
        "title": download_res.get("title", "Sound Track"),
        "uploader": download_res.get("uploader", "Creator"),
        "duration": beat_res.get("duration", 0),
        "bpm": beat_res.get("bpm", 120),
        "beat_times": beat_res.get("beat_times", []),
        "drop_times": beat_res.get("drop_times", []),
        "total_beats": beat_res.get("total_beats", 0)
    }


@app.post("/api/reference/upload-file")
async def process_reference_file(file: UploadFile = File(...)):
    """
    Mengunggah file audio (MP3/WAV) atau video TikTok secara manual,
    lalu menganalisis beat-nya.
    """
    file_id = f"ref_{uuid.uuid4().hex[:8]}"
    ext = Path(file.filename).suffix.lower()
    save_path = CACHE_DIR / f"{file_id}{ext}"

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    audio_target = save_path
    # Jika yang diunggah adalah file video, ekstrak audionya terlebih dahulu
    if ext in [".mp4", ".mov", ".mkv", ".webm"]:
        extracted_audio = CACHE_DIR / f"{file_id}.mp3"
        cmd = [FFMPEG_EXE, "-y", "-i", str(save_path), "-vn", "-c:a", "libmp3lame", "-b:a", "192k", str(extracted_audio)]
        import subprocess
        res = subprocess.run(cmd, capture_output=True)
        if res.returncode == 0 and extracted_audio.exists():
            audio_target = extracted_audio

    beat_res = analyze_audio_beats(str(audio_target))

    return {
        "success": True,
        "source": "upload_file",
        "audio_path": str(audio_target),
        "title": file.filename,
        "duration": beat_res.get("duration", 0),
        "bpm": beat_res.get("bpm", 120),
        "beat_times": beat_res.get("beat_times", []),
        "drop_times": beat_res.get("drop_times", []),
        "total_beats": beat_res.get("total_beats", 0)
    }


@app.post("/api/media/upload")
async def upload_media_files(files: List[UploadFile] = File(...)):
    """
    Mengunggah beberapa video/foto bahan mentah.
    """
    saved_items = []
    session_id = f"media_{uuid.uuid4().hex[:8]}"
    session_dir = UPLOAD_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    for i, file in enumerate(files):
        ext = Path(file.filename).suffix.lower()
        unique_name = f"clip_{i+1:02d}_{uuid.uuid4().hex[:6]}{ext}"
        target_path = session_dir / unique_name

        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        duration = get_media_duration(str(target_path)) if ext in [".mp4", ".mov", ".mkv"] else 3.0

        saved_items.append({
            "filename": file.filename,
            "path": str(target_path),
            "duration": round(duration, 2),
            "is_image": ext in [".jpg", ".jpeg", ".png", ".webp"]
        })

    return {
        "success": True,
        "session_id": session_id,
        "count": len(saved_items),
        "items": saved_items
    }


def background_render_task(job_id: str, clip_paths: list, audio_path: str, theme_key: str):
    """Fungsi worker background untuk menjalankan pemotongan dan rendering video."""
    def progress_update(pct: int, msg: str):
        jobs[job_id]["progress"] = pct
        jobs[job_id]["message"] = msg

    try:
        # Analisis beat jika belum ada
        beat_res = analyze_audio_beats(audio_path)
        total_duration = beat_res.get("duration", 15.0)
        beat_times = beat_res.get("beat_times", [])

        # Hitung titik potong segmen sesuai tema
        segments = generate_cut_segments(
            beat_times=beat_times,
            total_duration=total_duration,
            theme_key=theme_key,
            num_available_clips=len(clip_paths)
        )

        # Jalankan rendering
        result = render_auto_edit(
            clip_paths=clip_paths,
            audio_path=audio_path,
            segments=segments,
            theme_key=theme_key,
            job_id=job_id,
            progress_callback=progress_update
        )

        if result.get("success"):
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100
            jobs[job_id]["message"] = "Rendering selesai!"
            jobs[job_id]["result"] = result
        else:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["message"] = result.get("error", "Gagal merender video.")
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = str(e)


@app.post("/api/render/start")
def start_render(req: RenderRequest, background_tasks: BackgroundTasks):
    """
    Memulai proses auto-edit video di background.
    """
    if not req.clip_paths:
        raise HTTPException(status_code=400, detail="Minimal 1 file bahan harus dipilih.")
    if not req.audio_path or not Path(req.audio_path).exists():
        raise HTTPException(status_code=400, detail="File audio referensi tidak ditemukan.")

    job_id = f"job_{uuid.uuid4().hex[:8]}"
    jobs[job_id] = {
        "status": "processing",
        "progress": 5,
        "message": "Memulai proses auto-edit...",
        "theme": req.theme,
        "result": None
    }

    background_tasks.add_task(
        background_render_task,
        job_id=job_id,
        clip_paths=req.clip_paths,
        audio_path=req.audio_path,
        theme_key=req.theme
    )

    return {"job_id": job_id, "status": "processing"}


@app.get("/api/job/{job_id}")
def get_job_status(job_id: str):
    """Mengecek status dan progres proses render."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan.")
    return jobs[job_id]


@app.get("/api/output/{filename}")
def download_rendered_video(filename: str):
    """Mengunduh atau memutar file video hasil render."""
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File video tidak ditemukan.")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)


# Static files mount untuk Frontend
DIST_DIR = FRONTEND_DIR / "dist"
if DIST_DIR.exists() and (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/")
def serve_index():
    if DIST_DIR.exists() and (DIST_DIR / "index.html").exists():
        return FileResponse(DIST_DIR / "index.html")
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Auto Video Editor API is running. Frontend index.html not found."}

@app.get("/manifest.json")
def serve_manifest():
    for p in [DIST_DIR / "manifest.json", FRONTEND_DIR / "manifest.json"]:
        if p.exists():
            return FileResponse(p, media_type="application/manifest+json")
    raise HTTPException(status_code=404, detail="Manifest not found")

@app.get("/icon.svg")
def serve_icon():
    for p in [DIST_DIR / "icon.svg", FRONTEND_DIR / "icon.svg"]:
        if p.exists():
            return FileResponse(p, media_type="image/svg+xml")
    raise HTTPException(status_code=404, detail="Icon not found")


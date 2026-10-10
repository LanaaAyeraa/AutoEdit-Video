import os
import subprocess
import uuid
import shutil
import logging
from pathlib import Path
from backend.config import FFMPEG_EXE, PROCESSED_DIR, OUTPUT_DIR, TARGET_WIDTH, TARGET_HEIGHT, TARGET_FPS
from backend.engine.themes import get_theme_config

logger = logging.getLogger(__name__)

def run_ffmpeg(args: list) -> bool:
    """Menjalankan command FFmpeg dan menangkap output bila terjadi error."""
    full_cmd = [FFMPEG_EXE] + args
    cmd_str = " ".join(str(x) for x in full_cmd)
    logger.info(f"Running FFmpeg: {cmd_str[:200]}...")
    
    result = subprocess.run(full_cmd, capture_output=True, text=True, errors="replace")
    if result.returncode != 0:
        logger.error(f"FFmpeg error ({result.returncode}): {result.stderr}")
        return False
    return True

def get_media_duration(file_path: str) -> float:
    """Mendapatkan durasi video atau audio menggunakan ffprobe/ffmpeg."""
    try:
        # Jalankan ffmpeg -i untuk membaca metadata durasi
        res = subprocess.run(
            [FFMPEG_EXE, "-i", str(file_path)],
            capture_output=True,
            text=True,
            errors="replace"
        )
        for line in res.stderr.splitlines():
            if "Duration:" in line:
                time_str = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = time_str.split(":")
                return float(h) * 3600 + float(m) * 60 + float(s)
    except Exception as e:
        logger.warning(f"Gagal mendeteksi durasi media: {e}")
    return 10.0

def process_single_clip(
    input_path: str,
    output_path: str,
    duration: float,
    theme_filter: str,
    start_offset: float = 0.0
) -> bool:
    """
    Memotong, auto-crop ke format vertikal 9:16 (1080x1920), normalisasi 30fps,
    dan menerapkan filter warna sesuai tema.
    Mendukung format video (mp4, mov, mkv) dan gambar (jpg, png).
    """
    is_image = Path(input_path).suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]

    # Filter rantai:
    # 1. Scale & Crop ke 1080x1920 (9:16 vertikal)
    # 2. Set SAR & framerate standar
    # 3. Terapkan color filter tema & efek flash white CapCut jika ada
    scale_crop_filter = (
        f"scale={TARGET_WIDTH}:{TARGET_HEIGHT}:force_original_aspect_ratio=increase,"
        f"crop={TARGET_WIDTH}:{TARGET_HEIGHT},setsar=1,fps={TARGET_FPS}"
    )
    
    filters = [scale_crop_filter]
    if theme_filter:
        filters.append(theme_filter)

    full_vf = ",".join(filters)

    if is_image:
        args = [
            "-y",
            "-loop", "1",
            "-t", str(duration),
            "-i", str(input_path),
            "-vf", full_vf,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-an",
            str(output_path)
        ]
    else:
        args = [
            "-y",
            "-ss", str(start_offset),
            "-t", str(duration),
            "-i", str(input_path),
            "-vf", full_vf,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-an",  # Pisahkan video track dulu, nanti di-mux audio bersih
            str(output_path)
        ]

    return run_ffmpeg(args)


def render_auto_edit(
    clip_paths: list,
    audio_path: str,
    segments: list,
    theme_key: str,
    job_id: str,
    progress_callback=None
) -> dict:
    """
    Pipeline lengkap auto-edit video:
    1. Mengelompokkan dan memproses potongan tiap klip sesuai beat.
    2. Menggabungkan (concatenate) semua potongan video.
    3. Menyematkan musik latar TikTok referensi.
    4. Mengeluarkan file video MP4 final.
    """
    job_temp_dir = PROCESSED_DIR / job_id
    job_temp_dir.mkdir(parents=True, exist_ok=True)
    
    theme = get_theme_config(theme_key)
    output_filename = f"edited_{job_id}.mp4"
    final_output_path = OUTPUT_DIR / output_filename

    total_segments = len(segments)
    processed_segment_files = []

    try:
        # Langkah 1: Render setiap segmen video sesuai ketukan beat
        for i, seg in enumerate(segments):
            if progress_callback:
                pct = int(10 + (i / total_segments) * 60)
                progress_callback(pct, f"Memproses klip #{i+1} dari {total_segments}...")

            clip_idx = seg["clip_index"]
            source_clip = clip_paths[clip_idx]
            seg_duration = seg["duration"]
            
            # Hitung offset potong agar bagian klip bervariasi jika klipnya panjang
            source_dur = get_media_duration(source_clip)
            max_offset = max(0.0, source_dur - seg_duration)
            offset = round((i * 1.5) % (max_offset + 0.1), 2) if max_offset > 0.5 else 0.0

            seg_out = job_temp_dir / f"seg_{i:04d}.mp4"
            current_filter = theme.get("ffmpeg_filter", "")
            if theme.get("flash_effect"):
                current_filter = f"{current_filter},fade=t=in:st=0:d=0.08:color=white" if current_filter else "fade=t=in:st=0:d=0.08:color=white"

            success = process_single_clip(
                input_path=source_clip,
                output_path=str(seg_out),
                duration=seg_duration,
                theme_filter=current_filter,
                start_offset=offset
            )
            
            if success and seg_out.exists():
                processed_segment_files.append(str(seg_out))
            else:
                logger.warning(f"Gagal memproses segmen {i}, melewati segmen ini.")

        if not processed_segment_files:
            raise RuntimeError("Tidak ada klip video yang berhasil diproses.")

        # Langkah 2: Buat list concat
        if progress_callback:
            progress_callback(75, "Menggabungkan potongan klip (concatenating)...")

        concat_list_file = job_temp_dir / "concat_list.txt"
        with open(concat_list_file, "w", encoding="utf-8") as f:
            for seg_file in processed_segment_files:
                # Format concat demuxer FFmpeg
                escaped_path = seg_file.replace("\\", "/")
                f.write(f"file '{escaped_path}'\n")

        temp_merged_video = job_temp_dir / "merged_video.mp4"
        concat_args = [
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list_file),
            "-c", "copy",
            str(temp_merged_video)
        ]
        if not run_ffmpeg(concat_args):
            # Fallback jika concat copy gagal
            concat_args = [
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list_file),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                str(temp_merged_video)
            ]
            run_ffmpeg(concat_args)

        # Langkah 3: Mux Audio (TikTok Reference Audio)
        if progress_callback:
            progress_callback(88, "Menyelaraskan audio musik TikTok referensi...")

        final_args = [
            "-y",
            "-i", str(temp_merged_video),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            "-movflags", "+faststart",
            str(final_output_path)
        ]

        if not run_ffmpeg(final_args):
            raise RuntimeError("Gagal menyematkan audio musik pada video final.")

        if progress_callback:
            progress_callback(100, "Selesai! Video siap diunduh.")

        return {
            "success": True,
            "output_file": output_filename,
            "output_path": str(final_output_path),
            "total_clips": len(clip_paths),
            "total_segments": len(processed_segment_files),
            "theme": theme_key
        }

    except Exception as e:
        logger.error(f"Render auto-edit error: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        # Bersihkan file temporary
        try:
            shutil.rmtree(job_temp_dir, ignore_errors=True)
        except Exception:
            pass

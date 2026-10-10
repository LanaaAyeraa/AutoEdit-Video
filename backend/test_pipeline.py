import os
import subprocess
from pathlib import Path
from backend.config import FFMPEG_EXE, UPLOAD_DIR, CACHE_DIR, OUTPUT_DIR
from backend.engine.beat_detector import analyze_audio_beats, generate_cut_segments
from backend.engine.video_editor import render_auto_edit

def test_system():
    print("[1] Memeriksa FFmpeg Executable...")
    assert FFMPEG_EXE is not None
    print(f"    FFmpeg path: {FFMPEG_EXE}")

    # Buat dummy audio 5 detik
    test_audio = CACHE_DIR / "test_beat.wav"
    print("[2] Membuat file audio uji coba...")
    cmd_audio = [
        FFMPEG_EXE, "-y",
        "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
        "-c:a", "pcm_s16le",
        str(test_audio)
    ]
    subprocess.run(cmd_audio, check=True, capture_output=True)
    assert test_audio.exists(), "File audio uji coba gagal dibuat"

    # Analisis beat
    print("[3] Menguji deteksi beat...")
    beat_res = analyze_audio_beats(str(test_audio))
    print(f"    Hasil Beat: BPM={beat_res.get('bpm')}, Total Beats={beat_res.get('total_beats')}")
    assert beat_res["success"] is True

    # Buat 2 dummy video klip (masing-masing 3 detik dengan warna berbeda)
    print("[4] Membuat dummy clip footage...")
    clip1 = UPLOAD_DIR / "dummy_clip1.mp4"
    clip2 = UPLOAD_DIR / "dummy_clip2.mp4"
    
    cmd_v1 = [
        FFMPEG_EXE, "-y",
        "-f", "lavfi", "-i", "color=c=red:s=720x1280:d=3",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        str(clip1)
    ]
    cmd_v2 = [
        FFMPEG_EXE, "-y",
        "-f", "lavfi", "-i", "color=c=blue:s=720x1280:d=3",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        str(clip2)
    ]
    subprocess.run(cmd_v1, check=True, capture_output=True)
    subprocess.run(cmd_v2, check=True, capture_output=True)

    # Uji coba rendering auto edit tema TikTok Viral
    print("[5] Menguji rendering auto-edit tema 'tiktok_viral'...")
    segments = generate_cut_segments(
        beat_times=beat_res["beat_times"],
        total_duration=beat_res["duration"],
        theme_key="tiktok_viral",
        num_available_clips=2
    )
    print(f"    Segmen dihasilkan: {len(segments)} potongan")

    render_res = render_auto_edit(
        clip_paths=[str(clip1), str(clip2)],
        audio_path=str(test_audio),
        segments=segments,
        theme_key="tiktok_viral",
        job_id="test_job_1",
        progress_callback=lambda pct, msg: print(f"    Progress [{pct}%] {msg}")
    )

    print(f"[6] Hasil Render: {render_res}")
    assert render_res["success"] is True
    assert Path(render_res["output_path"]).exists()
    print(">>> SEMUA TES BERHASIL 100%! PIPELINE BERJALAN SEMPURNA! <<<")

if __name__ == "__main__":
    test_system()

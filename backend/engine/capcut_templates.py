import os
import subprocess
from pathlib import Path
from backend.config import CACHE_DIR, FFMPEG_EXE

# Definisi Template CapCut Terpopuler
CAPCUT_TEMPLATES = [
    {
        "id": "capcut_jj_mengkane",
        "name": "CapCut JJ Mengkane (Jedag-Jedug)",
        "category": "Jedag-Jedug 🔥",
        "badge": "Viral TikTok",
        "description": "Template jedag-jedug khas CapCut paling viral! Potongan super cepat pas di setiap ketukan bass drum dengan efek flash white kilat.",
        "icon": "⚡",
        "theme_key": "tiktok_viral",
        "bpm": 128,
        "duration": 14.0,
        "recommended_clips": "6 - 12 klip / foto",
        "effects": ["Flash White", "Punch Zoom", "Vibrant Contrast"],
        "audio_style": "bass_drop"
    },
    {
        "id": "capcut_cinematic_slowmo",
        "name": "CapCut Cinematic Film Look",
        "category": "Cinematic 🎬",
        "badge": "Trending",
        "description": "Template cinematic ala film bioskop. Dilengkapi letterbox bar hitam 2.35:1, color grading Moody Teal & Orange, dan transisi dissolve halus.",
        "icon": "🎬",
        "theme_key": "cinematic",
        "bpm": 84,
        "duration": 16.0,
        "recommended_clips": "4 - 8 klip",
        "effects": ["Letterbox 2.35:1", "Moody Teal & Orange", "Smooth Dissolve"],
        "audio_style": "cinematic_ambient"
    },
    {
        "id": "capcut_daily_vlog",
        "name": "CapCut Mini Vlog / Daily Story",
        "category": "Vlog & Story 📖",
        "badge": "Popular",
        "description": "Template aesthetic untuk dokumentasi jalan-jalan atau kegiatan sehari-hari. Warna natural bersih dengan audio vokal tetap terdengar jelas.",
        "icon": "☕",
        "theme_key": "dokumentasi",
        "bpm": 105,
        "duration": 15.0,
        "recommended_clips": "5 - 10 klip",
        "effects": ["Natural Clean", "Voice Ducking 70%", "Narrative Flow"],
        "audio_style": "lofi_vlog"
    },
    {
        "id": "capcut_retro_polaroid",
        "name": "CapCut 90s Retro Film Roll",
        "category": "Vintage 📸",
        "badge": "Aesthetic",
        "description": "Template bernuansa nostalgia 90-an dengan warm pastel grading, efek grain lembut, dan transisi fade elegan.",
        "icon": "🎞️",
        "theme_key": "cinematic",
        "bpm": 92,
        "duration": 13.5,
        "recommended_clips": "4 - 8 foto / klip",
        "effects": ["Warm 90s Tone", "Soft Film Grain", "Fade In/Out"],
        "audio_style": "vintage_chill"
    },
    {
        "id": "capcut_travel_recap",
        "name": "CapCut Travel Recap (Speed-Ramp)",
        "category": "Travel ✈️",
        "badge": "High Energy",
        "description": "Template liburan dan eksplorasi dengan ritme dinamis berenergi tinggi, transisi whip cut, dan saturasi kaya warna.",
        "icon": "🌴",
        "theme_key": "tiktok_viral",
        "bpm": 132,
        "duration": 15.0,
        "recommended_clips": "6 - 14 klip",
        "effects": ["Dynamic Cuts", "High Saturation", "Beat Drop"],
        "audio_style": "upbeat_travel"
    }
]

def generate_template_audio(template_id: str) -> str:
    """
    Menyiapkan file audio berkualitas tinggi untuk template CapCut bawaan.
    Jika belum ada di cache, audio dihasilkan secara otomatis dengan beat ritmis.
    """
    audio_file = CACHE_DIR / f"{template_id}.mp3"
    if audio_file.exists():
        return str(audio_file)

    tmpl = next((t for t in CAPCUT_TEMPLATES if t["id"] == template_id), CAPCUT_TEMPLATES[0])
    dur = tmpl["duration"]
    bpm = tmpl["bpm"]
    beat_hz = bpm / 60.0

    # Buat komposisi audio ritmis sesuai style template
    if tmpl["audio_style"] == "bass_drop":
        # Jedag-jedug bass beat
        filter_str = (
            f"[0:a]volume=1.8,tremolo=f={beat_hz * 2}:d=0.85[kick];"
            f"[1:a]volume=0.9,tremolo=f={beat_hz * 4}:d=0.9[snare];"
            f"[kick][snare]amix=inputs=2,volume=1.2"
        )
        cmd = [
            FFMPEG_EXE, "-y",
            "-f", "lavfi", "-i", f"sine=frequency=65:duration={dur}",
            "-f", "lavfi", "-i", f"sine=frequency=180:duration={dur}",
            "-filter_complex", filter_str,
            "-c:a", "libmp3lame", "-b:a", "192k",
            str(audio_file)
        ]
    elif tmpl["audio_style"] == "cinematic_ambient":
        # Slow-mo ambient cinematic
        filter_str = (
            f"[0:a]volume=1.2,tremolo=f={beat_hz}:d=0.5[pad];"
            f"[1:a]volume=0.8,tremolo=f={beat_hz * 2}:d=0.6[lead];"
            f"[pad][lead]amix=inputs=2,volume=1.1"
        )
        cmd = [
            FFMPEG_EXE, "-y",
            "-f", "lavfi", "-i", f"sine=frequency=110:duration={dur}",
            "-f", "lavfi", "-i", f"sine=frequency=220:duration={dur}",
            "-filter_complex", filter_str,
            "-c:a", "libmp3lame", "-b:a", "192k",
            str(audio_file)
        ]
    else:
        # Upbeat / lofi vlog
        filter_str = (
            f"[0:a]volume=1.3,tremolo=f={beat_hz}:d=0.7[bass];"
            f"[1:a]volume=0.9,tremolo=f={beat_hz * 2}:d=0.8[chord];"
            f"[bass][chord]amix=inputs=2"
        )
        cmd = [
            FFMPEG_EXE, "-y",
            "-f", "lavfi", "-i", f"sine=frequency=95:duration={dur}",
            "-f", "lavfi", "-i", f"sine=frequency=280:duration={dur}",
            "-filter_complex", filter_str,
            "-c:a", "libmp3lame", "-b:a", "192k",
            str(audio_file)
        ]

    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except Exception as e:
        # Fallback sederhana jika filter kompleks gagal
        simple_cmd = [
            FFMPEG_EXE, "-y",
            "-f", "lavfi", "-i", f"sine=frequency=120:duration={dur}",
            "-c:a", "libmp3lame", "-b:a", "192k",
            str(audio_file)
        ]
        subprocess.run(simple_cmd, check=True, capture_output=True)

    return str(audio_file)

def get_template_by_id(template_id: str) -> dict:
    for t in CAPCUT_TEMPLATES:
        if t["id"] == template_id:
            return t
    return CAPCUT_TEMPLATES[0]

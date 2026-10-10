THEMES = {
    "tiktok_viral": {
        "id": "tiktok_viral",
        "name": "CapCut JJ Mengkane (Beat-Sync)",
        "badge": "⚡ Trending CapCut 🔥",
        "description": "Potongan super cepat tepat pada setiap hentakan drum/bass, efek kilat flash white, dan warna kontras punchy.",
        "icon": "zap",
        "min_interval": 0.45,
        "ffmpeg_filter": "eq=contrast=1.22:saturation=1.4:brightness=0.01",
        "flash_effect": True,
        "letterbox": False,
        "music_volume": 1.0,
        "original_audio_volume": 0.0,
        "transition": "fast",
        "target_fps": 30
    },
    "cinematic": {
        "id": "cinematic",
        "name": "CapCut Cinematic Film Look",
        "badge": "🎬 Sinematik Pro",
        "description": "Grading moody teal & orange, letterbox bar 2.35:1 ala bioskop, transisi halus, alur tempo tenang dan dramatis.",
        "icon": "film",
        "min_interval": 2.0,
        "ffmpeg_filter": "eq=contrast=1.12:saturation=1.15:brightness=-0.02,curves=r='0/0 0.5/0.46 1/1':b='0/0.06 0.5/0.54 1/0.92',vignette=PI/5,drawbox=x=0:y=0:w=iw:h=ih*0.08:color=black:t=fill,drawbox=x=0:y=ih-ih*0.08:w=iw:h=ih*0.08:color=black:t=fill",
        "flash_effect": False,
        "letterbox": True,
        "music_volume": 1.0,
        "original_audio_volume": 0.15,
        "transition": "fade",
        "target_fps": 30
    },
    "dokumentasi": {
        "id": "dokumentasi",
        "name": "CapCut Mini Vlog / Daily Story",
        "badge": "📖 Vlog & Story",
        "description": "Warna natural bersih & tajam, mempertahankan suara vokal asli footage dipadu musik latar santai.",
        "icon": "book-open",
        "min_interval": 1.6,
        "ffmpeg_filter": "eq=contrast=1.06:saturation=1.2:brightness=0.02,unsharp=3:3:0.5:3:3:0.0",
        "flash_effect": False,
        "letterbox": False,
        "music_volume": 0.45,
        "original_audio_volume": 0.85,
        "transition": "cut",
        "target_fps": 30
    }
}

def get_theme_config(theme_id: str) -> dict:
    return THEMES.get(theme_id, THEMES["tiktok_viral"])

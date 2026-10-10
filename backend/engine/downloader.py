import os
import re
import uuid
import logging
import urllib.request
from pathlib import Path
import yt_dlp
from backend.config import CACHE_DIR, FFMPEG_EXE

logger = logging.getLogger(__name__)

def is_capcut_url(url: str) -> bool:
    """Mengecek apakah URL berasal dari CapCut."""
    url_lower = url.lower()
    return "capcut.com" in url_lower or "capcut.net" in url_lower

def download_capcut_template(url: str) -> dict:
    """
    Mengunduh audio dari template CapCut (capcut.com/template-detail/... atau capcut.com/t/...).
    """
    file_id = f"capcut_{uuid.uuid4().hex[:8]}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    }

    try:
        # Ikuti redirect untuk mendapatkan halaman detail template
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as response:
            final_url = response.geturl()
            html = response.read().decode('utf-8', errors='ignore')

        # Ambil judul template
        title_match = re.search(r'<meta property="og:title" content="([^"]+)"', html)
        title = title_match.group(1) if title_match else "CapCut Template"
        title = re.sub(r' - CapCut.*$', '', title).strip()

        # Cari video preview URL di dalam HTML / JSON SSR
        video_url = None
        
        # 1. Cek meta property og:video
        og_match = re.search(r'<meta property="og:video(?::url)?" content="([^"]+)"', html)
        if og_match:
            video_url = og_match.group(1)

        # 2. Cek JSON play_url atau video_url
        if not video_url:
            json_matches = re.findall(r'"(?:play_url|video_url|music_url|download_url)"\s*:\s*"([^"]+)"', html)
            if json_matches:
                video_url = json_matches[0].replace('\\u0026', '&').replace('\\/', '/')

        # 3. Cek pola direct mp4 url
        if not video_url:
            direct_matches = re.findall(r'https?://[^\s"\'<>]+\.(?:mp4)[^\s"\'<>]*', html)
            if direct_matches:
                video_url = direct_matches[0]

        if not video_url:
            # Coba fallback ke yt-dlp jika direct regex tidak ketemu
            return download_with_ytdlp(url, file_id, title)

        # Unduh file media preview
        raw_video = CACHE_DIR / f"{file_id}_raw.mp4"
        req_video = urllib.request.Request(video_url, headers=headers)
        with urllib.request.urlopen(req_video, timeout=25) as v_resp, open(raw_video, 'wb') as f_out:
            f_out.write(v_resp.read())

        # Ekstrak audio dari video preview CapCut menggunakan FFmpeg
        output_audio = CACHE_DIR / f"{file_id}.mp3"
        import subprocess
        cmd = [
            FFMPEG_EXE, "-y",
            "-i", str(raw_video),
            "-vn",
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            str(output_audio)
        ]
        res = subprocess.run(cmd, capture_output=True)
        
        # Hapus video raw
        if raw_video.exists():
            raw_video.unlink()

        if res.returncode == 0 and output_audio.exists():
            return {
                "success": True,
                "audio_path": str(output_audio),
                "title": f"CapCut: {title}",
                "uploader": "CapCut Creator",
                "file_id": file_id
            }
        else:
            raise RuntimeError("Gagal mengekstrak audio dari video CapCut.")

    except Exception as e:
        logger.warning(f"CapCut direct scraper failed: {e}. Mencoba fallback yt-dlp...")
        return download_with_ytdlp(url, file_id, "CapCut Template")


def download_with_ytdlp(url: str, file_id: str, default_title: str) -> dict:
    """Download audio menggunakan yt-dlp (untuk TikTok, Reels, YouTube Shorts)."""
    out_tmpl = str(CACHE_DIR / f"{file_id}.%(ext)s")
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': out_tmpl,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'ffmpeg_location': str(Path(FFMPEG_EXE).parent),
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get('title', default_title)
            uploader = info.get('uploader', 'Creator')
            duration = info.get('duration', 0)
            
            output_audio = CACHE_DIR / f"{file_id}.mp3"
            if not output_audio.exists():
                matched = list(CACHE_DIR.glob(f"{file_id}.*"))
                if matched:
                    output_audio = matched[0]
                else:
                    raise FileNotFoundError("Audio file not found")

            return {
                "success": True,
                "audio_path": str(output_audio),
                "title": title,
                "uploader": uploader,
                "duration": duration,
                "file_id": file_id
            }
    except Exception as e:
        logger.error(f"yt-dlp error: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Gagal mengunduh audio dari link tersebut. Pastikan link valid dan video dapat diakses publik."
        }


def download_media_reference(url: str) -> dict:
    """Router otomatis untuk mengunduh dari link CapCut, TikTok, Reels, atau Shorts."""
    if is_capcut_url(url):
        return download_capcut_template(url)
    else:
        file_id = f"tiktok_{uuid.uuid4().hex[:8]}"
        return download_with_ytdlp(url, file_id, "TikTok Sound")

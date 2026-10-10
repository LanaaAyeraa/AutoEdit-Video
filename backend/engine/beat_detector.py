import logging
import numpy as np
import librosa

logger = logging.getLogger(__name__)

def analyze_audio_beats(audio_path: str) -> dict:
    """
    Menganalisis audio untuk mendeteksi tempo (BPM), timestamp setiap beat,
    dan energi onset untuk keperluan sinkronisasi potongan video (beat-sync).
    """
    try:
        # Load audio (mono, 22050 Hz)
        y, sr = librosa.load(audio_path, sr=22050, mono=True)
        duration = float(librosa.get_duration(y=y, sr=sr))

        # Deteksi tempo dan beat frames
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        
        # Penanganan tipe data tempo di berbagai versi librosa
        if isinstance(tempo, (np.ndarray, list)):
            bpm = float(np.atleast_1d(tempo)[0])
        else:
            bpm = float(tempo)

        # Ubah frame menjadi waktu dalam detik
        beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
        beat_times = [round(float(t), 3) for t in beat_times]

        # Jika audio terlalu sunyi atau beat tidak terdeteksi, buat beat sintetis berdasarkan tempo default
        if not beat_times:
            default_interval = 0.8  # ~75 BPM
            beat_times = [round(t, 3) for t in np.arange(0, duration, default_interval).tolist()]

        # Pastikan ada titik awal 0.0 jika beat pertama tidak mulai dari nol
        if beat_times and beat_times[0] > 0.3:
            beat_times.insert(0, 0.0)

        # Hitung envelope energi onset (berguna untuk mendeteksi drop/bass besar)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        peaks = librosa.util.peak_pick(
            onset_env,
            pre_max=3, post_max=3,
            pre_avg=3, post_avg=5,
            delta=0.5, wait=10
        )
        drop_times = librosa.frames_to_time(peaks, sr=sr).tolist()
        drop_times = [round(float(t), 3) for t in drop_times if t <= duration]

        return {
            "success": True,
            "duration": round(duration, 2),
            "bpm": round(bpm, 1),
            "beat_times": beat_times,
            "drop_times": drop_times,
            "total_beats": len(beat_times)
        }
    except Exception as e:
        logger.error(f"Gagal menganalisis beat audio: {e}")
        return {
            "success": False,
            "error": str(e),
            "bpm": 120.0,
            "duration": 15.0,
            "beat_times": [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        }


def generate_cut_segments(beat_times: list, total_duration: float, theme_key: str, num_available_clips: int) -> list:
    """
    Menghitung segmen pemotongan (start_time, end_time, duration) berdasarkan tema.
    - cinematic: Interval potongan lebih panjang (2.0s - 4.0s) pada beat-beat utama.
    - dokumentasi: Interval sedang (1.8s - 3.0s) mengikuti alur cerita.
    - tiktok_viral: Interval cepat (0.4s - 1.2s) pada setiap ketukan beat/drop.
    """
    if not beat_times:
        beat_times = [0.0]

    # Filter/quantize beat berdasarkan tema
    if theme_key == "cinematic":
        min_interval = 2.0
    elif theme_key == "dokumentasi":
        min_interval = 1.6
    else:  # tiktok_viral
        min_interval = 0.5

    cut_points = [0.0]
    last_point = 0.0

    for bt in beat_times:
        if (bt - last_point) >= min_interval:
            cut_points.append(bt)
            last_point = bt

    # Pastikan cut point berakhir mendekati total_duration
    if (total_duration - last_point) >= 1.0:
        cut_points.append(total_duration)
    else:
        cut_points[-1] = total_duration

    # Buat daftar segmen
    segments = []
    for i in range(len(cut_points) - 1):
        start = cut_points[i]
        end = cut_points[i + 1]
        duration = round(end - start, 3)
        if duration > 0.2:
            segments.append({
                "segment_index": i,
                "start": round(start, 3),
                "end": round(end, 3),
                "duration": duration,
                "clip_index": i % num_available_clips  # Klip yang dialokasikan (loop jika bahan lebih sedikit)
            })

    return segments

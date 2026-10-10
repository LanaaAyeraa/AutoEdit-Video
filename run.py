import os
import sys
import socket
import argparse
import subprocess
import threading
import re
import time
import webbrowser
import uvicorn

DEFAULT_PORT = 8585
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLOUDFLARED_EXE = os.path.join(BASE_DIR, "cloudflared.exe")

def get_local_ip():
    """Mendapatkan alamat IP lokal komputer di jaringan WiFi/LAN."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Mengecek apakah port tertentu sedang digunakan aplikasi lain."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def find_available_port(start_port: int = DEFAULT_PORT) -> int:
    """Mencari port yang benar-benar kosong agar tidak bentrok."""
    port = start_port
    while is_port_in_use(port):
        print(f"[*] Port {port} sedang digunakan aplikasi lain. Mencari port berikutnya...")
        port += 1
    return port

def launch_cloudflare_tunnel(port: int):
    """Menjalankan Cloudflare Tunnel di background dan mencari link publik HTTPS."""
    if not os.path.exists(CLOUDFLARED_EXE):
        return

    try:
        proc = subprocess.Popen(
            [CLOUDFLARED_EXE, "tunnel", "--url", f"http://localhost:{port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            errors="replace"
        )
        url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
        for line in proc.stdout:
            match = url_pattern.search(line)
            if match:
                public_url = match.group(0)
                print("\n" + "=" * 65)
                print(" 🌐 LINK PUBLIK ONLINE (UNTUK HP BEDA JARINGAN / KUOTA DATA)")
                print("=" * 65)
                print(f" 👉 Buka di iPhone / Android : {public_url}")
                print("-" * 65)
                print(" [!] Link ini aman (HTTPS) dan bisa diakses dari MANA SAJA")
                print("     (beda WiFi, data seluler 4G/5G, di luar rumah, dll)!")
                print("=" * 65 + "\n")
                break
    except Exception as e:
        pass

def main():
    parser = argparse.ArgumentParser(description="Auto Video Editor Runner")
    parser.add_argument("--port", "-p", type=int, default=None, help="Tentukan port manual jika diinginkan")
    parser.add_argument("--no-tunnel", action="store_true", help="Nonaktifkan cloudflare tunnel online")
    args = parser.parse_args()

    preferred_port = args.port if args.port else DEFAULT_PORT
    active_port = find_available_port(preferred_port)
    local_ip = get_local_ip()

    print("=" * 65)
    print(" >>> AUTO VIDEO EDITOR & CAPCUT TEMPLATES <<<")
    print("=" * 65)
    print(f" [OK] Port Khusus       : {active_port} (Aman, bebas dari bentrok port 8000)")
    print(f" [PC] Akses Laptop/PC   : http://localhost:{active_port}")
    print(f" [HP] Akses WiFi Sama   : http://{local_ip}:{active_port}")
    print("-" * 65)
    print(" [*] Menyiapkan Link Online Publik untuk HP yang Beda Jaringan...")
    print("=" * 65)

    # Jalankan Cloudflare Tunnel di background jika diizinkan
    if not args.no_tunnel and os.path.exists(CLOUDFLARED_EXE):
        t_tunnel = threading.Thread(target=launch_cloudflare_tunnel, args=(active_port,), daemon=True)
        t_tunnel.start()

    # Buka browser lokal setelah 1.2 detik
    def open_browser():
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{active_port}")
    threading.Thread(target=open_browser, daemon=True).start()

    # Jalankan server FastAPI
    uvicorn.run("backend.app:app", host="0.0.0.0", port=active_port, reload=False)

if __name__ == "__main__":
    main()

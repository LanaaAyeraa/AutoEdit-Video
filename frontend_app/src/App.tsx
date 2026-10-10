import React, { useState, useEffect, useRef } from "react"
import {
  UploadCloud,
  Film,
  Music,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Smartphone,
  Trash2,
  Link as LinkIcon,
  FolderOpen,
  Volume2,
  Check,
  Disc3,
  Clock,
  Activity,
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2
} from "lucide-react"
import confetti from "canvas-confetti"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Dialog } from "@/components/ui/dialog"

interface ClipItem {
  filename: string
  path: string
  duration: number
  is_image: boolean
  file?: File
  previewUrl?: string
}

interface CapcutTemplate {
  id: string
  name: string
  category: string
  badge: string
  description: string
  icon: string
  theme_key: string
  bpm: number
  duration: number
  recommended_clips: string
  effects: string[]
  audio_style?: string
}

interface AudioRefData {
  audio_path: string
  title: string
  bpm: number
  duration: number
  beat_times: number[]
  drop_times: number[]
  total_beats: number
  source?: string
  uploader?: string
}

interface SystemStatus {
  status: string
  ffmpeg_available: boolean
}

const THEME_OPTIONS = [
  {
    id: "tiktok_viral",
    name: "CapCut JJ Mengkane (Beat-Sync)",
    badge: "Trending CapCut 🔥",
    description: "Potongan super cepat pas di setiap hentakan bass drum dengan efek flash white dan zoom punch.",
    icon: Zap,
    accentColor: "from-[#fe2c55] to-[#ff0055]",
    features: [
      "Ultra-fast beat-sync cuts",
      "Flash White & Punch Zoom",
      "Vibrant Contrast & Pop Colors",
      "Auto-framing vertikal 9:16 standard"
    ]
  },
  {
    id: "cinematic",
    name: "CapCut Cinematic Film Look",
    badge: "Sinematik Pro 🎬",
    description: "Grading moody teal & orange, rasio bioskop letterbox 2.35:1, alur santai dramatis.",
    icon: Film,
    accentColor: "from-amber-500 to-teal-500",
    features: [
      "Moody Teal & Orange Color Grading",
      "Rasio Letterbox Bioskop 2.35:1",
      "Transisi Smooth Dissolve / Crossfade",
      "Audio Ambient & Slow-motion pacing"
    ]
  },
  {
    id: "dokumentasi",
    name: "CapCut Mini Vlog / Daily Story",
    badge: "Vlog & Story 📖",
    description: "Warna natural bersih & tajam, mempertahankan vokal asli dengan musik latar seimbang.",
    icon: Layers,
    accentColor: "from-blue-500 to-emerald-500",
    features: [
      "Warna Natural Tajam & Bersih",
      "Voice Ducking 70% (vokal asli tetap jelas)",
      "Transisi naratif berkesinambungan",
      "Cocok untuk jalan-jalan & daily recap"
    ]
  }
]

export default function App() {
  // Navigation State
  const [currentStep, setCurrentStep] = useState<number>(1)

  // System status
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null)

  // Step 1: Upload Clips
  const [clips, setClips] = useState<ClipItem[]>([])
  const [isUploadingClips, setIsUploadingClips] = useState<boolean>(false)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 2: Audio & CapCut Templates
  const [activeTab, setActiveTab] = useState<"capcut" | "url" | "upload">("capcut")
  const [templates, setTemplates] = useState<CapcutTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false)
  const [isUploadingAudio, setIsUploadingAudio] = useState<boolean>(false)
  const [audioRef, setAudioRef] = useState<AudioRefData | null>(null)
  const audioFileInputRef = useRef<HTMLInputElement>(null)

  // Step 3: Themes
  const [selectedTheme, setSelectedTheme] = useState<string>("tiktok_viral")

  // Step 4: Render
  const [jobId, setJobId] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle")
  const [renderProgress, setRenderProgress] = useState<number>(10)
  const [renderMessage, setRenderMessage] = useState<string>("Menyiapkan engine FFmpeg...")
  const [resultVideoFile, setResultVideoFile] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const pollTimerRef = useRef<any>(null)

  // PWA Modal
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false)

  // Fetch initial system status & templates
  useEffect(() => {
    fetchStatus()
    fetchTemplates()

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status")
      if (res.ok) {
        const data = await res.json()
        setSysStatus(data)
      }
    } catch {
      // Offline / standalone mode
    }
  }

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const res = await fetch("/api/capcut/templates")
      const data = await res.json()
      if (data.templates && data.templates.length > 0) {
        setTemplates(data.templates)
        // Select first template by default
        handleSelectTemplate(data.templates[0].id)
      }
    } catch (err) {
      console.error("Gagal memuat template CapCut:", err)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // Step 1: Upload Clips Handlers
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploadingClips(true)
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i])
    }

    try {
      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (data.success && data.items) {
        const newClips: ClipItem[] = data.items.map((item: any) => ({
          filename: item.filename,
          path: item.path,
          duration: item.duration,
          is_image: item.is_image,
        }))
        setClips((prev) => [...prev, ...newClips])
      } else {
        alert("Gagal mengunggah file. Pastikan format video/foto didukung.")
      }
    } catch (err) {
      console.error(err)
      alert("Terjadi kesalahan jaringan saat mengunggah file.")
    } finally {
      setIsUploadingClips(false)
    }
  }

  const removeClip = (index: number) => {
    setClips((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAllClips = () => {
    setClips([])
  }

  // Step 2: Template & Audio Handlers
  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId)
    try {
      const res = await fetch("/api/capcut/select-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      })
      const data = await res.json()
      if (data.success) {
        setAudioRef(data)
        if (data.theme_key) {
          setSelectedTheme(data.theme_key)
        }
      }
    } catch (err) {
      console.error("Gagal memilih template:", err)
    }
  }

  const handleFetchUrl = async () => {
    if (!audioUrl.trim()) {
      alert("Silakan masukkan link URL template CapCut atau TikTok.")
      return
    }

    setIsFetchingUrl(true)
    try {
      const res = await fetch("/api/reference/tiktok-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: audioUrl.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setAudioRef(data)
      } else {
        alert(data.detail || "Gagal mengunduh audio dari URL tersebut.")
      }
    } catch (err) {
      console.error(err)
      alert("Gagal menghubungi server untuk mengunduh template.")
    } finally {
      setIsFetchingUrl(false)
    }
  }

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAudio(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/reference/upload-file", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setAudioRef(data)
      } else {
        alert("Gagal memproses file audio/video referensi.")
      }
    } catch (err) {
      console.error(err)
      alert("Terjadi kesalahan saat memproses file.")
    } finally {
      setIsUploadingAudio(false)
    }
  }

  // Step 4: Render Handlers
  const handleStartRender = async () => {
    if (clips.length === 0) {
      alert("Silakan unggah minimal 1 bahan video/foto.")
      setCurrentStep(1)
      return
    }
    if (!audioRef) {
      alert("Silakan tentukan referensi musik atau template terlebih dahulu.")
      setCurrentStep(2)
      return
    }

    setCurrentStep(4)
    setRenderStatus("processing")
    setRenderProgress(10)
    setRenderMessage("Menyiapkan engine FFmpeg & penyelarasan beat...")
    setResultVideoFile(null)
    setErrorMessage("")

    try {
      const payload = {
        clip_paths: clips.map((c) => c.path),
        audio_path: audioRef.audio_path,
        theme: selectedTheme,
      }

      const res = await fetch("/api/render/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.job_id) {
        setJobId(data.job_id)
        startPolling(data.job_id)
      } else {
        setRenderStatus("failed")
        setErrorMessage("Gagal membuat tugas render.")
      }
    } catch (err) {
      console.error(err)
      setRenderStatus("failed")
      setErrorMessage("Terjadi gangguan koneksi saat memulai render.")
    }
  }

  const startPolling = (currentJobId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${currentJobId}`)
        const data = await res.json()

        if (data.status === "processing") {
          setRenderProgress(data.progress || 15)
          setRenderMessage(data.message || "Sedang memproses video...")
        } else if (data.status === "completed") {
          clearInterval(pollTimerRef.current)
          setRenderProgress(100)
          setRenderStatus("completed")
          setResultVideoFile(data.result?.output_file || null)
          // Fire celebration confetti!
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#fe2c55", "#25f4ee", "#ffffff"],
          })
        } else if (data.status === "failed") {
          clearInterval(pollTimerRef.current)
          setRenderStatus("failed")
          setErrorMessage(data.message || "Gagal memproses video.")
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }, 1200)
  }

  const handleRestart = () => {
    setClips([])
    setResultVideoFile(null)
    setRenderStatus("idle")
    setCurrentStep(1)
  }

  // Beat Waveform visualizer helper
  const renderBeatBars = () => {
    if (!audioRef || !audioRef.beat_times) return null
    const beats = audioRef.beat_times
    const drops = new Set(audioRef.drop_times || [])
    const sampleCount = Math.min(beats.length, 36)
    const step = Math.max(1, Math.floor(beats.length / sampleCount))

    const bars = []
    for (let i = 0; i < beats.length; i += step) {
      const isDrop = drops.has(beats[i])
      bars.push(
        <div
          key={i}
          className={`h-full w-1 rounded-full transition-all duration-300 ${
            isDrop
              ? "bg-[#25f4ee] h-8 shadow-[0_0_8px_#25f4ee]"
              : "bg-primary/70 h-5"
          }`}
        />
      )
    }
    return bars
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl px-4 py-6 md:py-10 flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#fe2c55] via-[#ff0055] to-[#25f4ee] flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="h-6 w-6 text-white fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  AutoEdit <span className="text-[#fe2c55]">AI</span>
                </h1>
                <Badge variant="popular" className="text-[10px] uppercase font-bold tracking-wider">
                  CapCut Sync
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                TikTok Beat-Sync & Automated Aesthetic Theme Editor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {sysStatus && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground">
                <span
                  className={`h-2 w-2 rounded-full ${
                    sysStatus.ffmpeg_available ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"
                  }`}
                />
                <span>{sysStatus.ffmpeg_available ? "FFmpeg Siap" : "Mode Standalone"}</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPwaModal(true)}
              className="gap-1.5 text-xs font-semibold hover:border-primary/50"
            >
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              <span>Install di HP</span>
            </Button>
          </div>
        </header>

        {/* Stepper Navigation */}
        <nav aria-label="Progress" className="w-full">
          <div className="flex items-center justify-between relative px-2 sm:px-6">
            {/* Step Connection Lines */}
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-border/60 -z-10">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-in-out"
                style={{
                  width: `${((currentStep - 1) / 3) * 100}%`,
                }}
              />
            </div>

            {[
              { num: 1, label: "Bahan", icon: FolderOpen },
              { num: 2, label: "CapCut & Beat", icon: Music },
              { num: 3, label: "Tema Gaya", icon: Sparkles },
              { num: 4, label: "Export Video", icon: Film },
            ].map((step) => {
              const isActive = currentStep === step.num
              const isDone = currentStep > step.num
              const Icon = step.icon

              return (
                <button
                  key={step.num}
                  onClick={() => {
                    // Allow navigation backwards or if prerequisites are met
                    if (isDone || (step.num === 2 && clips.length > 0) || (step.num === 3 && audioRef)) {
                      setCurrentStep(step.num)
                    }
                  }}
                  disabled={!isDone && !isActive && (step.num === 2 && clips.length === 0)}
                  className="flex flex-col items-center gap-2 group cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                >
                  <div
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 border ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-110"
                        : isDone
                        ? "bg-secondary text-secondary-foreground border-secondary shadow-md shadow-secondary/20"
                        : "bg-card text-muted-foreground border-border group-hover:border-muted-foreground/50"
                    }`}
                  >
                    {isDone ? <Check className="h-5 w-5 stroke-[3]" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span
                    className={`text-xs font-semibold transition-colors duration-200 hidden sm:block ${
                      isActive ? "text-foreground font-bold" : isDone ? "text-secondary" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* STEP CONTENT PANELS */}
        <main className="w-full">
          {/* STEP 1: IMPORT BAHAN */}
          {currentStep === 1 && (
            <Card className="border-border/80 bg-card/70">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      1. Import Bahan Video & Foto
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Pilih beberapa klip video atau foto yang ingin dipotong otomatis sesuai hentakan irama beat.
                    </CardDescription>
                  </div>
                  {clips.length > 0 && (
                    <Badge variant="secondary" className="font-semibold text-xs">
                      {clips.length} Klip Dipilih
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragOver(false)
                    handleFileUpload(e.dataTransfer.files)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
                    isDragOver
                      ? "border-primary bg-primary/10 scale-[1.01]"
                      : "border-border/80 hover:border-primary/60 hover:bg-muted/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="video/mp4,video/quicktime,video/mkv,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />

                  <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    {isUploadingClips ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <UploadCloud className="h-8 w-8" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">
                      {isUploadingClips ? "Sedang Mengunggah & Menganalisis..." : "Tarik & Lepas File di Sini"}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Mendukung MP4, MOV, MKV, JPG, PNG. Otomatis di-crop ke format vertikal 9:16 standar TikTok/CapCut.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingClips}
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                    className="mt-2 font-medium"
                  >
                    Telusuri File dari Laptop / HP
                  </Button>
                </div>

                {/* Uploaded Clips Grid */}
                {clips.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Daftar Bahan ({clips.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllClips}
                        className="text-xs text-destructive hover:bg-destructive/20 hover:text-destructive h-8 px-2.5"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Hapus Semua
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-1">
                      {clips.map((clip, index) => (
                        <div
                          key={index}
                          className="group relative aspect-[9/16] rounded-xl overflow-hidden border border-border bg-muted/40 flex flex-col justify-between p-2 shadow-sm hover:border-primary/60 transition-all"
                        >
                          <div className="flex justify-between items-center z-10">
                            <Badge variant="outline" className="text-[10px] bg-background/80 backdrop-blur-sm px-1.5 py-0.5">
                              {clip.is_image ? "Foto" : `${clip.duration}s`}
                            </Badge>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeClip(index)
                              }}
                              className="h-6 w-6 rounded-lg bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-30 select-none">
                            {clip.is_image ? "🖼️" : "🎬"}
                          </div>

                          <div className="z-10 mt-auto bg-black/60 backdrop-blur-sm rounded-md p-1">
                            <p className="text-[10px] font-medium text-white/90 truncate">{clip.filename}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Step Action */}
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={clips.length === 0 || isUploadingClips}
                    size="lg"
                    className="w-full sm:w-auto font-bold gap-2"
                  >
                    <span>Lanjut ke Template CapCut</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: CAPCUT TEMPLATE & BEAT-SYNC */}
          {currentStep === 2 && (
            <Card className="border-border/80 bg-card/70">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Music className="h-5 w-5 text-primary" />
                      2. Pilih Template CapCut & Beat-Sync
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Pilih ritme musik trending CapCut siap pakai atau tempelkan link video/template TikTok.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tabs switcher */}
                <div className="flex rounded-xl bg-muted/60 p-1 gap-1 border border-border/60">
                  <button
                    onClick={() => setActiveTab("capcut")}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "capcut"
                        ? "bg-card text-foreground shadow-md border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>🔥 Template CapCut</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("url")}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "url"
                        ? "bg-card text-foreground shadow-md border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>Link CapCut / TikTok</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "upload"
                        ? "bg-card text-foreground shadow-md border border-border/80"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Upload Audio</span>
                  </button>
                </div>

                {/* Tab 1: Template CapCut Siap Pakai */}
                {activeTab === "capcut" && (
                  <div className="space-y-4">
                    {isLoadingTemplates ? (
                      <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span>Memuat katalog template CapCut...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {templates.map((tmpl) => {
                          const isSelected = selectedTemplateId === tmpl.id
                          return (
                            <div
                              key={tmpl.id}
                              onClick={() => handleSelectTemplate(tmpl.id)}
                              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 ring-1 ring-primary"
                                  : "border-border/80 bg-card/60 hover:border-primary/50 hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-2xl p-2 rounded-xl bg-background border border-border/80 shadow-sm">
                                    {tmpl.icon}
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                      {tmpl.name}
                                    </h4>
                                    <span className="text-[11px] text-muted-foreground">
                                      {tmpl.category}
                                    </span>
                                  </div>
                                </div>
                                <Badge
                                  variant={tmpl.badge.includes("Viral") ? "popular" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {tmpl.badge}
                                </Badge>
                              </div>

                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {tmpl.description}
                              </p>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                                <div className="flex items-center gap-1.5 text-secondary font-bold">
                                  <Clock className="h-3 w-3" />
                                  <span>{tmpl.duration}s ({tmpl.bpm} BPM)</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {tmpl.recommended_clips}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Link URL */}
                {activeTab === "url" && (
                  <div className="space-y-3 py-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        placeholder="Contoh: https://www.capcut.com/template-detail/... atau https://vt.tiktok.com/..."
                        className="flex-1"
                      />
                      <Button
                        onClick={handleFetchUrl}
                        disabled={isFetchingUrl || !audioUrl.trim()}
                        className="gap-2 shrink-0 font-bold"
                      >
                        {isFetchingUrl ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Mengunduh...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            <span>Ambil Template</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mendukung link share template CapCut (`template-detail` atau `capcut.com/t/...`), TikTok, Reels, dan YouTube Shorts. Audio akan diunduh dan dianalisis titik hentakannya.
                    </p>
                  </div>
                )}

                {/* Tab 3: Upload Audio */}
                {activeTab === "upload" && (
                  <div className="py-2">
                    <div
                      onClick={() => audioFileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/80 rounded-2xl p-6 text-center cursor-pointer hover:border-secondary hover:bg-secondary/5 transition-all flex flex-col items-center gap-2"
                    >
                      <input
                        ref={audioFileInputRef}
                        type="file"
                        accept="audio/*,video/*"
                        className="hidden"
                        onChange={handleUploadAudio}
                      />
                      <Volume2 className="h-8 w-8 text-secondary" />
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {isUploadingAudio ? "Menganalisis audio..." : "Pilih File Musik atau Video TikTok"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Format MP3, WAV, M4A, atau file video MP4 untuk diambil suaranya.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Beat Analysis Waveform Result */}
                {audioRef && (
                  <div className="p-4 rounded-2xl bg-card border border-border shadow-md space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                          <Disc3 className="h-6 w-6 animate-spin [animation-duration:4s]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
                            {audioRef.title || "CapCut Beat Audio"}
                          </h4>
                          <span className="text-[11px] text-muted-foreground">
                            {audioRef.uploader ? `Oleh: ${audioRef.uploader}` : "Analisis Beat Selesai"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs gap-1 font-bold">
                          <Activity className="h-3 w-3" />
                          {audioRef.bpm} BPM
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1 font-bold">
                          <Clock className="h-3 w-3" />
                          {audioRef.duration}s
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          🥁 {audioRef.total_beats || 0} Beats
                        </Badge>
                      </div>
                    </div>

                    {/* Waveform Visualization */}
                    <div className="p-3 rounded-xl bg-background/80 border border-border/50">
                      <div className="flex items-end justify-between h-10 gap-1 overflow-hidden px-1">
                        {renderBeatBars()}
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2 px-1">
                        <span>Titik Beat (Cuts)</span>
                        <span className="text-[#25f4ee] font-semibold">Cyan: Drop Bass Drums</span>
                        <span>{audioRef.duration}s</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation actions */}
                <div className="pt-4 flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(1)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali</span>
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    disabled={!audioRef}
                    size="lg"
                    className="font-bold gap-2"
                  >
                    <span>Lanjut Pilih Tema</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: PILIH TEMA EDITING */}
          {currentStep === 3 && (
            <Card className="border-border/80 bg-card/70">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  3. Pilih Gaya & Tema Editing
                </CardTitle>
                <CardDescription className="mt-1">
                  Sesuaikan mood, grading warna, dan pola transisi pemotongan video Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {THEME_OPTIONS.map((theme) => {
                    const isSelected = selectedTheme === theme.id
                    const Icon = theme.icon

                    return (
                      <div
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-xl shadow-primary/20 ring-2 ring-primary"
                            : "border-border/80 bg-card/60 hover:border-primary/50 hover:bg-muted/40"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center text-primary">
                              <Icon className="h-5 w-5" />
                            </div>
                            <Badge
                              variant={isSelected ? "popular" : "secondary"}
                              className="text-[10px]"
                            >
                              {theme.badge}
                            </Badge>
                          </div>

                          <div>
                            <h3 className="font-bold text-base text-foreground">
                              {theme.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {theme.description}
                            </p>
                          </div>

                          <ul className="space-y-2 pt-2 border-t border-border/50">
                            {theme.features.map((feat, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2">
                          <div
                            className={`w-full py-2 rounded-xl text-xs font-bold text-center transition-all ${
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-muted/60 text-muted-foreground"
                            }`}
                          >
                            {isSelected ? "Tema Dipilih ✓" : "Pilih Tema Ini"}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(2)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali</span>
                  </Button>
                  <Button
                    onClick={handleStartRender}
                    variant="gradient"
                    size="lg"
                    className="font-bold gap-2 text-base px-8"
                  >
                    <Zap className="h-5 w-5 fill-current" />
                    <span>Render Video Auto-Edit ➔</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: RENDER & HASIL */}
          {currentStep === 4 && (
            <Card className="border-border/80 bg-card/70 text-center">
              <CardContent className="py-12 px-4 sm:px-8 max-w-xl mx-auto space-y-6">
                
                {/* 4A: Processing State */}
                {renderStatus === "processing" && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-muted/30" />
                      <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <Zap className="h-10 w-10 text-primary animate-pulse" />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-xl font-black text-foreground">
                        Sedang Mengedit Video Otomatis...
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {renderMessage}
                      </p>
                    </div>

                    <div className="space-y-2 max-w-md mx-auto">
                      <Progress value={renderProgress} className="h-3" />
                      <div className="flex justify-between text-xs font-bold text-muted-foreground px-1">
                        <span>FFmpeg Pipeline</span>
                        <span className="text-primary">{renderProgress}%</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground max-w-sm mx-auto">
                      💡 Rendering dilakukan di engine FFmpeg lokal tanpa kompresi berlebih agar hasil tetap tajam dan jernih.
                    </div>
                  </div>
                )}

                {/* 4B: Completed State */}
                {renderStatus === "completed" && resultVideoFile && (
                  <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Video Selesai Dibuat!
                    </div>

                    <h2 className="text-2xl font-black text-foreground">
                      Video Auto-Edit Siap Ditonton & Diunduh
                    </h2>

                    {/* 9:16 Video Player Container */}
                    <div className="relative mx-auto w-full max-w-[280px] aspect-[9/16] rounded-3xl overflow-hidden border-2 border-border shadow-2xl bg-black">
                      <video
                        src={`/api/output/${resultVideoFile}`}
                        controls
                        playsInline
                        autoPlay
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-md mx-auto">
                      <Button
                        asChild
                        variant="gradient"
                        size="lg"
                        className="flex-1 font-bold gap-2 text-white"
                      >
                        <a href={`/api/output/${resultVideoFile}`} download="auto_edited_tiktok.mp4">
                          <Download className="h-5 w-5" />
                          <span>Unduh Video (MP4)</span>
                        </a>
                      </Button>

                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleRestart}
                        className="gap-2 font-semibold"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Buat Video Baru</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* 4C: Failed State */}
                {renderStatus === "failed" && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/20 border border-destructive/40 flex items-center justify-center text-destructive">
                      <AlertCircle className="h-8 w-8" />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-foreground">
                        Terjadi Kesalahan
                      </h2>
                      <p className="text-sm text-destructive max-w-md mx-auto">
                        {errorMessage || "Gagal merender video. Periksa koneksi atau file bahan."}
                      </p>
                    </div>

                    <div className="flex justify-center gap-3 pt-2">
                      <Button
                        variant="secondary"
                        onClick={handleStartRender}
                        className="font-bold gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Coba Lagi</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setCurrentStep(1)}
                      >
                        Ganti Bahan
                      </Button>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 AutoEdit AI — TikTok Beat-Sync & CapCut Auto Engine.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-foreground transition-colors cursor-pointer" onClick={() => setShowPwaModal(true)}>
              Panduan PWA HP
            </span>
            <span>•</span>
            <span className="text-muted-foreground/80">Local FFmpeg Engine</span>
          </div>
        </footer>

      </div>

      {/* PWA Mobile Installation Guide Dialog */}
      <Dialog
        open={showPwaModal}
        onClose={() => setShowPwaModal(false)}
        title="📱 Cara Pasang di iPhone & Android"
        description="Aplikasi ini berbasis Progressive Web App (PWA) berkecepatan tinggi, bisa dipasang langsung ke layar beranda HP tanpa perlu lewat App Store / Play Store!"
      >
        <div className="space-y-4 pt-2">
          {/* iOS Safari Guide */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-2">
            <h4 className="text-sm font-bold text-[#25f4ee] flex items-center gap-2">
              <span>🍏 Untuk Pengguna iPhone (iOS):</span>
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>Pastikan iPhone terhubung ke <strong>WiFi yang sama</strong> dengan laptop.</li>
              <li>Buka browser <strong>Safari</strong> di iPhone, lalu ketik alamat IP laptop Anda.</li>
              <li>Ketuk ikon <strong>Share</strong> (kotak dengan panah ke atas) di bilah bawah Safari.</li>
              <li>Gulir ke bawah lalu pilih <strong>"Add to Home Screen"</strong> (Tambahkan ke Layar Utama).</li>
              <li>Ketuk <strong>"Add" / "Tambah"</strong> di pojok kanan atas. Ikon AutoEdit langsung aktif di layar iPhone Anda!</li>
            </ol>
          </div>

          {/* Android Chrome Guide */}
          <div className="p-4 rounded-xl bg-background border border-border space-y-2">
            <h4 className="text-sm font-bold text-[#fe2c55] flex items-center gap-2">
              <span>🤖 Untuk Pengguna Android:</span>
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4 leading-relaxed">
              <li>Buka browser <strong>Google Chrome</strong> di HP Android.</li>
              <li>Buka alamat IP laptop Anda di bilah alamat browser.</li>
              <li>Ketuk tombol menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas.</li>
              <li>Pilih opsi <strong>"Install aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
            </ol>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPwaModal(false)}
              className="font-semibold text-xs"
            >
              Tutup Panduan
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

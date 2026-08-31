import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Type, Smile, Scissors, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import {
  DEFAULT_FILTER,
  EMPTY_OVERLAYS,
  FILTER_PRESETS,
  STICKER_CHOICES,
  TEXT_COLORS,
  filterToCss,
  renderFilteredImage,
  getVideoDuration,
  trimVideoFile,
  type FilterState,
  type MediaOverlays,
} from "../filters";

interface MediaEditorProps {
  file: File;
  kind: "image" | "video";
  submitLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onDone: (file: File) => void | Promise<void>;
}

export function MediaEditor({ file, kind, submitLabel = "Continuar", busy, onCancel, onDone }: MediaEditorProps) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [overlays, setOverlays] = useState<MediaOverlays>(EMPTY_OVERLAYS);
  const [preset, setPreset] = useState("normal");
  const [rendering, setRendering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const css = filterToCss(filter);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    if (kind !== "video") return;
    getVideoDuration(file).then((d) => { setDuration(d); setEnd(d); }).catch(() => {});
  }, [file, kind]);

  async function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        if (v.currentTime >= end && end > 0) v.currentTime = start;
        await v.play();
        setPlaying(true);
        setVideoError(null);
      } else {
        v.pause();
        setPlaying(false);
      }
    } catch (error) {
      console.error("[MediaEditor] playback", error);
      setPlaying(false);
      setVideoError("Não foi possível reproduzir este vídeo neste navegador.");
    }
  }

  function seek(value: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = value;
    setCurrentTime(value);
    if (value >= end) setPlaying(false);
  }

  async function handleDone() {
    setRendering(true);
    try {
      if (kind === "video") {
        let out = file;
        if (duration > 0 && (start > 0 || end < duration - 0.05)) {
          try { out = await trimVideoFile(file, start, end); }
          catch (trimError) {
            console.warn("[MediaEditor] corte indisponível; mantendo o original", trimError);
            toast.info("O corte não está disponível neste navegador. O vídeo original será mantido.");
          }
        }
        await onDone(out);
      } else {
        const out = await renderFilteredImage(file, filter, overlays);
        await onDone(out);
      }
    } catch (error) {
      console.error("[MediaEditor]", error);
      alert(error instanceof Error ? error.message : t("media.editFailed", "Não foi possível aplicar a edição."));
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <div className="relative mx-auto aspect-[9/16] max-h-[58vh] w-full">
          {kind === "image" ? (
            <img src={url} alt="Pré-visualização" className="h-full w-full object-contain" style={{ filter: css }} onError={() => setVideoError("Não foi possível abrir esta imagem. Use JPG, PNG ou WebP.")} />
          ) : (
            <video
              ref={videoRef}
              src={url}
              playsInline
              preload="auto"
              autoPlay
              muted={muted}
              loop
              controls={false}
              onLoadedMetadata={(e) => {
                const d = Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0;
                if (d > 0) { setDuration(d); setEnd((prev) => prev > 0 ? Math.min(prev, d) : d); }
                setVideoError(null);
                void e.currentTarget.play().catch(() => undefined);
              }}
              onCanPlay={(e) => {
                if (!playing) void e.currentTarget.play().catch(() => undefined);
              }}
              onTimeUpdate={(e) => {
                const time = e.currentTarget.currentTime;
                setCurrentTime(time);
                if (time >= end && end > 0) { e.currentTarget.pause(); setPlaying(false); }
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); setCurrentTime(0); }}
              onError={(e) => {
                setPlaying(false);
                const mediaError = e.currentTarget.error;
                setVideoError(mediaError?.message || "Não foi possível carregar este vídeo neste navegador. Prefira MP4 (H.264) ou WebM.");
              }}
              className="h-full w-full object-contain"
            />
          )}
          {overlays.stickers.map((s) => <span key={s.id} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, fontSize: `${s.size / 2.2}px` }}>{s.emoji}</span>)}
          {overlays.text?.value && <span className="pointer-events-none absolute inset-x-4 -translate-y-1/2 text-center text-xl font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]" style={{ top: `${overlays.text.y * 100}%`, color: overlays.text.color }}>{overlays.text.value}</span>}
        </div>
        {kind === "image" && videoError && <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-xs text-red-100">{videoError}</div>}
        {kind === "video" && <div className="absolute inset-x-3 bottom-3 flex flex-col gap-1 rounded-xl bg-black/65 px-2 py-2 text-white backdrop-blur"><div className="flex items-center gap-2"><Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={togglePlay}>{playing ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}</Button><div className="flex-1 text-xs">{formatTime(currentTime)} / {formatTime(duration)}</div><Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={()=>{ const next=!muted; setMuted(next); if(videoRef.current) videoRef.current.muted=next; }}>{muted ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}</Button></div>{videoError && <div className="px-1 text-[11px] text-red-200">{videoError}</div>}</div>}
      </div>

      {kind === "video" ? (
        <Tabs defaultValue="cortar">
          <TabsList className="w-full">
            <TabsTrigger value="cortar" className="flex-1"><Scissors className="mr-1 h-3.5 w-3.5"/>Cortar</TabsTrigger>
            <TabsTrigger value="texto" className="flex-1"><Type className="mr-1 h-3.5 w-3.5"/>Texto</TabsTrigger>
            <TabsTrigger value="stickers" className="flex-1"><Smile className="mr-1 h-3.5 w-3.5"/>Figurinhas</TabsTrigger>
          </TabsList>
          <TabsContent value="cortar" className="space-y-4 pt-3">
            <div className="rounded-xl border p-3">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{t("media.start", "Início")} {formatTime(start)}</span><span>{t("media.end", "Fim")} {formatTime(end)}</span></div>
              <div className="relative h-10 rounded-lg bg-muted/70">
                <div className="absolute inset-y-0 rounded-lg bg-primary/20" style={{ left: `${duration ? (start/duration)*100 : 0}%`, right: `${duration ? 100-(end/duration)*100 : 0}%` }} />
                <input aria-label="Início do vídeo" type="range" min="0" max={Math.max(duration, 0.1)} step="0.1" value={start} onChange={(e)=>{const v=Math.min(Number(e.target.value),Math.max(0,end-0.1));setStart(v);seek(v)}} className="absolute inset-0 w-full accent-primary"/>
                <input aria-label="Fim do vídeo" type="range" min="0" max={Math.max(duration, 0.1)} step="0.1" value={end} onChange={(e)=>{const v=Math.max(Number(e.target.value),Math.min(duration,start+0.1));setEnd(v);}} className="absolute inset-0 w-full accent-primary"/>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Arraste os marcadores para definir o trecho que será publicado.</p>
            </div>
          </TabsContent>
          <TabsContent value="texto" className="space-y-3 pt-3">
            <Input placeholder="Escreva algo sobre o vídeo" maxLength={120} value={overlays.text?.value ?? ""} onChange={(e)=>setOverlays({...overlays,text:{value:e.target.value,color:overlays.text?.color ?? "#ffffff",y:overlays.text?.y ?? 0.5}})} />
            <div className="flex gap-2">{TEXT_COLORS.map((c)=><button key={c} type="button" aria-label={`Cor ${c}`} onClick={()=>setOverlays({...overlays,text:{value:overlays.text?.value ?? "",color:c,y:overlays.text?.y ?? 0.5}})} className={cn("h-7 w-7 rounded-full border-2",overlays.text?.color===c?"border-primary":"border-border")} style={{backgroundColor:c}}/>)}</div>
            <p className="text-xs text-muted-foreground">O texto é mostrado na prévia. A publicação preserva o vídeo original quando o recurso de composição não estiver disponível no navegador.</p>
          </TabsContent>
          <TabsContent value="stickers" className="space-y-3 pt-3"><div className="flex flex-wrap gap-2">{STICKER_CHOICES.map((emoji)=><button key={emoji} type="button" className="rounded-lg border border-border px-2 py-1 text-xl transition hover:border-primary" onClick={()=>setOverlays(o=>({...o,stickers:[...o.stickers,{id:`${emoji}-${Date.now()}`,emoji,x:0.25+Math.random()*0.5,y:0.25+Math.random()*0.5,size:90}].slice(0,8)}))}>{emoji}</button>)}</div>{overlays.stickers.length>0&&<Button size="sm" variant="outline" onClick={()=>setOverlays({...overlays,stickers:[]})}>Limpar figurinhas</Button>}</TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="filtros">
          <TabsList className="w-full"><TabsTrigger value="filtros" className="flex-1"><Sparkles className="mr-1 h-3.5 w-3.5"/>Filtros</TabsTrigger><TabsTrigger value="texto" className="flex-1"><Type className="mr-1 h-3.5 w-3.5"/>Texto</TabsTrigger><TabsTrigger value="stickers" className="flex-1"><Smile className="mr-1 h-3.5 w-3.5"/>Stickers</TabsTrigger></TabsList>
          <TabsContent value="filtros" className="space-y-4 pt-3"><div className="flex gap-2 overflow-x-auto pb-1">{FILTER_PRESETS.map((p)=><button key={p.key} type="button" onClick={()=>{setPreset(p.key);setFilter(p.state)}} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs transition",preset===p.key?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground hover:text-foreground")}>{p.label}</button>)}</div><FilterSlider label="Brilho" value={filter.brightness} min={50} max={160} onChange={(v)=>{setPreset("custom");setFilter({...filter,brightness:v})}}/><FilterSlider label="Contraste" value={filter.contrast} min={50} max={180} onChange={(v)=>{setPreset("custom");setFilter({...filter,contrast:v})}}/><FilterSlider label="Saturação" value={filter.saturation} min={0} max={200} onChange={(v)=>{setPreset("custom");setFilter({...filter,saturation:v})}}/><FilterSlider label="Desfoque" value={filter.blur} min={0} max={10} onChange={(v)=>{setPreset("custom");setFilter({...filter,blur:v})}}/></TabsContent>
          <TabsContent value="texto" className="space-y-3 pt-3"><Input placeholder="Escreva algo sobre a mídia" maxLength={120} value={overlays.text?.value ?? ""} onChange={(e)=>setOverlays({...overlays,text:{value:e.target.value,color:overlays.text?.color ?? "#ffffff",y:overlays.text?.y ?? 0.5}})} /><FilterSlider label="Posição vertical" value={Math.round((overlays.text?.y ?? 0.5)*100)} min={5} max={95} onChange={(v)=>setOverlays({...overlays,text:{value:overlays.text?.value ?? "",color:overlays.text?.color ?? "#ffffff",y:v/100}})}/></TabsContent>
          <TabsContent value="stickers" className="space-y-3 pt-3"><div className="flex flex-wrap gap-2">{STICKER_CHOICES.map((emoji)=><button key={emoji} type="button" className="rounded-lg border border-border px-2 py-1 text-xl transition hover:border-primary" onClick={()=>setOverlays(o=>({...o,stickers:[...o.stickers,{id:`${emoji}-${Date.now()}`,emoji,x:0.25+Math.random()*0.5,y:0.25+Math.random()*0.5,size:90}].slice(0,8)}))}>{emoji}</button>)}</div></TabsContent>
        </Tabs>
      )}

      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onCancel}>{t("common.cancel", "Cancelar")}</Button><Button onClick={handleDone} disabled={rendering || busy}>{(rendering || busy)&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{submitLabel}</Button></div>
    </div>
  );
}

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function FilterSlider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
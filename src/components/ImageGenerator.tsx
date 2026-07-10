import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, Wand2, Download, Copy, ImageIcon, Sparkles, Palette } from 'lucide-react'

interface ImageGeneratorProps {
  onBack: () => void
}

interface Style {
  id: string
  name: string
  description: string
  preview_url: string
}

const SIZES = [
  { value: '1536x1536', label: '1:1 Square' },
  { value: '2048x1152', label: '16:9 Landscape' },
  { value: '1152x2048', label: '9:16 Portrait' },
  { value: '2048x1536', label: '4:3 Landscape' },
  { value: '1536x2048', label: '3:4 Portrait' },
]

const PRESETS = [
  { label: 'Product Photo', prompt: 'Professional product photography on white background, studio lighting, high-end commercial, clean, minimal' },
  { label: 'Lifestyle Shot', prompt: 'Lifestyle photography, natural lighting, aspirational setting, editorial style, warm tones, candid' },
  { label: 'Fashion Editorial', prompt: 'High fashion editorial shoot, dramatic lighting, bold pose, designer clothing, magazine quality' },
  { label: 'Portrait', prompt: 'Beautiful portrait photograph, soft bokeh background, natural skin, professional headshot, flattering light' },
]

export default function ImageGenerator({ onBack }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [styleId, setStyleId] = useState('1cb4b936-77bf-4f9a-9039-f3d349a4cdbe')
  const [size, setSize] = useState('1536x1536')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<Array<{ prompt: string; url: string; style: string; timestamp: number }>>([])
  const [styles, setStyles] = useState<Style[]>([])
  const [loadingStyles, setLoadingStyles] = useState(true)
  const [showStyles, setShowStyles] = useState(false)

  const [provider, setProvider] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => {
    fetch('/api/higgsfield/styles')
      .then(r => r.json())
      .then(data => {
        if (data.styles) setStyles(data.styles)
      })
      .catch(() => {})
      .finally(() => setLoadingStyles(false))
  }, [])

  async function handleGenerate() {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/higgsfield/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style_id: styleId,
          width_and_height: size,
          quality: '720p',
          batch_size: 1,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`)
        return
      }

      const imageUrl = data.images?.[0]?.url
      if (imageUrl) {
        setResult(imageUrl)
        setHistory(prev => [{ prompt: prompt.trim(), url: imageUrl, style: styles.find(s => s.id === styleId)?.name ?? '', timestamp: Date.now() }, ...prev].slice(0, 20))
        setProvider(data.provider ?? 'higgsfield')
        setNote(data.note ?? '')
      } else {
        setError('No image was returned. The API may have returned an unexpected response.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const selectedStyle = styles.find(s => s.id === styleId)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-violet-400" />
            <h1 className="text-lg font-bold">Image Generator</h1>
          </div>
          <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded-full">AI Image Generator</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Style</label>
              <button
                onClick={() => setShowStyles(!showStyles)}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-all flex items-center gap-3"
              >
                {selectedStyle?.preview_url && (
                  <img src={selectedStyle.preview_url} alt="" className="w-10 h-10 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{selectedStyle?.name ?? 'Realistic'}</div>
                  {selectedStyle?.description && (
                    <p className="text-xs text-zinc-500 truncate">{selectedStyle.description}</p>
                  )}
                </div>
                <Palette size={14} className="text-zinc-500 shrink-0" />
              </button>

              {showStyles && (
                <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-2 space-y-1">
                  {loadingStyles ? (
                    <div className="flex items-center justify-center py-4 text-zinc-500">
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Loading styles...
                    </div>
                  ) : styles.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">No styles loaded</p>
                  ) : (
                    styles.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setStyleId(s.id); setShowStyles(false) }}
                        className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-all ${
                          styleId === s.id
                            ? 'bg-violet-500/20 border border-violet-500/30'
                            : 'hover:bg-zinc-800 border border-transparent'
                        }`}
                      >
                        {s.preview_url && (
                          <img src={s.preview_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{s.name}</div>
                          {s.description && (
                            <p className="text-[10px] text-zinc-500 truncate">{s.description}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Aspect Ratio</label>
              <div className="space-y-1.5">
                {SIZES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSize(s.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                      size === s.value
                        ? 'border-violet-500 bg-violet-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Quick Presets</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setPrompt(p.prompt)}
                    className="text-left p-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors text-xs"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none transition-colors"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-zinc-600">{prompt.length} characters</span>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm whitespace-pre-wrap">
                {error}
              </div>
            )}

            {result && (
              <>
              <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                <img src={result} alt={prompt} className="w-full" />
                <div className="p-3 flex items-center gap-2 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = result
                      a.download = `drivekit-${Date.now()}.png`
                      a.target = '_blank'
                      a.click()
                    }}
                    className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={12} />
                    Download
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(prompt)}
                    className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Copy size={12} />
                    Copy Prompt
                  </button>
                  {selectedStyle && provider !== 'together' && (
                    <span className="text-[10px] text-zinc-500 ml-auto">Style: {selectedStyle.name}</span>
                  )}
                </div>
              </div>
              {provider && note && provider !== 'together' && (
                <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-center gap-2">
                  <span className="font-medium">Preview</span>
                  <span className="text-amber-500/60">·</span>
                  <span className="truncate">{note}</span>
                  <a href="https://higgsfield.ai/generate/image/soul-v2" target="_blank" rel="noopener noreferrer" className="ml-auto underline text-amber-400/80 hover:text-amber-300 shrink-0">Generate real images →</a>
                </div>
              )}
              {provider === 'together' && (
                <div className="mt-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                  <span className="font-medium">✨ Generated by Together AI · FLUX.1-schnell</span>
                </div>
              )}
              </>
            )}

            {!result && !generating && !error && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <ImageIcon size={48} className="mb-4 opacity-50" />
                <p className="text-sm">Enter a prompt and click Generate to create an image</p>
                <p className="text-xs text-zinc-700 mt-1">Powered by Together AI FLUX.1-schnell · Free & instant</p>
              </div>
            )}

            {generating && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <Loader2 size={48} className="mb-4 animate-spin text-violet-400" />
                <p className="text-sm">Generating your image...</p>
                <p className="text-xs text-zinc-600 mt-1">This may take 15-60 seconds</p>
              </div>
            )}

            {history.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Generations</h3>
                <div className="grid grid-cols-4 gap-2">
                  {history.map((item, i) => (
                    <div
                      key={i}
                      className="group relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer"
                      onClick={() => { setPrompt(item.prompt); setResult(item.url) }}
                    >
                      <img src={item.url} alt="" className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <p className="text-[10px] text-white line-clamp-2">{item.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

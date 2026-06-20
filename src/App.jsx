import { useState, useRef, useEffect } from 'react'
import './App.css'

const formatOptions = {
  doc: ['PDF', 'DOCX', 'HTML', 'Markdown', 'TXT', 'PPTX', 'ODT', 'RTF', 'EPUB'],
  img: ['PNG', 'JPG', 'WebP', 'AVIF', 'SVG', 'PDF', 'BMP', 'TIFF'],
  vid: ['MP4', 'GIF', 'WebM', 'MP3', 'MOV', 'AVI', 'MKV', 'MPEG'],
  data: ['JSON', 'CSV', 'XLSX', 'Parquet', 'SQL', 'TSV', 'TSV', 'XML', 'YAML'],
  aud: ['MP3', 'WAV', 'FLAC', 'OGG', 'M4A', 'AAC', 'OPUS'],
}

const extMap = {
  pdf: 'doc', doc: 'doc', docx: 'doc', txt: 'doc', md: 'doc', html: 'doc', pptx: 'doc',
  png: 'img', jpg: 'img', jpeg: 'img', gif: 'img', webp: 'img', svg: 'img',
  mp4: 'vid', mov: 'vid', avi: 'vid', webm: 'vid', mpeg: 'vid', mpg: 'vid', mkv: 'vid', '3gp': 'vid',
  csv: 'data', json: 'data', xlsx: 'data', tsv: 'data',
  mp3: 'aud', wav: 'aud', flac: 'aud', ogg: 'aud', m4a: 'aud', aac: 'aud', opus: 'aud', wma: 'aud', aiff: 'aud',
}

const typeMeta = {
  doc: { label: 'DOC', bg: '#dbeafe', color: '#1d4ed8', icon: '📄' },
  img: { label: 'IMG', bg: '#dcfce7', color: '#15803d', icon: '🖼️' },
  vid: { label: 'VID', bg: '#fee2e2', color: '#b91c1c', icon: '🎬' },
  data: { label: 'DATA', bg: '#ffedd5', color: '#c2410c', icon: '📊' },
  aud: { label: 'AUD', bg: '#ede9fe', color: '#6d28d9', icon: '🎵' },
}

function getType(name) {
  const ext = name.split('.').pop().toLowerCase()
  return extMap[ext] || 'doc'
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export default function App() {
  const [files, setFiles] = useState([])
  const [converting, setConverting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [mode, setMode] = useState('convert')
  const inputRef = useRef()
  const [mergeResult, setMergeResult] = useState(null)
  const [pages, setPages] = useState([])
  const [loadingPages, setLoadingPages] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [presets, setPresets] = useState([
      { name: 'Web optimized', format: 'WebP', spec: 'compress to under 200KB, high quality' },
      { name: 'Print quality', format: 'PDF', spec: 'high resolution, 300 DPI' },
      { name: 'Email attachment', format: 'PDF', spec: 'compress to under 5MB' },
    ])
  const [showPresetInput, setShowPresetInput] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  //useEffect(() => {
  //    loadPages()
  //  }, [files.length, mode])

  function addFiles(newFiles) {
    const entries = Array.from(newFiles).map(f => ({
      id: Date.now() + Math.random(),
      file: f,
      status: 'pending',
      spec: '',
      format: f.name.split('.').pop().toUpperCase(),
      downloadUrl: null,
      outputName: null,
      analyzing: false,
      aiSettings: null,
      progress: 0,
    }))
    setFiles(prev => [...prev, ...entries])
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function updateSpec(id, val) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, spec: val } : f))
  }

  function updateFormat(id, val) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, format: val } : f))
  }

  function applyPreset(fileId, preset) {
    setFiles(prev => prev.map(f => f.id === fileId
      ? { ...f, format: preset.format, spec: preset.spec, aiSettings: null }
      : f
    ))
  }

  function savePreset(fileId) {
    const f = files.find(item => item.id === fileId)
    if (!f || !newPresetName.trim()) return
    setPresets(prev => [...prev, { name: newPresetName, format: f.format, spec: f.spec }])
    setNewPresetName('')
    setShowPresetInput(false)
  }

  function moveFile(index, direction) {
    setFiles(prev => {
      const arr = [...prev]
      const temp = arr[index]
      arr[index] = arr[index + direction]
      arr[index + direction] = temp
      return arr
    })
  }

  async function loadPages() {
      if (mode !== 'merge' || files.length === 0) {
        setPages([])
        return
      }
      setLoadingPages(true)
      try {
        const formData = new FormData()
        files.forEach(f => formData.append('files', f.file))
        const response = await fetch('https://convertr-backend.onrender.com/preview-pages', {
          method: 'POST',
          body: formData,
        })
        const data = await response.json()
        if (data.pages) {
          const pagesWithThumbs = data.pages.map((p, idx) => ({
            ...p,
            id: `${p.filename}-${p.page_num}-${idx}`,
            file: files.find(f => f.file.name === p.filename)?.file,
            thumbUrl: null,
          }))
          setPages(pagesWithThumbs)
          pagesWithThumbs.forEach(p => loadThumbnail(p))
        }
      } catch (err) {
        console.error('Failed to load pages:', err)
      }
      setLoadingPages(false)
    }

    async function loadThumbnail(page) {
      try {
        const formData = new FormData()
        formData.append('file', page.file)
        formData.append('page_num', page.page_num)
        const response = await fetch('https://convertr-backend.onrender.com/page-thumbnail', {
          method: 'POST',
          body: formData,
        })
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        setPages(prev => prev.map(p => p.id === page.id ? { ...p, thumbUrl: url } : p))
      } catch (err) {
        console.error('Thumbnail failed:', err)
      }
    }

    function deletePage(id) {
      setPages(prev => prev.filter(p => p.id !== id))
    }

    function movePage(index, direction) {
      setPages(prev => {
        const arr = [...prev]
        const temp = arr[index]
        arr[index] = arr[index + direction]
        arr[index + direction] = temp
        return arr
      })
    }

  async function startMerge() {
    if (files.length < 2 || converting) return
    setConverting(true)
    setMergeResult(null)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f.file))
      formData.append('page_order', '')
      const response = await fetch('https://convertr-backend.onrender.com/merge', {
        method: 'POST',
        body: formData,
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setMergeResult({ url, size: blob.size })
    } catch (err) {
      console.error('Merge failed:', err)
    }
    setConverting(false)
  }

  async function analyzeSpec(id) {
    const f = files.find(item => item.id === id)
    if (!f || !f.spec.trim()) return

    setFiles(prev => prev.map(item => item.id === id ? { ...item, analyzing: true } : item))

    try {
      const formData = new FormData()
      formData.append('filename', f.file.name)
      formData.append('target_format', f.format)
      formData.append('spec', f.spec)
      formData.append('filesize', f.file.size)

      const response = await fetch('https://convertr-backend.onrender.com/analyze-spec', {
        method: 'POST',
        body: formData,
      })

      const settings = await response.json()
      setFiles(prev => prev.map(item => item.id === id ? { ...item, analyzing: false, aiSettings: settings } : item))
    } catch (err) {
      setFiles(prev => prev.map(item => item.id === id ? { ...item, analyzing: false } : item))
    }
  }
  
  async function startConversion() {
    if (files.length === 0 || converting) return
    setConverting(true)

    await fetch('https://convertr-backend.onrender.com').catch(() => {})
    await new Promise(r => setTimeout(r, 3000))

    for (let i = 0; i < files.length; i++) {
          const f = files[i]
          setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'converting', progress: 5 } : item))

          const progressInterval = setInterval(() => {
            setFiles(prev => prev.map((item, idx) => {
              if (idx === i && item.progress < 90) {
                return { ...item, progress: item.progress + Math.random() * 15 }
              }
              return item
            }))
          }, 400)

      try {
        const formData = new FormData()
        formData.append('file', f.file)
        formData.append('target_format', f.format)
        formData.append('spec', f.spec)
        formData.append('ai_quality', f.aiSettings?.quality || '')
        formData.append('ai_width', f.aiSettings?.width || '')
        formData.append('ai_height', f.aiSettings?.height || '')
        formData.append('ai_max_size_kb', f.aiSettings?.max_size_kb || '')
        formData.append('ai_grayscale', f.aiSettings?.grayscale || false)

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 120000)
        const response = await fetch('https://convertr-backend.onrender.com/convert', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
        clearTimeout(timeout)

        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const baseName = f.file.name.includes('.')
          ? f.file.name.substring(0, f.file.name.lastIndexOf('.'))
          : f.file.name
        const outputName = baseName + '.' + f.format.toLowerCase()
        const convertedSize = blob.size

        clearInterval(progressInterval)
                setFiles(prev => prev.map((item, idx) => idx === i
                  ? { ...item, status: 'done', downloadUrl, outputName, convertedSize, progress: 100 }
                  : item
                ))
              } catch (err) {
                clearInterval(progressInterval)
                setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', progress: 0 } : item))
              }
            }

    setConverting(false)
  }

  const done = files.filter(f => f.status === 'done').length
  const pct = files.length > 0 ? Math.round((done / files.length) * 100) : 0

  return (
    <div className={`app ${theme}`}>
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="container">
        <header className="header">
          <div className="header-left">
            <div className="logo-mark">C</div>
            <span className="logo-text">Convertr</span>
            <span className="logo-suffix">.app</span>
          </div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <span className="beta-pill">beta</span>
          </div>
        </header>

        <div className="hero">
          <h1 className="hero-title">
            Convert <span className="gradient-text">anything</span><br />
            to anything
          </h1>
          <p className="hero-sub">
            Drop your files, describe what you want in plain English,<br />
            and let AI handle the rest.
          </p>
        </div>

        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'convert' ? 'active' : ''}`}
            onClick={() => { setMode('convert'); setFiles([]) }}
          >
            ⚡ Convert
          </button>
          <button
            className={`mode-btn ${mode === 'merge' ? 'active' : ''}`}
            onClick={() => { setMode('merge'); setFiles([]) }}
          >
            ⊞ Merge
          </button>
        </div>
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current.click()}
        >
          <div className="drop-inner">
            <div className="drop-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="drop-label">Drop files here or <span className="drop-link">browse</span></p>
            <p className="drop-sub">PDF · DOCX · MP4 · PNG · CSV · MP3 · and 100+ more</p>
            <div className="type-pills">
              {['Documents', 'Images', 'Video', 'Audio', 'Data'].map(t => (
                <span key={t} className="type-pill">{t}</span>
              ))}
            </div>
          </div>
          <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => addFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div className="queue-wrap">
            <div className="queue-title-row">
              <p className="queue-title">{mode === 'convert' ? 'Conversion queue' : 'Merge queue'}</p>
              <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                <span className="queue-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                <button className="clear-btn" onClick={() => setFiles([])} disabled={converting}>
                  Clear all
                </button>
              </div>
            </div>

            <div className="queue-list">
              {files.map(f => {
                const type = getType(f.file.name)
                const meta = typeMeta[type]
                const opts = formatOptions[type]
                return (
                  <div className={`queue-card ${f.status}`} key={f.id}>
                    <div className="file-badge" style={{ background: meta.bg, color: meta.color }}>
                      <span className="file-badge-icon">{meta.icon}</span>
                      <span className="file-badge-label">{meta.label}</span>
                    </div>
                    <div className="file-info">
                      <p className="file-name">{f.file.name}</p>
                      <p className="file-meta">{fmtSize(f.file.size)}</p>
                    </div>
                    {mode === 'convert' ? (
                                          <div className="file-controls">
                                            <select
                                              className="format-select"
                                              value={f.format}
                                              disabled={converting}
                                              onChange={e => updateFormat(f.id, e.target.value)}
                                            >
                                              {opts.map(o => <option key={o}>{o}</option>)}
                                            </select>

                                            <div className="preset-chips">
                          {presets.map((p, idx) => (
                            <button
                              key={idx}
                              className="preset-chip"
                              onClick={() => applyPreset(f.id, p)}
                              disabled={converting}
                            >
                              {p.name}
                            </button>
                          ))}
                          <button
                            className="preset-chip save"
                            onClick={() => setShowPresetInput(f.id)}
                            disabled={converting}
                          >
                            + Save current
                          </button>
                        </div>
                        {showPresetInput === f.id && (
                          <div className="preset-save-row">
                            <input
                              className="preset-name-input"
                              placeholder="Preset name"
                              value={newPresetName}
                              onChange={e => setNewPresetName(e.target.value)}
                            />
                            <button className="preset-confirm-btn" onClick={() => savePreset(f.id)}>Save</button>
                          </div>
                        )}
                        <div className="spec-row">
                          <input
                            className="spec-input"
                            placeholder='AI spec: "compress to 500KB", "make 1080p"'
                            value={f.spec}
                            disabled={converting}
                            onChange={e => updateSpec(f.id, e.target.value)}
                          />
                          <button
                            className="analyze-btn"
                            onClick={() => analyzeSpec(f.id)}
                            disabled={converting || !f.spec.trim() || f.analyzing}
                          >
                            {f.analyzing ? '...' : '✦ AI'}
                          </button>
                        </div>
                        
                                          
                                            {f.aiSettings && !f.aiSettings.error && (
                                              <div className="ai-preview">
                                                <p className="ai-preview-title">✦ AI will apply:</p>
                                                <div className="ai-tags">
                                                  {f.aiSettings.quality > 0 && <span className="ai-tag">Quality: {f.aiSettings.quality}%</span>}
                                                  {f.aiSettings.width && f.aiSettings.height && <span className="ai-tag">{f.aiSettings.width}×{f.aiSettings.height}px</span>}
                                                  {f.aiSettings.max_size_kb && <span className="ai-tag">Max: {f.aiSettings.max_size_kb}KB</span>}
                                                  {f.aiSettings.dpi && <span className="ai-tag">DPI: {f.aiSettings.dpi}</span>}
                                                  {f.aiSettings.grayscale && <span className="ai-tag">Grayscale</span>}
                                                  {f.aiSettings.summary && <span className="ai-tag ai-summary">{f.aiSettings.summary}</span>}
                                                </div>
                                              </div>
                                            )}
                                            {f.aiSettings?.error && (
                                              <p className="ai-error">{f.aiSettings.error}</p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="merge-order">
                                            <button className="arrow-btn" onClick={() => moveFile(files.indexOf(f), -1)} disabled={files.indexOf(f) === 0}>↑</button>
                                            <span className="merge-num">#{files.indexOf(f) + 1}</span>
                                            <button className="arrow-btn" onClick={() => moveFile(files.indexOf(f), 1)} disabled={files.indexOf(f) === files.length - 1}>↓</button>
                                          </div>
                                        )}
                                        
                    <div className="file-right">
                      <div className={`status-badge ${f.status}`}>
                        {f.status === 'pending' && '○ Pending'}
                        {f.status === 'converting' && `◌ ${Math.round(f.progress)}%`}
                        {f.status === 'done' && '✓ Done'}
                        {f.status === 'error' && '✕ Error'}
                      </div>
                      {f.status === 'converting' && (
                        <div className="file-progress-track">
                          <div className="file-progress-fill" style={{ width: `${f.progress}%` }} />
                        </div>
                      )}
                      {f.status === 'done' && f.downloadUrl && (
                        
                          <a className="download-btn"
                          href={f.downloadUrl}
                          download={f.outputName}
                        >
                          ↓ Download {f.convertedSize ? `(${fmtSize(f.convertedSize)})` : ''}
                        </a>
                      )}
                      <button className="remove-btn" onClick={() => removeFile(f.id)} disabled={converting}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/*{mode === 'merge' && pages.length > 0 && (
              <div className="page-grid-section">
                <p className="section-label">Pages ({pages.length}) — use arrows to reorder, click ✕ to remove</p>
                <div className="page-grid">
                  {pages.map((p, idx) => (
                    <div className="page-thumb" key={p.id}>
                      <div className="page-thumb-img">
                        {p.thumbUrl ? (
                          <img src={p.thumbUrl} alt={`Page ${idx + 1}`} />
                        ) : (
                          <div className="page-thumb-loading">...</div>
                        )}
                      </div>
                      <div className="page-thumb-footer">
                        <span className="page-num-badge">{idx + 1}</span>
                        <div className="page-thumb-actions">
                          <button className="page-mini-btn" onClick={() => movePage(idx, -1)} disabled={idx === 0}>←</button>
                          <button className="page-mini-btn" onClick={() => movePage(idx, 1)} disabled={idx === pages.length - 1}>→</button>
                          <button className="page-mini-btn delete" onClick={() => deletePage(p.id)}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}*/}

            <div className="bottom-row">
              {mode === 'convert' ? (
                <button className="convert-btn" onClick={startConversion} disabled={converting || files.length === 0}>
                  {converting
                    ? <><span className="spin">◌</span> Converting…</>
                    : <><span>⚡</span> Convert all</>}
                </button>
              ) : (
                <>
                  <button className="convert-btn" onClick={startMerge} disabled={converting || files.length < 2}>
                    {converting
                      ? <><span className="spin">◌</span> Merging…</>
                      : <><span>⊞</span> Merge into PDF</>}
                  </button>
                  {mergeResult && (
                    <a className="download-btn" href={mergeResult.url} download="merged.pdf">
                      ↓ Download ({fmtSize(mergeResult.size)})
                    </a>
                  )}
                </>
              )}

              <div className="stats">
                <div className="stat">
                  <span className="stat-num">{files.length}</span>
                  <span className="stat-lbl">queued</span>
                </div>
                <div className="stat-divider" />
                <div className="stat">
                  <span className="stat-num">{done}</span>
                  <span className="stat-lbl">done</span>
                </div>
                <div className="stat-divider" />
                <div className="stat">
                  <span className="stat-num">{pct}%</span>
                  <span className="stat-lbl">progress</span>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="progress-track">
                <div className="progress-fill" style={{ width: pct + '%' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
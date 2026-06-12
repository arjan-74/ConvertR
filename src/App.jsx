import { useState, useRef } from 'react'
import './App.css'

const formatOptions = {
  doc: ['PDF', 'DOCX', 'HTML', 'Markdown', 'TXT', 'PPTX'],
  img: ['PNG', 'JPG', 'WebP', 'AVIF', 'SVG', 'PDF'],
  vid: ['MP4', 'GIF', 'WebM', 'MP3', 'MOV'],
  data: ['JSON', 'CSV', 'XLSX', 'Parquet', 'SQL', 'TSV'],
  aud: ['MP3', 'WAV', 'FLAC', 'OGG', 'M4A'],
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
  const inputRef = useRef()

  function addFiles(newFiles) {
    const entries = Array.from(newFiles).map(f => ({
      id: Date.now() + Math.random(),
      file: f,
      status: 'pending',
      spec: '',
      format: formatOptions[getType(f.name)].filter(
        opt => opt.toLowerCase() !== f.name.split('.').pop().toLowerCase()
      )[0] || formatOptions[getType(f.name)][0],
      downloadUrl: null,
      outputName: null,
      analyzing: false,
      aiSettings: null,
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
      setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'converting' } : item))

      try {
        const formData = new FormData()
        formData.append('file', f.file)
        formData.append('target_format', f.format)
        formData.append('spec', f.spec)

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

        setFiles(prev => prev.map((item, idx) => idx === i
          ? { ...item, status: 'done', downloadUrl, outputName }
          : item
        ))
      } catch (err) {
        setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item))
      }
    }

    setConverting(false)
  }

  const done = files.filter(f => f.status === 'done').length
  const pct = files.length > 0 ? Math.round((done / files.length) * 100) : 0

  return (
    <div className="app">
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
          <span className="beta-pill">beta</span>
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
              <p className="queue-title">Conversion queue</p>
              <span className="queue-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
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
                    <div className="file-controls">
                      <select
                        className="format-select"
                        value={f.format}
                        disabled={converting}
                        onChange={e => updateFormat(f.id, e.target.value)}
                      >
                        {opts
                          .filter(o => o.toLowerCase() !== f.file.name.split('.').pop().toLowerCase())
                          .map(o => <option key={o}>{o}</option>)}
                      </select>
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
                            {f.aiSettings.quality && <span className="ai-tag">Quality: {f.aiSettings.quality}%</span>}
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
                    <div className="file-right">
                      <div className={`status-badge ${f.status}`}>
                        {f.status === 'pending' && '○ Pending'}
                        {f.status === 'converting' && '◌ Converting'}
                        {f.status === 'done' && '✓ Done'}
                        {f.status === 'error' && '✕ Error'}
                      </div>
                      {f.status === 'done' && f.downloadUrl && (
                        
                          <a className="download-btn"
                          href={f.downloadUrl}
                          download={f.outputName}
                        >
                          ↓ Download
                        </a>
                      )}
                      <button className="remove-btn" onClick={() => removeFile(f.id)} disabled={converting}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bottom-row">
              <button className="convert-btn" onClick={startConversion} disabled={converting || files.length === 0}>
                {converting
                  ? <><span className="spin">◌</span> Converting…</>
                  : <><span>⚡</span> Convert all</>}
              </button>

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
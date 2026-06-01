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
  mp4: 'vid', mov: 'vid', avi: 'vid', webm: 'vid',
  csv: 'data', json: 'data', xlsx: 'data', tsv: 'data',
  mp3: 'aud', wav: 'aud', flac: 'aud', ogg: 'aud', m4a: 'aud',
}

const typeLabels = { doc: 'DOC', img: 'IMG', vid: 'VID', data: 'DATA', aud: 'AUD' }
const typeColors = { doc: '#1a6fc4', img: '#2e7d32', vid: '#c62828', data: '#e65100', aud: '#4527a0' }
const typeBg = { doc: '#e3f0fb', img: '#e8f5e9', vid: '#fdecea', data: '#fff3e0', aud: '#ede7f6' }

function getType(name) {
  const ext = name.split('.').pop().toLowerCase()
  return extMap[ext] || 'doc'
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function App() {
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
    }))
    setFiles(prev => [...prev, ...entries])
  }

  function removeFile(id) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function updateSpec(id, val) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, spec: val } : f))
  }

  async function startConversion() {
    if (files.length === 0 || converting) return
    setConverting(true)
    for (let i = 0; i < files.length; i++) {
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'converting' } : f))
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 600))
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f))
    }
    setConverting(false)
  }

  const done = files.filter(f => f.status === 'done').length
  const pct = files.length > 0 ? Math.round((done / files.length) * 100) : 0

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">Convertr<span className="logo-dot">.app</span></span>
        <span className="beta-badge">beta</span>
      </header>

      {/* Drop Zone */}
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
      >
        <div className="drop-icon">⬆</div>
        <p className="drop-label">Drop any files here</p>
        <p className="drop-sub">PDF, DOCX, MP4, PNG, CSV, MP3 and 100+ more</p>
        <button className="browse-btn" onClick={() => inputRef.current.click()}>
          Browse files
        </button>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)} />
      </div>

      {/* Queue */}
      {files.length > 0 && (
        <div className="queue-section">
          <p className="section-label">Conversion queue</p>

          <div className="queue-header-row">
            <span></span>
            <span className="col-label">File</span>
            <span className="col-label">Target format</span>
            <span className="col-label">AI spec</span>
            <span></span>
          </div>

          {files.map(f => {
            const type = getType(f.file.name)
            const opts = formatOptions[type] || formatOptions.doc
            return (
              <div className="queue-item" key={f.id}>
                <div className="file-icon" style={{ background: typeBg[type], color: typeColors[type] }}>
                  {typeLabels[type]}
                </div>
                <div className="file-info">
                  <p className="file-name">{f.file.name}</p>
                  <p className="file-meta">
                    {fmtSize(f.file.size)} &nbsp;·&nbsp;
                    <span className={`status-dot ${f.status}`}></span>
                    {f.status === 'converting' ? 'converting…' : f.status}
                  </p>
                </div>
                <select className="format-select" disabled={converting}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
                <input
                  className="spec-input"
                  placeholder='e.g. "compress for web"'
                  value={f.spec}
                  disabled={converting}
                  onChange={e => updateSpec(f.id, e.target.value)}
                />
                <button className="remove-btn" onClick={() => removeFile(f.id)} disabled={converting}>✕</button>
              </div>
            )
          })}

          {/* Actions */}
          <div className="action-row">
            <button className="convert-btn" onClick={startConversion} disabled={converting}>
              {converting ? 'Converting…' : '⚡ Convert all'}
            </button>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <p className="stat-label">Files queued</p>
              <p className="stat-value">{files.length}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Converted</p>
              <p className="stat-value">{done}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Progress</p>
              <p className="stat-value">{pct}%</p>
              <div className="progress-wrap">
                <div className="progress-bar" style={{ width: pct + '%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
import React, { useEffect, useRef, useState } from "react";
import {
  ScanFace, ShieldCheck, Gauge, PlugZap, Menu, X, UploadCloud,
  Image as ImageIcon, LayoutDashboard, Clock3, Settings, LogOut,
  ArrowRight, ArrowLeft, FileImage, Trash2, Download, CheckCircle2,
  AlertCircle, Users, Activity, Sparkles, ChevronRight, LockKeyhole
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const MAX_SIZE = 15 * 1024 * 1024;
const allowed = ["image/jpeg", "image/png", "image/webp"];


// Vercel limits request bodies to ~4.5 MB, so shrink large images in the browser first.
const UPLOAD_LIMIT = 3.5 * 1024 * 1024;
async function prepareUpload(file) {
  if (file.size <= UPLOAD_LIMIT) return file;
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85));
    if (blob && blob.size <= UPLOAD_LIMIT) return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    scale *= 0.7;
  }
  throw new Error("Could not shrink this image enough to upload. Try a smaller image.");
}

function Brand({ light = false }) {
  return <div className={`brand ${light ? "brand-light" : ""}`}>
    <span className="brand-mark"><ScanFace size={27} strokeWidth={2.5}/></span>
    <span>FaceRec</span>
  </div>;
}

function Landing({ onStart }) {
  return <div className="landing">
    <header className="landing-header wrap">
      <Brand />
      <nav><a href="#features">Key Features</a><a href="#about">About</a><button className="nav-cta" onClick={onStart}>Launch App <ArrowRight size={16}/></button></nav>
    </header>
    <main>
      <section className="hero wrap" id="about">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse-dot"/> AI-POWERED FACE DETECTION</div>
          <h1>Secure Your World with <span>Advanced Facial Recognition</span></h1>
          <p>FaceRec delivers fast, accurate, and scalable biometric technology for face detection, visual analysis, and access-control workflows.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={onStart}>Start Face Detection <ArrowRight size={18}/></button>
            <a className="secondary-btn" href="#features">Explore Features</a>
          </div>
          <div className="hero-proof"><ShieldCheck size={17}/> Image-based analysis <span/> Private by design</div>
        </div>
        <div className="hero-visual">
          <div className="blue-tile"></div>
          <div className="mock-laptop">
            <div className="mock-screen">
              <div className="mock-top"><Brand/><span className="mock-status">● System ready</span></div>
              <div className="mock-work">
                <div className="mock-sidebar"><b>Workspace</b><span>Overview</span><span>Face Detection</span><span>History</span><span>Settings</span></div>
                <div className="mock-photo">
                  <div className="face-outline"></div>
                  <div className="scan-line"></div>
                  <div className="mock-tag">Face detected<br/><b>Confidence: 98.6%</b></div>
                </div>
              </div>
            </div>
            <div className="laptop-base"></div>
          </div>
          <div className="floating-card"><span className="success-icon"><CheckCircle2 size={19}/></span><div><b>Detection ready</b><small>AI analysis workspace</small></div></div>
        </div>
      </section>
      <section className="features-section" id="features">
        <div className="wrap"><div className="section-heading"><span>WHY FACEREC</span><h2>Key Features</h2><p>Powerful tools designed for clear, reliable image analysis.</p></div>
          <div className="feature-grid">
            <Feature icon={<Gauge/>} title="High Accuracy" text="AI-powered face detection designed for precise results across varied images."/>
            <Feature icon={<Activity/>} title="Fast Processing" text="Upload an image and receive detection results from your connected model."/>
            <Feature icon={<PlugZap/>} title="Seamless Integration" text="Connect your deployed model through a secure API integration."/>
            <Feature icon={<LockKeyhole/>} title="Scalable & Secure" text="A clean workspace with controlled image handling and local history."/>
          </div>
        </div>
      </section>
      <section className="bottom-cta wrap"><div><h2>Ready to detect faces?</h2><p>Open the workspace and upload an image to get started.</p></div><button className="primary-btn" onClick={onStart}>Open FaceRec <ArrowRight size={18}/></button></section>
    </main>
    <footer className="landing-footer"><div className="wrap"><Brand/><span>© {new Date().getFullYear()} FaceRec. Face detection workspace.</span></div></footer>
  </div>;
}

function Feature({icon,title,text}) {
  return <article className="feature-card"><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{text}</p></article>;
}

function App({ onExit }) {
  const [page, setPage] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => { try { const h = JSON.parse(localStorage.getItem("facerec-history") || "[]"); return Array.isArray(h) ? h : []; } catch { return []; } });
  const [backend, setBackend] = useState("checking");
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/health`).then(r => r.json()).then(d => { if (alive) setBackend(d.model_configured ? "ready" : "nokey"); }).catch(() => { if (alive) setBackend("offline"); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem("facerec-history", JSON.stringify(history.slice(0, 30))); } catch { /* storage unavailable */ }
  }, [history]);

  function chooseImage(next) {
    setError(""); setResult(null);
    if (!next) return;
    if (!allowed.includes(next.type)) return setError("Please choose a JPG, PNG, or WEBP image.");
    if (next.size > MAX_SIZE) return setError("The image is larger than 15 MB. Choose a smaller image.");
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setPage("detect");
  }
  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(""); setResult(null); setError("");
    if (inputRef.current) inputRef.current.value = "";
  }
  async function runDetection() {
    if (!file) return setError("Upload an image before starting detection.");
    setBusy(true); setError(""); setResult(null);
    try {
      const body = new FormData(); body.append("file", await prepareUpload(file));
      const response = await fetch(`${API_BASE}/api/detect`, { method: "POST", body });
      let data = {};
      try { data = await response.json(); } catch { /* non-JSON error body */ }
      if (!response.ok) throw new Error(data.error || `Detection service returned HTTP ${response.status}.`);
      const detections = data.detections ?? data.faces ?? [];
      const normalized = {
        count: data.face_count ?? data.count ?? detections.length,
        detections,
        width: data.image_width ?? null,
        height: data.image_height ?? null,
        annotatedImage: data.annotated_image ?? data.image_url ?? null
      };
      setResult(normalized);
      const record = { id: Date.now(), name: file.name, date: new Date().toLocaleString(), count: normalized.count };
      setHistory(old => [record, ...old].slice(0, 30));
      setPage("results");
    } catch (e) {
      const offline = e instanceof TypeError;
      setError(offline ? "Cannot reach the backend. Make sure the server is running (npm run server)." : e.message);
    } finally { setBusy(false); }
  }

  const navItems = [
    ["overview","Overview",LayoutDashboard],["detect","Face Detection",ScanFace],
    ["history","History",Clock3],["settings","Settings",Settings]
  ];
  function navigate(next) { setPage(next); setMobileOpen(false); setError(""); }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><Brand/><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">{navItems.map(([id,label,Icon])=><button key={id} className={page===id ? "active":""} onClick={()=>navigate(id)}><Icon size={19}/>{label}{id==="detect"&&<span className="nav-arrow"><ChevronRight size={16}/></span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="secure-note"><ShieldCheck size={19}/><div><b>Secure workspace</b><small>Images are handled securely.</small></div></div><button className="exit-btn" onClick={onExit}><LogOut size={18}/> Exit workspace</button></div>
    </aside>
    {mobileOpen && <div className="scrim" onClick={()=>setMobileOpen(false)} />}
    <main className="main-area">
      <header className="app-topbar"><button className="hamburger" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="crumb">FaceRec <span>/</span> {navItems.find(x=>x[0]===page)?.[1] || "Results"}</div><div className="topbar-right"><span className="online-dot"/> Model connection <b className={backend==="ready"?"connected":"disconnected"}>{backend==="ready"?"Connected":backend==="checking"?"Checking...":backend==="nokey"?"API key missing":"Backend offline"}</b></div></header>
      <div className="page-content">
        {page==="overview" && <Overview onDetect={()=>navigate("detect")} onHistory={()=>navigate("history")} history={history}/>}
        {page==="detect" && <Detection file={file} preview={preview} inputRef={inputRef} chooseImage={chooseImage} clearImage={clearImage} dragging={dragging} setDragging={setDragging} runDetection={runDetection} busy={busy} error={error} result={result} onResults={()=>navigate("results")}/>}
        {page==="results" && <Results result={result} file={file} preview={preview} onNew={()=>{clearImage();navigate("detect")}} error={error}/>}
        {page==="history" && <History history={history} onClear={()=>setHistory([])}/>}
        {page==="settings" && <SettingsPage backend={backend}/>}
      </div>
    </main>
  </div>;
}

function PageTitle({eyebrow,title,description,action}) {
  return <div className="page-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function Overview({onDetect,onHistory,history}) {
  return <><PageTitle eyebrow="WORKSPACE OVERVIEW" title="Welcome to FaceRec" description="Your AI-powered image face detection workspace." action={<button className="primary-btn" onClick={onDetect}><ScanFace size={18}/> Start Detection</button>}/>
    <div className="welcome-banner"><div><span className="banner-kicker">FACEREC AI WORKSPACE</span><h2>Turn images into insights.</h2><p>Upload a photo, run your face-detection model, and review the results in one place.</p><button className="white-btn" onClick={onDetect}>Analyze an image <ArrowRight size={17}/></button></div><div className="banner-art"><ScanFace size={116} strokeWidth={1.1}/><span className="orbit orbit-one"/><span className="orbit orbit-two"/></div></div>
    <div className="stats-grid"><Stat icon={<ImageIcon/>} label="Analysis type" value="Images only"/><Stat icon={<ShieldCheck/>} label="Workspace" value="Private"/><Stat icon={<Clock3/>} label="Recent analyses" value={history.length}/></div>
    <div className="panel recent-panel"><div className="panel-heading"><div><h3>Recent activity</h3><p>Your latest image detection runs.</p></div>{onHistory&&<button className="text-btn" onClick={onHistory}>View all</button>}</div>
      {history.length ? <div className="history-list">{history.slice(0,4).map(item=><div className="history-row" key={item.id}><span className="file-icon"><FileImage/></span><div className="history-name"><b>{item.name}</b><small>{item.date}</small></div><span className="result-pill">{item.count} faces</span></div>)}</div> : <div className="empty-inline"><ImageIcon/><span>No analyses yet. Upload an image to begin.</span></div>}
    </div>
  </>;
}
function Stat({icon,label,value}) { return <div className="stat-card"><span>{icon}</span><div><small>{label}</small><b>{value}</b></div></div>; }

function Detection({file,preview,inputRef,chooseImage,clearImage,dragging,setDragging,runDetection,busy,error,result,onResults}) {
  return <><PageTitle eyebrow="IMAGE ANALYSIS" title="Face Detection" description="Upload a JPG, PNG, or WEBP image to detect faces."/>
    <div className="detect-layout"><section className="panel upload-panel"><div className="panel-heading"><div><h3>Upload an image</h3><p>Select a clear image for best results.</p></div><span className="step-label">STEP 01</span></div>
      {!file ? <div className={`dropzone ${dragging?"dragging":""}`} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);chooseImage(e.dataTransfer.files?.[0])}} onClick={()=>inputRef.current?.click()}>
        <input ref={inputRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e=>chooseImage(e.target.files?.[0])}/>
        <div className="upload-icon"><UploadCloud size={30}/></div><h3>Drag and drop your image here</h3><p>or click to browse files</p><span className="file-rules">JPG, PNG or WEBP · Maximum 15 MB</span>
      </div> : <div className="preview-box"><img src={preview} alt="Selected upload"/><div className="preview-meta"><div><b>{file.name}</b><small>{(file.size/1024/1024).toFixed(2)} MB</small></div><button className="icon-btn danger" onClick={clearImage} aria-label="Remove image"><Trash2 size={18}/></button></div></div>}
      {error && <div className="error-box"><AlertCircle size={18}/>{error}</div>}
      <div className="upload-actions"><button className="primary-btn" disabled={!file||busy} onClick={runDetection}>{busy?<><span className="spinner"/> Processing...</>:<>Run Face Detection <ArrowRight size={17}/></>}</button>{file&&<button className="secondary-btn" onClick={clearImage}>Remove image</button>}</div>
    </section>
    <aside className="panel tips-panel"><div className="tips-icon"><Sparkles/></div><h3>Tips for better results</h3><ul><li>Use a clear, well-lit image.</li><li>Make sure faces are not heavily obscured.</li><li>Images can contain one or multiple people.</li><li>Supported formats: JPG, PNG and WEBP.</li></ul><div className="privacy-callout"><LockKeyhole size={17}/><span>Your image is sent only to the configured detection service when you run analysis.</span></div></aside></div>
    {result && <div className="panel result-preview"><h3>Detection completed</h3><p>Detected {result.count} face(s).</p><button className="primary-btn" onClick={onResults}>View results <ArrowRight size={17}/></button></div>}
  </>;
}

function BoxedImage({src,detections,width,height}) {
  const [nat,setNat]=useState({w:width,h:height});
  const w=width||nat.w, h=height||nat.h;
  return <div className="boxed" style={{position:"relative",display:"inline-block",maxWidth:"100%"}}>
    <img src={src} alt="Uploaded image with detected faces" style={{display:"block",maxWidth:"100%",height:"auto"}} onLoad={e=>setNat({w:e.target.naturalWidth,h:e.target.naturalHeight})}/>
    {w&&h&&detections.map((d,i)=>{
      if([d.x1,d.y1,d.x2,d.y2].some(v=>typeof v!=="number")) return null;
      return <div key={i} style={{position:"absolute",left:`${d.x1/w*100}%`,top:`${d.y1/h*100}%`,width:`${(d.x2-d.x1)/w*100}%`,height:`${(d.y2-d.y1)/h*100}%`,border:"3px solid #22c55e",borderRadius:4,boxShadow:"0 0 0 1px #0006",pointerEvents:"none"}}>
        <span style={{position:"absolute",top:-22,left:-3,background:"#22c55e",color:"#fff",fontSize:12,fontWeight:800,padding:"1px 6px",borderRadius:4,whiteSpace:"nowrap"}}>{i+1}{typeof d.confidence==="number"?` · ${(d.confidence*100).toFixed(0)}%`:""}</span>
      </div>;
    })}
  </div>;
}

function Results({result,file,preview,onNew,error}) {
  if (!result) return <><PageTitle eyebrow="ANALYSIS OUTPUT" title="Detection Results" description="Your model output will appear here after an image has been processed."/><div className="panel empty-state"><ScanFace size={42}/><h3>No detection results yet</h3><p>Go to Face Detection, upload an image, and run the connected model.</p><button className="primary-btn" onClick={onNew}>Start a detection <ArrowRight size={17}/></button></div>{error&&<div className="error-box">{error}</div>}</>;
  return <><PageTitle eyebrow="ANALYSIS OUTPUT" title="Detection Results" description="Review the output returned by your connected face-detection model." action={<button className="primary-btn" onClick={onNew}>New detection <ArrowRight size={17}/></button>}/>
    <div className="result-stats"><div className="result-stat"><Users/><small>Faces detected</small><b>{result.count}</b></div><div className="result-stat"><CheckCircle2/><small>Analysis status</small><b>Completed</b></div><div className="result-stat"><FileImage/><small>Source image</small><b>{file?.name || "Uploaded image"}</b></div></div>
    <div className="panel output-panel"><div className="panel-heading"><div><h3>Processed image</h3><p>Annotated output from the model, when provided by the API.</p></div>{result.annotatedImage&&<a className="download-btn" href={result.annotatedImage} download><Download size={16}/> Download</a>}</div>
      <div className="output-image">{result.annotatedImage?<img src={result.annotatedImage} alt="Annotated detection result"/>:<BoxedImage src={preview} detections={result.detections} width={result.width} height={result.height}/>}</div>
    </div>
    <div className="panel detections-panel"><h3>Detection details</h3>{result.detections.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Class</th><th>Confidence</th></tr></thead><tbody>{result.detections.map((d,i)=><tr key={i}><td>{i+1}</td><td>{d.class_name||d.name||d.label||"face"}</td><td>{typeof d.confidence==="number"?`${(d.confidence*100).toFixed(1)}%`:"—"}</td></tr>)}</tbody></table></div>:<p className="muted-note">The service returned a face count but no individual detection details.</p>}</div>
  </>;
}
function History({history,onClear}) {
  return <><PageTitle eyebrow="ACTIVITY" title="Detection History" description="A record of successful analyses saved in this browser." action={history.length>0&&<button className="secondary-btn" onClick={onClear}><Trash2 size={16}/> Clear history</button>}/>
    <div className="panel">{history.length?<div className="history-list">{history.map(item=><div className="history-row" key={item.id}><span className="file-icon"><FileImage/></span><div className="history-name"><b>{item.name}</b><small>{item.date}</small></div><span className="result-pill">{item.count} faces</span></div>)}</div>:<div className="empty-state"><Clock3 size={40}/><h3>No history available</h3><p>Completed image detections will appear here.</p></div>}</div>
  </>;
}
function SettingsPage({backend}) {
  const apiConfigured = backend==="ready";
  return <><PageTitle eyebrow="PREFERENCES" title="Settings" description="View application configuration and connection status."/>
    <div className="panel settings-panel"><h3>Model connection</h3><p>FaceRec sends image uploads to a backend API. Keep private API keys on the backend, not in this browser app.</p><div className="setting-row"><div><b>API base URL</b><small>Optional VITE_API_BASE_URL; defaults to the same origin (/api).</small></div><span className={`status-badge ${apiConfigured?"good":"warn"}`}>{apiConfigured?"Connected":backend==="checking"?"Checking":backend==="nokey"?"API key missing":"Backend offline"}</span></div><div className="setting-row"><div><b>Input mode</b><small>Video upload and live camera features are not included.</small></div><span className="status-badge good">Images only</span></div><div className="setting-row"><div><b>Maximum upload size</b><small>JPG, PNG and WEBP files.</small></div><b>15 MB</b></div></div>
  </>;
}

export default function Root() {
  const [started,setStarted] = useState(false);
  return started ? <App onExit={()=>setStarted(false)}/> : <Landing onStart={()=>setStarted(true)}/>;
}
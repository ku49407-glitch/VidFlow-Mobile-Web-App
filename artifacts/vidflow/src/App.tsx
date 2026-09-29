import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  AlertCircle,
  Archive,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  Clock3,
  Download,
  FileAudio,
  FileVideo,
  FileSearch,
  History,
  Info,
  Link2,
  ListMusic,
  Moon,
  PanelLeft,
  Palette,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type AnalysisStatus = 'valid' | 'invalid';
type Theme = 'dark' | 'light';
type DownloadStatus = 'queued' | 'completed' | 'paused' | 'failed';

type AnalysisRecord = {
  id: string;
  url: string;
  host: string;
  status: AnalysisStatus;
  message: string;
  checkedAt: string;
};

type Settings = {
  accent: string;
  theme: Theme;
  defaultFormat: string;
  defaultQuality: string;
  downloadMode: 'ask' | 'queue';
  notifications: boolean;
  keepHistory: boolean;
};

type DownloadItem = {
  id: string;
  title: string;
  format: string;
  quality: string;
  size: string;
  status: DownloadStatus;
  progress: number;
  sourceUrl: string;
  createdAt: string;
};

type AnalysisResult = {
  kind: 'supported' | 'blocked';
  url: string;
  host: string;
  title: string;
  duration: string;
  fileSize: string;
  thumbnail: string;
  message: string;
};

type PlaylistItem = {
  id: string;
  title: string;
  duration: string;
  format: 'MP4' | 'MP3';
  quality: string;
  size: string;
};

const HISTORY_KEY = 'vidflow-analysis-history';
const SETTINGS_KEY = 'vidflow-settings';
const DOWNLOADS_KEY = 'vidflow-downloads';
const DEFAULT_SETTINGS: Settings = {
  accent: '158 87% 56%',
  theme: 'dark',
  defaultFormat: 'mp4',
  defaultQuality: '1080p',
  downloadMode: 'ask',
  notifications: true,
  keepHistory: true,
};
const ACCENTS = [
  { name: 'Signal mint', value: '158 87% 56%' },
  { name: 'Electric sky', value: '192 88% 62%' },
  { name: 'Warm amber', value: '37 93% 64%' },
  { name: 'Soft coral', value: '8 83% 68%' },
];
const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4 video' },
  { value: 'mp3', label: 'MP3 audio' },
];
const QUALITY_OPTIONS = ['360p', '480p', '720p', '1080p'];
const DEMO_PLAYLIST: PlaylistItem[] = [
  { id: 'playlist-01', title: 'Opening sequence — demo', duration: '02:14', format: 'MP4', quality: '1080p', size: '18.6 MB' },
  { id: 'playlist-02', title: 'Behind the scenes — demo', duration: '04:08', format: 'MP4', quality: '720p', size: '22.1 MB' },
  { id: 'playlist-03', title: 'Creator notes — demo', duration: '01:32', format: 'MP3', quality: '480p', size: '4.7 MB' },
  { id: 'playlist-04', title: 'Closing credits — demo', duration: '03:41', format: 'MP4', quality: '480p', size: '11.9 MB' },
];
const RESTRICTED_HOSTS = [
  'youtube.com',
  'youtu.be',
  'facebook.com',
  'tiktok.com',
  'instagram.com',
  'vimeo.com',
];

function readHistory(): AnalysisRecord[] {
  try {
    const value = localStorage.getItem(HISTORY_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readSettings(): Settings {
  try {
    const value = localStorage.getItem(SETTINGS_KEY);
    const parsed = value ? JSON.parse(value) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      defaultFormat: parsed.defaultFormat === 'mp3' ? 'mp3' : 'mp4',
      defaultQuality: QUALITY_OPTIONS.includes(parsed.defaultQuality) ? parsed.defaultQuality : DEFAULT_SETTINGS.defaultQuality,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function demoDownloads(): DownloadItem[] {
  const now = new Date();
  return [
    {
      id: 'demo-queued',
      title: 'Product launch preview',
      format: 'MP4',
      quality: '1080p',
      size: '28.4 MB',
      status: 'queued',
      progress: 38,
      sourceUrl: 'https://media.example.com/launch-preview',
      createdAt: new Date(now.getTime() - 1000 * 60 * 7).toISOString(),
    },
    {
      id: 'demo-completed',
      title: 'Brand story — sample',
      format: 'MP4',
      quality: '720p',
      size: '12.8 MB',
      status: 'completed',
      progress: 100,
      sourceUrl: 'https://media.example.com/brand-story',
      createdAt: new Date(now.getTime() - 1000 * 60 * 55).toISOString(),
    },
    {
      id: 'demo-paused',
      title: 'Interview audio preview',
      format: 'MP3',
      quality: '480p',
      size: '8.1 MB',
      status: 'paused',
      progress: 64,
      sourceUrl: 'https://media.example.com/interview-audio',
      createdAt: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: 'demo-failed',
      title: 'Campaign cut — sample',
      format: 'MP4',
      quality: '1080p',
      size: '—',
      status: 'failed',
      progress: 0,
      sourceUrl: 'https://media.example.com/campaign-cut',
      createdAt: new Date(now.getTime() - 1000 * 60 * 185).toISOString(),
    },
  ];
}

function readDownloads(): DownloadItem[] {
  try {
    const value = localStorage.getItem(DOWNLOADS_KEY);
    if (value) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Use local demo data when storage is unavailable.
  }
  return demoDownloads();
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatHost(host: string) {
  return host.replace(/^www\./, '');
}

function isRestrictedHost(host: string) {
  const normalized = host.toLowerCase().replace(/^www\./, '');
  return RESTRICTED_HOSTS.some((blockedHost) => normalized === blockedHost || normalized.endsWith(`.${blockedHost}`));
}

function titleFromHost(host: string) {
  const name = formatHost(host).split('.')[0] ?? 'Source';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} media preview`;
}

function sizeForSelection(format: string, quality: string) {
  const sizes: Record<string, string> = {
    'mp4-360p': '8.4 MB',
    'mp4-480p': '12.1 MB',
    'mp4-720p': '18.6 MB',
    'mp4-1080p': '31.8 MB',
    'mp3-360p': '3.1 MB',
    'mp3-480p': '4.7 MB',
    'mp3-720p': '6.8 MB',
    'mp3-1080p': '9.2 MB',
  };
  return sizes[`${format}-${quality}`] ?? 'demo';
}

function AppShell({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  const navItems = [
    { href: '/', label: 'Home', icon: FileSearch },
    { href: '/downloads', label: 'Downloads', icon: History },
    { href: '/playlist', label: 'Playlist', icon: ListMusic },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <div className="vf-shell">
      <aside className="vf-sidebar" aria-label="Primary navigation">
        <Link href="/" className="vf-brand" data-testid="link-brand">
          <span className="vf-brand-mark" aria-hidden="true"><PanelLeft size={16} strokeWidth={2.5} /></span>
          <span className="vf-brand-name">vid<span>flow</span></span>
        </Link>
        <div className="vf-nav-label">Workspace</div>
        <nav className="vf-nav">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="vf-nav-link" data-active={currentPath === href} data-testid={`link-nav-${label.toLowerCase()}`}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="vf-sidebar-foot">
          <strong>Authorized content only</strong>
          VidFlow uses demo data and never bypasses platform protections.
        </div>
      </aside>
      <header className="vf-mobile-bar">
        <Link href="/" className="vf-brand" data-testid="link-mobile-brand">
          <span className="vf-brand-mark" aria-hidden="true"><PanelLeft size={16} strokeWidth={2.5} /></span>
          <span className="vf-brand-name">vid<span>flow</span></span>
        </Link>
        <nav className="vf-mobile-nav" aria-label="Mobile navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="vf-nav-link" data-active={currentPath === href} aria-label={label} data-testid={`link-mobile-${label.toLowerCase()}`}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </header>
      <main className="vf-main">{children}</main>
    </div>
  );
}

function EmptyHistory({ compact = false }: { compact?: boolean }) {
  return (
    <div className="vf-empty" data-testid={compact ? 'empty-recent-history' : 'empty-analysis-history'}>
      <span className="vf-empty-icon" aria-hidden="true"><Archive size={19} strokeWidth={1.7} /></span>
      <h3>{compact ? 'No recent checks' : 'Your local history is clear'}</h3>
      <p>{compact ? 'Submit an authorized media URL to see its structural result here.' : 'Checked URLs will appear here when local history retention is enabled.'}</p>
    </div>
  );
}

function HistoryRow({ record, onDelete }: { record: AnalysisRecord; onDelete: (id: string) => void }) {
  const isValid = record.status === 'valid';
  return (
    <div className="vf-history-row" data-testid={`row-analysis-${record.id}`}>
      <div className="vf-history-main">
        <div className="vf-history-host">
          <span className="vf-status-dot" style={{ background: isValid ? 'hsl(var(--accent))' : 'hsl(var(--destructive))', boxShadow: isValid ? '0 0 0 4px hsl(var(--accent) / .1)' : '0 0 0 4px hsl(var(--destructive) / .1)' }} aria-hidden="true" />
          <span>{formatHost(record.host)}</span>
          {isValid ? <CheckCircle2 size={14} color="hsl(var(--accent))" aria-label="Structurally valid" /> : <AlertCircle size={14} color="hsl(var(--destructive))" aria-label="Invalid URL" />}
        </div>
        <div className="vf-history-url" title={record.url}>{record.url}</div>
      </div>
      <time className="vf-history-time" dateTime={record.checkedAt}>{formatTime(record.checkedAt)}</time>
      <button type="button" className="vf-delete" onClick={() => onDelete(record.id)} aria-label={`Remove ${record.host} from history`} data-testid={`button-delete-analysis-${record.id}`}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function ResultCard({
  result,
  settings,
  onQueue,
  onDismiss,
}: {
  result: AnalysisResult;
  settings: Settings;
  onQueue: (format: string, quality: string, result: AnalysisResult) => void;
  onDismiss: () => void;
}) {
  const [format, setFormat] = useState(settings.defaultFormat);
  const [quality, setQuality] = useState(settings.defaultQuality);
  const isBlocked = result.kind === 'blocked';
  const selectedSize = sizeForSelection(format, quality);

  return (
    <div className={`vf-result ${isBlocked ? 'vf-result-blocked' : ''}`} role="status" data-testid="card-analysis-result">
      <div className="vf-result-head">
        <div>
          <h3 className="vf-result-title">
            {isBlocked ? <ShieldCheck size={17} /> : <BadgeCheck size={17} />}
            {isBlocked ? 'Protected source not supported' : 'Authorized source ready'}
          </h3>
          <p className="vf-result-message">{result.message}</p>
        </div>
        <button type="button" className="vf-delete" onClick={onDismiss} aria-label="Dismiss analysis result" data-testid="button-dismiss-result"><X size={16} /></button>
      </div>
      {isBlocked ? (
        <div className="vf-result-policy">
          VidFlow will not download from YouTube, Facebook, TikTok, Instagram, Vimeo, or other protected platforms. Use content you own or have permission to use from an authorized source.
        </div>
      ) : (
        <>
          <div className="vf-media-summary">
            <div className="vf-thumbnail" aria-label="Thumbnail placeholder">
              <FileVideo size={25} />
              <span>DEMO</span>
            </div>
            <div className="vf-media-copy">
              <div className="vf-kicker">Demo metadata / authorized source</div>
              <h3>{result.title}</h3>
              <p>{result.host} · {result.duration} · {selectedSize} · metadata only</p>
            </div>
          </div>
          <div className="vf-format-grid">
            <label className="vf-select-label">
              <span>Format</span>
              <span className="vf-select-wrap">
                <select value={format} onChange={(event) => setFormat(event.target.value)} data-testid="select-result-format">
                  {FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <ChevronDown size={14} />
              </span>
            </label>
            <label className="vf-select-label">
              <span>Quality</span>
              <span className="vf-select-wrap">
                <select value={quality} onChange={(event) => setQuality(event.target.value)} data-testid="select-result-quality">
                  {QUALITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <ChevronDown size={14} />
              </span>
            </label>
          </div>
          <div className="vf-result-actions">
            <span className="vf-result-meta">{settings.downloadMode === 'queue' ? 'Auto-queue preference' : 'Manual queue'} · no media bytes fetched</span>
            <button type="button" className="vf-button" onClick={() => onQueue(format, quality, result)} data-testid="button-download-demo">
              <Download size={15} /> Download
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Home({
  history,
  downloads,
  settings,
  onAdd,
  onDelete,
  onQueue,
}: {
  history: AnalysisRecord[];
  downloads: DownloadItem[];
  settings: Settings;
  onAdd: (record: AnalysisRecord) => void;
  onDelete: (id: string) => void;
  onQueue: (format: string, quality: string, result: AnalysisResult) => void;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notice, setNotice] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const clearForm = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setUrl('');
    setError('');
    setResult(null);
    setNotice('');
    setIsAnalyzing(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const candidate = url.trim();
    setNotice('');
    if (!candidate) {
      setError('Paste a URL to begin the structural check.');
      setResult(null);
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol');
      if (!parsed.hostname) throw new Error('hostname');
    } catch {
      setError('Enter a complete http:// or https:// URL, including a valid host.');
      setResult(null);
      return;
    }

    setError('');
    setResult(null);
    setIsAnalyzing(true);
    timerRef.current = window.setTimeout(() => {
      const blocked = isRestrictedHost(parsed.hostname);
      const checkedAt = new Date().toISOString();
      onAdd({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: parsed.toString(),
        host: parsed.hostname,
        status: blocked ? 'invalid' : 'valid',
        message: blocked ? 'This host is protected and cannot be used for downloading in VidFlow.' : 'The URL shape is valid. VidFlow can show demo metadata for an authorized source.',
        checkedAt,
      });
      setResult({
        kind: blocked ? 'blocked' : 'supported',
        url: parsed.toString(),
        host: parsed.hostname,
        title: titleFromHost(parsed.hostname),
        duration: '03:42',
        fileSize: sizeForSelection(settings.defaultFormat, settings.defaultQuality),
        thumbnail: 'demo',
        message: blocked ? 'This platform is not supported for downloading. VidFlow only works with authorized sources and never bypasses platform protections.' : 'The URL is structurally valid. The metadata below is a safe demo preview; VidFlow does not fetch the media behind this link.',
      });
      setIsAnalyzing(false);
    }, 700);
  };

  const recentDownloads = downloads.filter((download) => download.status === 'completed').slice(0, 3);

  return (
    <div className="vf-page">
      <header className="vf-page-header">
        <div>
          <div className="vf-kicker">Home / URL signal desk</div>
          <h1 className="vf-page-title">Know what you’re working with.</h1>
          <p className="vf-page-subtitle">A fast structural check for media URLs. No scraping, no workarounds, and no downloads from protected platforms.</p>
        </div>
      </header>
      <div className="vf-home-grid">
        <section className="vf-card vf-analysis-card" aria-labelledby="analysis-heading">
          <div className="vf-kicker">Analyze link</div>
          <h2 id="analysis-heading">Check the shape of a media URL.</h2>
          <p>Paste a link to confirm its protocol and host. For authorized sources, VidFlow can show safe demo metadata and add a mock item to the queue.</p>
          <form className="vf-form" onSubmit={submit} noValidate>
            <label className="vf-input-label" htmlFor="media-url">Media URL</label>
            <div className="vf-input-row">
              <div className="vf-input-wrap">
                <Link2 className="vf-input-icon" size={17} aria-hidden="true" />
                <input
                  id="media-url"
                  className="vf-input"
                  value={url}
                  onChange={(event) => { setUrl(event.target.value); if (error) setError(''); }}
                  placeholder="https://example.com/video"
                  aria-invalid={Boolean(error)}
                  data-invalid={Boolean(error)}
                  data-testid="input-media-url"
                  autoComplete="url"
                  disabled={isAnalyzing}
                />
              </div>
              <button className="vf-button" type="submit" disabled={isAnalyzing} data-testid="button-analyze-url">
                {isAnalyzing ? <><span className="vf-spinner" aria-hidden="true" /> Checking</> : <>Analyze <ArrowRight size={16} /></>}
              </button>
              <button className="vf-button vf-button-secondary vf-clear-button" type="button" onClick={clearForm} disabled={isAnalyzing || (!url && !result && !error)} data-testid="button-clear-url">
                Clear
              </button>
            </div>
            {error && <div className="vf-error" role="alert" data-testid="status-url-error"><AlertCircle size={14} />{error}</div>}
            <div className="vf-helper"><ShieldCheck size={14} aria-hidden="true" />Structural validation only. VidFlow never fetches the media behind your link.</div>
          </form>
          {isAnalyzing && (
            <div className="vf-loading-card" role="status" aria-live="polite" data-testid="status-analyzing">
              <span className="vf-spinner" aria-hidden="true" />
              <div><strong>Reading URL structure…</strong><span>Checking protocol and host locally.</span></div>
            </div>
          )}
          {result && <ResultCard result={result} settings={settings} onQueue={(format, quality, analysisResult) => { onQueue(format, quality, analysisResult); setNotice('Demo item added to the download queue.'); }} onDismiss={() => setResult(null)} />}
          {notice && <div className="vf-status-note" role="status" data-testid="status-download-added"><Check size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />{notice}</div>}
        </section>
        <div className="vf-side-stack">
          <section className="vf-card vf-mini-card" aria-labelledby="supported-heading">
            <div className="vf-kicker">Supported content</div>
            <h3 id="supported-heading">Authorized sources, kept clear.</h3>
            <div className="vf-mini-list">
              <div className="vf-mini-list-item"><span className="vf-mini-dot" /><span>Direct URLs you own or have permission to use.</span></div>
              <div className="vf-mini-list-item"><span className="vf-mini-dot" /><span>Local URL checks with demo metadata only.</span></div>
              <div className="vf-mini-list-item"><span className="vf-mini-dot" /><span>Protected social and streaming platforms stay blocked.</span></div>
            </div>
          </section>
          <section className="vf-card vf-mini-card">
            <div className="vf-kicker">Your privacy</div>
            <h3>Local by default.</h3>
            <p>Checks and demo queue items stay in this browser when history retention is on. No URL is sent to VidFlow servers.</p>
            <Link href="/settings" className="vf-text-link" style={{ marginTop: 16 }} data-testid="link-home-settings">Review settings <ArrowRight size={14} /></Link>
          </section>
        </div>
      </div>
      <section className="vf-section" aria-labelledby="recent-heading">
        <div className="vf-section-head">
          <div><div className="vf-kicker">Recent downloads</div><h2 id="recent-heading">Completed demo items</h2></div>
          <Link href="/downloads" className="vf-text-link" data-testid="link-view-downloads">View downloads <ArrowRight size={14} /></Link>
        </div>
        <div className="vf-card vf-history">
          {recentDownloads.length === 0 ? <EmptyHistory compact /> : recentDownloads.map((download) => <MiniDownloadRow key={download.id} item={download} />)}
        </div>
      </section>
      <section className="vf-card vf-supported-note" aria-label="Supported content information">
        <ShieldCheck size={18} />
        <div><strong>Use VidFlow with content you’re authorized to use.</strong><span>Demo downloads represent the queue experience only. They do not fetch or save media bytes.</span></div>
      </section>
    </div>
  );
}

function MiniDownloadRow({ item }: { item: DownloadItem }) {
  return (
    <div className="vf-history-row">
      <div className="vf-file-icon" aria-hidden="true">{item.format === 'MP3' ? <FileAudio size={17} /> : <FileVideo size={17} />}</div>
      <div className="vf-history-main">
        <div className="vf-history-host"><span>{item.title}</span><CheckCircle2 size={14} color="hsl(var(--accent))" /></div>
        <div className="vf-history-url">{item.format} · {item.quality} · {item.size}</div>
      </div>
      <span className="vf-status-badge vf-status-completed">Done</span>
    </div>
  );
}

function DownloadRow({
  item,
  onPause,
  onResume,
  onRetry,
  onCancel,
  onDelete,
}: {
  item: DownloadItem;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isAudio = item.format.toLowerCase() === 'mp3';
  const action = item.status === 'queued'
    ? <button type="button" className="vf-icon-button" onClick={() => onPause(item.id)} aria-label={`Pause ${item.title}`}><CirclePause size={15} /></button>
    : item.status === 'paused'
      ? <button type="button" className="vf-icon-button" onClick={() => onResume(item.id)} aria-label={`Resume ${item.title}`}><Play size={15} /></button>
      : item.status === 'failed'
        ? <button type="button" className="vf-icon-button" onClick={() => onRetry(item.id)} aria-label={`Retry ${item.title}`}><RotateCcw size={15} /></button>
        : null;
  const statusLabel = item.status === 'queued' ? 'downloading' : item.status;
  const canCancel = item.status === 'queued' || item.status === 'paused';

  return (
    <div className="vf-download-row" data-testid={`row-download-${item.id}`}>
      <div className="vf-file-icon" aria-hidden="true">{isAudio ? <FileAudio size={18} /> : <FileVideo size={18} />}</div>
      <div className="vf-download-main">
        <div className="vf-download-title-row">
          <div><h3>{item.title}</h3><p>{item.format} · {item.quality} · {item.size}</p></div>
          <span className={`vf-status-badge vf-status-${item.status}`}>{statusLabel}</span>
        </div>
        <div className="vf-progress-track" aria-label={`${item.progress}% complete`} role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${item.progress}%` }} />
        </div>
        <div className="vf-download-footer">
          <span>{item.status === 'completed' ? 'Demo item complete' : item.status === 'failed' ? 'Demo item could not be completed' : `${item.status === 'queued' ? 'Downloading' : 'Paused'} · ${item.progress}%`}</span>
          <div className="vf-download-actions">
            {action}
            {canCancel && <button type="button" className="vf-icon-button vf-icon-button-danger" onClick={() => onCancel(item.id)} aria-label={`Cancel ${item.title}`} title="Cancel"><X size={15} /></button>}
            <button type="button" className="vf-icon-button" onClick={() => onDelete(item.id)} aria-label={`Remove ${item.title}`}><Trash2 size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Downloads({
  downloads,
  onPause,
  onResume,
  onRetry,
  onCancel,
  onDelete,
  onClear,
}: {
  downloads: DownloadItem[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const sections: { key: DownloadStatus; label: string; description: string }[] = [
    { key: 'queued', label: 'Active downloads', description: 'Download queue · demo items waiting or in progress.' },
    { key: 'completed', label: 'Completed downloads', description: 'Demo items that finished successfully.' },
    { key: 'paused', label: 'Paused downloads', description: 'Items waiting for you to resume them.' },
    { key: 'failed', label: 'Failed downloads', description: 'Demo items that need a retry or removal.' },
  ];

  return (
    <div className="vf-page">
      <header className="vf-page-header">
        <div>
          <div className="vf-kicker">Downloads / 02</div>
          <h1 className="vf-page-title">Keep every state visible.</h1>
          <p className="vf-page-subtitle">A clear queue for authorized demo sources, with progress, pause, retry, and removal controls that work entirely in this browser.</p>
        </div>
        <button type="button" className="vf-button vf-button-danger" onClick={onClear} disabled={downloads.length === 0} data-testid="button-delete-download-history"><Trash2 size={14} /> Delete history</button>
      </header>
      <section className="vf-download-callout" aria-label="Download policy notice">
        <span className="vf-callout-icon" aria-hidden="true"><ShieldCheck size={19} /></span>
        <div><h2>Demo queue only — no protected media downloads.</h2><p>VidFlow never fetches content, removes restrictions, or suggests ways around platform protections. Every item here uses mock data so you can preview the experience safely.</p></div>
      </section>
      <div className="vf-download-sections">
        {sections.map((section) => {
          const items = downloads.filter((download) => download.status === section.key);
          return (
            <section className="vf-section vf-download-section" key={section.key} aria-labelledby={`downloads-${section.key}`}>
              <div className="vf-section-head">
                <div><div className="vf-kicker">{section.description}</div><h2 id={`downloads-${section.key}`}>{section.label} <span className="vf-count">{items.length}</span></h2></div>
              </div>
              <div className="vf-card vf-download-list">
                {items.length === 0 ? <div className="vf-download-empty"><Clock3 size={16} /><span>No {section.key} items right now.</span></div> : items.map((item) => <DownloadRow key={item.id} item={item} onPause={onPause} onResume={onResume} onRetry={onRetry} onCancel={onCancel} onDelete={onDelete} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Playlist({
  downloads,
  onQueuePlaylist,
}: {
  downloads: DownloadItem[];
  onQueuePlaylist: (items: PlaylistItem[]) => string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastBatchIds, setLastBatchIds] = useState<string[]>([]);
  const allSelected = selectedIds.length === DEMO_PLAYLIST.length;
  const selectedItems = DEMO_PLAYLIST.filter((item) => selectedIds.includes(item.id));
  const batchItems = downloads.filter((item) => lastBatchIds.includes(item.id));
  const batchProgress = batchItems.length === 0
    ? 0
    : Math.round(batchItems.reduce((total, item) => total + item.progress, 0) / batchItems.length);
  const batchComplete = batchItems.length > 0 && batchItems.every((item) => item.status === 'completed');

  const toggleItem = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  };
  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : DEMO_PLAYLIST.map((item) => item.id));
  };
  const queueSelected = () => {
    if (selectedItems.length === 0) return;
    setLastBatchIds(onQueuePlaylist(selectedItems));
    setSelectedIds([]);
  };

  return (
    <div className="vf-page">
      <header className="vf-page-header">
        <div>
          <div className="vf-kicker">Playlist / demo set</div>
          <h1 className="vf-page-title">Queue a whole story.</h1>
          <p className="vf-page-subtitle">Choose authorized demo items from a playlist, then add them to the same local queue used by individual downloads.</p>
        </div>
      </header>
      <section className="vf-card vf-playlist-card" aria-labelledby="playlist-heading">
        <div className="vf-playlist-header">
          <div className="vf-playlist-art" aria-hidden="true"><ListMusic size={24} /></div>
          <div>
            <div className="vf-kicker">Authorized demo playlist</div>
            <h2 id="playlist-heading">Signal room sessions</h2>
            <p>{DEMO_PLAYLIST.length} items · demo metadata only</p>
          </div>
        </div>
        <div className="vf-playlist-toolbar">
          <label className="vf-check-label">
            <input type="checkbox" className="vf-checkbox" checked={allSelected} onChange={toggleAll} />
            <span>Select all</span>
          </label>
          <span className="vf-selected-count">{selectedIds.length} selected</span>
        </div>
        <div className="vf-playlist-items">
          {DEMO_PLAYLIST.map((item) => (
            <label className="vf-playlist-item" key={item.id} data-selected={selectedIds.includes(item.id)}>
              <input type="checkbox" className="vf-checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleItem(item.id)} />
              <span className="vf-playlist-item-icon" aria-hidden="true">{item.format === 'MP3' ? <FileAudio size={16} /> : <FileVideo size={16} />}</span>
              <span className="vf-playlist-item-copy"><strong>{item.title}</strong><span>{item.format} · {item.quality} · {item.duration} · {item.size}</span></span>
              <CheckCircle2 size={15} className="vf-playlist-item-check" aria-hidden="true" />
            </label>
          ))}
        </div>
        <div className="vf-playlist-footer">
          <div>
            <strong>{selectedIds.length} of {DEMO_PLAYLIST.length} selected</strong>
            <span>Items will be added as safe demo downloads.</span>
          </div>
          <button type="button" className="vf-button" onClick={queueSelected} disabled={selectedItems.length === 0} data-testid="button-download-selected">
            <Download size={15} /> Download selected
          </button>
        </div>
      </section>
      {batchItems.length > 0 && (
        <section className="vf-card vf-playlist-progress" aria-live="polite" data-testid="card-playlist-progress">
          <div className="vf-playlist-progress-head">
            <div><div className="vf-kicker">Queue progress</div><h2>{batchComplete ? 'Playlist demo complete.' : 'Playlist is downloading.'}</h2></div>
            <strong>{batchProgress}%</strong>
          </div>
          <div className="vf-progress-track"><span style={{ width: `${batchProgress}%` }} /></div>
          <p>{batchComplete ? 'Every selected item moved to Completed Downloads.' : `${batchItems.filter((item) => item.status === 'completed').length} of ${batchItems.length} items complete. Manage individual states in Downloads.`}</p>
        </section>
      )}
      <section className="vf-download-callout" aria-label="Playlist policy notice">
        <span className="vf-callout-icon" aria-hidden="true"><ShieldCheck size={19} /></span>
        <div><h2>Playlist data is demo-only.</h2><p>VidFlow does not fetch playlist pages or protected content. These items model the experience for authorized sources without saving media bytes.</p></div>
      </section>
    </div>
  );
}

function SettingsPage({
  settings,
  historyCount,
  downloadCount,
  onSettingsChange,
  onReset,
}: {
  settings: Settings;
  historyCount: number;
  downloadCount: number;
  onSettingsChange: (settings: Settings) => void;
  onReset: () => void;
}) {
  const [notice, setNotice] = useState('');
  const update = (next: Settings, message: string) => {
    onSettingsChange(next);
    setNotice(message);
  };
  const reset = () => {
    onReset();
    setNotice('Local history reset.');
  };

  return (
    <div className="vf-page">
      <header className="vf-page-header">
        <div>
          <div className="vf-kicker">Settings / 03</div>
          <h1 className="vf-page-title">Set your signal.</h1>
          <p className="vf-page-subtitle">Tune VidFlow’s local experience. These preferences stay in this browser and can be changed anytime.</p>
        </div>
      </header>
      <div className="vf-settings-stack">
        <section className="vf-card vf-setting-card" aria-labelledby="theme-heading">
          <div className="vf-setting-row">
            <div className="vf-setting-copy"><h2 id="theme-heading">Theme</h2><p>Choose the appearance that feels best for your workspace.</p></div>
            {settings.theme === 'dark' ? <Moon size={19} color="hsl(var(--muted-foreground))" /> : <Sun size={19} color="hsl(var(--muted-foreground))" />}
          </div>
          <div className="vf-choice-grid">
            <button type="button" className="vf-choice-button" data-selected={settings.theme === 'dark'} onClick={() => update({ ...settings, theme: 'dark' }, 'Dark theme enabled.')}><Moon size={15} /> Dark</button>
            <button type="button" className="vf-choice-button" data-selected={settings.theme === 'light'} onClick={() => update({ ...settings, theme: 'light' }, 'Light theme enabled.')}><Sun size={15} /> Light</button>
          </div>
        </section>
        <section className="vf-card vf-setting-card" aria-labelledby="accent-heading">
          <div className="vf-setting-row">
            <div className="vf-setting-copy"><h2 id="accent-heading">Theme accent</h2><p>Choose the signal color used for actions, focus states, and successful checks.</p></div>
            <Palette size={19} color="hsl(var(--muted-foreground))" aria-hidden="true" />
          </div>
          <div className="vf-accent-options" role="radiogroup" aria-label="Theme accent">
            {ACCENTS.map((accent) => (
              <button key={accent.value} type="button" className="vf-accent-option" style={{ background: `hsl(${accent.value})` }} data-selected={settings.accent === accent.value} aria-label={accent.name} aria-pressed={settings.accent === accent.value} onClick={() => update({ ...settings, accent: accent.value }, 'Accent updated.')} data-testid={`button-accent-${accent.name.toLowerCase().replaceAll(' ', '-')}`} />
            ))}
          </div>
        </section>
        <section className="vf-card vf-setting-card" aria-labelledby="defaults-heading">
          <div className="vf-setting-copy"><h2 id="defaults-heading">Download defaults</h2><p>These choices prefill the safe demo result card after every analysis.</p></div>
          <div className="vf-settings-fields">
            <label className="vf-select-label"><span>Default format</span><span className="vf-select-wrap"><select value={settings.defaultFormat} onChange={(event) => update({ ...settings, defaultFormat: event.target.value }, 'Default format updated.')} data-testid="select-default-format">{FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={14} /></span></label>
            <label className="vf-select-label"><span>Default quality</span><span className="vf-select-wrap"><select value={settings.defaultQuality} onChange={(event) => update({ ...settings, defaultQuality: event.target.value }, 'Default quality updated.')} data-testid="select-default-quality">{QUALITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={14} /></span></label>
            <label className="vf-select-label"><span>Download preference</span><span className="vf-select-wrap"><select value={settings.downloadMode} onChange={(event) => update({ ...settings, downloadMode: event.target.value as Settings['downloadMode'] }, 'Download preference updated.')} data-testid="select-download-preference"><option value="ask">Ask before queueing</option><option value="queue">Queue demo item directly</option></select><ChevronDown size={14} /></span></label>
          </div>
        </section>
        <section className="vf-card vf-setting-card" aria-labelledby="notifications-heading">
          <div className="vf-setting-row">
            <div className="vf-setting-copy"><h2 id="notifications-heading">Notifications</h2><p>Show local status feedback when a demo item is added, paused, resumed, or retried.</p></div>
            <button type="button" className="vf-toggle" data-on={settings.notifications} aria-pressed={settings.notifications} aria-label="Toggle notifications" onClick={() => update({ ...settings, notifications: !settings.notifications }, settings.notifications ? 'Notifications disabled.' : 'Notifications enabled.')} data-testid="button-toggle-notifications"><span className="sr-only">Toggle notifications</span></button>
          </div>
          <div className="vf-setting-divider" />
          <div className="vf-setting-detail"><Info size={14} /> {settings.notifications ? 'Status feedback is enabled.' : 'Status feedback is muted.'}</div>
        </section>
        <section className="vf-card vf-setting-card" aria-labelledby="retention-heading">
          <div className="vf-setting-row">
            <div className="vf-setting-copy"><h2 id="retention-heading">Keep local history</h2><p>Store checked URLs and demo queue items only in this browser. No media is stored.</p></div>
            <button type="button" className="vf-toggle" data-on={settings.keepHistory} aria-pressed={settings.keepHistory} aria-label="Toggle local history retention" onClick={() => update({ ...settings, keepHistory: !settings.keepHistory }, settings.keepHistory ? 'Local retention disabled.' : 'Local retention enabled.')} data-testid="button-toggle-history"><span className="sr-only">Toggle history retention</span></button>
          </div>
          <div className="vf-setting-divider" />
          <div className="vf-setting-detail"><Info size={14} /> {settings.keepHistory ? `${historyCount} ${historyCount === 1 ? 'check' : 'checks'} currently stored locally.` : 'New checks will not be retained locally.'}</div>
        </section>
        <section className="vf-card vf-setting-card" aria-labelledby="about-heading">
          <div className="vf-setting-copy"><h2 id="about-heading">About VidFlow</h2><p>VidFlow is a local-first URL analysis workspace. The demo queue exists to make the authorized-content workflow concrete without fetching protected media.</p></div>
          <div className="vf-about-meta"><span>Version 1.0 demo</span><span>Built for clear next steps</span></div>
        </section>
        <section className="vf-card vf-legal-card" aria-label="Legal information">
          <details>
            <summary>Privacy Policy <ChevronDown size={15} /></summary>
            <p>VidFlow keeps settings, checked URLs, and demo queue state in your browser’s local storage. The app does not send URLs to a VidFlow server or fetch media content.</p>
          </details>
          <details>
            <summary>Terms of Use <ChevronDown size={15} /></summary>
            <p>Use VidFlow only with content you own or are authorized to use. Do not use it to bypass DRM, authentication, platform restrictions, or download protections.</p>
          </details>
        </section>
        <section className="vf-card vf-setting-card" aria-labelledby="reset-heading">
          <div className="vf-setting-row">
            <div className="vf-setting-copy"><h2 id="reset-heading">Reset local data</h2><p>Remove every saved analysis and demo queue item from this browser. This cannot be undone.</p></div>
            <button type="button" className="vf-button vf-button-danger" onClick={reset} disabled={historyCount === 0 && downloadCount === 0} data-testid="button-reset-history"><RotateCcw size={14} /> Reset</button>
          </div>
        </section>
        {notice && <div className="vf-status-note" role="status" data-testid="status-settings-update"><Check size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />{notice}</div>}
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const [history, setHistory] = useState<AnalysisRecord[]>(readHistory);
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [downloads, setDownloads] = useState<DownloadItem[]>(readDownloads);
  const visibleHistory = useMemo(() => history.slice().sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()), [history]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accent);
    document.documentElement.style.setProperty('--primary', settings.accent);
    document.documentElement.dataset.theme = settings.theme;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
  }, [downloads]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDownloads((current) => current.map((item) => {
        if (item.status !== 'queued') return item;
        const nextProgress = Math.min(100, item.progress + 8);
        return { ...item, progress: nextProgress, status: nextProgress >= 100 ? 'completed' : 'queued' };
      }));
    }, 1200);
    return () => window.clearInterval(timer);
  }, []);

  const addRecord = (record: AnalysisRecord) => {
    if (!settings.keepHistory) return;
    setHistory((current) => [record, ...current].slice(0, 50));
  };
  const deleteRecord = (id: string) => setHistory((current) => current.filter((record) => record.id !== id));
  const clearDownloads = () => setDownloads([]);
  const clearAllLocalData = () => {
    setHistory([]);
    setDownloads([]);
  };
  const queueDownload = (format: string, quality: string, result: AnalysisResult) => {
    const item: DownloadItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: result.title,
      format: format.toUpperCase(),
      quality,
      size: sizeForSelection(format, quality),
      status: 'queued',
      progress: 0,
      sourceUrl: result.url,
      createdAt: new Date().toISOString(),
    };
    setDownloads((current) => [item, ...current]);
  };
  const queuePlaylist = (items: PlaylistItem[]) => {
    const created = items.map((playlistItem) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: playlistItem.title,
      format: playlistItem.format,
      quality: playlistItem.quality,
      size: playlistItem.size,
      status: 'queued' as const,
      progress: 0,
      sourceUrl: `https://media.example.com/playlist/${playlistItem.id}`,
      createdAt: new Date().toISOString(),
    }));
    setDownloads((current) => [...created, ...current]);
    return created.map((item) => item.id);
  };
  const updateDownload = (id: string, next: Partial<DownloadItem>) => setDownloads((current) => current.map((item) => item.id === id ? { ...item, ...next } : item));
  const pauseDownload = (id: string) => updateDownload(id, { status: 'paused' });
  const resumeDownload = (id: string) => updateDownload(id, { status: 'queued' });
  const retryDownload = (id: string) => updateDownload(id, { status: 'queued', progress: 0 });
  const cancelDownload = (id: string) => setDownloads((current) => current.filter((item) => item.id !== id));
  const deleteDownload = (id: string) => setDownloads((current) => current.filter((item) => item.id !== id));

  return (
    <RoutedErrorBoundary>
      <AppShell currentPath={location}>
        <Switch>
          <Route path="/"><Home history={visibleHistory} downloads={downloads} settings={settings} onAdd={addRecord} onDelete={deleteRecord} onQueue={queueDownload} /></Route>
          <Route path="/downloads"><Downloads downloads={downloads} onPause={pauseDownload} onResume={resumeDownload} onRetry={retryDownload} onCancel={cancelDownload} onDelete={deleteDownload} onClear={clearDownloads} /></Route>
          <Route path="/playlist"><Playlist downloads={downloads} onQueuePlaylist={queuePlaylist} /></Route>
          <Route path="/settings"><SettingsPage settings={settings} historyCount={history.length} downloadCount={downloads.length} onSettingsChange={setSettings} onReset={clearAllLocalData} /></Route>
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
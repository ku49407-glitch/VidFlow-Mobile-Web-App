import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSearch,
  History,
  Info,
  Link2,
  PanelLeft,
  Palette,
  RotateCcw,
  Settings2,
  ShieldCheck,
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

type AnalysisRecord = {
  id: string;
  url: string;
  host: string;
  status: 'valid' | 'invalid';
  message: string;
  checkedAt: string;
};

type Settings = {
  accent: string;
  keepHistory: boolean;
};

const HISTORY_KEY = 'vidflow-analysis-history';
const SETTINGS_KEY = 'vidflow-settings';
const DEFAULT_SETTINGS: Settings = { accent: '158 87% 56%', keepHistory: true };
const ACCENTS = [
  { name: 'Signal mint', value: '158 87% 56%' },
  { name: 'Electric sky', value: '192 88% 62%' },
  { name: 'Warm amber', value: '37 93% 64%' },
  { name: 'Soft coral', value: '8 83% 68%' },
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
    return { ...DEFAULT_SETTINGS, ...(value ? JSON.parse(value) : {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatHost(host: string) {
  return host.replace(/^www\./, '');
}

function AppShell({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  const navItems = [
    { href: '/', label: 'Analyze', icon: FileSearch },
    { href: '/downloads', label: 'History', icon: History },
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
          <strong>Structural checks only</strong>
          VidFlow never downloads content or bypasses platform protections.
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

function Home({ history, onAdd, onDelete }: { history: AnalysisRecord[]; onAdd: (record: AnalysisRecord) => void; onDelete: (id: string) => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisRecord | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const candidate = url.trim();
    if (!candidate) {
      setError('Paste a URL to begin the structural check.');
      setResult(null);
      return;
    }
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('protocol');
      }
      if (!parsed.hostname) throw new Error('hostname');
      const record: AnalysisRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: parsed.toString(),
        host: parsed.hostname,
        status: 'valid',
        message: 'This URL has the expected web structure and is ready for your next authorized step.',
        checkedAt: new Date().toISOString(),
      };
      setError('');
      setResult(record);
      onAdd(record);
    } catch {
      setError('Enter a complete http:// or https:// URL, including a valid host.');
      setResult(null);
    }
  };

  return (
    <div className="vf-page">
      <header className="vf-page-header">
        <div>
          <div className="vf-kicker">URL signal desk / 01</div>
          <h1 className="vf-page-title">Know what you’re working with.</h1>
          <p className="vf-page-subtitle">A fast structural check for media URLs. No downloads, no scraping, no platform workarounds.</p>
        </div>
      </header>
      <div className="vf-home-grid">
        <section className="vf-card vf-analysis-card" aria-labelledby="analysis-heading">
          <div className="vf-kicker">Authorized content only</div>
          <h2 id="analysis-heading">Check the shape of a media URL.</h2>
          <p>Paste a link to confirm its protocol and host before you decide what to do next. VidFlow only reads the URL you provide.</p>
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
                />
              </div>
              <button className="vf-button" type="submit" data-testid="button-analyze-url">
                Analyze <ArrowRight size={16} />
              </button>
            </div>
            {error && <div className="vf-error" role="alert" data-testid="status-url-error"><AlertCircle size={14} />{error}</div>}
            <div className="vf-helper"><ShieldCheck size={14} aria-hidden="true" />Structural validation only. VidFlow never fetches the media behind your link.</div>
          </form>
          {result && (
            <div className="vf-result" role="status" data-testid="card-analysis-result">
              <div className="vf-result-head">
                <div>
                  <h3 className="vf-result-title"><CheckCircle2 size={17} /> URL structure looks valid</h3>
                  <p className="vf-result-message">{result.message}</p>
                </div>
                <button type="button" className="vf-delete" onClick={() => setResult(null)} aria-label="Dismiss analysis result" data-testid="button-dismiss-result"><X size={16} /></button>
              </div>
              <div className="vf-result-url" title={result.url}>{result.url}</div>
              <div className="vf-result-meta">Host detected: {formatHost(result.host)} · checked {formatTime(result.checkedAt)}</div>
            </div>
          )}
        </section>
        <div className="vf-side-stack">
          <section className="vf-card vf-mini-card" aria-labelledby="how-heading">
            <div className="vf-kicker">How it works</div>
            <h3 id="how-heading">A small check, kept clear.</h3>
            <div className="vf-mini-list">
              <div className="vf-mini-list-item"><span className="vf-mini-dot" /><span>Parse the URL locally with your browser.</span></div>
              <div className="vf-mini-list-item"><span className="vf-mini-dot" /><span>Confirm a secure web protocol and host.</span></div>
              <div className="vf-mini-list-item"><span className="vf-mini-dot" /><span>Choose your next authorized action elsewhere.</span></div>
            </div>
          </section>
          <section className="vf-card vf-mini-card">
            <div className="vf-kicker">Your privacy</div>
            <h3>Local by default.</h3>
            <p>Checks stay in this browser when history retention is on. No URL is sent to VidFlow servers.</p>
            <Link href="/settings" className="vf-text-link" style={{ marginTop: 16 }} data-testid="link-home-settings">Review settings <ArrowRight size={14} /></Link>
          </section>
        </div>
      </div>
      <section className="vf-section" aria-labelledby="recent-heading">
        <div className="vf-section-head">
          <div><div className="vf-kicker">Local trace</div><h2 id="recent-heading">Recent analysis</h2></div>
          <Link href="/downloads" className="vf-text-link" data-testid="link-view-history">View history <ArrowRight size={14} /></Link>
        </div>
        <div className="vf-card vf-history">
          {history.length === 0 ? <EmptyHistory compact /> : history.slice(0, 3).map((record) => <HistoryRow key={record.id} record={record} onDelete={onDelete} />)}
        </div>
      </section>
    </div>
  );
}

function Downloads({ history, onDelete, onClear }: { history: AnalysisRecord[]; onDelete: (id: string) => void; onClear: () => void }) {
  return (
    <div className="vf-page">
      <header className="vf-page-header">
        <div>
          <div className="vf-kicker">Local trace / 02</div>
          <h1 className="vf-page-title">Your analysis history.</h1>
          <p className="vf-page-subtitle">A private record of the URLs you checked in this browser, so you can pick up where you left off.</p>
        </div>
      </header>
      <section className="vf-download-callout" aria-label="Download policy notice">
        <span className="vf-callout-icon" aria-hidden="true"><ShieldCheck size={19} /></span>
        <div><h2>VidFlow does not download protected media.</h2><p>We only validate the structure of the URL you paste. We do not fetch content, remove restrictions, or suggest ways around platform protections. Continue only with content you are authorized to use.</p></div>
      </section>
      <section className="vf-section" aria-labelledby="history-heading">
        <div className="vf-section-head">
          <div><div className="vf-kicker">Stored on this device</div><h2 id="history-heading">Saved checks <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13, fontWeight: 400 }}>({history.length})</span></h2></div>
          {history.length > 0 && <button type="button" className="vf-button vf-button-danger" onClick={onClear} data-testid="button-clear-history"><Trash2 size={14} /> Clear all</button>}
        </div>
        <div className="vf-card vf-history">
          {history.length === 0 ? <EmptyHistory /> : history.map((record) => <HistoryRow key={record.id} record={record} onDelete={onDelete} />)}
        </div>
      </section>
      <section className="vf-section vf-card vf-mini-card">
        <div className="vf-kicker">A note on storage</div>
        <h3>Nothing leaves this browser.</h3>
        <p>History is saved only to local storage on this device. Use Settings to stop retaining future checks or reset this list at any time.</p>
        <Link href="/settings" className="vf-text-link" style={{ marginTop: 16 }} data-testid="link-history-settings">Manage retention <ArrowRight size={14} /></Link>
      </section>
    </div>
  );
}

function SettingsPage({ settings, historyCount, onSettingsChange, onReset }: { settings: Settings; historyCount: number; onSettingsChange: (settings: Settings) => void; onReset: () => void }) {
  const [notice, setNotice] = useState('');
  const selectAccent = (accent: string) => {
    onSettingsChange({ ...settings, accent });
    setNotice('Accent updated.');
  };
  const toggleHistory = () => {
    const next = !settings.keepHistory;
    onSettingsChange({ ...settings, keepHistory: next });
    setNotice(next ? 'New checks will be saved locally.' : 'Local history retention is off.');
  };
  const reset = () => {
    onReset();
    setNotice('Local analysis history reset.');
  };

  return (
    <div className="vf-page">
      <header className="vf-page-header">
        <div>
          <div className="vf-kicker">Control room / 03</div>
          <h1 className="vf-page-title">Set your signal.</h1>
          <p className="vf-page-subtitle">Tune VidFlow’s local experience. These preferences stay in this browser and can be changed anytime.</p>
        </div>
      </header>
      <div className="vf-settings-stack">
        <section className="vf-card vf-setting-card" aria-labelledby="accent-heading">
          <div className="vf-setting-row">
            <div className="vf-setting-copy"><h2 id="accent-heading">Theme accent</h2><p>Choose the signal color used for actions, focus states, and successful checks.</p></div>
            <Palette size={19} color="hsl(var(--muted-foreground))" aria-hidden="true" />
          </div>
          <div className="vf-accent-options" role="radiogroup" aria-label="Theme accent">
            {ACCENTS.map((accent) => (
              <button key={accent.value} type="button" className="vf-accent-option" style={{ background: `hsl(${accent.value})` }} data-selected={settings.accent === accent.value} aria-label={accent.name} aria-pressed={settings.accent === accent.value} onClick={() => selectAccent(accent.value)} data-testid={`button-accent-${accent.name.toLowerCase().replaceAll(' ', '-')}`} />
            ))}
          </div>
        </section>
        <section className="vf-card vf-setting-card" aria-labelledby="retention-heading">
          <div className="vf-setting-row">
            <div className="vf-setting-copy"><h2 id="retention-heading">Keep local analysis history</h2><p>When enabled, checked URLs are saved only in this browser so you can revisit the structural result. No media is stored.</p></div>
            <button type="button" className="vf-toggle" data-on={settings.keepHistory} aria-pressed={settings.keepHistory} aria-label="Toggle local analysis history retention" onClick={toggleHistory} data-testid="button-toggle-history"><span className="sr-only">Toggle history retention</span></button>
          </div>
          <div className="vf-setting-divider" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 12 }}><Info size={14} /> {settings.keepHistory ? `${historyCount} ${historyCount === 1 ? 'check' : 'checks'} currently stored locally.` : 'New checks will not be retained locally.'}</div>
        </section>
        <section className="vf-card vf-setting-card" aria-labelledby="reset-heading">
          <div className="vf-setting-row">
            <div className="vf-setting-copy"><h2 id="reset-heading">Reset local history</h2><p>Remove every saved analysis from this browser. This cannot be undone.</p></div>
            <button type="button" className="vf-button vf-button-danger" onClick={reset} disabled={historyCount === 0} data-testid="button-reset-history"><RotateCcw size={14} /> Reset</button>
          </div>
        </section>
        {notice && <div className="vf-status-note" role="status" data-testid="status-settings-update"><Check size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />{notice}</div>}
      </div>
      <section className="vf-section vf-card vf-mini-card">
        <div className="vf-kicker">Guardrails</div>
        <h3>Built for a clear next step.</h3>
        <p>VidFlow checks URL structure only. It never downloads content, bypasses access controls, or handles protected media.</p>
      </section>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const [history, setHistory] = useState<AnalysisRecord[]>(readHistory);
  const [settings, setSettings] = useState<Settings>(readSettings);
  const visibleHistory = useMemo(() => history.slice().sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()), [history]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accent);
    document.documentElement.style.setProperty('--primary', settings.accent);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const addRecord = (record: AnalysisRecord) => {
    if (!settings.keepHistory) return;
    setHistory((current) => [record, ...current].slice(0, 50));
  };
  const deleteRecord = (id: string) => setHistory((current) => current.filter((record) => record.id !== id));
  const clearHistory = () => setHistory([]);
  const updateSettings = (next: Settings) => setSettings(next);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  return (
    <RoutedErrorBoundary>
      <AppShell currentPath={location}>
        <Switch>
          <Route path="/"><Home history={visibleHistory} onAdd={addRecord} onDelete={deleteRecord} /></Route>
          <Route path="/downloads"><Downloads history={visibleHistory} onDelete={deleteRecord} onClear={clearHistory} /></Route>
          <Route path="/settings"><SettingsPage settings={settings} historyCount={history.length} onSettingsChange={updateSettings} onReset={clearHistory} /></Route>
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

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "./lib/supabase";

// ─── Constants ──────────────────────────────────────────────────
const INITIAL_POINTS = 1000;
const SPORT_LABELS = { big3: "BIG3", bench: "ベンチプレスのみ", deadlift: "デッドリフトのみ", squat: "スクワットのみ" };
const fmt = (n) => (typeof n === "number" ? n.toLocaleString() + " kg" : "—");

// ─── Auth Context ───────────────────────────────────────────────
const AuthCtx = createContext(null);

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // users table row
  const [loading, setLoading] = useState(true);
  const [needsName, setNeedsName] = useState(false);

  // Listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setNeedsName(false); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (uid) => {
    const { data } = await supabase.from("users").select("*").eq("id", uid).single();
    if (data) {
      setProfile(data);
      setNeedsName(false);
    } else {
      setNeedsName(true);
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const registerName = async (displayName) => {
    if (!session) return { error: "ログインしてください" };
    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length < 1 || trimmed.length > 20) {
      return { error: "名前は1〜20文字で入力してください" };
    }
    // Check reserved_names
    const { data: existing } = await supabase
      .from("reserved_names")
      .select("display_name")
      .ilike("display_name", trimmed);
    if (existing && existing.length > 0) {
      return { error: "この名前はすでに使われています" };
    }
    // Reserve name
    const { error: reserveErr } = await supabase
      .from("reserved_names")
      .insert({ display_name: trimmed, user_id: session.user.id });
    if (reserveErr) return { error: "名前の登録に失敗しました" };
    // Create user profile
    const { error: userErr } = await supabase.from("users").insert({
      id: session.user.id,
      email: session.user.email,
      display_name: trimmed,
      avatar_url: session.user.user_metadata?.avatar_url || null,
      role: "athlete",,
    });
    if (userErr) return { error: "ユーザー登録に失敗しました: " + userErr.message };
    await loadProfile(session.user.id);
    return { error: null };
  };

  return (
    <AuthCtx.Provider value={{
      session, profile, loading, needsName,
      signInWithGoogle, signOut, registerName,
      isAdmin: profile?.role === "admin",
      isAthlete: profile?.role === "athlete" || profile?.role === "admin",
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

const useAuth = () => useContext(AuthCtx);

// ─── Colors & Fonts ─────────────────────────────────────────────
const C = {
  bg: "#0A0A0F", surface: "#14141F", surfaceHover: "#1C1C2E",
  border: "#2A2A3E", gold: "#F5A623", accent: "#FF4757",
  green: "#2ED573", text: "#E8E6F0", textDim: "#8888A0", textMuted: "#55556A",
};
const F = {
  display: "'Trebuchet MS', 'Lucida Grande', sans-serif",
  body: "'Segoe UI', 'Helvetica Neue', sans-serif",
  mono: "'Courier New', monospace",
};

// ─── Shared Styles ──────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: F.body, fontSize: 14, margin: 0 },
  header: {
    background: `linear-gradient(135deg, ${C.surface} 0%, #1a1a2e 100%)`,
    borderBottom: `1px solid ${C.border}`, padding: "12px 16px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 100, flexWrap: "wrap", gap: 8,
  },
  logo: {
    fontFamily: F.display, fontSize: 20, fontWeight: 900, color: C.gold,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 8, userSelect: "none",
  },
  nav: { display: "flex", gap: 4, flexWrap: "wrap" },
  navBtn: (a) => ({
    padding: "7px 14px", borderRadius: 8, border: "none",
    background: a ? C.gold : "transparent", color: a ? C.bg : C.textDim,
    fontWeight: a ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: F.body,
  }),
  page: { maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" },
  pageTitle: { fontFamily: F.display, fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 4 },
  pageSub: { color: C.textDim, fontSize: 14, marginBottom: 24 },
  card: {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: 20, marginBottom: 12, transition: "all 0.2s",
  },
  cardTitle: { fontFamily: F.display, fontSize: 17, fontWeight: 800, marginBottom: 4 },
  badge: (c) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 700, background: c + "22", color: c,
  }),
  input: {
    width: "100%", padding: "12px 16px", borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
    fontSize: 15, fontFamily: F.body, outline: "none", boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "12px 16px", borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.bg, color: C.text,
    fontSize: 15, fontFamily: F.body, outline: "none", boxSizing: "border-box",
  },
  btn: (v = "primary") => ({
    padding: "12px 24px", borderRadius: 8, border: "none",
    fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: F.body,
    ...(v === "primary" ? { background: C.gold, color: C.bg }
      : v === "danger" ? { background: C.accent, color: "#fff" }
      : v === "google" ? { background: "#fff", color: "#333" }
      : { background: C.border, color: C.text }),
  }),
  label: { display: "block", fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" },
  fg: { marginBottom: 16 },
  empty: { textAlign: "center", padding: "60px 20px", color: C.textMuted },
  divider: { height: 1, background: C.border, margin: "20px 0" },
  leaderRow: (i) => ({
    display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderRadius: 10, marginBottom: 8,
    background: i === 0 ? C.gold + "18" : i === 1 ? "#C0C0C012" : i === 2 ? "#CD7F3212" : C.surface,
    border: `1px solid ${i === 0 ? C.gold + "40" : i === 1 ? "#C0C0C040" : i === 2 ? "#CD7F3240" : C.border}`,
  }),
  rankBadge: (i) => ({
    width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: 16, fontFamily: F.display,
    background: i === 0 ? C.gold : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : C.border,
    color: i < 3 ? C.bg : C.textDim, flexShrink: 0,
  }),
};

const GlobalStyle = () => (
  <style>{`
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; background: ${C.bg}; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  `}</style>
);

// ─── Icons ──────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const d = {
    back: <polyline points="15 18 9 12 15 6" />,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  };
  if (!d[name]) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{d[name]}</svg>
  );
};

// ─── Sub Components ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = { open: { l: "予想受付中", c: C.green }, closed: { l: "予想締切", c: C.gold }, settled: { l: "結果確定", c: C.accent } };
  const { l, c } = m[status] || m.open;
  return <span style={S.badge(c)}>{l}</span>;
}

function PointBar({ used, total = INITIAL_POINTS }) {
  const pct = (used / total) * 100;
  const clr = pct > 80 ? C.accent : pct > 50 ? C.gold : C.green;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: C.textDim }}>使用済み: {used} MP</span>
        <span style={{ color: clr, fontWeight: 700 }}>残り: {total - used} MP</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: clr, borderRadius: 3, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function BackBtn({ onClick, label = "戻る" }) {
  return (
    <button style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 4, fontSize: 14, padding: 0, fontFamily: F.body }} onClick={onClick}>
      <Icon name="back" size={16} /> {label}
    </button>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 999,
      padding: "12px 24px", borderRadius: 10,
      background: toast.type === "success" ? C.green : toast.type === "error" ? C.accent : C.gold,
      color: C.bg, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      animation: "fadeIn 0.2s ease",
    }}>{toast.msg}</div>
  );
}

// ─── Settlement Logic ───────────────────────────────────────────
function settleAthlete(predictions, actualResult) {
  const totalPool = predictions.reduce((s, p) => s + p.amount, 0);
  if (totalPool === 0) return { winners: [], athleteWins: false, reason: "none" };

  const exactFull = predictions.filter(p => p.predicted_total === actualResult && p.amount === INITIAL_POINTS);
  if (exactFull.length > 0) {
    const share = totalPool / exactFull.length;
    return { winners: exactFull.map(p => ({ ...p, pointsWon: Math.floor(share) })), athleteWins: false, reason: "exact" };
  }

  const allBelow = predictions.every(p => p.predicted_total < actualResult);
  if (allBelow) {
    return { winners: [], athleteWins: true, athletePoints: totalPool, reason: "athlete_wins" };
  }

  const belowPreds = predictions.filter(p => p.predicted_total < actualResult);
  if (belowPreds.length === 0) {
    return { winners: [], athleteWins: false, reason: "none" };
  }

  const maxBelow = Math.max(...belowPreds.map(p => p.predicted_total));
  const winningPreds = belowPreds.filter(p => p.predicted_total === maxBelow);
  const totalWinnerStake = winningPreds.reduce((s, p) => s + p.amount, 0);

  return {
    winners: winningPreds.map(p => ({ ...p, pointsWon: Math.floor((p.amount / totalWinnerStake) * totalPool) })),
    athleteWins: false, reason: "closest",
  };
}

// ─── Main App ───────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <GlobalStyle />
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const auth = useAuth();
  const [page, setPage] = useState("home");
  const [pageArg, setPageArg] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const nav = useCallback((pg, arg = null) => { setPage(pg); setPageArg(arg); }, []);

  if (auth.loading) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
          <div style={{ color: C.gold, fontWeight: 700, fontFamily: F.display }}>LOADING...</div>
        </div>
      </div>
    );
  }

  // Name registration for new Google users
  if (auth.session && auth.needsName) {
    return (
      <div style={S.app}>
        <GlobalStyle />
        <NameRegistration />
      </div>
    );
  }

  return (
    <div style={S.app}>
      <Toast toast={toast} />

      {/* Header */}
      <header style={S.header}>
        <div style={S.logo} onClick={() => nav("home")}>
          <span style={{ fontSize: 22 }}>🏋️</span>
          <span>MUSCLE<span style={{ color: C.text }}>PREDICT</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <nav style={S.nav}>
            {[["home", "大会"], ["leaderboard", "ランキング"], ["rules", "ルール"]].map(([pg, label]) => (
              <button key={pg} style={S.navBtn(page === pg || (pg === "home" && page === "event"))}
                onClick={() => nav(pg)}>{label}</button>
            ))}
            {auth.isAdmin && (
              <button style={S.navBtn(page === "admin")} onClick={() => nav("admin")}>管理</button>
            )}
          </nav>
          {auth.profile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.textDim }}>{auth.profile.display_name}</span>
              <button onClick={auth.signOut}
                style={{ background: "none", border: "none", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: F.body }}>
                ログアウト
              </button>
            </div>
          ) : (
            <button style={{ ...S.btn("google"), padding: "6px 14px", fontSize: 12 }}
              onClick={auth.signInWithGoogle}>
              Googleでログイン
            </button>
          )}
        </div>
      </header>

      <div style={S.page}>
        {page === "home" && <HomePage nav={nav} />}
        {page === "event" && <EventPage eventId={pageArg} nav={nav} showToast={showToast} />}
        {page === "leaderboard" && <LeaderboardPage />}
        {page === "rules" && <RulesPage />}
        {page === "admin" && auth.isAdmin && <AdminPage nav={nav} showToast={showToast} />}
      </div>
    </div>
  );
}

// ─── Name Registration ──────────────────────────────────────────
function NameRegistration() {
  const auth = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    const { error: err } = await auth.registerName(name);
    if (err) setError(err);
    setSubmitting(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 16 }}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: 32,
        border: `1px solid ${C.border}`, maxWidth: 400, width: "100%", textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💪</div>
        <h2 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
          ようこそ！
        </h2>
        <p style={{ color: C.textDim, fontSize: 14, marginBottom: 24 }}>
          表示名を決めてください（後から変更できません）
        </p>
        <div style={S.fg}>
          <input style={S.input} placeholder="表示名（1〜20文字）" value={name} maxLength={20}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) submit(); }} />
        </div>
        {error && <p style={{ color: C.accent, fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button style={{ ...S.btn("primary"), width: "100%", opacity: name.trim() && !submitting ? 1 : 0.5 }}
          disabled={!name.trim() || submitting} onClick={submit}>
          {submitting ? "登録中..." : "この名前で始める"}
        </button>
        <p style={{ color: C.textMuted, fontSize: 11, marginTop: 16 }}>
          ※ この名前はランキングや予想一覧で公開されます
        </p>
      </div>
    </div>
  );
}

// ─── Home Page ──────────────────────────────────────────────────
function HomePage({ nav }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("*, event_athletes(count)")
        .order("event_date", { ascending: false });
      setEvents(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 style={S.pageTitle}>大会一覧</h1>
      <p style={S.pageSub}>パワーリフティング大会の結果を予想しよう</p>
      {loading ? (
        <div style={S.empty}><p>読み込み中...</p></div>
      ) : events.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏋️</div>
          <p style={{ color: C.textDim }}>まだ大会がありません</p>
        </div>
      ) : events.map((ev) => (
        <div key={ev.id} style={{ ...S.card, cursor: "pointer" }} onClick={() => nav("event", ev.id)}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.surfaceHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.surface; }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={S.cardTitle}>{ev.name}</div>
            <StatusBadge status={ev.status} />
          </div>
          <div style={{ color: C.textDim, fontSize: 13, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>📅 {ev.event_date}</span>
            <span style={S.badge(C.gold)}>{SPORT_LABELS[ev.sport_type]}</span>
            {!ev.is_public && <span>🔒 合言葉制</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Event Page ─────────────────────────────────────────────────
function EventPage({ eventId, nav, showToast }) {
  const auth = useAuth();
  const [event, setEvent] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predMode, setPredMode] = useState(null);
  const [predAmount, setPredAmount] = useState("");
  const [predTotal, setPredTotal] = useState("");
  const [predSquat, setPredSquat] = useState("");
  const [predBench, setPredBench] = useState("");
  const [predDeadlift, setPredDeadlift] = useState("");
  const [predMessage, setPredMessage] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);

  const loadData = async () => {
    const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (!ev) { setLoading(false); return; }
    setEvent(ev);

    // Check password access
    if (ev.password && !accessGranted) {
      setLoading(false);
      return;
    }

    const { data: aths } = await supabase
      .from("event_athletes")
      .select("*, users(display_name, avatar_url)")
      .eq("event_id", eventId);
    setAthletes(aths || []);

    const { data: preds } = await supabase
      .from("predictions")
      .select("*, users(display_name)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    setPredictions(preds || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [eventId, accessGranted]);

  const checkPassword = () => {
    if (event && passwordInput === event.password) {
      setAccessGranted(true);
    } else {
      showToast("合言葉が違います", "error");
    }
  };

  // Show password gate
  if (event && event.password && !accessGranted) {
    return (
      <div>
        <BackBtn onClick={() => nav("home")} label="大会一覧へ" />
        <div style={{ ...S.card, cursor: "default", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 800, marginBottom: 12 }}>合言葉が必要です</h2>
          <div style={{ maxWidth: 300, margin: "0 auto" }}>
            <input style={S.input} type="password" placeholder="合言葉を入力"
              value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") checkPassword(); }} />
            <button style={{ ...S.btn("primary"), width: "100%", marginTop: 12 }} onClick={checkPassword}>
              入室する
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={S.empty}><p>読み込み中...</p></div>;
  if (!event) return <div style={S.empty}>大会が見つかりません</div>;

  const myPreds = predictions.filter(p => p.user_id === auth.profile?.id);
  const myUsed = myPreds.reduce((s, p) => s + p.amount, 0);
  const remaining = INITIAL_POINTS - myUsed;
  const isBig3 = event.sport_type === "big3";

  const submitPrediction = async () => {
    if (!auth.profile) { showToast("ログインが必要です", "error"); return; }
    const amount = parseInt(predAmount);
    const total = parseFloat(predTotal);
    if (!amount || amount <= 0 || amount > remaining) { showToast("ポイントが不正です", "error"); return; }
    if (!total || total <= 0) { showToast("記録を入力してください", "error"); return; }

    const row = {
      event_id: eventId,
      athlete_id: predMode.athleteId,
      user_id: auth.profile.id,
      amount,
      predicted_total: total,
      predicted_squat: isBig3 ? parseFloat(predSquat) || null : null,
      predicted_bench: (isBig3 || event.sport_type === "bench") ? parseFloat(predBench) || null : null,
      predicted_deadlift: (isBig3 || event.sport_type === "deadlift") ? parseFloat(predDeadlift) || null : null,
      message: predMessage.trim() || null,
    };

    const { error } = await supabase.from("predictions").insert(row);
    if (error) { showToast("予想の保存に失敗しました: " + error.message, "error"); return; }
    setPredMode(null); setPredAmount(""); setPredTotal("");
    setPredSquat(""); setPredBench(""); setPredDeadlift(""); setPredMessage("");
    showToast(`${amount} MPで予想しました！`);
    await loadData();
  };

  const deletePrediction = async (predId) => {
    await supabase.from("predictions").delete().eq("id", predId);
    showToast("予想を取り消しました");
    await loadData();
  };

  // Event leaderboard (when settled)
  const eventResults = event.status === "settled" ? (() => {
    const results = {};
    for (const ath of athletes) {
      if (ath.result_total == null) continue;
      const athPreds = predictions.filter(p => p.athlete_id === ath.id);
      const settlement = settleAthlete(athPreds, ath.result_total);
      for (const w of settlement.winners) {
        const name = w.users?.display_name || w.guest_name || "?";
        results[name] = (results[name] || 0) + w.pointsWon;
      }
    }
    return Object.entries(results).sort((a, b) => b[1] - a[1]);
  })() : [];

  return (
    <div>
      <BackBtn onClick={() => nav("home")} label="大会一覧へ" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <h1 style={{ ...S.pageTitle, marginBottom: 0 }}>{event.name}</h1>
        <StatusBadge status={event.status} />
      </div>
      <div style={{ color: C.textDim, fontSize: 13, marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span>📅 {event.event_date}</span>
        <span style={S.badge(C.gold)}>{SPORT_LABELS[event.sport_type]}</span>
      </div>

      {/* My Points */}
      {event.status === "open" && auth.profile && (
        <div style={{ ...S.card, cursor: "default", marginBottom: 24, background: C.bg, border: `1px solid ${C.gold}30` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{ fontWeight: 700, color: C.gold }}>あなたのマッスルポイント</span>
          </div>
          <PointBar used={myUsed} />
        </div>
      )}

      {/* Login prompt */}
      {event.status === "open" && !auth.profile && (
        <div style={{ ...S.card, cursor: "default", textAlign: "center", marginBottom: 24 }}>
          <p style={{ color: C.textDim, marginBottom: 12 }}>予想するにはログインが必要です</p>
          <button style={S.btn("google")} onClick={auth.signInWithGoogle}>Googleでログイン</button>
        </div>
      )}

      {/* Event Leaderboard (after settled) */}
      {event.status === "settled" && eventResults.length > 0 && (
        <div style={{ ...S.card, cursor: "default", marginBottom: 24 }}>
          <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>🏆 この大会のランキング</h3>
          {eventResults.map(([name, pts], i) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < eventResults.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 900, color: i === 0 ? C.gold : C.textDim, width: 24 }}>{i + 1}</span>
                <span style={{ fontWeight: 600 }}>{name}</span>
              </div>
              <span style={{ fontWeight: 800, color: C.gold }}>{pts.toLocaleString()} MP</span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 800, marginBottom: 12 }}>出場選手</h2>

      {athletes.length === 0 ? (
        <div style={{ ...S.empty, padding: "40px 20px" }}>
          <p style={{ color: C.textMuted }}>選手がまだ登録されていません</p>
        </div>
      ) : athletes.map((ath) => {
        const athPreds = predictions.filter(p => p.athlete_id === ath.id);
        const athName = ath.users?.display_name || "選手";
        const isSettled = event.status === "settled";
        const result = ath.result_total;
        let settlement = null;
        if (isSettled && result != null) settlement = settleAthlete(athPreds, result);

        return (
          <div key={ath.id} style={{ ...S.card, cursor: "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ ...S.cardTitle, fontSize: 16 }}>{athName}</div>
                {ath.weight_class && <span style={{ fontSize: 12, color: C.textMuted }}>{ath.weight_class}</span>}
              </div>
              {isSettled && result != null && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>結果</div>
                  <div style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, color: C.gold }}>{fmt(result)}</div>
                  {isBig3 && (
                    <div style={{ fontSize: 11, color: C.textDim }}>
                      S:{fmt(ath.result_squat)} B:{fmt(ath.result_bench)} D:{fmt(ath.result_deadlift)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Predictions list */}
            {athPreds.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: 8, fontWeight: 600 }}>
                  予想一覧 ({athPreds.length}件)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {athPreds.map((p) => {
                    const isMine = p.user_id === auth.profile?.id;
                    const predName = p.users?.display_name || p.guest_name || "ゲスト";
                    const isWinner = settlement?.winners?.some(w => w.id === p.id);
                    const wonPts = settlement?.winners?.find(w => w.id === p.id)?.pointsWon;
                    return (
                      <div key={p.id} style={{
                        padding: "10px 12px", borderRadius: 8, fontSize: 13,
                        background: isWinner ? C.gold + "18" : isMine ? C.surface : C.bg,
                        border: `1px solid ${isWinner ? C.gold + "50" : isMine ? C.gold + "30" : C.border}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isMine && <span style={{ fontSize: 10, color: C.gold }}>●</span>}
                            <span style={{ fontWeight: isMine ? 700 : 400 }}>{predName}</span>
                            <span style={S.badge(C.gold)}>{p.amount} MP</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontFamily: F.mono }}>{fmt(p.predicted_total)}</span>
                            {isWinner && <span style={{ ...S.badge(C.green), fontWeight: 800 }}>+{wonPts} MP</span>}
                            {isMine && event.status === "open" && (
                              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                                onClick={() => deletePrediction(p.id)}>
                                <Icon name="x" size={14} color={C.accent} />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Detail predictions */}
                        {isBig3 && (p.predicted_squat || p.predicted_bench || p.predicted_deadlift) && (
                          <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                            S:{fmt(p.predicted_squat)} B:{fmt(p.predicted_bench)} D:{fmt(p.predicted_deadlift)}
                          </div>
                        )}
                        {/* Cheer message */}
                        {p.message && (
                          <div style={{ fontSize: 12, color: C.textDim, marginTop: 6, fontStyle: "italic" }}>
                            💬 {p.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Settlement summary */}
            {settlement && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                {settlement.reason === "athlete_wins" && (
                  <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>
                    🎉 {athName}が全予想を上回りました！ +{settlement.athletePoints} MP
                  </div>
                )}
                {settlement.reason === "exact" && (
                  <div style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>🎯 完全的中！（1000MP全賭け）</div>
                )}
                {settlement.reason === "closest" && (
                  <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>✅ 結果に最も近い予想が的中</div>
                )}
                {settlement.reason === "none" && (
                  <div style={{ color: C.textMuted, fontWeight: 700, fontSize: 13 }}>❌ 勝者なし</div>
                )}
              </div>
            )}

            {/* Predict form */}
            {event.status === "open" && auth.profile && remaining > 0 && (
              <div style={{ marginTop: 12 }}>
                {predMode?.athleteId === ath.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
                    {/* Sport-specific fields */}
                    {isBig3 && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}><label style={S.label}>スクワット</label>
                          <input type="number" style={S.input} placeholder="kg" value={predSquat} onChange={(e) => setPredSquat(e.target.value)} /></div>
                        <div style={{ flex: 1 }}><label style={S.label}>ベンチプレス</label>
                          <input type="number" style={S.input} placeholder="kg" value={predBench} onChange={(e) => setPredBench(e.target.value)} /></div>
                        <div style={{ flex: 1 }}><label style={S.label}>デッドリフト</label>
                          <input type="number" style={S.input} placeholder="kg" value={predDeadlift} onChange={(e) => setPredDeadlift(e.target.value)} /></div>
                      </div>
                    )}
                    {event.sport_type === "bench" && (
                      <div style={S.fg}><label style={S.label}>ベンチプレス (kg)</label>
                        <input type="number" style={S.input} placeholder="kg" value={predBench} onChange={(e) => { setPredBench(e.target.value); setPredTotal(e.target.value); }} /></div>
                    )}
                    {event.sport_type === "deadlift" && (
                      <div style={S.fg}><label style={S.label}>デッドリフト (kg)</label>
                        <input type="number" style={S.input} placeholder="kg" value={predDeadlift} onChange={(e) => { setPredDeadlift(e.target.value); setPredTotal(e.target.value); }} /></div>
                    )}
                    {event.sport_type === "squat" && (
                      <div style={S.fg}><label style={S.label}>スクワット (kg)</label>
                        <input type="number" style={S.input} placeholder="kg" value={predSquat} onChange={(e) => { setPredSquat(e.target.value); setPredTotal(e.target.value); }} /></div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      {isBig3 && (
                        <div style={{ flex: 1 }}><label style={S.label}>予想TOTAL (kg)</label>
                          <input type="number" style={S.input} placeholder="例: 450" value={predTotal} onChange={(e) => setPredTotal(e.target.value)} /></div>
                      )}
                      <div style={{ flex: 1 }}><label style={S.label}>使用MP (残{remaining})</label>
                        <input type="number" style={S.input} placeholder={`最大${remaining}`} value={predAmount} onChange={(e) => setPredAmount(e.target.value)} /></div>
                    </div>
                    {/* Message */}
                    <div><label style={S.label}>応援メッセージ（任意）</label>
                      <input style={S.input} placeholder="頑張って！" value={predMessage} onChange={(e) => setPredMessage(e.target.value)} /></div>
                    {/* Quick bet buttons */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[100, 300, 500, remaining].filter((v, i, a) => v > 0 && v <= remaining && a.indexOf(v) === i).map(v => (
                        <button key={v} style={{ ...S.badge(C.gold), cursor: "pointer", border: `1px solid ${C.gold}40`, fontSize: 12 }}
                          onClick={() => setPredAmount(String(v))}>
                          {v === remaining ? `全部 (${v})` : v} MP
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ ...S.btn("primary"), flex: 1 }} onClick={submitPrediction}>予想する</button>
                      <button style={S.btn("ghost")}
                        onClick={() => { setPredMode(null); setPredAmount(""); setPredTotal(""); setPredSquat(""); setPredBench(""); setPredDeadlift(""); setPredMessage(""); }}>
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <button style={{
                    ...S.btn("primary"), width: "100%", background: "transparent",
                    border: `1px dashed ${C.gold}60`, color: C.gold,
                  }} onClick={() => setPredMode({ athleteId: ath.id })}>
                    + この選手を予想する
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Leaderboard ────────────────────────────────────────────────
function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: lb } = await supabase.from("leaderboard").select("*");
      setData(lb || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 style={S.pageTitle}>🏆 ランキング</h1>
      <p style={S.pageSub}>累計マッスルポイントランキング</p>
      {loading ? <div style={S.empty}><p>読み込み中...</p></div>
        : data.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🥇</div>
            <p style={{ color: C.textMuted }}>まだランキングがありません</p>
          </div>
        ) : (
          <div>
            {data.length >= 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
                {data.slice(0, 3).map((entry, i) => (
                  <div key={entry.player_id} style={{
                    textAlign: "center", padding: "24px 20px", borderRadius: 16, background: C.surface,
                    border: `2px solid ${i === 0 ? C.gold : i === 1 ? "#C0C0C0" : "#CD7F32"}40`,
                    minWidth: 110, flex: 1, maxWidth: 200, transform: i === 0 ? "scale(1.05)" : "scale(1)",
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{["🥇", "🥈", "🥉"][i]}</div>
                    <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{entry.display_name}</div>
                    <div style={{
                      fontFamily: F.display, fontSize: 22, fontWeight: 900,
                      color: i === 0 ? C.gold : i === 1 ? "#C0C0C0" : "#CD7F32",
                    }}>{Number(entry.total_points).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>MUSCLE POINTS</div>
                  </div>
                ))}
              </div>
            )}
            {data.map((entry, i) => (
              <div key={entry.player_id} style={S.leaderRow(i)}>
                <div style={S.rankBadge(i)}>{i + 1}</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{entry.display_name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{entry.events_participated}大会参加</div></div>
                <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 18, color: i < 3 ? C.gold : C.text }}>
                  {Number(entry.total_points).toLocaleString()}
                  <span style={{ fontSize: 11, color: C.textDim, marginLeft: 4 }}>MP</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── Rules Page ─────────────────────────────────────────────────
function RulesPage() {
  return (
    <div>
      <h1 style={S.pageTitle}>📋 ルール</h1>
      <p style={S.pageSub}>マッスルポイント予想システムについて</p>

      <div style={{ ...S.card, cursor: "default" }}>
        <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, marginBottom: 12, color: C.accent }}>
          ⚠️ これは賭け事ではありません
        </h3>
        <p style={{ color: C.textDim, fontSize: 14, lineHeight: 1.8 }}>
          「マッスルポイント（MP）」はこのサイトのランキング表示にのみ使用される架空のポイントです。
          実際の金銭や有価物とは一切関係がなく、交換・換金・譲渡はできません。
          友達同士で楽しむためのゲームです。
        </p>
      </div>

      <div style={{ ...S.card, cursor: "default" }}>
        <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>基本ルール</h3>
        <div style={{ color: C.textDim, fontSize: 14, lineHeight: 2 }}>
          <p>・大会にエントリーすると <strong style={{ color: C.gold }}>1,000 MP</strong> が配られます</p>
          <p>・選手の総重量記録を予想し、MPを賭けます</p>
          <p>・ポイントは分割可能（例: 300MP + 700MP）</p>
          <p>・予想は大会前日まで。選手は大会当日中に記録を登録</p>
          <p>・MPは大会をまたいで持ち越せません。毎回1,000MPでスタート</p>
        </div>
      </div>

      <div style={{ ...S.card, cursor: "default" }}>
        <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>勝敗の判定</h3>
        <div style={{ color: C.textDim, fontSize: 14, lineHeight: 2 }}>
          <p>・<strong style={{ color: C.gold }}>1000MP全賭けで完全的中</strong> → 全ポイント総取り</p>
          <p>・<strong style={{ color: C.green }}>全予想を選手が上回った</strong> → 選手が全ポイント獲得</p>
          <p>・<strong style={{ color: C.text }}>それ以外</strong> → 結果より低く、最も結果に近い予想をした人が勝ち</p>
          <p>・同じ予想が複数いた場合 → 賭けたMP比例で分配</p>
        </div>
      </div>

      <div style={{ ...S.card, cursor: "default" }}>
        <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>選手とサポーター</h3>
        <div style={{ color: C.textDim, fontSize: 14, lineHeight: 2 }}>
          <p>・<strong style={{ color: C.gold }}>選手</strong>: 大会に出場する人。ログイン必須</p>
          <p>・<strong style={{ color: C.text }}>サポーター</strong>: 予想する人。ログインして予想に参加</p>
          <p>・全ての予想を選手が上回ると、選手がポイントを獲得できます</p>
          <p>・つまり選手にとっては「予想を超える」ことがモチベーションに！</p>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Page ─────────────────────────────────────────────────
function AdminPage({ nav, showToast }) {
  const auth = useAuth();
  const [view, setView] = useState("list");
  const [events, setEvents] = useState([]);
  const [manageId, setManageId] = useState(null);
  const [loading, setLoading] = useState(true);
  // Create form
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newSport, setNewSport] = useState("big3");
  const [newPassword, setNewPassword] = useState("");
  const [newPublic, setNewPublic] = useState(true);
  // Athlete add
  const [athleteSearch, setAthleteSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [resultInputs, setResultInputs] = useState({});

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*, event_athletes(*, users(display_name))")
      .order("event_date", { ascending: false });
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, []);

  const createEvent = async () => {
    if (!newName.trim() || !newDate) return;
    const { error } = await supabase.from("events").insert({
      name: newName.trim(),
      event_date: newDate,
      sport_type: newSport,
      password: newPassword.trim() || null,
      is_public: newPublic,
      created_by: auth.profile.id,
    });
    if (error) { showToast("作成に失敗: " + error.message, "error"); return; }
    setNewName(""); setNewDate(""); setNewSport("big3"); setNewPassword("");
    setView("list");
    showToast("大会を作成しました！");
    await loadEvents();
  };

  const manageEvent = events.find(e => e.id === manageId);

  const searchAthletes = async (q) => {
    setAthleteSearch(q);
    if (q.length < 1) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("users")
      .select("id, display_name")
      .or(`role.eq.athlete,role.eq.admin`)
      .ilike("display_name", `%${q}%`)
      .limit(5);
    setSearchResults(data || []);
  };

  const addAthlete = async (userId) => {
    const { error } = await supabase.from("event_athletes").insert({
      event_id: manageId,
      user_id: userId,
    });
    if (error) { showToast("追加に失敗: " + error.message, "error"); return; }
    setAthleteSearch(""); setSearchResults([]);
    showToast("選手を追加しました");
    await loadEvents();
  };

  const removeAthlete = async (eaId) => {
    await supabase.from("event_athletes").delete().eq("id", eaId);
    showToast("選手を削除しました");
    await loadEvents();
  };

  const toggleStatus = async (eventId, newStatus) => {
    await supabase.from("events").update({ status: newStatus }).eq("id", eventId);
    const labels = { open: "予想受付中", closed: "予想締切" };
    showToast(`ステータスを「${labels[newStatus]}」に変更しました`);
    await loadEvents();
  };

  const saveResult = async (eaId, field, value) => {
    await supabase.from("event_athletes").update({ [field]: value }).eq("id", eaId);
  };

  const settleEvent = async () => {
    if (!manageEvent) return;
    // Load predictions
    const { data: preds } = await supabase
      .from("predictions")
      .select("*")
      .eq("event_id", manageId);
    if (!preds) return;

    const athletes = manageEvent.event_athletes || [];
    const settlements = [];

    for (const ath of athletes) {
      if (ath.result_total == null) continue;
      const athPreds = preds.filter(p => p.athlete_id === ath.id);
      const result = settleAthlete(athPreds, ath.result_total);

      if (result.athleteWins) {
        settlements.push({
          event_id: manageId, athlete_id: ath.id,
          winner_user_id: ath.user_id, points_won: result.athletePoints,
          reason: "athlete_wins",
        });
      }
      for (const w of result.winners) {
        settlements.push({
          event_id: manageId, athlete_id: ath.id,
          prediction_id: w.id,
          winner_user_id: w.user_id || null,
          winner_guest_name: w.guest_name || null,
          points_won: w.pointsWon,
          reason: result.reason,
        });
      }
      if (!result.athleteWins && result.winners.length === 0) {
        settlements.push({
          event_id: manageId, athlete_id: ath.id,
          points_won: 0, reason: "none",
        });
      }
    }

    if (settlements.length > 0) {
      const { error } = await supabase.from("settlements").insert(settlements);
      if (error) { showToast("精算に失敗: " + error.message, "error"); return; }
    }
    await supabase.from("events").update({ status: "settled" }).eq("id", manageId);
    showToast("結果を確定しランキングに反映しました！🎉");
    await loadEvents();
  };

  const deleteEvent = async (eventId) => {
    if (!confirm("本当にこの大会を削除しますか？")) return;
    await supabase.from("events").delete().eq("id", eventId);
    setManageId(null); setView("list");
    showToast("大会を削除しました");
    await loadEvents();
  };

  // ── Create ──
  if (view === "create") {
    return (
      <div>
        <BackBtn onClick={() => setView("list")} />
        <h1 style={S.pageTitle}>大会を作成</h1>
        <div style={{ ...S.card, cursor: "default", marginTop: 20 }}>
          <div style={S.fg}><label style={S.label}>大会名</label>
            <input style={S.input} placeholder="例: 第30回東京都パワーリフティング選手権" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <div style={S.fg}><label style={S.label}>開催日</label>
            <input type="date" style={S.input} value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
          <div style={S.fg}><label style={S.label}>競技種目</label>
            <select style={S.select} value={newSport} onChange={(e) => setNewSport(e.target.value)}>
              {Object.entries(SPORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div style={S.fg}>
            <label style={{ ...S.label, display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={!newPublic} onChange={(e) => setNewPublic(!e.target.checked)} /> 合言葉制にする
            </label>
            {!newPublic && (
              <input style={{ ...S.input, marginTop: 8 }} placeholder="合言葉を設定" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            )}
          </div>
          <button style={{ ...S.btn("primary"), width: "100%", opacity: newName.trim() && newDate ? 1 : 0.5 }}
            disabled={!newName.trim() || !newDate} onClick={createEvent}>作成する</button>
        </div>
      </div>
    );
  }

  // ── Manage ──
  if (view === "manage" && manageEvent) {
    const athletes = manageEvent.event_athletes || [];
    const isBig3 = manageEvent.sport_type === "big3";
    return (
      <div>
        <BackBtn onClick={() => { setView("list"); setManageId(null); }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h1 style={{ ...S.pageTitle, marginBottom: 4 }}>{manageEvent.name}</h1>
          <StatusBadge status={manageEvent.status} />
        </div>
        <div style={{ color: C.textDim, fontSize: 13, marginBottom: 24, display: "flex", gap: 12 }}>
          <span>📅 {manageEvent.event_date}</span>
          <span style={S.badge(C.gold)}>{SPORT_LABELS[manageEvent.sport_type]}</span>
        </div>

        {/* Status */}
        <div style={{ ...S.card, cursor: "default" }}>
          <div style={{ ...S.label, marginBottom: 12 }}>ステータス変更</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["open", "closed"].map(s => (
              <button key={s} style={{ ...S.btn(manageEvent.status === s ? "primary" : "ghost"), fontSize: 13, padding: "8px 16px" }}
                onClick={() => toggleStatus(manageId, s)}>
                {s === "open" ? "予想受付中" : "予想締切"}
              </button>
            ))}
          </div>
        </div>

        {/* Search & add athlete */}
        <h2 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 800, margin: "24px 0 12px" }}>選手管理</h2>
        <div style={{ ...S.card, cursor: "default" }}>
          <label style={S.label}>選手を検索して追加（ログイン済み選手のみ）</label>
          <input style={S.input} placeholder="選手名で検索..." value={athleteSearch} onChange={(e) => searchAthletes(e.target.value)} />
          {searchResults.length > 0 && (
            <div style={{ marginTop: 8, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {searchResults.map(u => {
                const already = athletes.some(a => a.user_id === u.id);
                return (
                  <div key={u.id} style={{
                    padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: `1px solid ${C.border}`, background: C.bg,
                  }}>
                    <span>{u.display_name}</span>
                    {already ? <span style={{ fontSize: 12, color: C.textMuted }}>追加済み</span> : (
                      <button style={{ ...S.btn("primary"), padding: "4px 12px", fontSize: 12 }} onClick={() => addAthlete(u.id)}>追加</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Athletes with results */}
        {athletes.map(ath => {
          const athName = ath.users?.display_name || "選手";
          return (
            <div key={ath.id} style={{ ...S.card, cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{athName}</span>
                  {ath.weight_class && <span style={{ color: C.textMuted, fontSize: 12, marginLeft: 8 }}>{ath.weight_class}</span>}
                </div>
                <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                  onClick={() => removeAthlete(ath.id)}>
                  <Icon name="x" size={16} color={C.accent} />
                </button>
              </div>
              {manageEvent.status === "closed" && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {isBig3 && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {[["result_squat", "スクワット"], ["result_bench", "ベンチ"], ["result_deadlift", "デッドリフト"]].map(([field, label]) => (
                        <div key={field} style={{ flex: 1 }}>
                          <label style={{ ...S.label, fontSize: 10 }}>{label}</label>
                          <input type="number" style={{ ...S.input, padding: "8px 12px", fontSize: 13 }}
                            placeholder="kg"
                            value={resultInputs[`${ath.id}_${field}`] ?? (ath[field] ?? "")}
                            onChange={(e) => setResultInputs(p => ({ ...p, [`${ath.id}_${field}`]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={S.label}>TOTAL (kg)</label>
                      <input type="number" style={S.input} placeholder="TOTAL"
                        value={resultInputs[`${ath.id}_result_total`] ?? (ath.result_total ?? "")}
                        onChange={(e) => setResultInputs(p => ({ ...p, [`${ath.id}_result_total`]: e.target.value }))} />
                    </div>
                    <button style={{ ...S.btn("primary"), padding: "12px 20px" }}
                      onClick={async () => {
                        const updates = {};
                        const fields = isBig3
                          ? ["result_squat", "result_bench", "result_deadlift", "result_total"]
                          : ["result_total"];
                        for (const f of fields) {
                          const val = parseFloat(resultInputs[`${ath.id}_${f}`]);
                          if (!isNaN(val) && val > 0) updates[f] = val;
                        }
                        if (Object.keys(updates).length === 0) { showToast("記録を入力してください", "error"); return; }
                        await supabase.from("event_athletes").update(updates).eq("id", ath.id);
                        showToast(`${athName}の結果を保存しました`);
                        await loadEvents();
                      }}>保存</button>
                  </div>
                </div>
              )}
              {ath.result_total != null && (
                <div style={{ marginTop: 8, color: C.green, fontSize: 13, fontWeight: 700 }}>✅ 結果: {fmt(ath.result_total)}</div>
              )}
            </div>
          );
        })}

        {/* Settle */}
        {manageEvent.status === "closed" && athletes.some(a => a.result_total != null) && (
          <button style={{ ...S.btn("primary"), width: "100%", marginTop: 16, padding: "16px 24px", fontSize: 16 }}
            onClick={settleEvent}>🏆 結果を確定してポイントを精算する</button>
        )}

        <div style={S.divider} />
        <button style={{ ...S.btn("danger"), width: "100%" }} onClick={() => deleteEvent(manageId)}>
          この大会を削除
        </button>
      </div>
    );
  }

  // ── List ──
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ ...S.pageTitle, marginBottom: 0 }}>⚙️ 管理画面</h1>
        <button style={S.btn("primary")} onClick={() => setView("create")}>+ 大会を作成</button>
      </div>
      {loading ? <div style={S.empty}><p>読み込み中...</p></div>
        : events.length === 0 ? (
          <div style={S.empty}><p style={{ color: C.textMuted }}>大会を作成してください</p></div>
        ) : events.map(ev => (
          <div key={ev.id} style={{ ...S.card, cursor: "pointer" }}
            onClick={() => { setManageId(ev.id); setView("manage"); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.surface; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={S.cardTitle}>{ev.name}</div>
                <div style={{ fontSize: 13, color: C.textDim }}>
                  📅 {ev.event_date} · 🏋️ {ev.event_athletes?.length || 0}名
                  {ev.password && " · 🔒"}
                </div>
              </div>
              <StatusBadge status={ev.status} />
            </div>
          </div>
        ))}
    </div>
  );
}

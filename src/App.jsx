import React, { useEffect, useMemo, useState } from "react";

/**
 * Kamdin Level-Up Dashboard
 * - Custom deadlines (datetime-local)
 * - Auto-penalties for overdue tasks (reads from localStorage each tick -> no stale state)
 * - Manual "Apply penalty now" for an overdue task
 * - Custom XP: Add or Subtract buttons
 */

const LEVEL_XP = 100;
const STORAGE_KEY = "kamdin_xp_state_v2";
const SNAPSHOT_KEY = "kamdin_xp_snapshots_v1";

const DEFAULT_STATS = [
  { key: "intelligence", label: "Intelligence", emoji: "🧠", xp: 0 },
  { key: "strength", label: "Strength", emoji: "💪", xp: 0 },
  { key: "creation", label: "Creation", emoji: "💻", xp: 0 },
  { key: "discipline", label: "Discipline", emoji: "🔥", xp: 0 },
  { key: "charisma", label: "Charisma", emoji: "💬", xp: 0 },
  { key: "mindfulness", label: "Mindfulness", emoji: "💖", xp: 0 },
  { key: "wisdom", label: "Wisdom", emoji: "🧭", xp: 0 },
];

const QUICK_ACTIONS = [
  { label: "Study 1 hr (DSA/WEB/SYD)", stat: "intelligence", xp: 15 },
  { label: "Solve hard problem", stat: "intelligence", xp: 20 },
  { label: "Exercise 30 min", stat: "strength", xp: 10 },
  { label: "Sleep 7+ hours", stat: "strength", xp: 10 },
  { label: "Healthy meal", stat: "strength", xp: 5 },
  { label: "Git commit/feature", stat: "creation", xp: 10 },
  { label: "Finish lab/assignment", stat: "creation", xp: 20 },
  { label: "Improve personal site", stat: "creation", xp: 15 },
  { label: "Follow daily plan", stat: "discipline", xp: 10 },
  { label: "Work even when tired", stat: "discipline", xp: 20 },
  { label: "Early submission", stat: "discipline", xp: 15 },
  { label: "Team sync / good message", stat: "charisma", xp: 10 },
  { label: "Help a classmate", stat: "charisma", xp: 15 },
  { label: "Handle OCD/anxiety episode", stat: "mindfulness", xp: 15 },
  { label: "Journal 10 min", stat: "mindfulness", xp: 10 },
  { label: "Avoid reactive anger", stat: "mindfulness", xp: 10 },
  { label: "Plan week / budget", stat: "wisdom", xp: 10 },
  { label: "Career research / decision", stat: "wisdom", xp: 15 },
  { label: "Clear decision after reflection", stat: "wisdom", xp: 20 },
];

const DEFAULT_QUESTS = [
  { id: "q1", title: "Finish DSA Lab 3", stat: "creation", xp: 20, done: false },
  { id: "q2", title: "WEB422 A1 complete", stat: "creation", xp: 20, done: false },
  { id: "q3", title: "3× workouts this week", stat: "strength", xp: 30, done: false },
  { id: "q4", title: "Journal 5× this week", stat: "mindfulness", xp: 50, done: false },
  { id: "q5", title: "Talk to 2 classmates", stat: "charisma", xp: 20, done: false },
];

const DEFAULT_TASKS = {
  intelligence: [],
  strength:    [],
  creation:    [],
  discipline:  [],
  charisma:    [],
  mindfulness: [],
  wisdom:      [],
};

function levelFromXp(xp) { return 1 + Math.floor(xp / LEVEL_XP); }
function progressWithinLevel(xp) { return xp % LEVEL_XP; }
function pct(a, b) { return Math.max(0, Math.min(100, Math.round((a / b) * 100))); }
function todayKey(d = new Date()) { return d.toISOString().slice(0,10); }

function nextDue(cadence, from = new Date()) {
  const now = new Date(from);

  if (cadence === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }

  // daily (same-day 23:59:59, unless already past then roll to tomorrow)
  const today2359 = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 0
  );

  if (now <= today2359) {
    return today2359.toISOString();
  } else {
    const tomorrow2359 = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      23, 59, 59, 0
    );
    return tomorrow2359.toISOString();
  }
}


/** Read-modify-write penalties from localStorage so it never uses stale React state. */
function penaltyEngineOnce() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { changed:false };
  let state;
  try { state = JSON.parse(raw); } catch { return {changed:false}; }
  const tasks = state.tasks || {};
  const stats = state.stats || [];
  const history = state.history || [];
  const now = Date.now();
  let changed = false;

  Object.keys(tasks).forEach(statKey => {
    tasks[statKey] = (tasks[statKey] || []).map(t => {
      if (!t || t.completedOnDate || !t.dueAt || !t.penalty || t.penalty <= 0) return t;
      const due = Date.parse(t.dueAt);
      if (!Number.isFinite(due) || now <= due) return t;

      // Prevent double-penalizing the same dueAt
      const last = t.lastPenaltyAt ? Date.parse(t.lastPenaltyAt) : NaN;
      const already = Number.isFinite(last) && Math.abs(last - due) < 60_000;
      if (already) return t;

      const stat = stats.find(s => s.key === statKey);
      if (stat) {
        stat.xp = Math.max(0, (stat.xp || 0) - t.penalty);
        history.unshift({ ts: new Date().toISOString(), label: `Penalty: ${t.title}`, stat: statKey, xp: -t.penalty });
        changed = true;
      }
      t.lastPenaltyAt = new Date(due).toISOString();
      t.dueAt = t.cadence ? nextDue(t.cadence, new Date()) : t.dueAt;
      return t;
    });
  });

  if (changed) {
    state.tasks = tasks;
    state.stats = stats;
    state.history = history.slice(0,200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  return { changed, state };
}

export default function App() {
  const [stats, setStats]   = useState(DEFAULT_STATS);
  const [quests, setQuests] = useState(DEFAULT_QUESTS);
  const [history, setHistory] = useState([]);
  const [tasks, setTasks]   = useState(DEFAULT_TASKS);
  const [openStat, setOpenStat] = useState(null);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.stats) setStats(data.stats);
        if (data.quests) setQuests(data.quests);
        if (data.history) setHistory(data.history);
        if (data.tasks) setTasks({ ...DEFAULT_TASKS, ...data.tasks });
      }
    } catch {}
  }, []);

  // Persist + daily snapshot
  useEffect(() => {
    const payload = { stats, quests, history, tasks };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    try {
      const day = todayKey();
      const all = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "{}");
      if (!all[day]) { all[day] = payload; localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(all)); }
    } catch {}
  }, [stats, quests, history, tasks]);

  // Penalty engine: run on mount, every minute, and on window focus
  useEffect(() => {
    const syncFromStorageIfChanged = () => {
      const { changed, state } = penaltyEngineOnce();
      if (changed && state) {
        setStats(state.stats || DEFAULT_STATS);
        setTasks({ ...DEFAULT_TASKS, ...(state.tasks || {}) });
        setHistory(state.history || []);
      }
    };
    syncFromStorageIfChanged();
    const onFocus = () => syncFromStorageIfChanged();
    window.addEventListener('focus', onFocus);
    const id = setInterval(syncFromStorageIfChanged, 60_000);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, []);

  const totals = useMemo(() => {
    const totalXp = stats.reduce((sum, s) => sum + s.xp, 0);
    const avgLevel = (stats.reduce((sum, s) => sum + levelFromXp(s.xp), 0) / stats.length).toFixed(1);
    return { totalXp, avgLevel };
  }, [stats]);

  function addXp(statKey, amount, label) {
    if (!amount) return;
    setStats((cur) => cur.map((s) => (s.key === statKey ? { ...s, xp: Math.max(0, s.xp + amount) } : s)));
    setHistory((h) => [{ ts: new Date().toISOString(), label: label || (amount>=0?`+${amount} XP`:`${amount} XP`), stat: statKey, xp: amount }, ...h].slice(0, 200));
  }

  function handleQuickAction(a) { addXp(a.stat, a.xp, a.label); }

  function resetAll() {
    if (!confirm("Reset all stats, quests, tasks, and history?")) return;
    setStats(DEFAULT_STATS.map((s) => ({ ...s, xp: 0 })));
    setQuests(DEFAULT_QUESTS.map((q) => ({ ...q, done: false })));
    setTasks(DEFAULT_TASKS);
    setHistory([]);
  }

  function exportData() {
    const payload = { stats, quests, history, tasks };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "kamdin-level-up-export.json"; a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setStats(parsed.stats || DEFAULT_STATS);
        setQuests(parsed.quests || DEFAULT_QUESTS);
        setTasks({ ...DEFAULT_TASKS, ...(parsed.tasks || {}) });
        setHistory(parsed.history || []);
      } catch { alert("Invalid file"); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-zinc-950/70 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-2xl font-bold">🎮 Kamdin Level-Up Dashboard</div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={resetAll} className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">Reset</button>
            <button onClick={exportData} className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">Export</button>
            <label className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm cursor-pointer">
              Import
              <input type="file" accept="application/json" className="hidden" onChange={importData} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <Hero totals={totals} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((s) => (
              <StatCard
                key={s.key}
                stat={s}
                onAddXp={(xp, label) => addXp(s.key, xp, label)}
                onOpen={() => setOpenStat(s.key)}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <QuickActions onClick={handleQuickAction} />
          <CustomAdder stats={stats} onAdd={addXp} />
          <Quests quests={quests} setQuests={setQuests} onClaim={(q) => addXp(q.stat, q.xp, `Quest: ${q.title}`)} />
          <History history={history} stats={stats} />
          <Snapshots />
        </aside>
      </main>

      {openStat && (
        <TasksModal
          statKey={openStat}
          stats={stats}
          tasks={tasks}
          setTasks={setTasks}
          addXp={addXp}
          onClose={() => setOpenStat(null)}
        />
      )}

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-xs text-zinc-400">
        Level = 1 + ⌊XP / {LEVEL_XP}⌋. Click a stat card to manage tasks & deadlines.
      </footer>
    </div>
  );
}

function Hero({ totals }) {
  return (
    <div className="rounded-2xl p-5 bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700">
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="text-sm uppercase tracking-widest text-zinc-400">Total XP</div>
          <div className="text-3xl font-bold">{totals.totalXp}</div>
        </div>
        <div>
          <div className="text-sm uppercase tracking-widest text-zinc-400">Avg Level</div>
          <div className="text-3xl font-bold">{totals.avgLevel}</div>
        </div>
        <div className="ml-auto text-zinc-300 text-sm">
          Track XP across stats. Quick Actions, custom XP, Quests, and Tasks with penalties.
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat, onAddXp, onOpen }) {
  const level = levelFromXp(stat.xp);
  const within = progressWithinLevel(stat.xp);
  const progress = pct(within, LEVEL_XP);

  return (
    <button onClick={onOpen} className="text-left rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow w-full hover:bg-zinc-800/70">
      <div className="flex items-center gap-3">
        <div className="text-2xl" aria-hidden>{stat.emoji}</div>
        <div className="font-semibold text-lg">{stat.label}</div>
        <div className="ml-auto text-sm text-zinc-400">LV {level}</div>
      </div>
      <div className="mt-3">
        <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-white/80 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 text-xs text-zinc-400">{within} / {LEVEL_XP} XP to next level (Total: {stat.xp})</div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {[5, 10, 20].map((amt) => (
          <span key={amt} onClick={(e) => { e.stopPropagation(); onAddXp(amt, `Quick +${amt} XP`); }} className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs cursor-pointer">
            +{amt} XP
          </span>
        ))}
      </div>
      <div className="mt-2 text-xs text-zinc-400">Click card to manage tasks & penalties</div>
    </button>
  );
}

function QuickActions({ onClick }) {
  return (
    <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow">
      <div className="font-semibold mb-2">⚡ Quick Actions</div>
      <div className="grid grid-cols-1 gap-2 max-h-80 overflow-auto pr-1">
        {QUICK_ACTIONS.map((a, i) => (
          <button key={i} onClick={() => onClick(a)} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-left" title={`+${a.xp} XP → ${a.stat}`}>
            <span className="text-sm">{a.label}</span>
            <span className="text-xs text-zinc-300">+{a.xp} XP</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomAdder({ stats, onAdd }) {
  const [stat, setStat] = useState(stats[0]?.key || "intelligence");
  const [xp, setXp] = useState(10);
  const [label, setLabel] = useState("");

  useEffect(() => { if (!stats.find((s) => s.key === stat) && stats[0]) setStat(stats[0].key); }, [stats]);

  function submitAdd(e) {
    e.preventDefault();
    const amount = Number(xp) || 0;
    if (amount <= 0) return;
    onAdd(stat, amount, label || `Custom +${amount} XP`);
    setLabel("");
  }
  function submitSubtract(e) {
    e.preventDefault();
    const amount = Number(xp) || 0;
    if (amount <= 0) return;
    onAdd(stat, -amount, label || `Manual -${amount} XP`);
    setLabel("");
  }

  return (
    <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow">
      <div className="font-semibold mb-3">➕/➖ Custom XP</div>
      <form className="grid grid-cols-1 gap-2">
        <div className="grid grid-cols-2 gap-2">
          <select value={stat} onChange={(e) => setStat(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm">
            {stats.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <input type="number" min={1} step={1} value={xp} onChange={(e) => setXp(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm" placeholder="XP" />
        </div>
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm" placeholder="What did you do? (optional)" />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={submitAdd} className="px-3 py-2 rounded-xl bg-white text-zinc-900 font-semibold hover:opacity-90">Add XP</button>
          <button onClick={submitSubtract} className="px-3 py-2 rounded-xl bg-red-500/90 text-white font-semibold hover:opacity-95">Subtract XP</button>
        </div>
      </form>
    </div>
  );
}

function Quests({ quests, setQuests, onClaim }) {
  const [title, setTitle] = useState("");
  const [stat, setStat] = useState("creation");
  const [xp, setXp] = useState(10);

  function toggle(id) { setQuests((cur) => cur.map((q) => (q.id === id ? { ...q, done: !q.done } : q))); }

  function addQuest(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const id = crypto.randomUUID();
    setQuests((cur) => [{ id, title: title.trim(), stat, xp: Number(xp) || 0, done: false }, ...cur]);
    setTitle(""); setXp(10);
  }

  function claim(q) {
    if (!q.done) return alert("Mark the quest as done first.");
    onClaim(q);
    setQuests((cur) => cur.filter((x) => x.id !== q.id));
  }

  return (
    <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow">
      <div className="font-semibold mb-3">🎯 Weekly Quests</div>
      <form onSubmit={addQuest} className="grid grid-cols-1 gap-2 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm" placeholder="New quest title" />
        <div className="grid grid-cols-2 gap-2">
          <select value={stat} onChange={(e) => setStat(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm">
            {DEFAULT_STATS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <input type="number" min={1} step={1} value={xp} onChange={(e) => setXp(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm" placeholder="XP" />
        </div>
        <button className="mt-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">Add Quest</button>
      </form>

      <div className="space-y-2 max-h-64 overflow-auto pr-1">
        {quests.length === 0 && <div className="text-sm text-zinc-400">No quests yet. Add one above.</div>}
        {quests.map((q) => (
          <div key={q.id} className={`rounded-2xl border ${q.done ? "border-emerald-700 bg-emerald-900/20" : "border-zinc-700 bg-zinc-800/50"} p-3` }>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={q.done} onChange={() => toggle(q.id)} className="size-4" />
              <div className="text-sm font-medium">{q.title}</div>
              <div className="ml-auto text-xs text-zinc-300">+{q.xp} XP → {q.stat}</div>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => claim(q)} className="px-2.5 py-1 rounded-lg bg-white text-zinc-900 text-xs font-semibold hover:opacity-90">Claim XP</button>
              <button onClick={() => setQuests((cur) => cur.filter((x) => x.id !== q.id))} className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function History({ history, stats }) {
  const statMap = useMemo(() => Object.fromEntries(stats.map((s) => [s.key, s])), [stats]);
  return (
    <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow">
      <div className="font-semibold mb-2">📜 Recent History</div>
      <div className="space-y-2 max-h-64 overflow-auto pr-1">
        {history.length === 0 && <div className="text-sm text-zinc-400">No XP events yet. Try a Quick Action!</div>}
        {history.map((h, i) => (
          <div key={i} className="text-xs flex items-center gap-2 border border-zinc-800 rounded-xl px-3 py-2 bg-zinc-950/40">
            <span className="text-zinc-400 tabular-nums">{new Date(h.ts).toLocaleString()}</span>
            <span className="opacity-70">•</span>
            <span className="">{h.label}</span>
            <span className="ml-auto">{h.xp>=0?'+':''}{h.xp} XP → {statMap[h.stat]?.label || h.stat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Snapshots() {
  const [list, setList] = useState({});
  useEffect(() => {
    try { setList(JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "{}")); } catch {}
  }, []);
  function restore(day) {
    const data = list[day];
    if (!data) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    location.reload();
  }
  const days = Object.keys(list).sort().reverse();
  return (
    <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow">
      <div className="font-semibold mb-2">🗂️ Daily Snapshots</div>
      {days.length === 0 ? <div className="text-sm text-zinc-400">No snapshots yet (a snapshot is saved once/day automatically).</div> :
      <div className="flex flex-wrap gap-2">
        {days.map(d => (
          <button key={d} onClick={() => restore(d)} className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs">{d}</button>
        ))}
      </div>}
    </div>
  );
}

function TasksModal({ statKey, stats, tasks, setTasks, addXp, onClose }) {
  const stat = stats.find(s => s.key === statKey);
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState(10);
  const [penalty, setPenalty] = useState(5);
  const [cadence, setCadence] = useState("daily");
  const [useCustomDue, setUseCustomDue] = useState(false);
  const [customDue, setCustomDue] = useState("");

  const list = tasks[statKey] || [];

  function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;

    let dueAt;
    if (useCustomDue && customDue) {
      const local = new Date(customDue);
      if (isNaN(local)) return alert("Invalid custom deadline");
      dueAt = local.toISOString();
    } else {
      dueAt = nextDue(cadence);
    }

    const t = {
      id: crypto.randomUUID(),
      title: title.trim(),
      reward: Math.max(0, Number(reward) || 0),
      penalty: Math.max(0, Number(penalty) || 0),
      cadence,
      dueAt,
      completedOnDate: null,
      useCustomDue: !!useCustomDue,
    };
    setTasks(cur => ({ ...cur, [statKey]: [t, ...(cur[statKey] || [])] }));
    setTitle(""); setReward(10); setPenalty(5); setCadence("daily"); setUseCustomDue(false); setCustomDue("");
  }

  function toggleDone(t) {
    const today = todayKey();
    setTasks(cur => ({
      ...cur,
      [statKey]: (cur[statKey] || []).map(x => {
        if (x.id !== t.id) return x;
        if (!x.completedOnDate) {
          if (t.reward > 0) addXp(statKey, t.reward, `Task done: ${t.title}`);
          const next = x.cadence ? nextDue(x.cadence) : x.dueAt;
          return { ...x, completedOnDate: today, dueAt: next };
        } else {
          return { ...x, completedOnDate: null };
        }
      })
    }));
  }

  function removeTask(id) {
    setTasks(cur => ({ ...cur, [statKey]: (cur[statKey] || []).filter(x => x.id !== id) }));
  }

  // Manual penalty now (user choice)
  function applyPenaltyNow(t) {
    if (!t.penalty || t.penalty <= 0) return;
    // subtract XP immediately
    addXp(statKey, -t.penalty, `Manual penalty: ${t.title}`);
    // roll due to next cycle so it doesn’t auto-penalize again right away
    setTasks(cur => ({
      ...cur,
      [statKey]: (cur[statKey] || []).map(x => x.id === t.id ? { ...x, lastPenaltyAt: new Date().toISOString(), dueAt: x.cadence ? nextDue(x.cadence) : x.dueAt } : x)
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="flex items-center gap-2 p-4 border-b border-zinc-800">
          <div className="text-xl font-semibold">{stat?.emoji} {stat?.label} — Tasks</div>
          <button onClick={onClose} className="ml-auto px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">Close</button>
        </div>

        <div className="p-4">
          <form onSubmit={addTask} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm md:col-span-2" placeholder="Task title (e.g., Study 1 hr)" />
            <input type="number" min={0} step={1} value={reward} onChange={(e) => setReward(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm" placeholder="Reward XP" />
            <input type="number" min={0} step={1} value={penalty} onChange={(e) => setPenalty(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm" placeholder="Penalty XP" />
            <select value={cadence} onChange={(e) => setCadence(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <label className="md:col-span-4 flex items-center gap-2 text-sm mt-1">
              <input type="checkbox" checked={useCustomDue} onChange={(e)=>setUseCustomDue(e.target.checked)} />
              <span>Use a specific deadline (date & time)</span>
            </label>
            {useCustomDue && (
              <input type="datetime-local" value={customDue} onChange={(e)=>setCustomDue(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm md:col-span-2" />
            )}
            <button className="px-3 py-2 rounded-xl bg-white text-zinc-900 font-semibold hover:opacity-90 md:col-span-4">Add Task</button>
          </form>

          <div className="mt-4 space-y-2 max-h-80 overflow-auto pr-1">
            {list.length === 0 && <div className="text-sm text-zinc-400">No tasks yet. Add one above.</div>}
            {list.map((t) => {
              const overdue = t.dueAt && new Date() > new Date(t.dueAt) && !t.completedOnDate;
              return (
                <div key={t.id} className={`rounded-xl border p-3 ${overdue ? "border-red-700 bg-red-900/20" : "border-zinc-700 bg-zinc-800/50"}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!t.completedOnDate} onChange={() => toggleDone(t)} className="size-4" />
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="ml-auto text-xs text-zinc-300">+{t.reward} XP / -{t.penalty} XP • {t.cadence || (t.useCustomDue ? "one-off" : "—")}</div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Due: {t.dueAt ? new Date(t.dueAt).toLocaleString() : "—"}
                    {overdue && <span className="ml-2 text-red-400">Overdue (penalty will apply)</span>}
                    {t.completedOnDate && <span className="ml-2 text-emerald-400">Completed {t.completedOnDate}</span>}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {overdue && (
                      <button onClick={() => applyPenaltyNow(t)} className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold hover:opacity-90">
                        Apply penalty now
                      </button>
                    )}
                    <button onClick={() => removeTask(t.id)} className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";

/**
 * Kamdin Level-Up Dashboard (Tailwind v4)
 */
const LEVEL_XP = 100;
const STORAGE_KEY = "kamdin_xp_state_v1";

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

function levelFromXp(xp) { return 1 + Math.floor(xp / LEVEL_XP); }
function progressWithinLevel(xp) { return xp % LEVEL_XP; }
function pct(a, b) { return Math.max(0, Math.min(100, Math.round((a / b) * 100))); }

export default function App() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [quests, setQuests] = useState(DEFAULT_QUESTS);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.quests) setQuests(parsed.quests);
        if (parsed.history) setHistory(parsed.history);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const payload = { stats, quests, history };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [stats, quests, history]);

  const totals = useMemo(() => {
    const totalXp = stats.reduce((sum, s) => sum + s.xp, 0);
    const avgLevel = (stats.reduce((sum, s) => sum + levelFromXp(s.xp), 0) / stats.length).toFixed(1);
    return { totalXp, avgLevel };
  }, [stats]);

  function addXp(statKey, amount, label) {
    setStats((cur) => cur.map((s) => (s.key === statKey ? { ...s, xp: s.xp + amount } : s)));
    setHistory((h) => [{ ts: new Date().toISOString(), label: label || `+${amount} XP`, stat: statKey, xp: amount }, ...h].slice(0, 200));
  }

  function handleQuickAction(a) { addXp(a.stat, a.xp, a.label); }

  function resetAll() {
    if (!confirm("Reset all stats, quests, and history?")) return;
    setStats(DEFAULT_STATS.map((s) => ({ ...s, xp: 0 })));
    setQuests(DEFAULT_QUESTS.map((q) => ({ ...q, done: false })));
    setHistory([]);
  }

  function exportData() {
    const blob = new Blob([localStorage.getItem(STORAGE_KEY) || "{}"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kamdin-level-up-export.json";
    a.click();
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
              <StatCard key={s.key} stat={s} onAddXp={(xp, label) => addXp(s.key, xp, label)} />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <QuickActions onClick={handleQuickAction} />
          <CustomAdder stats={stats} onAdd={addXp} />
          <Quests quests={quests} setQuests={setQuests} onClaim={(q) => addXp(q.stat, q.xp, `Quest: ${q.title}`)} />
          <History history={history} stats={stats} />
        </aside>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-xs text-zinc-400">
        Pro tip: Level = 1 + ⌊XP / {LEVEL_XP}&nbsp;⌋. Progress bars show your XP toward the next level.
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
          Track XP across 7 stats. Use Quick Actions, add custom XP, and complete weekly quests.
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat, onAddXp }) {
  const level = levelFromXp(stat.xp);
  const within = progressWithinLevel(stat.xp);
  const progress = pct(within, LEVEL_XP);

  return (
    <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow">
      <div className="flex items-center gap-3">
        <div className="text-2xl" aria-hidden>{stat.emoji}</div>
        <div className="font-semibold text-lg">{stat.label}</div>
        <div className="ml-auto text-sm text-zinc-400">LV {level}</div>
      </div>
      <div className="mt-3">
        <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full"
            style={{ width: `${progress}%` }}
            aria-label={`${progress}% toward next level`}
          />
        </div>
        <div className="mt-1 text-xs text-zinc-400">{within} / {LEVEL_XP} XP to next level (Total: {stat.xp})</div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {[5, 10, 20].map((amt) => (
          <button key={amt} onClick={() => onAddXp(amt, `Quick +${amt} XP`)} className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs">
            +{amt} XP
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ onClick }) {
  return (
    <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow">
      <div className="font-semibold mb-2">⚡ Quick Actions</div>
      <div className="grid grid-cols-1 gap-2 max-h-80 overflow-auto pr-1">
        {QUICK_ACTIONS.map((a, i) => (
          <button
            key={i}
            onClick={() => onClick(a)}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-left"
            title={`+${a.xp} XP → ${a.stat}`}
          >
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

  useEffect(() => {
    if (!stats.find((s) => s.key === stat) && stats[0]) setStat(stats[0].key);
  }, [stats]);

  function submit(e) {
    e.preventDefault();
    const amount = Number(xp) || 0;
    if (amount <= 0) return;
    onAdd(stat, amount, label || `Custom +${amount} XP`);
    setLabel("");
  }

  return (
    <div className="rounded-2xl p-4 bg-zinc-900 border border-zinc-800 shadow">
      <div className="font-semibold mb-3">➕ Add Custom XP</div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={stat}
            onChange={(e) => setStat(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm"
          >
            {stats.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            step={1}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm"
            placeholder="XP"
          />
        </div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm"
          placeholder="What did you do? (optional)"
        />
        <button className="mt-1 px-3 py-2 rounded-xl bg-white text-zinc-900 font-semibold hover:opacity-90">Add XP</button>
      </form>
    </div>
  );
}

function Quests({ quests, setQuests, onClaim }) {
  const [title, setTitle] = useState("");
  const [stat, setStat] = useState("creation");
  const [xp, setXp] = useState(10);

  function toggle(id) {
    setQuests((cur) => cur.map((q) => (q.id === id ? { ...q, done: !q.done } : q)));
  }

  function addQuest(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const id = crypto.randomUUID();
    setQuests((cur) => [{ id, title: title.trim(), stat, xp: Number(xp) || 0, done: false }, ...cur]);
    setTitle("");
    setXp(10);
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
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm"
          placeholder="New quest title"
        />
        <div className="grid grid-cols-2 gap-2">
          <select value={stat} onChange={(e) => setStat(e.target.value)} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm">
            {DEFAULT_STATS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            step={1}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm"
            placeholder="XP"
          />
        </div>
        <button className="mt-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm">Add Quest</button>
      </form>

      <div className="space-y-2 max-h-64 overflow-auto pr-1">
        {quests.length === 0 && <div className="text-sm text-zinc-400">No quests yet. Add one above.</div>}
        {quests.map((q) => (
          <div key={q.id} className={`rounded-xl border ${q.done ? "border-emerald-700 bg-emerald-900/20" : "border-zinc-700 bg-zinc-800/50"} p-3` }>
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
            <span className="ml-auto">+{h.xp} XP → {statMap[h.stat]?.label || h.stat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

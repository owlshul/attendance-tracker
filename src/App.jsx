import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";

/**
 * Attendlyx — mobile-first, laptop-clean
 * - Quick mode: manual totals
 * - Pro mode: per-subject day marking (21-day grid)
 * - localStorage persistence + export/import
 */

const LS_KEYS = {
  config: "attendlyx:config",
  subjects: "attendlyx:subjects",
  attendance: "attendlyx:attendance",
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const todayISO = () => iso(new Date());

function safeParse(json, fallback) {
  try {
    const x = JSON.parse(json);
    return x ?? fallback;
  } catch {
    return fallback;
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function statusFrom(buffer) {
  if (buffer >= 5)
    return {
      label: "Safe",
      msg: "You’ve got buffer. Skip if needed.",
      tone: "emerald",
      emoji: "✅",
    };
  if (buffer >= 0)
    return {
      label: "On track",
      msg: "You’re meeting the target. Don’t slip.",
      tone: "blue",
      emoji: "🟦",
    };
  if (buffer >= -5)
    return {
      label: "Close call",
      msg: "One bad week and you’re cooked. Attend next.",
      tone: "amber",
      emoji: "⚠️",
    };
  return {
    label: "At risk",
    msg: "You need recovery classes. No more random bunks.",
    tone: "rose",
    emoji: "🚨",
  };
}

function toneClasses(tone) {
  switch (tone) {
    case "emerald":
      return {
        ring: "ring-emerald-200",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        solid: "bg-emerald-600",
      };
    case "blue":
      return {
        ring: "ring-blue-200",
        bg: "bg-blue-50",
        text: "text-blue-700",
        solid: "bg-blue-600",
      };
    case "amber":
      return {
        ring: "ring-amber-200",
        bg: "bg-amber-50",
        text: "text-amber-700",
        solid: "bg-amber-600",
      };
    default:
      return {
        ring: "ring-rose-200",
        bg: "bg-rose-50",
        text: "text-rose-700",
        solid: "bg-rose-600",
      };
  }
}

function calcBunksLeft(attended, total, reqPct) {
  if (total <= 0) return 0;
  const req = reqPct / 100;
  // Max skippable classes while still meeting requirement:
  // attended/(total + x) >= req  => x <= attended/req - total
  return Math.max(0, Math.floor(attended / req - total));
}

function calcToRecover(attended, total, reqPct) {
  if (total <= 0) return 0;
  const req = reqPct / 100;
  // Need y such that (attended + y) / (total + y) >= req
  // y >= (req*total - attended) / (1 - req)
  if (req >= 1) return attended === total ? 0 : 999999;
  const y = (req * total - attended) / (1 - req);
  return Math.max(0, Math.ceil(y));
}

function buildForecast(attended, total, steps = 10) {
  // Assumption: you attend all next classes.
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = total + i;
    const a = attended + i;
    const p = t > 0 ? (a / t) * 100 : 0;
    out.push({ i, p });
  }
  return out;
}

function make21Days(endISO) {
  const end = new Date(endISO);
  const days = [];
  for (let k = 20; k >= 0; k--) {
    const d = new Date(end);
    d.setDate(d.getDate() - k);
    days.push(iso(d));
  }
  return days;
}

export default function AttendanceTracker() {
  // Mode + tabs
  const [mode, setMode] = useState("simple"); // "simple" | "advanced"
  const [tab, setTab] = useState("dashboard"); // "dashboard" | "tracker"

  // Config
  const [requirement, setRequirement] = useState(75);
  const [viewEnd, setViewEnd] = useState(null); // ISO end date for 21-day window (null = today)

  // Quick mode data
  const [manualTotal, setManualTotal] = useState(0);
  const [manualAttended, setManualAttended] = useState(0);

  // Pro mode data
  const [subjects, setSubjects] = useState([]); // {id,name,color}
  const [attendance, setAttendance] = useState({}); // key: `${subjectId}-${YYYY-MM-DD}` => "present" | "absent"

  // UI
  const [showAdd, setShowAdd] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const importRef = useRef(null);

  // ---------- Persistence (localStorage) ----------
  useEffect(() => {
    const cfg = safeParse(localStorage.getItem(LS_KEYS.config), null);
    const subs = safeParse(localStorage.getItem(LS_KEYS.subjects), []);
    const att = safeParse(localStorage.getItem(LS_KEYS.attendance), {});

    if (cfg) {
      setRequirement(typeof cfg.requirement === "number" ? cfg.requirement : 75);
      setMode(cfg.mode === "advanced" ? "advanced" : "simple");
      setTab(cfg.tab === "tracker" ? "tracker" : "dashboard");
      setViewEnd(cfg.viewEnd ?? null);
      setManualTotal(cfg.manualTotal ?? 0);
      setManualAttended(cfg.manualAttended ?? 0);
    }
    setSubjects(Array.isArray(subs) ? subs : []);
    setAttendance(att && typeof att === "object" ? att : {});
  }, []);

  useEffect(() => {
    localStorage.setItem(
      LS_KEYS.config,
      JSON.stringify({
        requirement,
        mode,
        tab,
        viewEnd,
        manualTotal,
        manualAttended,
      })
    );
  }, [requirement, mode, tab, viewEnd, manualTotal, manualAttended]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.subjects, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.attendance, JSON.stringify(attendance));
  }, [attendance]);

  // Keep manualAttended <= manualTotal always
  useEffect(() => {
    setManualAttended((a) => Math.min(a, manualTotal));
  }, [manualTotal]);

  // ---------- Derived stats ----------
  const windowEndISO = viewEnd ?? todayISO();
  const days21 = useMemo(() => make21Days(windowEndISO), [windowEndISO]);

  const perSubjectStats = useMemo(() => {
    const stats = {};
    for (const s of subjects) stats[s.id] = { total: 0, attended: 0 };

    for (const [key, val] of Object.entries(attendance)) {
      const [sid] = key.split("-");
      if (!stats[sid]) continue;
      stats[sid].total += 1;
      if (val === "present") stats[sid].attended += 1;
    }
    return stats;
  }, [subjects, attendance]);

  const overall = useMemo(() => {
    if (mode === "simple") {
      return {
        total: manualTotal,
        attended: manualAttended,
      };
    }
    let t = 0;
    let a = 0;
    for (const s of subjects) {
      const st = perSubjectStats[s.id] || { total: 0, attended: 0 };
      t += st.total;
      a += st.attended;
    }
    return { total: t, attended: a };
  }, [mode, manualTotal, manualAttended, subjects, perSubjectStats]);

  const missed = Math.max(0, overall.total - overall.attended);
  const percentage = overall.total > 0 ? (overall.attended / overall.total) * 100 : 0;
  const buffer = percentage - requirement;

  const bunksLeft = calcBunksLeft(overall.attended, overall.total, requirement);
  const toRecover = calcToRecover(overall.attended, overall.total, requirement);
  const forecast = useMemo(() => buildForecast(overall.attended, overall.total, 10), [overall]);

  const status = statusFrom(buffer);
  const tone = toneClasses(status.tone);

  // ---------- Actions ----------
  function resetQuick() {
    setManualTotal(0);
    setManualAttended(0);
  }

  function resetAll() {
    if (!confirm("Reset everything? This deletes all subjects + attendance.")) return;
    setSubjects([]);
    setAttendance({});
    setManualTotal(0);
    setManualAttended(0);
    setRequirement(75);
    setViewEnd(null);
    setMode("simple");
    setTab("dashboard");
  }

  function addSubject() {
    const name = newSubjectName.trim();
    if (!name) return;

    const palette = [
      "bg-indigo-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-cyan-500",
      "bg-violet-500",
    ];
    const color = palette[subjects.length % palette.length];

    setSubjects((prev) => [...prev, { id: uid(), name, color }]);
    setNewSubjectName("");
    setShowAdd(false);
  }

  function deleteSubject(id) {
    if (!confirm("Delete this subject and all its attendance?")) return;
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setAttendance((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${id}-`)) delete next[k];
      }
      return next;
    });
  }

  function cycleMark(subjectId, dateISO) {
    const key = `${subjectId}-${dateISO}`;
    setAttendance((prev) => {
      const next = { ...prev };
      const cur = next[key];
      if (cur === "present") next[key] = "absent";
      else if (cur === "absent") delete next[key];
      else next[key] = "present";
      return next;
    });
  }

  function exportData() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      config: { requirement, mode, tab, viewEnd, manualTotal, manualAttended },
      subjects,
      attendance,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendlyx-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(String(e.target.result || ""));
        const cfg = data.config || {};
        setRequirement(typeof cfg.requirement === "number" ? cfg.requirement : 75);
        setMode(cfg.mode === "advanced" ? "advanced" : "simple");
        setTab(cfg.tab === "tracker" ? "tracker" : "dashboard");
        setViewEnd(cfg.viewEnd ?? null);
        setManualTotal(cfg.manualTotal ?? 0);
        setManualAttended(cfg.manualAttended ?? 0);
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
        setAttendance(data.attendance && typeof data.attendance === "object" ? data.attendance : {});
      } catch {
        alert("Invalid backup file");
      } finally {
        if (importRef.current) importRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  // ---------- UI helpers ----------
  const card = "bg-white border border-gray-100 shadow-sm rounded-2xl";
  const chip = "px-2 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700";

  const viewRangeLabel = useMemo(() => {
    const end = new Date(windowEndISO);
    const start = new Date(windowEndISO);
    start.setDate(start.getDate() - 20);
    const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [windowEndISO]);

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .range::-webkit-slider-thumb { appearance: none; height: 18px; width: 18px; border-radius: 999px; background: #4f46e5; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,.12); }
      `}</style>

      {/* Page container: narrow on mobile, wider on laptop */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-6">
        {/* Header: compact, not chunky */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-lg">📊</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">Attendlyx</h1>
                <span className="hidden sm:inline text-xs text-gray-500">Bunk responsibly.</span>
              </div>
              <div className="sm:hidden text-xs text-gray-500">Bunk responsibly.</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportData}
              className="h-9 w-9 rounded-xl bg-white border border-gray-200 grid place-items-center hover:bg-gray-50"
              title="Export"
            >
              <Download className="w-4 h-4 text-gray-700" />
            </button>

            <label
              className="h-9 w-9 rounded-xl bg-white border border-gray-200 grid place-items-center hover:bg-gray-50 cursor-pointer"
              title="Import"
            >
              <Upload className="w-4 h-4 text-gray-700" />
              <input
                ref={importRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => importData(e.target.files?.[0])}
              />
            </label>

            <button
              onClick={resetAll}
              className="h-9 w-9 rounded-xl bg-white border border-gray-200 grid place-items-center hover:bg-gray-50"
              title="Reset all"
            >
              <RotateCcw className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Top controls: mode switch + (pro) tabs */}
        <div className={`${card} p-2 sm:p-2.5 mb-4 sm:mb-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Mode segmented control */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-auto">
              <button
                onClick={() => {
                  setMode("simple");
                  setTab("dashboard");
                }}
                className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  mode === "simple" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Quick
              </button>
              <button
                onClick={() => {
                  setMode("advanced");
                  setTab("dashboard");
                }}
                className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  mode === "advanced" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Pro (Subjects)
              </button>
            </div>

            {/* Pro tabs */}
            {mode === "advanced" && (
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-auto sm:ml-auto">
                <button
                  onClick={() => setTab("dashboard")}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    tab === "dashboard" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setTab("tracker")}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    tab === "tracker" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Mark
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main layout:
            - Mobile: single column (status first)
            - Laptop: 2 columns (left = inputs/subjects, right = status/forecast)
        */}
        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          {/* LEFT */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            {/* Quick mode controls */}
            {mode === "simple" && (
              <>
                <div className={`${card} p-4 sm:p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quick inputs</div>
                      <div className="text-sm text-gray-700">Keep it minimal. Numbers only.</div>
                    </div>
                    <button
                      onClick={resetQuick}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1"
                      title="Reset quick mode"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  </div>

                  {/* Compact tiles: Total / Attended / Missed */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {/* Total */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Total</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <button
                          className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                          onClick={() => setManualTotal((t) => Math.max(0, t - 1))}
                        >
                          −
                        </button>
                        <input
                          className="w-full text-center text-xl sm:text-2xl font-extrabold bg-transparent outline-none"
                          type="number"
                          value={manualTotal}
                          onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value || "0", 10) || 0))}
                        />
                        <button
                          className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                          onClick={() => setManualTotal((t) => t + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Attended */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Attended</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <button
                          className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                          onClick={() => setManualAttended((a) => Math.max(0, a - 1))}
                        >
                          −
                        </button>
                        <input
                          className="w-full text-center text-xl sm:text-2xl font-extrabold bg-transparent outline-none"
                          type="number"
                          value={manualAttended}
                          onChange={(e) =>
                            setManualAttended(
                              clamp(parseInt(e.target.value || "0", 10) || 0, 0, manualTotal)
                            )
                          }
                        />
                        <button
                          className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold"
                          onClick={() => setManualAttended((a) => Math.min(manualTotal, a + 1))}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Missed (derived) */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="text-[11px] font-bold text-gray-500 uppercase">Missed</div>
                      <div className="mt-2 text-center text-xl sm:text-2xl font-extrabold text-gray-900">
                        {missed}
                      </div>
                      <div className="mt-1 text-center text-[11px] text-gray-500">Auto</div>
                    </div>
                  </div>

                  {/* Requirement */}
                  <div className="mt-4 sm:mt-5">
                    <div className="flex items-end justify-between">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Requirement
                      </div>
                      <div className="text-lg font-extrabold text-indigo-700">{requirement}%</div>
                    </div>
                    <input
                      className="range mt-2 w-full h-2 rounded-full appearance-none cursor-pointer"
                      type="range"
                      min="0"
                      max="100"
                      value={requirement}
                      onChange={(e) => setRequirement(parseInt(e.target.value, 10))}
                      style={{
                        background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${requirement}%, #e5e7eb ${requirement}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                      <span>0</span>
                      <span>75</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>

                {/* Micro tip (small, not a big box) */}
                <div className={`${card} p-4 sm:p-5`}>
                  <div className="flex items-start gap-2">
                    <div className="text-lg">💡</div>
                    <div className="text-sm text-gray-700">
                      Keep a <span className="font-semibold">+5% buffer</span>. Real life ruins “perfect plans”.
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Pro mode dashboard */}
            {mode === "advanced" && tab === "dashboard" && (
              <>
                <div className={`${card} p-4 sm:p-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Requirement</div>
                      <div className="text-sm text-gray-700">Applies to overall + each subject.</div>
                    </div>
                    <div className="text-lg font-extrabold text-indigo-700">{requirement}%</div>
                  </div>

                  <input
                    className="range mt-3 w-full h-2 rounded-full appearance-none cursor-pointer"
                    type="range"
                    min="0"
                    max="100"
                    value={requirement}
                    onChange={(e) => setRequirement(parseInt(e.target.value, 10))}
                    style={{
                      background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${requirement}%, #e5e7eb ${requirement}%, #e5e7eb 100%)`,
                    }}
                  />
                </div>

                <div className={`${card} p-4 sm:p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Subjects</div>
                      <div className="text-sm text-gray-700">Per-subject snapshot (no extra tabs needed).</div>
                    </div>
                    <button
                      onClick={() => setTab("tracker")}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                    >
                      Go to marking →
                    </button>
                  </div>

                  {subjects.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center">
                      <div className="text-sm text-gray-600">No subjects yet.</div>
                      <button
                        onClick={() => setTab("tracker")}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4" /> Add first subject
                      </button>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
                      {subjects.map((s) => {
                        const st = perSubjectStats[s.id] || { total: 0, attended: 0 };
                        const pct = st.total > 0 ? (st.attended / st.total) * 100 : 0;
                        const ok = pct >= requirement;
                        return (
                          <div
                            key={s.id}
                            className="rounded-2xl border border-gray-200 bg-white p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${s.color || "bg-indigo-500"}`} />
                                <div className="font-semibold text-gray-900 truncate">{s.name}</div>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {st.attended}/{st.total} attended
                              </div>
                            </div>
                            <div className={`text-lg font-extrabold ${ok ? "text-emerald-700" : "text-rose-700"}`}>
                              {Math.round(pct)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Pro mode tracker */}
            {mode === "advanced" && tab === "tracker" && (
              <>
                {/* Add subject */}
                <div className={`${card} p-4 sm:p-5`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mark attendance</div>
                      <div className="text-sm text-gray-700">
                        Tap to cycle: <span className="font-semibold">✓ present</span> → <span className="font-semibold">✕ absent</span> → empty.
                      </div>
                    </div>

                    {!showAdd ? (
                      <button
                        onClick={() => setShowAdd(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowAdd(false);
                          setNewSubjectName("");
                        }}
                        className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {showAdd && (
                    <div className="mt-3 flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Subject name…"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSubject()}
                        autoFocus
                      />
                      <button
                        onClick={addSubject}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Date window controls */}
                {subjects.length > 0 && (
                  <div className={`${card} p-3 sm:p-4`}>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 grid place-items-center"
                        onClick={() => {
                          const cur = new Date(windowEndISO);
                          cur.setDate(cur.getDate() - 7);
                          setViewEnd(iso(cur));
                        }}
                        title="Previous week"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="text-center min-w-0">
                        <div className="text-sm font-extrabold text-gray-900 truncate">{viewRangeLabel}</div>
                        {viewEnd && (
                          <button
                            onClick={() => setViewEnd(null)}
                            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                          >
                            Jump to today
                          </button>
                        )}
                      </div>

                      <button
                        className={`h-9 w-9 rounded-xl grid place-items-center ${
                          viewEnd ? "bg-gray-100 hover:bg-gray-200" : "bg-gray-50 text-gray-300 cursor-not-allowed"
                        }`}
                        disabled={!viewEnd}
                        onClick={() => {
                          if (!viewEnd) return;
                          const cur = new Date(windowEndISO);
                          cur.setDate(cur.getDate() + 7);
                          const t = new Date(todayISO());
                          if (cur <= t) setViewEnd(iso(cur));
                        }}
                        title="Next week"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Subject cards */}
                {subjects.length === 0 ? (
                  <div className={`${card} p-5 text-center`}>
                    <div className="text-sm text-gray-600">Add a subject to start marking.</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjects.map((s) => {
                      const st = perSubjectStats[s.id] || { total: 0, attended: 0 };
                      const pct = st.total > 0 ? (st.attended / st.total) * 100 : 0;
                      const ok = pct >= requirement;

                      return (
                        <div key={s.id} className={`${card} p-4 sm:p-5`}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${s.color || "bg-indigo-500"}`} />
                                <div className="font-extrabold text-gray-900 truncate">{s.name}</div>
                                <span className={`${chip} ${ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                  {Math.round(pct)}%
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {st.attended}/{st.total} attended • tap squares to mark
                              </div>
                            </div>
                            <button
                              onClick={() => deleteSubject(s.id)}
                              className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 grid place-items-center"
                              title="Delete subject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* 21-day grid: 3 rows × 7 days */}
                          <div className="grid grid-cols-7 gap-1.5">
                            {days21.map((d) => {
                              const key = `${s.id}-${d}`;
                              const v = attendance[key]; // present/absent/undefined
                              const isToday = d === todayISO();
                              const dayNum = Number(d.slice(8, 10));
                              const cls =
                                v === "present"
                                  ? "bg-emerald-500 text-white"
                                  : v === "absent"
                                  ? "bg-rose-500 text-white"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200";

                              return (
                                <button
                                  key={d}
                                  onClick={() => cycleMark(s.id, d)}
                                  className={`relative aspect-square rounded-xl grid place-items-center text-xs font-bold transition ${cls} ${
                                    isToday ? "ring-2 ring-indigo-300" : ""
                                  }`}
                                  title={`${d} • ${v === "present" ? "Present" : v === "absent" ? "Absent" : "Unmarked"}`}
                                >
                                  <span className="leading-none">{dayNum}</span>
                                  <span className="absolute bottom-1 text-[10px] font-extrabold opacity-90">
                                    {v === "present" ? "✓" : v === "absent" ? "✕" : "·"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6">
            {/* Status: compact but dominant */}
            <div className={`${tone.bg} ${card} p-4 sm:p-5 ring-1 ${tone.ring}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</div>
                  <div className={`mt-1 text-2xl sm:text-3xl font-extrabold ${tone.text}`}>
                    {status.emoji} {status.label}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">{status.msg}</div>
                </div>

                {/* % badge */}
                <div className="shrink-0">
                  <div className="rounded-2xl bg-white/70 border border-white/40 px-4 py-3 text-center">
                    <div className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                      {Math.round(percentage)}
                      <span className="text-lg font-bold text-gray-500">%</span>
                    </div>
                    <div className="text-[11px] text-gray-500 font-semibold">
                      {overall.attended}/{overall.total || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key actions row */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-2xl bg-white/70 border border-white/40 p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Safe skips</div>
                  <div className="mt-1 text-2xl font-extrabold text-emerald-700">{bunksLeft}</div>
                </div>
                <div className="rounded-2xl bg-white/70 border border-white/40 p-3">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Attend next</div>
                  <div className="mt-1 text-2xl font-extrabold text-amber-700">{toRecover}</div>
                </div>
              </div>

              {/* Tiny stats */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={chip}>Total: {overall.total}</span>
                <span className={chip}>Attended: {overall.attended}</span>
                <span className={chip}>Missed: {missed}</span>
                <span className={`${chip} ${buffer >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  Buffer: {buffer >= 0 ? "+" : ""}
                  {buffer.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Forecast: compact on mobile, roomier on laptop */}
            <div className={`${card} p-4 sm:p-5`}>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Forecast</div>
                  <div className="text-sm text-gray-700">Assuming you attend the next 10 classes.</div>
                </div>
                <div className="text-xs font-semibold text-gray-500">Goal: {requirement}%</div>
              </div>

              <div className="mt-4">
                {/* Simple bar chart without wasting height */}
                <div className="relative h-28 sm:h-36">
                  {/* goal line */}
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-gray-300"
                    style={{ top: `${100 - clamp(((requirement - 70) / 30) * 100, 0, 100)}%` }}
                  />
                  <div className="absolute right-0 -top-2 text-[10px] text-gray-500 bg-white px-2 rounded">
                    {requirement}%
                  </div>

                  <div className="absolute inset-0 flex items-end gap-1.5">
                    {forecast.map((pt) => {
                      const h = clamp(((pt.p - 70) / 30) * 100, 0, 100);
                      const ok = pt.p >= requirement;
                      return (
                        <div key={pt.i} className="flex-1 flex flex-col items-center justify-end">
                          <div
                            className={`w-full rounded-t-lg ${ok ? "bg-emerald-500" : "bg-rose-500"} hover:opacity-90`}
                            style={{ height: `${h}%` }}
                            title={`${Math.round(pt.p)}%`}
                          />
                          <div className="mt-2 text-[10px] font-semibold text-gray-500">
                            {pt.i === 0 ? "Now" : `+${pt.i}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-gray-500">
                  If you want a different forecast assumption (e.g., “I will miss 2 upcoming”), we can add a slider for that.
                </div>
              </div>
            </div>

            {/* Pro mode: show quick subject glance even on right column (laptop UX) */}
            {mode === "advanced" && subjects.length > 0 && (
              <div className={`${card} p-4 sm:p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quick glance</div>
                  <button
                    onClick={() => setTab("tracker")}
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    Mark →
                  </button>
                </div>
                <div className="space-y-2">
                  {subjects.slice(0, 4).map((s) => {
                    const st = perSubjectStats[s.id] || { total: 0, attended: 0 };
                    const pct = st.total > 0 ? (st.attended / st.total) * 100 : 0;
                    const ok = pct >= requirement;
                    return (
                      <div key={s.id} className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-2.5 w-2.5 rounded-full ${s.color || "bg-indigo-500"}`} />
                          <div className="text-sm font-semibold text-gray-900 truncate">{s.name}</div>
                        </div>
                        <div className={`text-sm font-extrabold ${ok ? "text-emerald-700" : "text-rose-700"}`}>
                          {Math.round(pct)}%
                        </div>
                      </div>
                    );
                  })}
                  {subjects.length > 4 && (
                    <div className="text-[11px] text-gray-500">+{subjects.length - 4} more…</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-gray-400">
          © 2026 Attendlyx • local-only • export your backup
        </div>
      </div>
    </div>
  );
}

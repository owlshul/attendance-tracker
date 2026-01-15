import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, RotateCcw, AlertTriangle, HelpCircle, Info } from 'lucide-react';

export default function AttendanceTracker() {
  const [mode, setMode] = useState('quick');
  const [requirement, setRequirement] = useState(67);
  
  // Quick mode
  const [quickTotal, setQuickTotal] = useState(0);
  const [quickAttended, setQuickAttended] = useState(0);
  
  // Pro mode
  const [subjects, setSubjects] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [dateOffset, setDateOffset] = useState(0);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [showHelp, setShowHelp] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Load from localStorage with version tracking
  useEffect(() => {
    const saved = localStorage.getItem('attendance-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setMode(data.mode || 'quick');
        setRequirement(data.requirement || 67);
        setQuickTotal(data.quickTotal || 0);
        setQuickAttended(data.quickAttended || 0);
        setSubjects(data.subjects || []);
        setAttendance(data.attendance || {});
        setViewMode(data.viewMode || 'week');
        setHasSeenWelcome(data.hasSeenWelcome || false);
        
        // Check if truly first time (no data at all)
        if (data.quickTotal === 0 && data.quickAttended === 0 && (!data.subjects || data.subjects.length === 0)) {
          setIsFirstTime(true);
        } else {
          setIsFirstTime(false);
        }
      } catch (e) {
        setIsFirstTime(true);
      }
    } else {
      setIsFirstTime(true);
    }
  }, []);

  // Save to localStorage with version tracking
  useEffect(() => {
    localStorage.setItem('attendance-data-v2', JSON.stringify({
      mode, requirement, quickTotal, quickAttended, subjects, attendance, viewMode,
      hasSeenWelcome,
      version: 2,
      lastUpdated: new Date().toISOString()
    }));
  }, [mode, requirement, quickTotal, quickAttended, subjects, attendance, viewMode, hasSeenWelcome]);

  // Calculate stats
  const getStats = () => {
    if (mode === 'quick') {
      const total = quickTotal;
      const attended = quickAttended;
      const percentage = total > 0 ? (attended / total) * 100 : 0;
      const bunksLeft = total > 0 ? Math.max(0, Math.floor((attended / (requirement / 100)) - total)) : 0;
      const toRecover = total > 0 && requirement < 100 
        ? Math.max(0, Math.ceil(((requirement / 100) * total - attended) / (1 - requirement / 100)))
        : 0;
      return { total, attended, percentage, bunksLeft, toRecover };
    } else {
      let total = 0, attended = 0;
      Object.values(attendance).forEach(status => {
        if (status === 'present' || status === 'absent') {
          total++;
          if (status === 'present') attended++;
        }
      });
      const percentage = total > 0 ? (attended / total) * 100 : 0;
      const bunksLeft = total > 0 ? Math.max(0, Math.floor((attended / (requirement / 100)) - total)) : 0;
      const toRecover = total > 0 && requirement < 100
        ? Math.max(0, Math.ceil(((requirement / 100) * total - attended) / (1 - requirement / 100)))
        : 0;
      return { total, attended, percentage, bunksLeft, toRecover };
    }
  };

  const stats = getStats();

  const getStatus = () => {
    const diff = stats.percentage - requirement;
    if (diff >= 5) return { label: 'Comfortable', color: 'bg-emerald-500', text: "You're safe!", emoji: '✅' };
    if (diff >= 0) return { label: 'Safe', color: 'bg-green-500', text: 'Just meeting target', emoji: '✓' };
    if (diff >= -5) return { label: 'Warning', color: 'bg-amber-500', text: 'Close to danger', emoji: '⚠️' };
    return { label: 'Critical', color: 'bg-red-500', text: 'Need to attend!', emoji: '🚨' };
  };

  const status = getStatus();

  // Forecast
  const getForecast = () => {
    const forecast = [];
    for (let i = 0; i <= 10; i++) {
      const futureTotal = stats.total + i;
      const futureAttended = stats.attended + i;
      const pct = futureTotal > 0 ? (futureAttended / futureTotal) * 100 : 0;
      forecast.push(pct);
    }
    return forecast;
  };

  const forecast = getForecast();
  const maxForecast = Math.max(...forecast, requirement, 100);

  // Date helpers
  const getDates = () => {
    const dates = [];
    const today = new Date();
    
    if (viewMode === 'month') {
      // Show current month
      const year = today.getFullYear();
      const month = today.getMonth() - dateOffset;
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }
    } else {
      // Show week
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - (7 * dateOffset) - 6);
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    
    return dates;
  };

  const dates = getDates();

  const isToday = (dateStr) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  const canGoNext = () => {
    if (viewMode === 'month') {
      return dateOffset > 0;
    }
    return dateOffset > 0;
  };

  const getCurrentMonthName = () => {
    const today = new Date();
    const month = today.getMonth() - dateOffset;
    const year = today.getFullYear();
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Subject actions
  const addSubject = () => {
    if (!newSubjectName.trim()) return;
    const colors = ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#6366F1', '#EF4444', '#14B8A6'];
    setSubjects([...subjects, {
      id: Date.now().toString(),
      name: newSubjectName.trim(),
      color: colors[subjects.length % colors.length]
    }]);
    setNewSubjectName('');
    setShowAddSubject(false);
  };

  const deleteSubject = (id) => {
    if (!confirm('Delete this subject?')) return;
    setSubjects(subjects.filter(s => s.id !== id));
    const newAttendance = { ...attendance };
    Object.keys(newAttendance).forEach(key => {
      if (key.startsWith(`${id}-`)) delete newAttendance[key];
    });
    setAttendance(newAttendance);
  };

  const toggleAttendance = (subjectId, date) => {
    const key = `${subjectId}-${date}`;
    const current = attendance[key];
    const newAttendance = { ...attendance };
    
    if (!current) newAttendance[key] = 'present';
    else if (current === 'present') newAttendance[key] = 'absent';
    else delete newAttendance[key];
    
    setAttendance(newAttendance);
  };

  const getSubjectStats = (subjectId) => {
    let total = 0, attended = 0;
    Object.entries(attendance).forEach(([key, status]) => {
      if (key.startsWith(`${subjectId}-`) && (status === 'present' || status === 'absent')) {
        total++;
        if (status === 'present') attended++;
      }
    });
    const percentage = total > 0 ? (attended / total) * 100 : 0;
    return { total, attended, percentage };
  };

  // Reset functions
  const resetQuickMode = () => {
    if (!confirm('Reset Quick mode data?')) return;
    setQuickTotal(0);
    setQuickAttended(0);
  };

  const resetEverything = () => {
    if (!confirm('Reset ALL data? This cannot be undone!')) return;
    setQuickTotal(0);
    setQuickAttended(0);
    setSubjects([]);
    setAttendance({});
    setRequirement(75);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', -apple-system, sans-serif; }
        input[type="range"]::-webkit-slider-thumb { appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #4F46E5; cursor: pointer; }
        input[type="range"]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #4F46E5; cursor: pointer; border: none; }
        input[type="number"]::-webkit-inner-spin-button { display: none; }
      `}</style>

      <div className="max-w-6xl mx-auto px-3 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Attendance Survival</h1>
            <p className="text-xs text-slate-600">Bunk smartly</p>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="How to use"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Welcome Screen - First Time Only */}
        {!hasSeenWelcome && (
          <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Attendance Tracker</h1>
              <p className="text-slate-600 mb-8">Keep track of your attendance and know exactly when you can skip class.</p>
              
              <div className="space-y-3 text-left mb-8">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="font-semibold text-indigo-900 mb-1">Quick Mode</div>
                  <div className="text-sm text-indigo-700">Simple counter. Just enter total classes and how many you attended.</div>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="font-semibold text-purple-900 mb-1">Pro Mode</div>
                  <div className="text-sm text-purple-700">Track each subject separately. See which classes need attention.</div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setHasSeenWelcome(true);
                  setIsFirstTime(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Let's Start
              </button>
            </div>
          </div>
        )}

        {/* Simple Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-lg font-bold text-slate-900">Need Help?</h2>
                <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">What do the numbers mean?</h3>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p><strong>Safe Skips:</strong> How many classes you can miss while staying above your target.</p>
                    <p><strong>Attend Next:</strong> How many classes you need to attend (in a row) to reach your target.</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">The math is harsh</h3>
                  <p className="text-sm text-slate-700">When you attend a class, both numbers increase (attended AND total). This makes it hard to climb back up once you fall below target.</p>
                  <p className="text-sm text-slate-700 mt-2">Example: At 92%, you need 7 consecutive classes to reach 95%.</p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Pro Mode Quick Guide</h3>
                  <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                    <li>Add your subjects</li>
                    <li>Click on dates to mark: gray → green (present) → red (absent)</li>
                    <li>Check Dashboard to see all subjects at once</li>
                  </ol>
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200 rounded-b-2xl">
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm mb-4 max-w-md mx-auto">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
              mode === 'quick'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Quick Mode
          </button>
          <button
            onClick={() => setMode('pro')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all ${
              mode === 'pro'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pro Mode
          </button>
        </div>

        {mode === 'quick' ? (
          // QUICK MODE
          <div className="max-w-md mx-auto space-y-3">
            {/* Status Card */}
            <div className={`${status.color} text-white rounded-2xl p-5 shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{status.emoji}</span>
                <span className="text-xs font-medium opacity-90">Target: {requirement}%</span>
              </div>
              <div className="text-6xl font-black mb-2">{Math.round(stats.percentage)}%</div>
              <div className="text-sm font-medium opacity-95">{status.label}</div>
              <div className="text-xs opacity-75 mt-1">{status.text}</div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  Safe Skips
                  <div className="group relative">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Classes you can safely miss
                    </div>
                  </div>
                </div>
                <div className="text-4xl font-black text-emerald-600">{stats.bunksLeft}</div>
                <div className="text-xs text-slate-500 mt-1">Can miss</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  Attend Next
                  <div className="group relative">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      Must attend consecutively
                    </div>
                  </div>
                </div>
                <div className="text-4xl font-black text-red-600">{stats.toRecover}</div>
                <div className="text-xs text-slate-500 mt-1">Must attend</div>
              </div>
            </div>

            {/* Input Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-2">Total</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuickTotal(Math.max(0, quickTotal - 1))}
                    className="w-7 h-7 bg-slate-100 rounded-lg text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quickTotal}
                    onChange={(e) => setQuickTotal(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-2xl font-bold bg-transparent border-0 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuickTotal(quickTotal + 1)}
                    className="w-7 h-7 bg-slate-100 rounded-lg text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-2">Attended</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuickAttended(Math.max(0, quickAttended - 1))}
                    className="w-7 h-7 bg-slate-100 rounded-lg text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quickAttended}
                    onChange={(e) => setQuickAttended(Math.max(0, Math.min(quickTotal, parseInt(e.target.value) || 0)))}
                    className="w-full text-center text-2xl font-bold bg-transparent border-0 focus:outline-none"
                  />
                  <button
                    onClick={() => setQuickAttended(Math.min(quickTotal, quickAttended + 1))}
                    className="w-7 h-7 bg-slate-100 rounded-lg text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 shadow-sm border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 mb-2">Missed</div>
                <div className="text-2xl font-bold text-red-600 text-center pt-2">
                  {stats.total - stats.attended}
                </div>
              </div>
            </div>

            {/* Buffer Indicator */}
            <div className={`rounded-xl p-3 ${stats.percentage >= requirement ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Buffer from target</span>
                <span className={`text-lg font-bold ${stats.percentage >= requirement ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stats.percentage >= requirement ? '+' : ''}{(stats.percentage - requirement).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Requirement Slider */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Target Requirement</span>
                <span className="text-2xl font-bold text-indigo-600">{requirement}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={requirement}
                onChange={(e) => setRequirement(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Compact Forecast */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-700">10-Class Forecast</span>
              </div>
              <div className="relative h-32" style={{ paddingBottom: '8px' }}>
                <div className="absolute inset-0 flex items-end justify-between gap-0.5" style={{ paddingBottom: '20px' }}>
                  {forecast.map((pct, i) => {
                    const heightPercent = (pct / maxForecast) * 100;
                    return (
                      <div key={i} className="flex-1 group relative flex flex-col items-center h-full justify-end">
                        <div
                          className={`w-full rounded-t transition-all cursor-pointer ${
                            pct >= requirement ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {Math.round(pct)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500">
                  {forecast.map((_, i) => (
                    <div key={i} className="flex-1 text-center">
                      {i === 0 ? 'Now' : i}
                    </div>
                  ))}
                </div>
                {/* Goal line */}
                <div
                  className="absolute w-full border-t-2 border-dashed border-indigo-400 pointer-events-none"
                  style={{ bottom: `${20 + ((requirement / maxForecast) * (100 - 20))}px` }}
                >
                  <span className="absolute -top-3 right-0 text-xs font-semibold text-indigo-600 bg-white px-1 rounded">
                    {requirement}%
                  </span>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetQuickMode}
              className="w-full py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
            >
              Reset Quick Mode
            </button>
          </div>
        ) : (
          // PRO MODE
          <div>
            {/* Desktop Layout */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Left Column - Status & Forecast (Mobile: stacked first) */}
              <div className="space-y-3 max-w-md mx-auto lg:mx-0 w-full">
                {/* Status Card */}
                <div className={`${status.color} text-white rounded-2xl p-5 shadow-lg`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{status.emoji}</span>
                    <span className="text-xs font-medium opacity-90">Target: {requirement}%</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-6xl font-black mb-2">{Math.round(stats.percentage)}%</div>
                      <div className="text-sm font-medium opacity-95">{status.label}</div>
                      <div className="text-xs opacity-75 mt-1">{status.text}</div>
                    </div>
                    <div className="text-right text-sm opacity-90">
                      <div>{stats.attended}/{stats.total}</div>
                    </div>
                  </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      Safe Skips
                      <div className="group relative">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          Classes you can safely miss
                        </div>
                      </div>
                    </div>
                    <div className="text-4xl font-black text-emerald-600">{stats.bunksLeft}</div>
                    <div className="text-xs text-slate-500 mt-1">Can miss</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      Attend Next
                      <div className="group relative">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          Must attend consecutively
                        </div>
                      </div>
                    </div>
                    <div className="text-4xl font-black text-red-600">{stats.toRecover}</div>
                    <div className="text-xs text-slate-500 mt-1">Must attend</div>
                  </div>
                </div>

                {/* Buffer */}
                <div className={`rounded-xl p-3 ${stats.percentage >= requirement ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Buffer from target</span>
                    <span className={`text-lg font-bold ${stats.percentage >= requirement ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stats.percentage >= requirement ? '+' : ''}{(stats.percentage - requirement).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Requirement Slider */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Target Requirement</span>
                    <span className="text-2xl font-bold text-indigo-600">{requirement}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={requirement}
                    onChange={(e) => setRequirement(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Compact Forecast */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-slate-700">10-Class Forecast</span>
                  </div>
                  <div className="relative h-32 lg:h-40" style={{ paddingBottom: '8px' }}>
                    <div className="absolute inset-0 flex items-end justify-between gap-0.5" style={{ paddingBottom: '20px' }}>
                      {forecast.map((pct, i) => {
                        const heightPercent = (pct / maxForecast) * 100;
                        return (
                          <div key={i} className="flex-1 group relative flex flex-col items-center h-full justify-end">
                            <div
                              className={`w-full rounded-t transition-all cursor-pointer ${
                                pct >= requirement ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                {Math.round(pct)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500">
                      {forecast.map((_, i) => (
                        <div key={i} className="flex-1 text-center">
                          {i === 0 ? 'Now' : i}
                        </div>
                      ))}
                    </div>
                    <div
                      className="absolute w-full border-t-2 border-dashed border-indigo-400 pointer-events-none"
                      style={{ bottom: `${20 + ((requirement / maxForecast) * (100 - 20))}px` }}
                    >
                      <span className="absolute -top-3 right-0 text-xs font-semibold text-indigo-600 bg-white px-1 rounded">
                        {requirement}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Subjects & Tracker */}
              <div className="space-y-3 max-w-md mx-auto lg:mx-0 w-full">
                {/* Tab Navigation */}
                <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === 'dashboard'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('tracker')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                      activeTab === 'tracker'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Mark Attendance
                  </button>
                </div>

                {activeTab === 'dashboard' ? (
                  subjects.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-700 px-1">Your Subjects</div>
                      {subjects.map(subject => {
                        const subStats = getSubjectStats(subject.id);
                        return (
                          <div key={subject.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: subject.color }}
                                />
                                <span className="font-semibold text-slate-800 text-sm truncate">
                                  {subject.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <div className={`text-2xl font-black ${
                                    subStats.percentage >= requirement ? 'text-emerald-600' : 'text-red-600'
                                  }`}>
                                    {Math.round(subStats.percentage)}%
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {subStats.attended}/{subStats.total}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => setActiveTab('tracker')}
                        className="w-full py-3 text-sm text-indigo-600 font-semibold hover:bg-indigo-50 rounded-xl transition-colors border-2 border-dashed border-indigo-200"
                      >
                        + Add / Mark Attendance
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center">
                      <div className="text-5xl mb-3">👋</div>
                      <div className="text-base font-semibold text-slate-700 mb-2">Let's add your first subject</div>
                      <div className="text-sm text-slate-600 mb-4">Click the button below, then you can start marking attendance.</div>
                      <button
                        onClick={() => setActiveTab('tracker')}
                        className="px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
                      >
                        Add Subject
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {/* Add Subject */}
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
                      {!showAddSubject ? (
                        <button
                          onClick={() => setShowAddSubject(true)}
                          className="w-full py-2 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Subject
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                            placeholder="Subject name..."
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            onClick={addSubject}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowAddSubject(false);
                              setNewSubjectName('');
                            }}
                            className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Date Navigation */}
                    {subjects.length > 0 && (
                      <>
                        {/* View Mode Toggle */}
                        <div className="flex gap-2 p-1 bg-white rounded-xl shadow-sm border border-slate-200">
                          <button
                            onClick={() => { setViewMode('week'); setDateOffset(0); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                              viewMode === 'week' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                            }`}
                          >
                            Week View
                          </button>
                          <button
                            onClick={() => { setViewMode('month'); setDateOffset(0); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                              viewMode === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                            }`}
                          >
                            Month View
                          </button>
                        </div>

                        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex items-center justify-between">
                          <button
                            onClick={() => setDateOffset(dateOffset + 1)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                          </button>
                          <div className="text-center">
                            <div className="text-xs font-semibold text-slate-700">
                              {viewMode === 'month' ? (
                                getCurrentMonthName()
                              ) : (
                                <>
                                  {new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dates[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </>
                              )}
                            </div>
                            {dateOffset > 0 && (
                              <button
                                onClick={() => setDateOffset(0)}
                                className="text-xs text-indigo-600 font-medium hover:underline"
                              >
                                Jump to today
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => setDateOffset(Math.max(0, dateOffset - 1))}
                            disabled={!canGoNext()}
                            className={`p-2 rounded-lg transition-colors ${
                              canGoNext() ? 'hover:bg-slate-100' : 'opacity-30 cursor-not-allowed'
                            }`}
                          >
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Subjects Attendance */}
                    {subjects.length === 0 ? (
                      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center">
                        <div className="text-5xl mb-3">📝</div>
                        <div className="text-base font-semibold text-slate-700 mb-2">Click "Add Subject" above</div>
                        <div className="text-sm text-slate-600">Add all your subjects first, then you can mark attendance.</div>
                      </div>
                    ) : (
                      <>
                      <div className="space-y-2">
                        {subjects.map(subject => {
                          const subStats = getSubjectStats(subject.id);
                          return (
                            <div key={subject.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: subject.color }}
                                  />
                                  <span className="font-semibold text-slate-800 text-sm truncate">
                                    {subject.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`text-xl font-black ${
                                    subStats.percentage >= requirement ? 'text-emerald-600' : 'text-red-600'
                                  }`}>
                                    {Math.round(subStats.percentage)}%
                                  </span>
                                  <button
                                    onClick={() => deleteSubject(subject.id)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Attendance Grid */}
                              <div className={`${viewMode === 'month' ? 'grid grid-cols-7 gap-1' : 'flex gap-1 overflow-x-auto'} pb-1`}>
                                {dates.map(date => {
                                  const key = `${subject.id}-${date}`;
                                  const status = attendance[key];
                                  const d = new Date(date);
                                  const today = isToday(date);

                                  return (
                                    <button
                                      key={date}
                                      onClick={() => toggleAttendance(subject.id, date)}
                                      className={`flex flex-col items-center justify-center ${viewMode === 'month' ? 'aspect-square' : 'min-w-[2.5rem] h-14'} rounded-lg text-xs font-semibold transition-all ${
                                        status === 'present'
                                          ? 'bg-emerald-500 text-white'
                                          : status === 'absent'
                                          ? 'bg-red-500 text-white'
                                          : 'bg-slate-100 text-slate-400'
                                      } ${today ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                                    >
                                      <div className="text-[10px] opacity-75">
                                        {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                                      </div>
                                      <div className="font-bold">{d.getDate()}</div>
                                      <div className="text-xs">
                                        {status === 'present' ? '✓' : status === 'absent' ? '✕' : '·'}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


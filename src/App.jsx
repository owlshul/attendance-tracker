import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, Download, Upload, Flame, Target } from 'lucide-react';

export default function AttendanceTracker() {
  const [totalClasses, setTotalClasses] = useState(0);
  const [attended, setAttended] = useState(0);
  const [requirement, setRequirement] = useState(75);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subjects, setSubjects] = useState([]);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [attendance, setAttendance] = useState({});
  const [dateRangeStart, setDateRangeStart] = useState(null);
  const [trackingMode, setTrackingMode] = useState('advanced');
  const [manualTotal, setManualTotal] = useState(0);
  const [manualAttended, setManualAttended] = useState(0);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { saveData(); }, [subjects, attendance, requirement, dateRangeStart, trackingMode, manualTotal, manualAttended]);
  useEffect(() => { calculateOverallStats(); }, [attendance, subjects]);

  const loadData = async () => {
    try {
      const configResult = await window.storage.get('attendance-config');
      if (configResult) {
        const config = JSON.parse(configResult.value);
        setRequirement(config.requirement || 75);
        setDateRangeStart(config.dateRangeStart || null);
        setTrackingMode(config.trackingMode || 'advanced');
        setManualTotal(config.manualTotal || 0);
        setManualAttended(config.manualAttended || 0);
      }
    } catch (e) {}

    try {
      const subjectsResult = await window.storage.get('attendance-subjects');
      if (subjectsResult) setSubjects(JSON.parse(subjectsResult.value));
    } catch (e) {}

    try {
      const attendanceResult = await window.storage.get('attendance-records');
      if (attendanceResult) setAttendance(JSON.parse(attendanceResult.value));
    } catch (e) {}
  };

  const saveData = async () => {
    try {
      await window.storage.set('attendance-config', JSON.stringify({ requirement, dateRangeStart, trackingMode, manualTotal, manualAttended }));
      await window.storage.set('attendance-subjects', JSON.stringify(subjects));
      await window.storage.set('attendance-records', JSON.stringify(attendance));
    } catch (e) {}
  };

  const calculateOverallStats = () => {
    if (trackingMode === 'simple') return;
    let totalConducted = 0, totalAttended = 0;
    subjects.forEach(subject => {
      const subjectRecords = Object.entries(attendance).filter(([key]) => key.startsWith(`${subject.id}-`));
      totalConducted += subjectRecords.length;
      totalAttended += subjectRecords.filter(([, status]) => status === 'present').length;
    });
    setTotalClasses(totalConducted);
    setAttended(totalAttended);
  };

  const displayTotal = trackingMode === 'simple' ? manualTotal : totalClasses;
  const displayAttended = trackingMode === 'simple' ? manualAttended : attended;
  const percentage = displayTotal > 0 ? (displayAttended / displayTotal) * 100 : 0;
  const bunksLeft = Math.floor(displayAttended / (requirement / 100) - displayTotal);
  const toRecover = Math.ceil((requirement / 100) * displayTotal - displayAttended);

  const getStatus = () => {
    if (percentage >= requirement + 5) return { label: 'On Fire', emoji: '🔥', bg: 'bg-gradient-to-br from-orange-500 to-red-500' };
    if (percentage >= requirement) return { label: 'Safe', emoji: '✅', bg: 'bg-gradient-to-br from-emerald-500 to-teal-500' };
    if (percentage >= requirement - 5) return { label: 'Warning', emoji: '⚠️', bg: 'bg-gradient-to-br from-yellow-500 to-orange-500' };
    return { label: 'Critical', emoji: '🚨', bg: 'bg-gradient-to-br from-red-600 to-rose-600' };
  };

  const status = getStatus();

  const forecast = [];
  for (let i = 0; i <= 10; i++) {
    const futureTotal = displayTotal + i;
    const futureAttended = displayAttended + i;
    const futurePercentage = futureTotal > 0 ? (futureAttended / futureTotal) * 100 : 0;
    forecast.push({ classes: i, percentage: futurePercentage });
  }

  const addSubject = () => {
    if (newSubjectName.trim()) {
      const colors = ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#6366F1', '#EF4444', '#14B8A6'];
      setSubjects([...subjects, { id: Date.now().toString(), name: newSubjectName.trim(), conducted: 0, attended: 0, color: colors[Math.floor(Math.random() * colors.length)] }]);
      setNewSubjectName('');
      setShowAddSubject(false);
    }
  };

  const deleteSubject = (id) => {
    setSubjects(subjects.filter(s => s.id !== id));
    const newAttendance = { ...attendance };
    Object.keys(newAttendance).forEach(key => { if (key.startsWith(`${id}-`)) delete newAttendance[key]; });
    setAttendance(newAttendance);
  };

  const markAttendance = (subjectId, date, status) => {
    const key = `${subjectId}-${date}`;
    const newAttendance = { ...attendance };
    if (status === null) delete newAttendance[key];
    else newAttendance[key] = status;
    setAttendance(newAttendance);
  };

  useEffect(() => {
    const updatedSubjects = subjects.map(subject => {
      const subjectRecords = Object.entries(attendance).filter(([key]) => key.startsWith(`${subject.id}-`));
      return { ...subject, conducted: subjectRecords.length, attended: subjectRecords.filter(([, status]) => status === 'present').length };
    });
    setSubjects(updatedSubjects);
  }, [attendance]);

  const getDates = () => {
    const dates = [];
    const endDate = dateRangeStart ? new Date(dateRangeStart) : new Date();
    for (let i = 20; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const dates = getDates();
  const getSubjectPercentage = (subject) => subject.conducted > 0 ? (subject.attended / subject.conducted) * 100 : 0;

  const getCurrentStreak = () => {
    if (trackingMode === 'simple' || subjects.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      let hadClass = false, wasPresent = false;
      subjects.forEach(subject => {
        const key = `${subject.id}-${dateStr}`;
        if (attendance[key]) {
          hadClass = true;
          if (attendance[key] === 'present') wasPresent = true;
        }
      });
      if (hadClass) {
        if (wasPresent) streak++;
        else break;
      }
    }
    return streak;
  };

  const exportData = () => {
    const data = { subjects, attendance, requirement, trackingMode, manualTotal, manualAttended, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          setSubjects(data.subjects || []);
          setAttendance(data.attendance || {});
          setRequirement(data.requirement || 75);
          setTrackingMode(data.trackingMode || 'advanced');
          setManualTotal(data.manualTotal || 0);
          setManualAttended(data.manualAttended || 0);
        } catch (error) { alert('Invalid file'); }
      };
      reader.readAsText(file);
    }
  };

  const currentStreak = getCurrentStreak();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-3">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Poppins', sans-serif; }
      `}</style>

      <div className="max-w-md mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={exportData} className="p-2 bg-white rounded-xl shadow-sm" title="Export">
              <Download className="w-4 h-4 text-slate-600" />
            </button>
            <label className="p-2 bg-white rounded-xl shadow-sm cursor-pointer" title="Import">
              <Upload className="w-4 h-4 text-slate-600" />
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm">
          <button onClick={() => setTrackingMode('simple')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition ${trackingMode === 'simple' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
            Quick
          </button>
          <button onClick={() => setTrackingMode('advanced')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition ${trackingMode === 'advanced' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
            Detailed
          </button>
        </div>

        {trackingMode === 'simple' ? (
          <div className="space-y-3">
            {/* Compact Status */}
            <div className={`${status.bg} text-white rounded-2xl p-4 shadow-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{status.emoji}</span>
                <span className="text-sm opacity-90">Target: {requirement}%</span>
              </div>
              <div className="text-6xl font-black mb-1">{Math.round(percentage)}%</div>
              <div className="text-sm font-medium opacity-95">{status.label}</div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">Total</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setManualTotal(Math.max(0, manualTotal - 1))} className="w-6 h-6 bg-slate-100 rounded text-slate-600 text-lg flex items-center justify-center">−</button>
                  <input type="number" value={manualTotal} onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value) || 0))} className="w-full text-center text-xl font-bold bg-slate-50 rounded py-1 border-0 focus:ring-2 focus:ring-indigo-400" />
                  <button onClick={() => setManualTotal(manualTotal + 1)} className="w-6 h-6 bg-slate-100 rounded text-slate-600 text-lg flex items-center justify-center">+</button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">Attended</div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setManualAttended(Math.max(0, manualAttended - 1))} className="w-6 h-6 bg-slate-100 rounded text-slate-600 text-lg flex items-center justify-center">−</button>
                  <input type="number" value={manualAttended} onChange={(e) => setManualAttended(Math.max(0, Math.min(manualTotal, parseInt(e.target.value) || 0)))} className="w-full text-center text-xl font-bold bg-slate-50 rounded py-1 border-0 focus:ring-2 focus:ring-emerald-400" />
                  <button onClick={() => setManualAttended(Math.min(manualTotal, manualAttended + 1))} className="w-6 h-6 bg-slate-100 rounded text-slate-600 text-lg flex items-center justify-center">+</button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 shadow-sm">
                <div className="text-xs text-slate-500 mb-1">Missed</div>
                <div className="text-3xl font-bold text-red-600 text-center">{displayTotal - displayAttended}</div>
              </div>
            </div>

            {/* Action Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <div className="text-xs text-emerald-700 font-medium mb-1">Can Skip</div>
                <div className="text-3xl font-black text-emerald-600">{Math.max(0, bunksLeft)}</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                <div className="text-xs text-red-700 font-medium mb-1">Must Attend</div>
                <div className="text-3xl font-black text-red-600">{Math.max(0, toRecover)}</div>
              </div>
            </div>

            {/* Compact Target */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Target</span>
                <span className="text-2xl font-bold text-indigo-600">{requirement}%</span>
              </div>
              <input type="range" min="0" max="100" value={requirement} onChange={(e) => setRequirement(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
            </div>

            {/* Compact Forecast */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-sm font-semibold text-slate-700 mb-2">Forecast</div>
              <div className="relative h-32">
                <div className="absolute inset-0 flex items-end justify-between gap-0.5">
                  {forecast.map((point, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className={`w-full rounded-t ${point.percentage >= requirement ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: `${point.percentage}%` }} />
                      <span className="text-[10px] text-slate-500 mt-1">{i || 'N'}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute w-full border-t border-dashed border-indigo-400" style={{ bottom: `${requirement}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tabs */}
            <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm">
              <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                Dashboard
              </button>
              <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'tracker' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                Track
              </button>
            </div>

            {activeTab === 'dashboard' ? (
              <div className="space-y-3">
                {/* Compact Status */}
                <div className={`${status.bg} text-white rounded-2xl p-4 shadow-lg`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{status.emoji}</span>
                      {currentStreak > 0 && (
                        <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                          <Flame className="w-3 h-3" />
                          <span className="text-xs font-bold">{currentStreak}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm opacity-90">Target: {requirement}%</span>
                  </div>
                  <div className="text-6xl font-black mb-1">{Math.round(percentage)}%</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium opacity-95">{status.label}</span>
                    <span className="opacity-90">{displayAttended}/{displayTotal}</span>
                  </div>
                </div>

                {/* Action Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                    <div className="text-xs text-emerald-700 font-medium mb-1">Can Skip</div>
                    <div className="text-3xl font-black text-emerald-600">{Math.max(0, bunksLeft)}</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                    <div className="text-xs text-red-700 font-medium mb-1">Must Attend</div>
                    <div className="text-3xl font-black text-red-600">{Math.max(0, toRecover)}</div>
                  </div>
                </div>

                {subjects.length > 0 ? (
                  <>
                    {/* Subjects */}
                    <div className="space-y-2">
                      {subjects.map(subject => {
                        const pct = getSubjectPercentage(subject);
                        return (
                          <div key={subject.id} className="bg-white rounded-xl p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                                <span className="font-semibold text-slate-800 text-sm truncate">{subject.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`text-2xl font-black ${pct >= requirement ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {Math.round(pct)}%
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {subject.attended}/{subject.conducted} attended
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Compact Forecast */}
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="text-sm font-semibold text-slate-700 mb-2">Forecast</div>
                      <div className="relative h-32">
                        <div className="absolute inset-0 flex items-end justify-between gap-0.5">
                          {forecast.map((point, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                              <div className={`w-full rounded-t ${point.percentage >= requirement ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: `${point.percentage}%` }} />
                              <span className="text-[10px] text-slate-500 mt-1">{i || 'N'}</span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute w-full border-t border-dashed border-indigo-400" style={{ bottom: `${requirement}%` }} />
                      </div>
                    </div>

                    {/* Compact Target */}
                    <div className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">Target</span>
                        <span className="text-2xl font-bold text-indigo-600">{requirement}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={requirement} onChange={(e) => setRequirement(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                    <div className="text-4xl mb-2">📚</div>
                    <div className="text-sm font-semibold text-slate-700 mb-1">No subjects</div>
                    <button onClick={() => setActiveTab('tracker')} className="text-sm text-indigo-600 font-medium">
                      Add one →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Add Subject */}
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  {!showAddSubject ? (
                    <button onClick={() => setShowAddSubject(true)} className="w-full flex items-center justify-center gap-2 text-indigo-600 font-semibold text-sm">
                      <Plus className="w-4 h-4" />
                      Add Subject
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject..." className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" onKeyPress={(e) => e.key === 'Enter' && addSubject()} autoFocus />
                      <button onClick={addSubject} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Add</button>
                      <button onClick={() => { setShowAddSubject(false); setNewSubjectName(''); }} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">✕</button>
                    </div>
                  )}
                </div>

                {/* Date Nav */}
                {subjects.length > 0 && (
                  <div className="bg-white rounded-xl p-2 shadow-sm flex items-center justify-between">
                    <button onClick={() => { const c = dateRangeStart ? new Date(dateRangeStart) : new Date(); const n = new Date(c); n.setDate(n.getDate() - 7); setDateRangeStart(n.toISOString().split('T')[0]); }} className="p-2">
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <div className="text-xs font-semibold text-slate-700 text-center">
                      {dateRangeStart ? <>{new Date(new Date(dateRangeStart).setDate(new Date(dateRangeStart).getDate() - 20)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</> : 'Last 21 days'}
                      {dateRangeStart && <button onClick={() => setDateRangeStart(null)} className="block text-indigo-600 mt-0.5">Today</button>}
                    </div>
                    <button onClick={() => { if (!dateRangeStart) return; const c = new Date(dateRangeStart); const n = new Date(c); n.setDate(n.getDate() + 7); if (n <= new Date()) setDateRangeStart(n.toISOString().split('T')[0]); }} disabled={!dateRangeStart} className={`p-2 ${!dateRangeStart ? 'opacity-30' : ''}`}>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                )}

                {/* Subjects */}
                {subjects.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                    <div className="text-4xl mb-2">🎓</div>
                    <div className="text-sm text-slate-600">No subjects yet</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subjects.map(subject => {
                      const pct = getSubjectPercentage(subject);
                      return (
                        <div key={subject.id} className="bg-white rounded-xl p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                              <span className="font-semibold text-slate-800 text-sm">{subject.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xl font-black ${pct >= requirement ? 'text-emerald-600' : 'text-red-600'}`}>{Math.round(pct)}%</span>
                              <button onClick={() => deleteSubject(subject.id)} className="text-red-500">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <div className="flex gap-1">
                              {dates.map(date => {
                                const key = `${subject.id}-${date}`;
                                const status = attendance[key];
                                const d = new Date(date);
                                const isToday = date === new Date().toISOString().split('T')[0];
                                return (
                                  <button
                                    key={date}
                                    onClick={() => {
                                      if (status === 'present') markAttendance(subject.id, date, 'absent');
                                      else if (status === 'absent') markAttendance(subject.id, date, null);
                                      else markAttendance(subject.id, date, 'present');
                                    }}
                                    className={`flex flex-col items-center min-w-[2.2rem] ${
                                      status === 'present' ? 'bg-emerald-500 text-white' :
                                      status === 'absent' ? 'bg-red-500 text-white' :
                                      'bg-slate-100 text-slate-400'
                                    } rounded-lg p-1 text-xs ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
                                  >
                                    <span className="font-medium">{d.getDate()}</span>
                                    <span className="text-[10px]">{status === 'present' ? '✓' : status === 'absent' ? '✕' : '·'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

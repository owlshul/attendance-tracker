import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, Download, Upload, RotateCcw } from 'lucide-react';

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
  const [trackingMode, setTrackingMode] = useState('simple');
  const [manualTotal, setManualTotal] = useState(0);
  const [manualAttended, setManualAttended] = useState(0);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { saveData(); }, [subjects, attendance, requirement, dateRangeStart, trackingMode, manualTotal, manualAttended]);
  useEffect(() => { calculateOverallStats(); }, [attendance, subjects, trackingMode]);

  const loadData = async () => {
    try {
      const configResult = await window.storage.get('attendance-config');
      if (configResult) {
        const config = JSON.parse(configResult.value);
        setRequirement(config.requirement || 75);
        setDateRangeStart(config.dateRangeStart || null);
        setTrackingMode(config.trackingMode || 'simple');
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
  const bunksLeft = Math.max(0, Math.floor(displayAttended / (requirement / 100) - displayTotal));
  const toRecover = Math.max(0, Math.ceil((requirement / 100) * displayTotal - displayAttended));

  const forecast = [];
  for (let i = 0; i <= 10; i++) {
    const futureTotal = displayTotal + i;
    const futureAttended = displayAttended + i;
    const futurePercentage = futureTotal > 0 ? (futureAttended / futureTotal) * 100 : 0;
    forecast.push({ classes: i, percentage: futurePercentage });
  }

  const addSubject = () => {
    if (newSubjectName.trim()) {
      setSubjects([...subjects, { id: Date.now().toString(), name: newSubjectName.trim(), conducted: 0, attended: 0 }]);
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

  const exportData = () => {
    const data = { subjects, attendance, requirement, trackingMode, manualTotal, manualAttended, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendlyx-${new Date().toISOString().split('T')[0]}.json`;
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
          setTrackingMode(data.trackingMode || 'simple');
          setManualTotal(data.manualTotal || 0);
          setManualAttended(data.manualAttended || 0);
        } catch (error) { alert('Invalid backup file'); }
      };
      reader.readAsText(file);
    }
  };

  const getStatusInfo = () => {
    const buffer = percentage - requirement;
    if (buffer >= 5) return { status: "You're Safe!", message: "Buffer available. Take a break if you need!", color: "from-emerald-400 to-green-500", textColor: "text-emerald-700", bgColor: "bg-emerald-50", icon: "🎉" };
    if (buffer >= 0) return { status: "On Track", message: "Keep it up! You're meeting your goal.", color: "from-blue-400 to-cyan-500", textColor: "text-blue-700", bgColor: "bg-blue-50", icon: "✓" };
    if (buffer >= -5) return { status: "Close Call", message: "Attend classes to stay on track.", color: "from-amber-400 to-orange-500", textColor: "text-amber-700", bgColor: "bg-amber-50", icon: "⚠" };
    return { status: "At Risk", message: "Need to catch up on attendance.", color: "from-rose-400 to-red-500", textColor: "text-red-700", bgColor: "bg-red-50", icon: "!" };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', sans-serif; }
        
        .circle-progress {
          transform: rotate(-90deg);
        }
        
        .glass {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attendlyx</h1>
              <p className="text-sm text-gray-500">Bunk responsibly.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setTrackingMode(trackingMode === 'simple' ? 'advanced' : 'simple')} className="px-4 py-2 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all border border-gray-200 shadow-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              {trackingMode === 'simple' ? 'Switch to Detailed' : 'Switch to Quick'}
            </button>
            <button onClick={exportData} className="p-2.5 bg-white rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm" title="Export">
              <Download className="w-4 h-4 text-gray-600" />
            </button>
            <label className="p-2.5 bg-white rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm cursor-pointer" title="Import">
              <Upload className="w-4 h-4 text-gray-600" />
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {trackingMode === 'simple' ? (
              <>
                {/* Input Data Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">📝 Input Data</h3>
                    <button onClick={() => { setManualTotal(0); setManualAttended(0); }} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-3">Total Classes<br/><span className="text-xs uppercase">Conducted</span></label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setManualTotal(Math.max(0, manualTotal - 1))} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors">−</button>
                        <input type="number" value={manualTotal} onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 text-center text-4xl font-bold bg-gray-50 rounded-xl py-3 border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors" />
                        <button onClick={() => setManualTotal(manualTotal + 1)} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors">+</button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-3">Attended<br/><span className="text-xs uppercase">Present</span></label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setManualAttended(Math.max(0, manualAttended - 1))} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors">−</button>
                        <input type="number" value={manualAttended} onChange={(e) => setManualAttended(Math.max(0, Math.min(manualTotal, parseInt(e.target.value) || 0)))} className="flex-1 text-center text-4xl font-bold bg-gray-50 rounded-xl py-3 border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors" />
                        <button onClick={() => setManualAttended(Math.min(manualTotal, manualAttended + 1))} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirement Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">🎯 Requirement</h3>
                      <p className="text-xs text-gray-400 mt-1">Target %</p>
                    </div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {requirement}%
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={requirement} 
                    onChange={(e) => setRequirement(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                    style={{
                      background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${requirement}%, #e5e7eb ${requirement}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>0%</span>
                    <span className="text-indigo-600 font-medium">Keep it real</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Pro Tip */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-5 border border-amber-200">
                  <p className="text-sm text-amber-900">
                    <span className="font-semibold">💡 Pro Tip:</span> Always keep a 5% buffer for unexpected sick days!
                  </p>
                </div>
              </>
            ) : (
              // Advanced Mode - Subjects
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-1 shadow-sm border border-gray-100 flex gap-1">
                  <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
                    Dashboard
                  </button>
                  <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-3 px-4 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'tracker' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
                    Mark Attendance
                  </button>
                </div>

                {activeTab === 'dashboard' ? (
                  <>
                    {/* Requirement */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">🎯 Requirement</h3>
                          <p className="text-xs text-gray-400 mt-1">Target %</p>
                        </div>
                        <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {requirement}%
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={requirement} 
                        onChange={(e) => setRequirement(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                        style={{
                          background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${requirement}%, #e5e7eb ${requirement}%, #e5e7eb 100%)`
                        }}
                      />
                    </div>

                    {/* Subjects List */}
                    {subjects.length > 0 ? (
                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">📚 Subjects ({subjects.length})</h3>
                        <div className="space-y-3">
                          {subjects.map((subject) => {
                            const subjectPercentage = getSubjectPercentage(subject);
                            const isGood = subjectPercentage >= requirement;
                            return (
                              <div key={subject.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900">{subject.name}</div>
                                  <div className="text-xs text-gray-500 mt-1">{subject.attended} / {subject.conducted} classes</div>
                                </div>
                                <div className={`text-3xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                                  {Math.round(subjectPercentage)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500 mb-4">No subjects added yet</p>
                        <button onClick={() => setActiveTab('tracker')} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-colors shadow-md">
                          Add First Subject
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  // Mark Attendance Tab
                  <div className="space-y-4">
                    <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
                      {!showAddSubject ? (
                        <button onClick={() => setShowAddSubject(true)} className="w-full py-3 text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4" />
                          Add Subject
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject name..." className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:border-indigo-500 focus:outline-none" onKeyPress={(e) => e.key === 'Enter' && addSubject()} autoFocus />
                          <button onClick={addSubject} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-colors">Add</button>
                          <button onClick={() => { setShowAddSubject(false); setNewSubjectName(''); }} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition-colors">✕</button>
                        </div>
                      )}
                    </div>

                    {subjects.length > 0 && (
                      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                        <button onClick={() => { const currentStart = dateRangeStart ? new Date(dateRangeStart) : new Date(); const newStart = new Date(currentStart); newStart.setDate(newStart.getDate() - 7); setDateRangeStart(newStart.toISOString().split('T')[0]); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-gray-900">
                            {dateRangeStart ? <>{new Date(new Date(dateRangeStart).setDate(new Date(dateRangeStart).getDate() - 20)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</> : 'Last 21 days'}
                          </div>
                          {dateRangeStart && <button onClick={() => setDateRangeStart(null)} className="text-xs text-indigo-600 hover:text-indigo-700 mt-1">Jump to today</button>}
                        </div>
                        <button onClick={() => { if (!dateRangeStart) return; const currentStart = new Date(dateRangeStart); const newStart = new Date(currentStart); newStart.setDate(newStart.getDate() + 7); const today = new Date(); if (newStart <= today) setDateRangeStart(newStart.toISOString().split('T')[0]); }} disabled={!dateRangeStart} className={`p-2 rounded-xl transition-colors ${dateRangeStart ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}>
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    )}

                    {subjects.length === 0 ? (
                      <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center">
                        <p className="text-gray-500">Add a subject to start marking attendance</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {subjects.map((subject) => (
                          <div key={subject.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                              <button onClick={() => deleteSubject(subject.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="overflow-x-auto">
                              <div className="flex gap-2">
                                {dates.map((date) => {
                                  const key = `${subject.id}-${date}`;
                                  const status = attendance[key];
                                  const dateObj = new Date(date);
                                  const dayNum = dateObj.getDate();
                                  const isToday = date === new Date().toISOString().split('T')[0];
                                  return (
                                    <button
                                      key={date}
                                      onClick={() => {
                                        if (status === 'present') markAttendance(subject.id, date, 'absent');
                                        else if (status === 'absent') markAttendance(subject.id, date, null);
                                        else markAttendance(subject.id, date, 'present');
                                      }}
                                      className={`flex flex-col items-center min-w-[2.5rem] py-2 rounded-xl transition-all ${
                                        status === 'present' ? 'bg-green-500 text-white' :
                                        status === 'absent' ? 'bg-red-500 text-white' :
                                        'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                      } ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
                                    >
                                      <span className="text-xs font-semibold">{dayNum}</span>
                                      <span className="text-xs mt-0.5">{status === 'present' ? '✓' : status === 'absent' ? '✕' : '·'}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Status & Forecast */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className={`rounded-3xl p-8 shadow-lg border-2 ${statusInfo.bgColor} border-gray-200`}>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Current Status</p>
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className={`text-4xl font-bold mb-2 ${statusInfo.textColor}`}>{statusInfo.status}</h2>
                  <p className="text-gray-600">{statusInfo.message}</p>
                </div>
                
                {/* Circular Progress */}
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full circle-progress" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke="url(#gradient)" 
                      strokeWidth="8"
                      strokeDasharray={`${percentage * 2.827} 283`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" className={statusInfo.color.includes('emerald') ? 'stop-emerald-400' : statusInfo.color.includes('blue') ? 'stop-blue-400' : statusInfo.color.includes('amber') ? 'stop-amber-400' : 'stop-rose-400'} />
                        <stop offset="100%" className={statusInfo.color.includes('green') ? 'stop-green-500' : statusInfo.color.includes('cyan') ? 'stop-cyan-500' : statusInfo.color.includes('orange') ? 'stop-orange-500' : 'stop-red-500'} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">{Math.round(percentage)}</span>
                    <span className="text-lg font-semibold text-gray-500">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-emerald-600">{bunksLeft}</div>
                  <div className="text-xs text-gray-600 uppercase mt-1">Safe Skips</div>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="text-3xl font-bold text-amber-600">{toRecover}</div>
                  <div className="text-xs text-gray-600 uppercase mt-1">Attend Next</div>
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Forecast</h3>
              <p className="text-xs text-gray-500 mb-6">Projection for the next 10 classes</p>
              
              {/* Chart */}
              <div className="relative h-48">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400 pr-2">
                  <span>100%</span>
                  <span>89%</span>
                  <span>85%</span>
                  <span>80%</span>
                  <span>75%</span>
                  <span>70%</span>
                </div>

                {/* Chart area */}
                <div className="absolute left-12 right-0 top-0 bottom-0">
                  {/* Goal line */}
                  <div className="absolute w-full border-t-2 border-dashed border-gray-300" style={{ bottom: `${(requirement - 70) / 30 * 100}%` }}>
                    <span className="absolute right-0 -top-3 text-xs text-gray-500 bg-white px-2 rounded">GOAL {requirement}%</span>
                  </div>

                  {/* Bars */}
                  <div className="absolute inset-0 flex items-end justify-between pb-8">
                    {forecast.map((point, i) => {
                      const normalizedHeight = Math.max(0, Math.min(100, (point.percentage - 70) / 30 * 100));
                      const isGood = point.percentage >= requirement;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center h-full justify-end px-0.5">
                          <div 
                            className={`w-full rounded-t-lg transition-all cursor-pointer ${isGood ? 'bg-gradient-to-t from-emerald-500 to-green-400' : 'bg-gradient-to-t from-rose-500 to-red-400'} hover:opacity-80`}
                            style={{ height: `${normalizedHeight}%` }}
                            title={`${Math.round(point.percentage)}%`}
                          />
                          <span className="text-xs text-gray-500 mt-2 font-medium">{i === 0 ? 'Now' : `+${i}`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400">
          © 2026 Attendlyx · Made for students
        </div>
      </div>
    </div>
  );
}

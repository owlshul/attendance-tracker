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
    if (buffer >= 5) return { status: "You're Safe!", message: "Buffer available. Take a break if you need!", color: "from-emerald-400 to-green-500", textColor: "text-emerald-700", bgColor: "bg-emerald-50" };
    if (buffer >= 0) return { status: "On Track", message: "Keep it up! You're meeting your goal.", color: "from-blue-400 to-cyan-500", textColor: "text-blue-700", bgColor: "bg-blue-50" };
    if (buffer >= -5) return { status: "Close Call", message: "Attend classes to stay on track.", color: "from-amber-400 to-orange-500", textColor: "text-amber-700", bgColor: "bg-amber-50" };
    return { status: "At Risk", message: "Need to catch up on attendance.", color: "from-rose-400 to-red-500", textColor: "text-red-700", bgColor: "bg-red-50" };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 md:p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl sm:text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Attendlyx</h1>
              <p className="text-xs sm:text-sm text-gray-500">Bunk responsibly.</p>
            </div>
          </div>
          
          <div className="flex gap-2 self-end sm:self-auto">
            <button onClick={exportData} className="p-2 bg-white rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm" title="Export">
              <Download className="w-4 h-4 text-gray-600" />
            </button>
            <label className="p-2 bg-white rounded-xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm cursor-pointer" title="Import">
              <Upload className="w-4 h-4 text-gray-600" />
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Mode Selection - More Prominent */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose Tracking Mode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setTrackingMode('simple')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                trackingMode === 'simple'
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="font-bold text-base mb-1">⚡ Quick Mode</div>
              <div className="text-sm opacity-90">Just enter total & attended numbers</div>
            </button>
            <button
              onClick={() => setTrackingMode('advanced')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                trackingMode === 'advanced'
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-600 shadow-lg'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="font-bold text-base mb-1">📚 Detailed Mode</div>
              <div className="text-sm opacity-90">Track subjects & mark daily attendance</div>
            </button>
          </div>
        </div>

        {trackingMode === 'simple' ? (
          // SIMPLE MODE
          <div className="space-y-4">
            {/* Target Requirement */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">🎯 Target Requirement</h3>
                  <p className="text-xs text-gray-500 mt-1">Your attendance goal</p>
                </div>
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
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
                <span>100%</span>
              </div>
            </div>

            {/* Input Numbers */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">📝 Your Numbers</h3>
                <button onClick={() => { setManualTotal(0); setManualAttended(0); }} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Total Classes Conducted</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setManualTotal(Math.max(0, manualTotal - 1))} className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors text-lg">−</button>
                    <input type="number" value={manualTotal} onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 text-center text-3xl sm:text-4xl font-bold bg-gray-50 rounded-xl py-2 sm:py-3 border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors" />
                    <button onClick={() => setManualTotal(manualTotal + 1)} className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors text-lg">+</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Classes You Attended</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setManualAttended(Math.max(0, manualAttended - 1))} className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors text-lg">−</button>
                    <input type="number" value={manualAttended} onChange={(e) => setManualAttended(Math.max(0, Math.min(manualTotal, parseInt(e.target.value) || 0)))} className="flex-1 text-center text-3xl sm:text-4xl font-bold bg-gray-50 rounded-xl py-2 sm:py-3 border-2 border-gray-200 focus:border-indigo-500 focus:outline-none transition-colors" />
                    <button onClick={() => setManualAttended(Math.min(manualTotal, manualAttended + 1))} className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors text-lg">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className={`rounded-2xl p-5 sm:p-6 shadow-lg border-2 ${statusInfo.bgColor} border-gray-200`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Status</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="text-center sm:text-left">
                  <h2 className={`text-3xl sm:text-4xl font-bold mb-2 ${statusInfo.textColor}`}>{statusInfo.status}</h2>
                  <p className="text-sm sm:text-base text-gray-600">{statusInfo.message}</p>
                </div>
                
                <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                        <stop offset="0%" stopColor={statusInfo.color.includes('emerald') ? '#34d399' : statusInfo.color.includes('blue') ? '#60a5fa' : statusInfo.color.includes('amber') ? '#fbbf24' : '#fb7185'} />
                        <stop offset="100%" stopColor={statusInfo.color.includes('green') ? '#10b981' : statusInfo.color.includes('cyan') ? '#06b6d4' : statusInfo.color.includes('orange') ? '#f97316' : '#ef4444'} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900">{Math.round(percentage)}</span>
                    <span className="text-base sm:text-lg font-semibold text-gray-500">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/70 rounded-xl p-3 sm:p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{bunksLeft}</div>
                  <div className="text-xs text-gray-600 uppercase mt-1">Safe Skips</div>
                </div>
                <div className="bg-white/70 rounded-xl p-3 sm:p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-amber-600">{toRecover}</div>
                  <div className="text-xs text-gray-600 uppercase mt-1">Attend Next</div>
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">📈 Forecast</h3>
              <p className="text-xs text-gray-500 mb-4">If you attend the next 10 classes</p>
              
              <div className="relative h-40 sm:h-48">
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-gray-400 pr-2">
                  <span>100%</span>
                  <span>85%</span>
                  <span>70%</span>
                </div>

                <div className="absolute left-10 right-0 top-0 bottom-0">
                  <div className="absolute w-full border-t-2 border-dashed border-gray-300" style={{ bottom: `${(requirement - 70) / 30 * 100}%` }}>
                    <span className="absolute right-0 -top-3 text-xs text-gray-500 bg-white px-2 rounded">Goal {requirement}%</span>
                  </div>

                  <div className="absolute inset-0 flex items-end justify-between pb-6">
                    {forecast.map((point, i) => {
                      const normalizedHeight = Math.max(0, Math.min(100, (point.percentage - 70) / 30 * 100));
                      const isGood = point.percentage >= requirement;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center h-full justify-end px-0.5">
                          <div 
                            className={`w-full rounded-t transition-all ${isGood ? 'bg-gradient-to-t from-emerald-500 to-green-400' : 'bg-gradient-to-t from-rose-500 to-red-400'}`}
                            style={{ height: `${normalizedHeight}%` }}
                            title={`${Math.round(point.percentage)}%`}
                          />
                          <span className="text-xs text-gray-500 mt-1.5">{i === 0 ? 'Now' : `+${i}`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">💡 Pro Tip:</span> Keep a 5% buffer for sick days!
              </p>
            </div>
          </div>
        ) : (
          // DETAILED MODE
          <div className="space-y-4">
            {/* Tabs */}
            <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-200 grid grid-cols-2 gap-1">
              <button onClick={() => setActiveTab('dashboard')} className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600'}`}>
                Dashboard
              </button>
              <button onClick={() => setActiveTab('tracker')} className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'tracker' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600'}`}>
                Mark Attendance
              </button>
            </div>

            {activeTab === 'dashboard' ? (
              <>
                {/* Requirement */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">🎯 Target Requirement</h3>
                      <p className="text-xs text-gray-500 mt-1">Your attendance goal</p>
                    </div>
                    <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
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

                {/* Overall Status */}
                <div className={`rounded-2xl p-5 sm:p-6 shadow-lg border-2 ${statusInfo.bgColor} border-gray-200`}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Overall Status</p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <div className="text-center sm:text-left">
                      <h2 className={`text-3xl sm:text-4xl font-bold mb-2 ${statusInfo.textColor}`}>{statusInfo.status}</h2>
                      <p className="text-sm sm:text-base text-gray-600">{statusInfo.message}</p>
                    </div>
                    
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl sm:text-4xl font-bold text-gray-900">{Math.round(percentage)}</span>
                        <span className="text-base sm:text-lg font-semibold text-gray-500">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{displayTotal}</div>
                      <div className="text-xs text-gray-600 uppercase mt-1">Total</div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-emerald-600">{displayAttended}</div>
                      <div className="text-xs text-gray-600 uppercase mt-1">Attended</div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-red-600">{displayTotal - displayAttended}</div>
                      <div className="text-xs text-gray-600 uppercase mt-1">Missed</div>
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                {subjects.length > 0 ? (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">📚 Your Subjects ({subjects.length})</h3>
                    <div className="space-y-3">
                      {subjects.map((subject) => {
                        const subjectPercentage = getSubjectPercentage(subject);
                        const isGood = subjectPercentage >= requirement;
                        return (
                          <div key={subject.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{subject.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{subject.attended} / {subject.conducted} classes</div>
                            </div>
                            <div className={`text-2xl sm:text-3xl font-bold ml-4 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.round(subjectPercentage)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-gray-200 text-center">
                    <p className="text-gray-500 mb-4">No subjects added yet</p>
                    <button onClick={() => setActiveTab('tracker')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md">
                      Add Your First Subject
                    </button>
                  </div>
                )}

                {/* Forecast */}
                {subjects.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">📈 Forecast</h3>
                    <p className="text-xs text-gray-500 mb-4">If you attend the next 10 classes</p>
                    
                    <div className="relative h-40 sm:h-48">
                      <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-gray-400 pr-2">
                        <span>100%</span>
                        <span>85%</span>
                        <span>70%</span>
                      </div>

                      <div className="absolute left-10 right-0 top-0 bottom-0">
                        <div className="absolute w-full border-t-2 border-dashed border-gray-300" style={{ bottom: `${(requirement - 70) / 30 * 100}%` }}>
                          <span className="absolute right-0 -top-3 text-xs text-gray-500 bg-white px-2 rounded">Goal {requirement}%</span>
                        </div>

                        <div className="absolute inset-0 flex items-end justify-between pb-6">
                          {forecast.map((point, i) => {
                            const normalizedHeight = Math.max(0, Math.min(100, (point.percentage - 70) / 30 * 100));
                            const isGood = point.percentage >= requirement;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end px-0.5">
                                <div 
                                  className={`w-full rounded-t transition-all ${isGood ? 'bg-gradient-to-t from-emerald-500 to-green-400' : 'bg-gradient-to-t from-rose-500 to-red-400'}`}
                                  style={{ height: `${normalizedHeight}%` }}
                                  title={`${Math.round(point.percentage)}%`}
                                />
                                <span className="text-xs text-gray-500 mt-1.5">{i === 0 ? 'Now' : `+${i}`}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Mark Attendance Tab
              <div className="space-y-4">
                {/* Add Subject */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                  {!showAddSubject ? (
                    <button onClick={() => setShowAddSubject(true)} className="w-full py-3 text-sm text-indigo-600 font-semibold flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Subject
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject name..." className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:outline-none" onKeyPress={(e) => e.key === 'Enter' && addSubject()} autoFocus />
                      <button onClick={addSubject} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">Add</button>
                      <button onClick={() => { setShowAddSubject(false); setNewSubjectName(''); }} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors">✕</button>
                    </div>
                  )}
                </div>

                {/* Date Navigation */}
                {subjects.length > 0 && (
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 flex items-center justify-between">
                    <button onClick={() => { const currentStart = dateRangeStart ? new Date(dateRangeStart) : new Date(); const newStart = new Date(currentStart); newStart.setDate(newStart.getDate() - 7); setDateRangeStart(newStart.toISOString().split('T')[0]); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        {dateRangeStart ? <>{new Date(new Date(dateRangeStart).setDate(new Date(dateRangeStart).getDate() - 20)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</> : 'Last 21 days'}
                      </div>
                      {dateRangeStart && <button onClick={() => setDateRangeStart(null)} className="text-xs text-indigo-600 hover:text-indigo-700 mt-1">Today</button>}
                    </div>
                    <button onClick={() => { if (!dateRangeStart) return; const currentStart = new Date(dateRangeStart); const newStart = new Date(currentStart); newStart.setDate(newStart.getDate() + 7); const today = new Date(); if (newStart <= today) setDateRangeStart(newStart.toISOString().split('T')[0]); }} disabled={!dateRangeStart} className={`p-2 rounded-xl transition-colors ${dateRangeStart ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}>
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                )}

                {/* Subjects */}
                {subjects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-gray-200 text-center">
                    <p className="text-gray-500">Add a subject to start marking attendance</p>
                  </div>
                ) : (
                  <>
                    {/* Legend */}
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">How to mark attendance:</h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="w-full h-12 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-2">✓</div>
                          <div className="text-xs text-blue-900 font-medium">Present</div>
                        </div>
                        <div>
                          <div className="w-full h-12 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-2">✕</div>
                          <div className="text-xs text-blue-900 font-medium">Absent</div>
                        </div>
                        <div>
                          <div className="w-full h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-bold text-lg mb-2 border-2 border-dashed border-gray-300">·</div>
                          <div className="text-xs text-blue-900 font-medium">Not Marked</div>
                        </div>
                      </div>
                      <p className="text-xs text-blue-700 mt-3 text-center">Tap any date to cycle: Not Marked → Present → Absent → Not Marked</p>
                    </div>

                    <div className="space-y-3">
                      {subjects.map((subject) => (
                        <div key={subject.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 flex-1 truncate">{subject.name}</h4>
                            <button onClick={() => deleteSubject(subject.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors ml-2">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="overflow-x-auto -mx-2 px-2">
                            <div className="flex gap-2 min-w-max">
                              {dates.map((date) => {
                                const key = `${subject.id}-${date}`;
                                const status = attendance[key];
                                const dateObj = new Date(date);
                                const dayNum = dateObj.getDate();
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })[0];
                                const isToday = date === new Date().toISOString().split('T')[0];
                                return (
                                  <button
                                    key={date}
                                    onClick={() => {
                                      if (status === 'present') markAttendance(subject.id, date, 'absent');
                                      else if (status === 'absent') markAttendance(subject.id, date, null);
                                      else markAttendance(subject.id, date, 'present');
                                    }}
                                    className={`flex flex-col items-center min-w-[3rem] py-2 px-3 rounded-xl transition-all ${
                                      status === 'present' ? 'bg-green-500 text-white shadow-md' :
                                      status === 'absent' ? 'bg-red-500 text-white shadow-md' :
                                      'bg-gray-100 text-gray-400 hover:bg-gray-200 border-2 border-dashed border-gray-300'
                                    } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
                                  >
                                    <span className="text-xs font-medium mb-1">{dayName}</span>
                                    <span className="text-lg font-bold">{dayNum}</span>
                                    <span className="text-lg mt-1">{status === 'present' ? '✓' : status === 'absent' ? '✕' : '·'}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400">
          © 2026 Attendlyx · Made for students
        </div>
      </div>
    </div>
  );
}

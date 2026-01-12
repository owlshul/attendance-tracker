import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, TrendingUp, Calendar, Plus, X, Save, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [trackingMode, setTrackingMode] = useState('advanced'); // 'simple' or 'advanced'
  const [manualTotal, setManualTotal] = useState(0);
  const [manualAttended, setManualAttended] = useState(0);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    saveData();
  }, [subjects, attendance, requirement, dateRangeStart, trackingMode, manualTotal, manualAttended]);

  // Calculate overall stats from subject attendance
  useEffect(() => {
    calculateOverallStats();
  }, [attendance, subjects]);

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
    } catch (e) {
      console.log('No existing config found');
    }

    try {
      const subjectsResult = await window.storage.get('attendance-subjects');
      if (subjectsResult) {
        const loadedSubjects = JSON.parse(subjectsResult.value);
        setSubjects(loadedSubjects);
      }
    } catch (e) {
      console.log('No existing subjects found');
    }

    try {
      const attendanceResult = await window.storage.get('attendance-records');
      if (attendanceResult) {
        setAttendance(JSON.parse(attendanceResult.value));
      }
    } catch (e) {
      console.log('No existing attendance records found');
    }
  };

  const saveData = async () => {
    try {
      await window.storage.set(
        'attendance-config',
        JSON.stringify({ requirement, dateRangeStart, trackingMode, manualTotal, manualAttended })
      );
      await window.storage.set('attendance-subjects', JSON.stringify(subjects));
      await window.storage.set('attendance-records', JSON.stringify(attendance));
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  };

  const calculateOverallStats = () => {
    if (trackingMode === 'simple') return;
    
    let totalConducted = 0;
    let totalAttended = 0;

    subjects.forEach(subject => {
      const subjectRecords = Object.entries(attendance).filter(([key]) => 
        key.startsWith(`${subject.id}-`)
      );
      totalConducted += subjectRecords.length;
      totalAttended += subjectRecords.filter(([, status]) => status === 'present').length;
    });

    setTotalClasses(totalConducted);
    setAttended(totalAttended);
  };

  // Use the appropriate values based on mode
  const displayTotal = trackingMode === 'simple' ? manualTotal : totalClasses;
  const displayAttended = trackingMode === 'simple' ? manualAttended : attended;
  const percentage = displayTotal > 0 ? (displayAttended / displayTotal) * 100 : 0;
  const bunksLeft = Math.floor(displayAttended / (requirement / 100) - displayTotal);
  const toRecover = Math.ceil((requirement / 100) * displayTotal - displayAttended);

  const getStatus = () => {
    if (percentage < requirement - 10) return { label: 'Critical!', color: 'bg-red-200', textColor: 'text-red-900', message: 'Attendance required immediately!' };
    if (percentage < requirement) return { label: 'Warning', color: 'bg-yellow-200', textColor: 'text-yellow-900', message: 'Improve attendance soon!' };
    return { label: 'Good', color: 'bg-green-200', textColor: 'text-green-900', message: 'Keep up the good work!' };
  };

  const status = getStatus();

  // Forecast: assuming you attend all future classes
  const forecast = [];
  for (let i = 0; i <= 10; i++) {
    const futureTotal = displayTotal + i;
    const futureAttended = displayAttended + i;
    const futurePercentage = futureTotal > 0 ? (futureAttended / futureTotal) * 100 : 0;
    forecast.push({ classes: i, percentage: futurePercentage });
  }

  const addSubject = () => {
    if (newSubjectName.trim()) {
      const newSubject = {
        id: Date.now().toString(),
        name: newSubjectName.trim(),
        conducted: 0,
        attended: 0
      };
      setSubjects([...subjects, newSubject]);
      setNewSubjectName('');
      setShowAddSubject(false);
    }
  };

  const deleteSubject = (id) => {
    setSubjects(subjects.filter(s => s.id !== id));
    const newAttendance = { ...attendance };
    delete newAttendance[id];
    setAttendance(newAttendance);
  };

  const markAttendance = (subjectId, date, status) => {
    const key = `${subjectId}-${date}`;
    const newAttendance = { ...attendance };
    
    if (status === null) {
      delete newAttendance[key];
    } else {
      newAttendance[key] = status;
    }
    
    setAttendance(newAttendance);
    updateSubjectStats();
  };

  const updateSubjectStats = () => {
    const updatedSubjects = subjects.map(subject => {
      const subjectRecords = Object.entries(attendance).filter(([key]) => 
        key.startsWith(`${subject.id}-`)
      );
      const conducted = subjectRecords.length;
      const attended = subjectRecords.filter(([, status]) => status === 'present').length;
      return { ...subject, conducted, attended };
    });
    setSubjects(updatedSubjects);
  };

  useEffect(() => {
    updateSubjectStats();
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

  const shiftDatesBackward = () => {
    const currentStart = dateRangeStart ? new Date(dateRangeStart) : new Date();
    const newStart = new Date(currentStart);
    newStart.setDate(newStart.getDate() - 7);
    setDateRangeStart(newStart.toISOString().split('T')[0]);
  };

  const shiftDatesForward = () => {
    const currentStart = dateRangeStart ? new Date(dateRangeStart) : new Date();
    const newStart = new Date(currentStart);
    newStart.setDate(newStart.getDate() + 7);
    const today = new Date();
    if (newStart <= today) {
      setDateRangeStart(newStart.toISOString().split('T')[0]);
    }
  };

  const resetToToday = () => {
    setDateRangeStart(null);
  };

  const dates = getDates();

  const getSubjectPercentage = (subject) => {
    return subject.conducted > 0 ? (subject.attended / subject.conducted) * 100 : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .animate-slide-in { animation: slideIn 0.5s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-pulse-slow { animation: pulse 2s ease-in-out infinite; }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        .shadow-soft { box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); }
        .shadow-heavy { box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12); }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6 animate-slide-in">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
            Attendance Tracker
          </h1>
          <p className="text-slate-600 text-sm md:text-base">Stay on top of your attendance goals</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 glass-effect rounded-xl p-1.5 shadow-soft animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tracker'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg'
                : 'text-slate-600 hover:bg-white/50'
            }`}
          >
            Subject Tracker
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-4">
            {/* Mode Selector - Compact */}
            <div className="glass-effect rounded-2xl p-3 md:p-4 shadow-soft animate-slide-in">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Tracking Mode</h3>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <button
                  onClick={() => setTrackingMode('simple')}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    trackingMode === 'simple'
                      ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white border-indigo-600 shadow-lg'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-bold text-sm md:text-base mb-0.5">📊 Simple</div>
                  <div className="text-xs opacity-90">Manual entry</div>
                </button>
                <button
                  onClick={() => setTrackingMode('advanced')}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    trackingMode === 'advanced'
                      ? 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white border-indigo-600 shadow-lg'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-bold text-sm md:text-base mb-0.5">🎯 Advanced</div>
                  <div className="text-xs opacity-90">Detailed tracking</div>
                </button>
              </div>
            </div>

            {/* Compact Status Card */}
            <div className={`${status.color} rounded-2xl p-4 md:p-6 shadow-heavy border-3 border-black animate-slide-in`} style={{ animationDelay: '0.1s' }}>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                CURRENT STATUS
              </p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className={`text-3xl md:text-5xl font-black ${status.textColor} mb-1 ${percentage < requirement ? 'animate-pulse-slow' : ''}`}>
                    {status.label}
                  </h2>
                  <p className={`${status.textColor} font-semibold text-sm md:text-lg`}>
                    {status.message}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-5xl md:text-7xl font-black text-slate-900">
                    {Math.round(percentage)}%
                  </div>
                  <p className="text-slate-700 font-medium text-xs md:text-sm mt-1">Attendance</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Compact Stats */}
              <div className="space-y-4 animate-slide-in" style={{ animationDelay: '0.2s' }}>
                {/* Compact Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-effect rounded-2xl p-3 shadow-soft">
                    <div className="flex items-center gap-1 mb-1 text-slate-600">
                      <Shield className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Bunks</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-slate-900">{Math.max(0, bunksLeft)}</div>
                    <p className="text-xs text-slate-500 uppercase">Safe Skips</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl p-3 shadow-soft border-2 border-red-200">
                    <div className="flex items-center gap-1 mb-1 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase">Recover</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-red-900">{Math.max(0, toRecover)}</div>
                    <p className="text-xs text-red-700 uppercase">Attend Next</p>
                  </div>
                </div>

                {/* Compact Overall Stats */}
                <div className="glass-effect rounded-2xl p-3 md:p-4 shadow-soft">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Overall Numbers</h3>
                  
                  {trackingMode === 'simple' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Total</label>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => setManualTotal(Math.max(0, manualTotal - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 transition-all text-sm"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={manualTotal}
                            onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value) || 0))}
                            className="flex-1 text-center text-xl font-bold bg-white rounded-lg py-1.5 border-2 border-slate-200 focus:border-indigo-400 focus:outline-none"
                          />
                          <button
                            onClick={() => setManualTotal(manualTotal + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 transition-all text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Attended</label>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => setManualAttended(Math.max(0, manualAttended - 1))}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 transition-all text-sm"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={manualAttended}
                            onChange={(e) => setManualAttended(Math.max(0, Math.min(manualTotal, parseInt(e.target.value) || 0)))}
                            className="flex-1 text-center text-xl font-bold bg-white rounded-lg py-1.5 border-2 border-slate-200 focus:border-indigo-400 focus:outline-none"
                          />
                          <button
                            onClick={() => setManualAttended(Math.min(manualTotal, manualAttended + 1))}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 transition-all text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center bg-white rounded-lg py-2 border border-slate-200">
                        <div className="text-xs text-slate-500 mb-0.5">Total</div>
                        <div className="text-xl font-bold text-slate-900">{displayTotal}</div>
                      </div>
                      <div className="text-center bg-white rounded-lg py-2 border border-slate-200">
                        <div className="text-xs text-slate-500 mb-0.5">Present</div>
                        <div className="text-xl font-bold text-green-600">{displayAttended}</div>
                      </div>
                      <div className="text-center bg-white rounded-lg py-2 border border-slate-200">
                        <div className="text-xs text-slate-500 mb-0.5">Missed</div>
                        <div className="text-xl font-bold text-red-600">{displayTotal - displayAttended}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Compact Requirement Slider */}
                <div className="glass-effect rounded-2xl p-3 md:p-4 shadow-soft">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm">Requirement</h3>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{requirement}%</div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={requirement}
                    onChange={(e) => setRequirement(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${requirement}%, #e2e8f0 ${requirement}%, #e2e8f0 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Compact Pro Tip */}
                <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl p-3 shadow-soft border-2 border-yellow-200">
                  <p className="text-slate-800 text-xs md:text-sm">
                    💡 <strong>Pro Tip:</strong> Keep a 5% buffer for sick days!
                  </p>
                </div>

                {trackingMode === 'advanced' && subjects.length === 0 && (
                  <div className="bg-gradient-to-br from-indigo-100 to-blue-100 rounded-2xl p-3 shadow-soft border-2 border-indigo-200">
                    <p className="text-slate-800 font-medium text-xs md:text-sm mb-1">
                      📊 <strong>Get Started:</strong>
                    </p>
                    <p className="text-slate-700 text-xs">
                      Switch to "Subject Tracker" to add subjects and mark attendance!
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Compact Forecast */}
              <div className="lg:col-span-2 animate-slide-in" style={{ animationDelay: '0.3s' }}>
                <div className="glass-effect rounded-2xl p-4 md:p-6 shadow-soft h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg md:text-xl">Forecast</h3>
                      <p className="text-xs text-slate-500">Next 10 classes (attending all)</p>
                    </div>
                  </div>

                  <div className="relative" style={{ height: '280px' }}>
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-xs text-slate-500 pr-2">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>

                    {/* Chart area */}
                    <div className="absolute left-10 right-0 top-0 bottom-0">
                      {/* Goal line */}
                      <div
                        className="absolute w-full border-t-2 border-dashed border-indigo-400 z-10"
                        style={{ top: `${100 - requirement}%` }}
                      >
                        <span className="absolute right-0 -top-5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shadow-sm">
                          {requirement}%
                        </span>
                      </div>

                      {/* Bars */}
                      <div className="absolute inset-0 flex items-end justify-between pb-10">
                        {forecast.map((point, i) => {
                          const barColor = point.percentage >= requirement ? 'from-green-400 to-emerald-500' : 'from-red-400 to-rose-500';
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                              <div className="relative group flex-1 flex items-end justify-center w-full px-0.5">
                                <div
                                  className={`w-full bg-gradient-to-t ${barColor} rounded-t-lg transition-all hover:opacity-90 cursor-pointer shadow-sm relative`}
                                  style={{ height: `${point.percentage}%` }}
                                >
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                    <div className="bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                                      <div className="font-bold">{Math.round(point.percentage)}%</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs text-slate-600 mt-1.5 font-medium">
                                {i === 0 ? 'Now' : `+${i}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Subject Tracker View */}
            <div className="glass-effect rounded-2xl p-4 md:p-5 shadow-soft mb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900">Subject Attendance</h2>
                  <p className="text-slate-600 text-xs md:text-sm">Track attendance for each subject</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddSubject(true)}
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Subject
                  </button>
                </div>
              </div>

              {/* Date Navigation - Compact */}
              <div className="mb-4 flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                <button
                  onClick={shiftDatesBackward}
                  className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 hover:bg-indigo-50 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <div className="text-center flex-1">
                  <div className="text-xs md:text-sm font-semibold text-indigo-900">
                    {dateRangeStart ? (
                      <>{ new Date(new Date(dateRangeStart).setDate(new Date(dateRangeStart).getDate() - 20)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                    ) : (
                      'Last 21 days'
                    )}
                  </div>
                  {dateRangeStart && (
                    <button
                      onClick={resetToToday}
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Today
                    </button>
                  )}
                </div>
                <button
                  onClick={shiftDatesForward}
                  disabled={!dateRangeStart}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all shadow-sm ${
                    dateRangeStart 
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Legend - Compact */}
              {subjects.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-green-500 text-white font-bold text-xs flex items-center justify-center">P</div>
                      <span className="text-xs text-slate-700 font-medium">Present</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-red-500 text-white font-bold text-xs flex items-center justify-center">A</div>
                      <span className="text-xs text-slate-700 font-medium">Absent</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center border border-dashed border-slate-300">—</div>
                      <span className="text-xs text-slate-700 font-medium">Unmarked</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 italic">
                    💡 Click to cycle states
                  </div>
                </div>
              )}

              {showAddSubject && (
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="Subject name..."
                      className="flex-1 px-3 py-2 rounded-lg border border-blue-300 focus:border-blue-500 focus:outline-none text-sm font-medium"
                      onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                    />
                    <button
                      onClick={addSubject}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-all flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSubject(false);
                        setNewSubjectName('');
                      }}
                      className="bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-400 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {subjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-indigo-300" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No subjects added yet</h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Get started by adding your first subject.
                    </p>
                    <div className="bg-blue-50 rounded-xl p-4 text-left border border-blue-200">
                      <h4 className="font-bold text-slate-900 mb-2 text-sm">📚 Quick Guide:</h4>
                      <ol className="space-y-1.5 text-xs text-slate-700">
                        <li className="flex gap-2">
                          <span className="font-bold text-indigo-600">1.</span>
                          <span>Click "Add Subject"</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-indigo-600">2.</span>
                          <span>Navigate dates with Prev/Next</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-indigo-600">3.</span>
                          <span>Click dates to mark attendance</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-indigo-600">4.</span>
                          <span>Check Dashboard for overall stats</span>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjects.map((subject) => {
                    const subjectPercentage = getSubjectPercentage(subject);
                    return (
                      <div key={subject.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-base md:text-lg font-bold text-slate-900">{subject.name}</h3>
                            <p className="text-xs text-slate-500">
                              {subject.attended} / {subject.conducted} attended
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`text-2xl md:text-3xl font-bold ${
                                subjectPercentage >= requirement ? 'text-green-600' : 
                                subjectPercentage >= requirement - 10 ? 'text-yellow-600' : 
                                'text-red-600'
                              }`}>
                                {Math.round(subjectPercentage)}%
                              </div>
                            </div>
                            <button
                              onClick={() => deleteSubject(subject.id)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <div className="flex gap-1 min-w-max pb-2">
                            {dates.map((date, index) => {
                              const key = `${subject.id}-${date}`;
                              const status = attendance[key];
                              const dateObj = new Date(date);
                              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                              const dayNum = dateObj.getDate();
                              const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                              const isToday = date === new Date().toISOString().split('T')[0];
                              const isFirstOfMonth = dayNum === 1 || index === 0;

                              return (
                                <div key={date} className="flex flex-col items-center">
                                  {isFirstOfMonth && (
                                    <div className="text-xs font-bold text-indigo-600 mb-0.5 bg-indigo-50 px-1.5 py-0.5 rounded text-center">
                                      {monthName}
                                    </div>
                                  )}
                                  <div className="text-xs text-slate-500 mb-0.5">{dayName}</div>
                                  <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                                    {dayNum}
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (status === 'present') markAttendance(subject.id, date, 'absent');
                                      else if (status === 'absent') markAttendance(subject.id, date, null);
                                      else markAttendance(subject.id, date, 'present');
                                    }}
                                    className={`w-10 h-10 rounded-lg font-bold text-xs transition-all relative ${
                                      status === 'present'
                                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm'
                                        : status === 'absent'
                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-dashed border-slate-300'
                                    } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                                  >
                                    {status === 'present' ? 'P' : status === 'absent' ? 'A' : '—'}
                                  </button>
                                </div>
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

            {/* Overall Statistics - Compact */}
            {subjects.length > 0 && (
              <div className="glass-effect rounded-2xl p-4 shadow-soft">
                <h3 className="text-base font-bold text-slate-900 mb-3">Overall Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {subjects.map((subject) => {
                    const percentage = getSubjectPercentage(subject);
                    return (
                      <div key={subject.id} className="text-center p-3 bg-white rounded-xl border border-slate-100">
                        <div className="text-xs font-semibold text-slate-700 mb-1 truncate">
                          {subject.name}
                        </div>
                        <div className={`text-2xl font-bold ${
                          percentage >= requirement ? 'text-green-600' : 
                          percentage >= requirement - 10 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {Math.round(percentage)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, TrendingUp, Calendar, Plus, X, Save, ChevronLeft, ChevronRight, Download, Upload, Award, Zap } from 'lucide-react';

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
  const [trackingMode, setTrackingMode] = useState('advanced');
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
    if (percentage < requirement - 10) return { label: 'Critical', color: 'from-red-500 to-rose-600', textColor: 'text-white', icon: '🚨' };
    if (percentage < requirement) return { label: 'Warning', color: 'from-amber-500 to-orange-500', textColor: 'text-white', icon: '⚠️' };
    return { label: 'Excellent', color: 'from-emerald-500 to-green-600', textColor: 'text-white', icon: '✨' };
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
        attended: 0,
        color: getRandomColor()
      };
      setSubjects([...subjects, newSubject]);
      setNewSubjectName('');
      setShowAddSubject(false);
    }
  };

  const getRandomColor = () => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-cyan-500', 'bg-teal-500'];
    return colors[Math.floor(Math.random() * colors.length)];
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

  // Calculate current streak
  const getCurrentStreak = () => {
    if (trackingMode === 'simple' || subjects.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      let hadClass = false;
      let wasPresent = false;
      
      subjects.forEach(subject => {
        const key = `${subject.id}-${dateStr}`;
        if (attendance[key]) {
          hadClass = true;
          if (attendance[key] === 'present') {
            wasPresent = true;
          }
        }
      });
      
      if (hadClass) {
        if (wasPresent) {
          streak++;
        } else {
          break;
        }
      }
    }
    
    return streak;
  };

  const exportData = () => {
    const data = {
      subjects,
      attendance,
      requirement,
      trackingMode,
      manualTotal,
      manualAttended,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
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
        } catch (error) {
          alert('Invalid backup file');
        }
      };
      reader.readAsText(file);
    }
  };

  const currentStreak = getCurrentStreak();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-3 md:p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          letter-spacing: -0.01em;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        
        .card-hover {
          transition: all 0.2s ease;
        }
        
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Attendance</h1>
            <p className="text-sm text-slate-600 mt-0.5">Track your progress</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={exportData}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 transition-all"
              title="Export data"
            >
              <Download className="w-4 h-4" />
            </button>
            <label className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 transition-all cursor-pointer" title="Import data">
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Mode Toggle - Clean Pills */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl mb-6 animate-slide-up">
          <button
            onClick={() => setTrackingMode('simple')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              trackingMode === 'simple'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simple Mode
          </button>
          <button
            onClick={() => setTrackingMode('advanced')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              trackingMode === 'advanced'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Advanced Mode
          </button>
        </div>

        {trackingMode === 'simple' ? (
          // Simple Mode Dashboard
          <div className="space-y-4 animate-slide-up">
            {/* Status Card */}
            <div className={`bg-gradient-to-br ${status.color} rounded-2xl p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90 mb-1">Current Status</div>
                  <div className="text-4xl font-bold mb-1">{Math.round(percentage)}%</div>
                  <div className="text-sm opacity-90">{status.icon} {status.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-90 mb-2">Requirement</div>
                  <div className="text-3xl font-bold">{requirement}%</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Input Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Class Stats</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-2 block">Total Classes</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setManualTotal(Math.max(0, manualTotal - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-semibold text-slate-700 transition-all"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={manualTotal}
                        onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value) || 0))}
                        className="flex-1 text-center text-xl font-semibold bg-slate-50 rounded-lg py-2 border border-slate-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                      <button
                        onClick={() => setManualTotal(manualTotal + 1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-semibold text-slate-700 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-2 block">Attended</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setManualAttended(Math.max(0, manualAttended - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-semibold text-slate-700 transition-all"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={manualAttended}
                        onChange={(e) => setManualAttended(Math.max(0, Math.min(manualTotal, parseInt(e.target.value) || 0)))}
                        className="flex-1 text-center text-xl font-semibold bg-slate-50 rounded-lg py-2 border border-slate-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                      <button
                        onClick={() => setManualAttended(Math.min(manualTotal, manualAttended + 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-semibold text-slate-700 transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-2 text-emerald-600">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-medium text-slate-600">Safe Skips</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{Math.max(0, bunksLeft)}</div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                  <div className="flex items-center gap-2 mb-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium text-slate-600">To Recover</span>
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{Math.max(0, toRecover)}</div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 col-span-2">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-600">Target Requirement</div>
                      <div className="text-2xl font-bold text-slate-900">{requirement}%</div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={requirement}
                    onChange={(e) => setRequirement(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">Forecast (Next 10 Classes)</h3>
              </div>
              
              <div className="relative h-48">
                <div className="absolute inset-0 flex items-end justify-between gap-1">
                  {forecast.map((point, i) => {
                    const height = `${point.percentage}%`;
                    const color = point.percentage >= requirement ? 'bg-emerald-500' : 'bg-red-500';
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-full ${color} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                          style={{ height }}
                          title={`${Math.round(point.percentage)}%`}
                        />
                        <span className="text-xs text-slate-500 mt-2">
                          {i === 0 ? 'Now' : `+${i}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div
                  className="absolute w-full border-t-2 border-dashed border-blue-400"
                  style={{ bottom: `${requirement}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          // Advanced Mode
          <div className="space-y-4 animate-slide-up">
            {/* Tab Navigation */}
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('tracker')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'tracker'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mark Attendance
              </button>
            </div>

            {activeTab === 'dashboard' ? (
              <div className="space-y-4">
                {/* Status Row */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className={`bg-gradient-to-br ${status.color} rounded-2xl p-5 text-white shadow-lg md:col-span-2`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm opacity-90 mb-1">Overall Attendance</div>
                        <div className="text-5xl font-bold mb-1">{Math.round(percentage)}%</div>
                        <div className="flex items-center gap-2 text-sm opacity-90">
                          <span>{status.icon}</span>
                          <span>{status.label}</span>
                          {currentStreak > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                              🔥 {currentStreak} day streak
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm opacity-90 mb-2">Target</div>
                        <div className="text-4xl font-bold">{requirement}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-rows-2 gap-4">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-2 mb-1 text-emerald-600">
                        <Shield className="w-4 h-4" />
                        <span className="text-xs font-medium text-slate-600">Safe Skips</span>
                      </div>
                      <div className="text-3xl font-bold text-slate-900">{Math.max(0, bunksLeft)}</div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-2 mb-1 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-medium text-slate-600">To Recover</span>
                      </div>
                      <div className="text-3xl font-bold text-slate-900">{Math.max(0, toRecover)}</div>
                    </div>
                  </div>
                </div>

                {/* Subject Cards */}
                {subjects.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Subjects</h3>
                      <span className="text-xs text-slate-500">{subjects.length} total</span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subjects.map((subject) => {
                        const subjectPercentage = getSubjectPercentage(subject);
                        return (
                          <div key={subject.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 card-hover">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                                <h4 className="font-semibold text-slate-900 text-sm truncate">{subject.name}</h4>
                              </div>
                              <div className={`text-2xl font-bold ${
                                subjectPercentage >= requirement ? 'text-emerald-600' : 
                                subjectPercentage >= requirement - 10 ? 'text-amber-600' : 
                                'text-red-600'
                              }`}>
                                {Math.round(subjectPercentage)}%
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>{subject.attended} / {subject.conducted} attended</span>
                              <span>{subject.conducted - subject.attended} missed</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Forecast */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-900">Attendance Forecast</h3>
                        <span className="text-xs text-slate-500">(attending all future classes)</span>
                      </div>
                      
                      <div className="relative h-48">
                        <div className="absolute inset-0 flex items-end justify-between gap-1">
                          {forecast.map((point, i) => {
                            const height = `${point.percentage}%`;
                            const color = point.percentage >= requirement ? 'bg-emerald-500' : 'bg-red-500';
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center">
                                <div
                                  className={`w-full ${color} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                                  style={{ height }}
                                  title={`${Math.round(point.percentage)}%`}
                                />
                                <span className="text-xs text-slate-500 mt-2">
                                  {i === 0 ? 'Now' : `+${i}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div
                          className="absolute w-full border-t-2 border-dashed border-blue-400"
                          style={{ bottom: `${requirement}%` }}
                        />
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-slate-600">Attendance Requirement</div>
                          <div className="text-2xl font-bold text-slate-900">{requirement}%</div>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={requirement}
                        onChange={(e) => setRequirement(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No subjects yet</h3>
                    <p className="text-sm text-slate-600 mb-4">Add subjects to start tracking attendance</p>
                    <button
                      onClick={() => setActiveTab('tracker')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all"
                    >
                      Add Your First Subject
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Mark Attendance Tab
              <div className="space-y-4">
                {/* Add Subject */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                  {!showAddSubject ? (
                    <button
                      onClick={() => setShowAddSubject(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-all"
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
                        placeholder="Subject name..."
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                        autoFocus
                      />
                      <button
                        onClick={addSubject}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddSubject(false);
                          setNewSubjectName('');
                        }}
                        className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Date Navigation */}
                {subjects.length > 0 && (
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 flex items-center justify-between gap-3">
                    <button
                      onClick={shiftDatesBackward}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    
                    <div className="text-center flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {dateRangeStart ? (
                          <>{new Date(new Date(dateRangeStart).setDate(new Date(dateRangeStart).getDate() - 20)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                        ) : (
                          'Last 21 days'
                        )}
                      </div>
                      {dateRangeStart && (
                        <button
                          onClick={resetToToday}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Jump to today
                        </button>
                      )}
                    </div>

                    <button
                      onClick={shiftDatesForward}
                      disabled={!dateRangeStart}
                      className={`p-2 rounded-lg transition-all ${
                        dateRangeStart 
                          ? 'hover:bg-slate-100' 
                          : 'opacity-30 cursor-not-allowed'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>
                )}

                {/* Subjects Attendance */}
                {subjects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No subjects yet</h3>
                    <p className="text-sm text-slate-600">Click "Add Subject" above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjects.map((subject) => {
                      const subjectPercentage = getSubjectPercentage(subject);
                      return (
                        <div key={subject.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                              <h4 className="font-semibold text-slate-900">{subject.name}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-2xl font-bold ${
                                subjectPercentage >= requirement ? 'text-emerald-600' : 
                                subjectPercentage >= requirement - 10 ? 'text-amber-600' : 
                                'text-red-600'
                              }`}>
                                {Math.round(subjectPercentage)}%
                              </div>
                              <button
                                onClick={() => deleteSubject(subject.id)}
                                className="p-1 hover:bg-red-50 rounded-lg text-red-600 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <div className="flex gap-1 pb-2">
                              {dates.map((date, index) => {
                                const key = `${subject.id}-${date}`;
                                const status = attendance[key];
                                const dateObj = new Date(date);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })[0];
                                const dayNum = dateObj.getDate();
                                const isToday = date === new Date().toISOString().split('T')[0];

                                return (
                                  <div key={date} className="flex flex-col items-center min-w-[2.5rem]">
                                    <div className="text-xs text-slate-400 mb-0.5">{dayName}</div>
                                    <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                                      {dayNum}
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (status === 'present') markAttendance(subject.id, date, 'absent');
                                        else if (status === 'absent') markAttendance(subject.id, date, null);
                                        else markAttendance(subject.id, date, 'present');
                                      }}
                                      className={`w-10 h-10 rounded-lg font-semibold text-xs transition-all ${
                                        status === 'present'
                                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                          : status === 'absent'
                                          ? 'bg-red-500 text-white hover:bg-red-600'
                                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-dashed border-slate-300'
                                      } ${isToday ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

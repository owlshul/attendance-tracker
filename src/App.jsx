import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, Download, Upload, Flame, Target, Calendar as CalendarIcon, Zap, Award, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

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
    if (percentage >= requirement + 5) return { label: 'On Fire', emoji: '🔥', color: 'from-amber-400 via-orange-500 to-rose-500', textColor: 'text-white', bgAccent: 'bg-orange-100', borderColor: 'border-orange-300' };
    if (percentage >= requirement) return { label: 'Safe Zone', emoji: '✨', color: 'from-emerald-400 via-teal-500 to-cyan-500', textColor: 'text-white', bgAccent: 'bg-teal-100', borderColor: 'border-teal-300' };
    if (percentage >= requirement - 5) return { label: 'Close Call', emoji: '⚠️', color: 'from-yellow-400 via-amber-500 to-orange-400', textColor: 'text-white', bgAccent: 'bg-yellow-100', borderColor: 'border-yellow-300' };
    return { label: 'Danger Zone', emoji: '🚨', color: 'from-red-500 via-rose-600 to-pink-600', textColor: 'text-white', bgAccent: 'bg-red-100', borderColor: 'border-red-300' };
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
        } catch (error) { alert('Invalid backup file'); }
      };
      reader.readAsText(file);
    }
  };

  const currentStreak = getCurrentStreak();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { font-family: 'Outfit', sans-serif; }
        .font-display { font-family: 'Space Grotesk', monospace; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
        
        .glass-morph {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #8B5CF6, #EC4899); border-radius: 10px; }
      `}</style>

      {/* Floating decoration blobs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-gradient-to-br from-violet-300 to-purple-400 rounded-full opacity-20 blur-3xl animate-float" style={{ animationDelay: '0s' }} />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-fuchsia-300 to-pink-400 rounded-full opacity-20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="fixed top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-cyan-300 to-blue-400 rounded-full opacity-20 blur-3xl animate-float" style={{ animationDelay: '4s' }} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-up">
          <div>
            <h1 className="text-4xl md:text-5xl font-black gradient-text font-display mb-1">AttendoMate</h1>
            <p className="text-violet-600 font-medium">Your smart attendance companion 🎯</p>
          </div>
          
          <div className="flex gap-2">
            <button onClick={exportData} className="p-3 rounded-2xl glass-morph hover:scale-110 transition-transform shadow-lg" title="Export">
              <Download className="w-5 h-5 text-violet-600" />
            </button>
            <label className="p-3 rounded-2xl glass-morph hover:scale-110 transition-transform shadow-lg cursor-pointer" title="Import">
              <Upload className="w-5 h-5 text-violet-600" />
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <button
            onClick={() => setTrackingMode('simple')}
            className={`flex-1 py-4 px-6 rounded-3xl font-bold transition-all ${
              trackingMode === 'simple'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xl scale-105'
                : 'glass-morph text-violet-700 hover:scale-105'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              <span>Quick Mode</span>
            </div>
          </button>
          <button
            onClick={() => setTrackingMode('advanced')}
            className={`flex-1 py-4 px-6 rounded-3xl font-bold transition-all ${
              trackingMode === 'advanced'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xl scale-105'
                : 'glass-morph text-violet-700 hover:scale-105'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Target className="w-5 h-5" />
              <span>Pro Mode</span>
            </div>
          </button>
        </div>

        {trackingMode === 'simple' ? (
          // Simple Mode
          <div className="space-y-4 animate-bounce-in">
            {/* Status Hero */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${status.color} p-8 shadow-2xl`}>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-6xl animate-bounce-in">{status.emoji}</div>
                  <div className="text-right">
                    <div className="text-sm opacity-90 text-white mb-1">Target</div>
                    <div className="text-4xl font-black text-white">{requirement}%</div>
                  </div>
                </div>
                <div className="text-8xl md:text-9xl font-black text-white mb-2 font-display">{Math.round(percentage)}%</div>
                <div className="text-2xl font-bold text-white opacity-95">{status.label}</div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Input Card */}
              <div className="glass-morph rounded-3xl p-6 shadow-xl card-hover">
                <h3 className="text-xl font-bold text-violet-900 mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Your Stats
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-violet-700 mb-2 block">Total Classes</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setManualTotal(Math.max(0, manualTotal - 1))} className="w-12 h-12 rounded-xl bg-violet-100 hover:bg-violet-200 flex items-center justify-center font-bold text-violet-700 transition-all">−</button>
                      <input type="number" value={manualTotal} onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 text-center text-3xl font-black bg-white rounded-2xl py-3 border-2 border-violet-200 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-100 transition-all" />
                      <button onClick={() => setManualTotal(manualTotal + 1)} className="w-12 h-12 rounded-xl bg-violet-100 hover:bg-violet-200 flex items-center justify-center font-bold text-violet-700 transition-all">+</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-violet-700 mb-2 block">Attended</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setManualAttended(Math.max(0, manualAttended - 1))} className="w-12 h-12 rounded-xl bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center font-bold text-emerald-700 transition-all">−</button>
                      <input type="number" value={manualAttended} onChange={(e) => setManualAttended(Math.max(0, Math.min(manualTotal, parseInt(e.target.value) || 0)))} className="flex-1 text-center text-3xl font-black bg-white rounded-2xl py-3 border-2 border-emerald-200 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 transition-all" />
                      <button onClick={() => setManualAttended(Math.min(manualTotal, manualAttended + 1))} className="w-12 h-12 rounded-xl bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center font-bold text-emerald-700 transition-all">+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="glass-morph rounded-3xl p-6 shadow-xl card-hover">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-emerald-700 mb-1 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Safe Bunks
                      </div>
                      <div className="text-5xl font-black text-emerald-600 font-display">{Math.max(0, bunksLeft)}</div>
                    </div>
                    <div className="text-5xl opacity-50">😎</div>
                  </div>
                </div>

                <div className="glass-morph rounded-3xl p-6 shadow-xl card-hover">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Need to Attend
                      </div>
                      <div className="text-5xl font-black text-red-600 font-display">{Math.max(0, toRecover)}</div>
                    </div>
                    <div className="text-5xl opacity-50">📚</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Slider */}
            <div className="glass-morph rounded-3xl p-6 shadow-xl card-hover">
              <div className="flex items-center gap-4 mb-4">
                <Target className="w-6 h-6 text-violet-600" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-violet-700">Attendance Target</div>
                  <div className="text-4xl font-black text-violet-900 font-display">{requirement}%</div>
                </div>
              </div>
              <input type="range" min="0" max="100" value={requirement} onChange={(e) => setRequirement(parseInt(e.target.value))} className="w-full h-3 bg-violet-200 rounded-full appearance-none cursor-pointer accent-violet-600" style={{ background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${requirement}%, #DDD6FE ${requirement}%, #DDD6FE 100%)` }} />
              <div className="flex justify-between text-xs text-violet-600 font-semibold mt-2">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Forecast */}
            <div className="glass-morph rounded-3xl p-6 shadow-xl card-hover">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-violet-600" />
                <h3 className="text-xl font-bold text-violet-900">10-Day Forecast</h3>
              </div>
              
              <div className="relative h-56 bg-white/50 rounded-2xl p-4">
                <div className="absolute inset-4 flex items-end justify-between gap-1">
                  {forecast.map((point, i) => {
                    const height = `${point.percentage}%`;
                    const isGood = point.percentage >= requirement;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group">
                        <div className={`w-full ${isGood ? 'bg-gradient-to-t from-emerald-500 to-teal-400' : 'bg-gradient-to-t from-red-500 to-rose-400'} rounded-t-xl transition-all hover:scale-105 cursor-pointer shadow-lg relative`} style={{ height }} title={`${Math.round(point.percentage)}%`}>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-semibold">
                            {Math.round(point.percentage)}%
                          </div>
                        </div>
                        <span className="text-xs text-violet-700 font-semibold mt-2">{i === 0 ? 'Now' : `+${i}`}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute inset-4 pointer-events-none">
                  <div className="absolute w-full border-t-2 border-dashed border-violet-400" style={{ bottom: `${requirement}%` }}>
                    <span className="absolute right-0 -top-6 text-xs font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-full">Target {requirement}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Advanced Mode
          <div className="space-y-4 animate-bounce-in">
            {/* Tabs */}
            <div className="flex gap-2 glass-morph rounded-3xl p-2 shadow-xl">
              <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-3 px-6 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' : 'text-violet-700 hover:bg-white/50'}`}>
                Dashboard
              </button>
              <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-3 px-6 rounded-2xl font-bold transition-all ${activeTab === 'tracker' ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' : 'text-violet-700 hover:bg-white/50'}`}>
                Mark Attendance
              </button>
            </div>

            {activeTab === 'dashboard' ? (
              <div className="space-y-4">
                {/* Status Hero with Streak */}
                <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${status.color} p-8 shadow-2xl`}>
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <div className="text-6xl mb-2">{status.emoji}</div>
                      <div className="text-7xl md:text-8xl font-black text-white mb-2 font-display">{Math.round(percentage)}%</div>
                      <div className="text-2xl font-bold text-white opacity-95 mb-3">{status.label}</div>
                      {currentStreak > 0 && (
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                          <Flame className="w-5 h-5 text-orange-300" />
                          <span className="text-white font-bold">{currentStreak} day streak!</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-90 text-white mb-2">Target</div>
                      <div className="text-5xl font-black text-white font-display">{requirement}%</div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm text-white opacity-90">Safe Bunks:</span>
                          <span className="text-2xl font-black text-white">{Math.max(0, bunksLeft)}</span>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm text-white opacity-90">To Recover:</span>
                          <span className="text-2xl font-black text-white">{Math.max(0, toRecover)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full -mr-48 -mt-48" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -ml-32 -mb-32" />
                </div>

                {/* Subjects Grid */}
                {subjects.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-violet-900 flex items-center gap-2">
                        <Award className="w-6 h-6" />
                        Your Subjects
                      </h3>
                      <span className="text-sm font-semibold text-violet-600 bg-violet-100 px-3 py-1 rounded-full">{subjects.length} total</span>
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subjects.map((subject, idx) => {
                        const subjectPercentage = getSubjectPercentage(subject);
                        const isGood = subjectPercentage >= requirement;
                        return (
                          <div key={subject.id} className="glass-morph rounded-3xl p-6 shadow-xl card-hover animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: subject.color }} />
                                <h4 className="font-bold text-violet-900 text-lg truncate">{subject.name}</h4>
                              </div>
                              <div className={`text-4xl font-black font-display ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
                                {Math.round(subjectPercentage)}%
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-violet-600 font-medium">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {subject.attended}
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                {subject.conducted - subject.attended}
                              </span>
                              <span className="text-violet-400">/ {subject.conducted}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Forecast */}
                    <div className="glass-morph rounded-3xl p-6 shadow-xl card-hover">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-6 h-6 text-violet-600" />
                        <h3 className="text-xl font-bold text-violet-900">Future Projection</h3>
                        <span className="text-sm text-violet-600">(if you attend all)</span>
                      </div>
                      
                      <div className="relative h-56 bg-white/50 rounded-2xl p-4">
                        <div className="absolute inset-4 flex items-end justify-between gap-1">
                          {forecast.map((point, i) => {
                            const height = `${point.percentage}%`;
                            const isGood = point.percentage >= requirement;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center group">
                                <div className={`w-full ${isGood ? 'bg-gradient-to-t from-emerald-500 to-teal-400' : 'bg-gradient-to-t from-red-500 to-rose-400'} rounded-t-xl transition-all hover:scale-105 cursor-pointer shadow-lg relative`} style={{ height }} title={`${Math.round(point.percentage)}%`}>
                                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-semibold">
                                    {Math.round(point.percentage)}%
                                  </div>
                                </div>
                                <span className="text-xs text-violet-700 font-semibold mt-2">{i === 0 ? 'Now' : `+${i}`}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="absolute inset-4 pointer-events-none">
                          <div className="absolute w-full border-t-2 border-dashed border-violet-400" style={{ bottom: `${requirement}%` }}>
                            <span className="absolute right-0 -top-6 text-xs font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-full">Target {requirement}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Target Slider */}
                    <div className="glass-morph rounded-3xl p-6 shadow-xl card-hover">
                      <div className="flex items-center gap-4 mb-4">
                        <Target className="w-6 h-6 text-violet-600" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-violet-700">Attendance Target</div>
                          <div className="text-4xl font-black text-violet-900 font-display">{requirement}%</div>
                        </div>
                      </div>
                      <input type="range" min="0" max="100" value={requirement} onChange={(e) => setRequirement(parseInt(e.target.value))} className="w-full h-3 bg-violet-200 rounded-full appearance-none cursor-pointer accent-violet-600" style={{ background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${requirement}%, #DDD6FE ${requirement}%, #DDD6FE 100%)` }} />
                      <div className="flex justify-between text-xs text-violet-600 font-semibold mt-2">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="glass-morph rounded-3xl p-12 shadow-xl text-center">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-2xl font-bold text-violet-900 mb-2">No Subjects Yet</h3>
                    <p className="text-violet-600 mb-6">Add your first subject to start tracking</p>
                    <button onClick={() => setActiveTab('tracker')} className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg">
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Mark Attendance Tab
              <div className="space-y-4">
                {/* Add Subject */}
                <div className="glass-morph rounded-3xl p-4 shadow-xl">
                  {!showAddSubject ? (
                    <button onClick={() => setShowAddSubject(true)} className="w-full flex items-center justify-center gap-2 py-3 text-violet-600 font-bold hover:bg-white/50 rounded-2xl transition-all">
                      <Plus className="w-5 h-5" />
                      Add New Subject
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject name..." className="flex-1 px-4 py-3 rounded-2xl border-2 border-violet-300 focus:border-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-100 font-semibold" onKeyPress={(e) => e.key === 'Enter' && addSubject()} autoFocus />
                      <button onClick={addSubject} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg">
                        Add
                      </button>
                      <button onClick={() => { setShowAddSubject(false); setNewSubjectName(''); }} className="px-4 py-3 bg-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-300 transition-all">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Date Navigation */}
                {subjects.length > 0 && (
                  <div className="glass-morph rounded-3xl p-4 shadow-xl flex items-center justify-between gap-4">
                    <button onClick={() => { const currentStart = dateRangeStart ? new Date(dateRangeStart) : new Date(); const newStart = new Date(currentStart); newStart.setDate(newStart.getDate() - 7); setDateRangeStart(newStart.toISOString().split('T')[0]); }} className="p-3 hover:bg-white/50 rounded-2xl transition-all">
                      <ChevronLeft className="w-6 h-6 text-violet-600" />
                    </button>
                    
                    <div className="text-center flex-1">
                      <div className="text-sm font-bold text-violet-900">
                        {dateRangeStart ? <>{new Date(new Date(dateRangeStart).setDate(new Date(dateRangeStart).getDate() - 20)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</> : 'Last 21 days'}
                      </div>
                      {dateRangeStart && <button onClick={() => setDateRangeStart(null)} className="text-xs text-violet-600 hover:text-violet-700 font-semibold mt-1">Jump to today</button>}
                    </div>

                    <button onClick={() => { if (!dateRangeStart) return; const currentStart = new Date(dateRangeStart); const newStart = new Date(currentStart); newStart.setDate(newStart.getDate() + 7); const today = new Date(); if (newStart <= today) setDateRangeStart(newStart.toISOString().split('T')[0]); }} disabled={!dateRangeStart} className={`p-3 rounded-2xl transition-all ${dateRangeStart ? 'hover:bg-white/50' : 'opacity-30 cursor-not-allowed'}`}>
                      <ChevronRight className="w-6 h-6 text-violet-600" />
                    </button>
                  </div>
                )}

                {/* Subjects */}
                {subjects.length === 0 ? (
                  <div className="glass-morph rounded-3xl p-12 shadow-xl text-center">
                    <div className="text-6xl mb-4">🎓</div>
                    <h3 className="text-2xl font-bold text-violet-900 mb-2">No Subjects Yet</h3>
                    <p className="text-violet-600">Click "Add New Subject" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjects.map((subject) => {
                      const subjectPercentage = getSubjectPercentage(subject);
                      const isGood = subjectPercentage >= requirement;
                      return (
                        <div key={subject.id} className="glass-morph rounded-3xl p-5 shadow-xl">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                              <h4 className="font-bold text-violet-900 text-lg">{subject.name}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-3xl font-black font-display ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
                                {Math.round(subjectPercentage)}%
                              </div>
                              <button onClick={() => deleteSubject(subject.id)} className="p-2 hover:bg-red-100 rounded-xl text-red-600 transition-all">
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <div className="flex gap-1.5 pb-2">
                              {dates.map((date) => {
                                const key = `${subject.id}-${date}`;
                                const status = attendance[key];
                                const dateObj = new Date(date);
                                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })[0];
                                const dayNum = dateObj.getDate();
                                const isToday = date === new Date().toISOString().split('T')[0];

                                return (
                                  <div key={date} className="flex flex-col items-center min-w-[2.75rem]">
                                    <div className="text-xs text-violet-400 font-semibold mb-1">{dayName}</div>
                                    <div className={`text-xs font-bold mb-1 ${isToday ? 'text-violet-600' : 'text-violet-500'}`}>{dayNum}</div>
                                    <button
                                      onClick={() => {
                                        if (status === 'present') markAttendance(subject.id, date, 'absent');
                                        else if (status === 'absent') markAttendance(subject.id, date, null);
                                        else markAttendance(subject.id, date, 'present');
                                      }}
                                      className={`w-11 h-11 rounded-xl font-black text-sm transition-all ${
                                        status === 'present'
                                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white hover:scale-110 shadow-lg'
                                          : status === 'absent'
                                          ? 'bg-gradient-to-br from-red-500 to-rose-500 text-white hover:scale-110 shadow-lg'
                                          : 'bg-white border-2 border-dashed border-violet-300 text-violet-400 hover:scale-105 hover:border-violet-400'
                                      } ${isToday ? 'ring-2 ring-violet-400 ring-offset-2' : ''}`}
                                    >
                                      {status === 'present' ? '✓' : status === 'absent' ? '✕' : '·'}
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

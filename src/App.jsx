import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, X, ChevronLeft, ChevronRight, Download, Upload, Info } from 'lucide-react';

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
  const [showModeInfo, setShowModeInfo] = useState(false);

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

  const getStatusColor = () => {
    if (percentage >= requirement) return 'text-green-600';
    if (percentage >= requirement - 5) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Tracker</h1>
            <p className="text-sm text-gray-500 mt-0.5">Keep track of your class attendance</p>
          </div>
          
          <div className="flex gap-2">
            <button onClick={exportData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" title="Export data">
              <Download className="w-4 h-4 text-gray-600" />
            </button>
            <label className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" title="Import data">
              <Upload className="w-4 h-4 text-gray-600" />
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Target Requirement - First Thing */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <label className="text-sm font-medium text-gray-700 mb-3 block">Attendance Requirement</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={requirement} 
              onChange={(e) => setRequirement(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
            <div className="text-3xl font-bold text-gray-900 w-20 text-right">{requirement}%</div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Tracking Mode</label>
            <button 
              onClick={() => setShowModeInfo(!showModeInfo)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <Info className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          {showModeInfo && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-gray-700">
              <p className="mb-2"><strong>Quick Mode:</strong> Manually enter total classes and attended. Best for simple tracking or if you don't want to mark daily attendance.</p>
              <p><strong>Detailed Mode:</strong> Add subjects and mark attendance day-by-day. Automatically calculates overall stats from all your subjects.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTrackingMode('simple')}
              className={`py-2.5 px-4 rounded-lg font-medium transition-colors ${
                trackingMode === 'simple'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quick Mode
            </button>
            <button
              onClick={() => setTrackingMode('advanced')}
              className={`py-2.5 px-4 rounded-lg font-medium transition-colors ${
                trackingMode === 'advanced'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Detailed Mode
            </button>
          </div>
        </div>

        {trackingMode === 'simple' ? (
          // Quick Mode
          <div className="space-y-4">
            {/* Stats Display */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-center mb-6">
                <div className={`text-6xl font-bold mb-2 ${getStatusColor()}`}>{Math.round(percentage)}%</div>
                <div className="text-sm text-gray-600">
                  {percentage >= requirement ? 'You\'re doing great!' : `${toRecover} more classes needed`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{bunksLeft}</div>
                  <div className="text-xs text-gray-600 mt-1">Classes you can skip</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{toRecover}</div>
                  <div className="text-xs text-gray-600 mt-1">Classes to attend</div>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Your Numbers</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-600 mb-2 block">Total Classes</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setManualTotal(Math.max(0, manualTotal - 1))} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 transition-colors">−</button>
                    <input type="number" value={manualTotal} onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 text-center text-2xl font-bold bg-gray-50 rounded-lg py-2 border border-gray-200 focus:border-blue-500 focus:outline-none" />
                    <button onClick={() => setManualTotal(manualTotal + 1)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 transition-colors">+</button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-2 block">Classes Attended</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setManualAttended(Math.max(0, manualAttended - 1))} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 transition-colors">−</button>
                    <input type="number" value={manualAttended} onChange={(e) => setManualAttended(Math.max(0, Math.min(manualTotal, parseInt(e.target.value) || 0)))} className="flex-1 text-center text-2xl font-bold bg-gray-50 rounded-lg py-2 border border-gray-200 focus:border-blue-500 focus:outline-none" />
                    <button onClick={() => setManualAttended(Math.min(manualTotal, manualAttended + 1))} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 transition-colors">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-700">Forecast (if you attend next 10 classes)</h3>
              </div>
              
              <div className="relative h-40 bg-gray-50 rounded-lg p-3">
                <div className="absolute inset-3 flex items-end justify-between">
                  {forecast.map((point, i) => {
                    const height = Math.max(2, point.percentage);
                    const isGood = point.percentage >= requirement;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end px-0.5">
                        <div 
                          className={`w-full ${isGood ? 'bg-green-500' : 'bg-red-500'} rounded-t transition-all hover:opacity-80`} 
                          style={{ height: `${height}%` }}
                          title={`${Math.round(point.percentage)}%`}
                        />
                        <span className="text-xs text-gray-500 mt-1.5">{i === 0 ? 'Now' : `+${i}`}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute inset-3 pointer-events-none">
                  <div className="absolute w-full border-t border-dashed border-gray-400" style={{ bottom: `${requirement}%` }}>
                    <span className="absolute right-0 -top-4 text-xs text-gray-600 bg-white px-1">{requirement}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Detailed Mode
          <div className="space-y-4">
            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1">
              <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                Overview
              </button>
              <button onClick={() => setActiveTab('tracker')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tracker' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                Mark Attendance
              </button>
            </div>

            {activeTab === 'dashboard' ? (
              <div className="space-y-4">
                {/* Overall Stats */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="text-center mb-6">
                    <div className={`text-6xl font-bold mb-2 ${getStatusColor()}`}>{Math.round(percentage)}%</div>
                    <div className="text-sm text-gray-600">
                      {percentage >= requirement ? 'You\'re on track!' : `${toRecover} more classes needed`}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">{displayTotal}</div>
                      <div className="text-xs text-gray-600 mt-1">Total</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">{displayAttended}</div>
                      <div className="text-xs text-gray-600 mt-1">Attended</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">{displayTotal - displayAttended}</div>
                      <div className="text-xs text-gray-600 mt-1">Missed</div>
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                {subjects.length > 0 ? (
                  <>
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Subjects ({subjects.length})</h3>
                      <div className="space-y-3">
                        {subjects.map((subject) => {
                          const subjectPercentage = getSubjectPercentage(subject);
                          const isGood = subjectPercentage >= requirement;
                          return (
                            <div key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">{subject.name}</div>
                                <div className="text-xs text-gray-600 mt-0.5">{subject.attended} / {subject.conducted}</div>
                              </div>
                              <div className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.round(subjectPercentage)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Forecast */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-gray-600" />
                        <h3 className="text-sm font-medium text-gray-700">Forecast (if you attend next 10 classes)</h3>
                      </div>
                      
                      <div className="relative h-40 bg-gray-50 rounded-lg p-3">
                        <div className="absolute inset-3 flex items-end justify-between">
                          {forecast.map((point, i) => {
                            const height = Math.max(2, point.percentage);
                            const isGood = point.percentage >= requirement;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end px-0.5">
                                <div 
                                  className={`w-full ${isGood ? 'bg-green-500' : 'bg-red-500'} rounded-t transition-all hover:opacity-80`} 
                                  style={{ height: `${height}%` }}
                                  title={`${Math.round(point.percentage)}%`}
                                />
                                <span className="text-xs text-gray-500 mt-1.5">{i === 0 ? 'Now' : `+${i}`}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="absolute inset-3 pointer-events-none">
                          <div className="absolute w-full border-t border-dashed border-gray-400" style={{ bottom: `${requirement}%` }}>
                            <span className="absolute right-0 -top-4 text-xs text-gray-600 bg-white px-1">{requirement}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <p className="text-gray-600 mb-4">No subjects added yet</p>
                    <button onClick={() => setActiveTab('tracker')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      Add Your First Subject
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Mark Attendance
              <div className="space-y-4">
                {/* Add Subject */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  {!showAddSubject ? (
                    <button onClick={() => setShowAddSubject(true)} className="w-full py-2 text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Subject
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject name" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" onKeyPress={(e) => e.key === 'Enter' && addSubject()} autoFocus />
                      <button onClick={addSubject} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Add</button>
                      <button onClick={() => { setShowAddSubject(false); setNewSubjectName(''); }} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                    </div>
                  )}
                </div>

                {/* Date Navigation */}
                {subjects.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                    <button onClick={() => { const currentStart = dateRangeStart ? new Date(dateRangeStart) : new Date(); const newStart = new Date(currentStart); newStart.setDate(newStart.getDate() - 7); setDateRangeStart(newStart.toISOString().split('T')[0]); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {dateRangeStart ? <>{new Date(new Date(dateRangeStart).setDate(new Date(dateRangeStart).getDate() - 20)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</> : 'Last 21 days'}
                      </div>
                      {dateRangeStart && <button onClick={() => setDateRangeStart(null)} className="text-xs text-blue-600 hover:text-blue-700 mt-0.5">Today</button>}
                    </div>

                    <button onClick={() => { if (!dateRangeStart) return; const currentStart = new Date(dateRangeStart); const newStart = new Date(currentStart); newStart.setDate(newStart.getDate() + 7); const today = new Date(); if (newStart <= today) setDateRangeStart(newStart.toISOString().split('T')[0]); }} disabled={!dateRangeStart} className={`p-2 rounded-lg transition-colors ${dateRangeStart ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}>
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                )}

                {/* Subjects */}
                {subjects.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <p className="text-gray-600">Add a subject to start tracking attendance</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjects.map((subject) => {
                      const subjectPercentage = getSubjectPercentage(subject);
                      return (
                        <div key={subject.id} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{subject.name}</h4>
                            <div className="flex items-center gap-3">
                              <span className={`text-xl font-bold ${subjectPercentage >= requirement ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.round(subjectPercentage)}%
                              </span>
                              <button onClick={() => deleteSubject(subject.id)} className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <div className="flex gap-1.5">
                              {dates.map((date) => {
                                const key = `${subject.id}-${date}`;
                                const status = attendance[key];
                                const dateObj = new Date(date);
                                const dayNum = dateObj.getDate();
                                const isToday = date === new Date().toISOString().split('T')[0];

                                return (
                                  <div key={date} className="flex flex-col items-center min-w-[2.5rem]">
                                    <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{dayNum}</div>
                                    <button
                                      onClick={() => {
                                        if (status === 'present') markAttendance(subject.id, date, 'absent');
                                        else if (status === 'absent') markAttendance(subject.id, date, null);
                                        else markAttendance(subject.id, date, 'present');
                                      }}
                                      className={`w-10 h-10 rounded-lg font-bold text-xs transition-colors ${
                                        status === 'present'
                                          ? 'bg-green-500 text-white hover:bg-green-600'
                                          : status === 'absent'
                                          ? 'bg-red-500 text-white hover:bg-red-600'
                                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                      } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                                    >
                                      {status === 'present' ? 'P' : status === 'absent' ? 'A' : '·'}
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

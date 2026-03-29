import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Plus, BookOpen, Trash2, RotateCcw, FileText, X, MapPin, Users, Calendar } from "lucide-react";
import SessionCard from "@/components/SessionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import { courses, attendance } from "../services/api";
import QRDisplay from "../components/QRDisplay";

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: '', name: '' });
  const [error, setError] = useState('');

  useEffect(() => { load(); loadHistory(); }, []);

  const load = async () => {
    try {
      const res = await courses.list();
      setList(res.data);
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const res = await attendance.teacherHistory();
      setHistory(res.data);
    } catch {}
  };

  const handleStart = async (id: number) => {
    try {
      const res = await attendance.createSession({
        course_id: id,
        latitude: null,
        longitude: null,
      });
      setSession(res.data);
    } catch (err: any) {
      alert('Failed to start session: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEnd = async (sessionId: number) => {
    try {
      await attendance.endSession(sessionId);
      loadHistory();
      setSession(null);
    } catch {}
  };

  const handleReset = async (id: number) => {
    if (!confirm('🗑️ Delete all attendance for this session?')) return;
    try {
      await attendance.clearAttendance(id);
      loadHistory();
      alert('Records cleared!');
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this session permanently?')) return;
    try {
      await attendance.deleteSession(id);
      loadHistory();
    } catch {}
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Delete this course permanently?')) return;
    try {
      await courses.delete(id);
      load();
      loadHistory();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Delete failed");
    }
  };

  const handleEditCourse = (c: any) => {
    setForm({ code: c.code, name: c.name });
    setEditingId(c.id);
    setShowAdd(true);
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await courses.update(editingId, form);
      } else {
        await courses.create(form);
      }
      setForm({ code: '', name: '' });
      setEditingId(null);
      setShowAdd(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to save");
    }
  };

  // Active Session View
  if (session) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-lg font-bold text-white">Live Session</h2>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/20" onClick={() => { handleDelete(session.id); setSession(null); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl border-white/20 text-white hover:bg-white/10" onClick={() => handleEnd(session.id)}>
              End Session
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-8 max-w-6xl mx-auto px-4">
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/20">
          <QRDisplay sessionId={session.id} onEnd={() => handleEnd(session.id)} />
        </div>
        <div className="mt-6">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-2xl border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
            onClick={() => handleReset(session.id)}
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Reset Attendance
          </Button>
        </div>
      </main>
    </div>
  );

  // Dashboard View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{user?.full_name}</h1>
              <p className="text-xs text-slate-500">Teacher Dashboard</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-slate-800">
            Log out
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{list.length}</p>
                <p className="text-xs text-slate-500">Courses</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{history.length}</p>
                <p className="text-xs text-slate-500">Sessions</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {history.reduce((acc, s) => acc + (s.present_count || 0), 0)}
                </p>
                <p className="text-xs text-slate-500">Total Scans</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">15m</p>
                <p className="text-xs text-slate-500">GPS Range</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">My Courses</h2>
            <Button
              onClick={() => setShowAdd(true)}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Course
            </Button>
          </div>

          {/* Add/Edit Course Form */}
          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
              >
                <div className="flex justify-between mb-4">
                  <h3 className="font-bold text-slate-800">{editingId ? 'Edit Course' : 'New Course'}</h3>
                  <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setEditingId(null); setForm({code:'', name:''}); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleAddCourse} className="space-y-3">
                  <Input
                    placeholder="Course Code (e.g. CS101)"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    required
                    className="rounded-xl h-12"
                  />
                  <Input
                    placeholder="Course Name (e.g. Algorithms)"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    className="rounded-xl h-12"
                  />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <Button type="submit" className="w-full h-12 rounded-xl">{editingId ? 'Save' : 'Create'}</Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Course Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.length === 0 ? (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">No courses yet</p>
                <p className="text-slate-400 text-sm">Create your first course to get started</p>
              </div>
            ) : list.map((c) => (
              <SessionCard
                key={c.id}
                id={c.id}
                title={c.name}
                course={c.code}
                time="Ready"
                students={0}
                totalStudents={0}
                isActive={false}
                gpsEnabled={true}
                onStart={() => handleStart(c.id)}
                onEnd={() => {}}
                onEdit={() => handleEditCourse(c)}
                onDelete={() => handleDeleteCourse(c.id)}
              />
            ))}
          </div>
        </div>

        {/* History Section */}
        <div className="space-y-4 pb-10">
          <h2 className="text-lg font-bold text-slate-800">Session History</h2>
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-slate-400 text-sm">No sessions recorded yet</p>
              </div>
            ) : history.map(s => (
              <motion.div 
                key={s.id} 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white flex items-center justify-between p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{s.course_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(s.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    {s.present_count !== undefined && (
                      <span className="ml-2 text-green-600">• {s.present_count} present</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => window.open(`/api/attendance/sessions/${s.id}/report?token=${localStorage.getItem('token')}`, '_blank')}
                    className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-50"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleReset(s.id)} className="h-9 w-9 rounded-xl text-orange-500 hover:bg-orange-50">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)} className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Plus, BookOpen, Trash2, RotateCcw, FileText, X, Clock, Satellite, Wifi, AlertCircle, Terminal, Copy, CheckCheck } from "lucide-react";
import SessionCard from "@/components/SessionCard";
import SecurityIndicator from "@/components/SecurityIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import { courses, attendance } from "../services/api";
import QRDisplay from "../components/QRDisplay";
import { getGpsLocation, checkGpsAvailability } from "../lib/geo";

type GpsStatus = 'loading' | 'gps' | 'ip' | 'none';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [teacherPos, setTeacherPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [gps, setGps] = useState<GpsStatus>('loading');
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
  });
  const [error, setError] = useState('');

  useEffect(() => { load(); loadHistory(); checkGps(); }, []);

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

  const checkGps = async () => {
    setGps('loading');
    const status = await checkGpsAvailability();
    setGps(status);
  };

  const handleStart = async (id: number) => {
  try {
    // Create session WITHOUT location - teacher will set it via phone
    const res = await attendance.createSession({
      course_id: id,
      latitude: null,
      longitude: null,
    });
    setSession(res.data);
    setTeacherPos(null); // No location yet
  } catch (err: any) {
    alert('Failed to start session: ' + (err.response?.data?.detail || err.message));
  }
};

  const handleEnd = async (sessionId: number) => {
    try {
      await attendance.endSession(sessionId);
      loadHistory();
      setSession(null);
      setTeacherPos(null);
    } catch {}
  };

  const handleReset = async (id: number) => {
    if (!confirm('🗑️ Delete all attendance for this session? This will let students scan again.')) return;
    try {
      await attendance.clearAttendance(id);
      loadHistory();
      alert('Records cleared!');
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to completely delete this session?')) return;
    try {
      await attendance.deleteSession(id);
      loadHistory();
    } catch {}
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Delete this course permanently? This will erase all its sessions and attendance!')) return;
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

  if (session) return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Live Session Hub</h2>
            <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded-full animate-pulse">RECORDING</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => { handleDelete(session.id); setSession(null); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Kill
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleEnd(session.id)}>
              Close
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-8 max-w-lg mx-auto">
        <div className="glass-card p-4 rounded-3xl shadow-2xl overflow-hidden border-2 border-primary/20">
          <QRDisplay
            sessionId={session.id}
            teacherLat={teacherPos?.lat}
            teacherLng={teacherPos?.lng}
            onEnd={() => handleEnd(session.id)}
          />
        </div>
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <RotateCcw className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium flex-1">Reset all attendance for this session?</p>
            <Button size="sm" onClick={() => handleReset(session.id)} className="rounded-xl">Reset Now</Button>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground truncate max-w-[150px]">{user?.full_name}</h1>
              <p className="text-xs text-muted-foreground">Management Hub</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            Log out
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="glass-card p-5 text-center rounded-2xl">
            <p className="text-3xl font-black text-primary">{history.length}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Sessions</p>
          </div>
          <div className="glass-card p-5 text-center rounded-2xl">
            <p className="text-3xl font-black text-success">{list.length}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Active Courses</p>
          </div>
        </motion.div>

        {/* Security Status + Tunnel Helper */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Server Heartbeat</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <SecurityIndicator
              type="gps"
              active={gps === 'gps' || gps === 'ip'}
              label={gps === 'gps' ? 'GPS Precise' : gps === 'ip' ? 'IP Location' : gps === 'loading' ? 'Locating…' : 'GPS Blocked'}
            />
            <SecurityIndicator type="device" active={true} label="Device Lock Enabled" />
          </div>

          {/* Pinggy Tunnel Panel */}
          <div className="glass-card rounded-2xl overflow-hidden border border-border/50">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/50">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">HTTPS Tunnel (required for phone GPS)</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Run this command in a <b>new terminal</b>, then give students the printed <code className="bg-muted px-1 rounded">https://</code> link:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/40 text-green-400 text-[11px] font-mono px-3 py-2 rounded-xl overflow-x-auto whitespace-nowrap">
                  ssh -p 443 -R0:localhost:5173 a.pinggy.io
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-xl shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText('ssh -p 443 -R0:localhost:5173 a.pinggy.io');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <CheckCheck className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {gps !== 'gps' && (
                <p className="text-[10px] text-warning flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  GPS on your PC is {gps === 'ip' ? 'using IP fallback' : 'unavailable'}. Run the tunnel above so phones can get precise GPS.
                </p>
              )}
              {gps === 'gps' && (
                <p className="text-[10px] text-success flex items-center gap-1">
                  <Satellite className="h-3 w-3" /> GPS active on this device.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">My Classroom</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdd(true)}
              className="rounded-full h-8 px-4 text-[10px] font-bold border-primary text-primary hover:bg-primary/5"
            >
              <Plus className="h-3 w-3 mr-1" /> NEW COURSE
            </Button>
          </div>

          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-6 rounded-3xl border-2 border-primary/20 bg-primary/5"
              >
                <div className="flex justify-between mb-4">
                  <h3 className="font-bold">{editingId ? 'Edit Course' : 'Add New Course'}</h3>
                  <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setEditingId(null); setForm({code:'', name:''}); }}><X className="h-4 w-4" /></Button>
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

                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button type="submit" className="w-full h-12 rounded-xl">{editingId ? 'Save Changes' : 'Create Course'}</Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground opacity-30 select-none border-2 border-dashed rounded-3xl">
                <BookOpen className="h-10 w-10 mx-auto mb-2" />
                <p className="text-xs font-semibold uppercase tracking-widest">No courses tracked yet</p>
              </div>
            ) : list.map((c) => (
              <SessionCard
                key={c.id}
                id={c.id}
                title={c.name}
                course={c.code}
                time="Regular Session"
                students={0}
                totalStudents={0}
                isActive={false}
                gpsEnabled={gps === 'gps' || gps === 'ip'}
                onStart={() => handleStart(c.id)}
                onEnd={() => {}}
                onEdit={() => handleEditCourse(c)}
                onDelete={() => handleDeleteCourse(c.id)}
              />
            ))}
          </motion.div>
        </div>

        {/* Audit Trail */}
        <div className="space-y-4 pb-10">
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Audit Trail</h2>
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-10 opacity-20">
                <p className="text-xs italic font-semibold">Empty Log</p>
              </div>
            ) : history.map(s => (
              <div key={s.id} className="glass-card flex items-center justify-between p-4 rounded-2xl group hover:border-primary/30 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate tracking-tight">{s.course_name}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                    {new Date(s.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => window.open(`/api/attendance/sessions/${s.id}/report?token=${localStorage.getItem('token')}`, '_blank')}
                    className="h-9 w-9 rounded-xl text-success hover:bg-success/10"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleReset(s.id)} className="h-9 w-9 rounded-xl text-warning hover:bg-warning/10">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)} className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;

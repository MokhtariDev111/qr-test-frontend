import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen } from "lucide-react";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    full_name: '', 
    role: 'student', 
    student_id: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.role === 'student' && !form.student_id) return setError('Student ID is required');

    setError('');
    setLoading(true);
    try {
      await auth.register(form);
      const res = await auth.login({ email: form.email, password: form.password });
      login(res.data);
      navigate(res.data.user.role === 'teacher' ? '/' : '/student');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-8 rounded-3xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary mb-4">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground text-sm">Join the University Hub</p>
        </div>

        {error && <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            placeholder="Full Name" 
            value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            required
            className="rounded-xl h-11"
          />
          <Input 
            type="email" 
            placeholder="Email Address" 
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            className="rounded-xl h-11"
          />
          <Input 
            type="password" 
            placeholder="Create Password" 
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
            className="rounded-xl h-11"
          />
          
          <Select onValueChange={(v) => setForm({ ...form, role: v })}>
             <SelectTrigger className="h-11 rounded-xl">
               <SelectValue placeholder="Social Role" />
             </SelectTrigger>
             <SelectContent className="rounded-xl">
               <SelectItem value="student">👨‍🎓 Student</SelectItem>
               <SelectItem value="teacher">👨‍🏫 Teacher</SelectItem>
             </SelectContent>
          </Select>

          {form.role === 'student' && (
            <Input 
              placeholder="Student ID (Example: 2024001)" 
              value={form.student_id}
              onChange={e => setForm({ ...form, student_id: e.target.value })}
              required
              className="rounded-xl h-11"
            />
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-lg shadow-lg mt-4">
            {loading ? "Creating..." : "Register"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

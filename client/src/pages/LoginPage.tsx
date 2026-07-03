import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* wordmark — matches Sidebar */}
        <div className="flex items-center justify-center gap-3">
          <img
            src="/assemble49-mark.png"
            alt="Assemble49"
            className="h-12 w-12 shrink-0 rounded-card object-cover ring-1 ring-paper-line"
          />
          <div className="leading-tight">
            <p className="text-lg font-bold text-ink">Assemble49</p>
            <p className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Fleet Console</p>
          </div>
        </div>

        <Card>
          <div className="mb-5">
            <h1 className="text-lg font-bold text-ink">Sign in</h1>
            <p className="mt-0.5 text-sm text-ink-muted">Access your fleet console</p>
          </div>

          {error && (
            <div className="mb-4 rounded-control bg-danger-bg px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@fleet.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <Button type="submit" className="w-full" isLoading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-mono text-xs text-ink-ghost">Demo: admin@fleet.com / password123</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

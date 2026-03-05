import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { authAPI } from '@/api/auth';
import { Loader2 } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authAPI.login({ username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'reception') {
        navigate('/reception');
      } else if (data.user.role === 'nurse') {
        navigate('/nurse');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Invalid username or password';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
          autoComplete="username"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
          className="h-11"
        />
      </div>
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      <Button
        type="submit"
        className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Logging in...
          </>
        ) : (
          'Login'
        )}
      </Button>
    </form>
  );
};

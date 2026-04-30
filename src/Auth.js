import React, { useState } from 'react';
import { supabase } from './supabase';

const C = { green: '#8BC43F', greenLight: '#e8f5d3', black: '#000000', dark: '#353535', greyBorder: '#dedede', greyMid: '#888', grey: '#f5f5f5', white: '#ffffff' };

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name) { setError('Please enter your name'); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name } }
        });
        if (error) throw error;
        if (data.user) onAuth(data.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onAuth(data.user);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const S = {
    page: { minHeight: '100vh', background: C.white, fontFamily: "'Inter', system-ui, sans-serif", color: C.dark, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { background: C.white, padding: 28, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%' },
    logo: { fontSize: 36, fontWeight: 800, textAlign: 'center', color: C.black },
    logoAccent: { color: C.green },
    subtitle: { textAlign: 'center', color: C.greyMid, fontSize: 13, marginBottom: 24 },
    input: { width: '100%', padding: '12px 14px', border: `1.5px solid ${C.greyBorder}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit' },
    primary: { width: '100%', padding: '14px', background: C.green, color: C.white, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
    google: { width: '100%', padding: '14px', background: C.white, color: C.dark, border: `1.5px solid ${C.greyBorder}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', marginBottom: 14 },
    toggle: { textAlign: 'center', marginTop: 16, fontSize: 13, color: C.greyMid },
    link: { color: C.green, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' },
    divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', color: C.greyMid, fontSize: 11 },
    line: { flex: 1, height: 1, background: C.greyBorder },
    error: { background: '#fee', color: '#c00', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 12, textAlign: 'center' },
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>PT<span style={S.logoAccent}>:</span>U</div>
        <div style={S.subtitle}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</div>

        {error && <div style={S.error}>{error}</div>}

        <button style={S.google} onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div style={S.divider}><div style={S.line}></div>OR<div style={S.line}></div></div>

        <form onSubmit={handleEmail}>
          {mode === 'signup' && (
            <input style={S.input} type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input style={S.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={S.input} type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          <button style={{ ...S.primary, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Loading...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div style={S.toggle}>
          {mode === 'signup' ? (
            <>Already have an account? <span style={S.link} onClick={() => { setMode('login'); setError(''); }}>Log in</span></>
          ) : (
            <>New to PT:U? <span style={S.link} onClick={() => { setMode('signup'); setError(''); }}>Create an account</span></>
          )}
        </div>
      </div>
    </div>
  );
}

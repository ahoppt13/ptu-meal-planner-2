import React, { useState } from 'react';
import { supabase } from './supabase';

const C = { green: '#8BC43F', greenLight: '#e8f5d3', black: '#000000', dark: '#353535', greyBorder: '#dedede', greyMid: '#888', grey: '#f5f5f5', white: '#ffffff' };

export default function Auth({ onAuth, onGuest }) {
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

  const S = {
    page: { minHeight: '100vh', background: C.white, fontFamily: "'Inter', system-ui, sans-serif", color: C.dark, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { background: C.white, padding: 28, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%' },
    logo: { fontSize: 36, fontWeight: 800, textAlign: 'center', color: C.black },
    logoAccent: { color: C.green },
    subtitle: { textAlign: 'center', color: C.greyMid, fontSize: 13, marginBottom: 24 },
    input: { width: '100%', padding: '12px 14px', border: `1.5px solid ${C.greyBorder}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit' },
    primary: { width: '100%', padding: '14px', background: C.green, color: C.white, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
    guest: { width: '100%', padding: '14px', background: C.white, color: C.dark, border: `1.5px solid ${C.greyBorder}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 },
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

        <button style={S.guest} onClick={onGuest} disabled={loading}>
          → Continue Without Logging In
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

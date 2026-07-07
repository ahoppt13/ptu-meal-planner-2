import { useState, useEffect } from 'react';
import MealPlanner from './MealPlanner';
import Auth from './Auth';
import { supabase } from './supabase';

function App() {
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) setGuest(false);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveNewPassword = async (e) => {
    if (e) e.preventDefault();
    if (newPassword.length < 6) { setResetMsg('Password must be at least 6 characters'); return; }
    setResetBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setResetBusy(false);
    if (error) setResetMsg(error.message);
    else { setRecovery(false); setNewPassword(''); setResetMsg(''); }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 36, fontWeight: 800 }}>PT<span style={{ color: '#8BC43F' }}>:</span>U</div>
      </div>
    );
  }

  if (recovery) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", padding: 20 }}>
        <div style={{ background: '#fff', padding: 28, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%' }}>
          <div style={{ fontSize: 36, fontWeight: 800, textAlign: 'center' }}>PT<span style={{ color: '#8BC43F' }}>:</span>U</div>
          <div style={{ textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 20 }}>Choose a new password</div>
          {resetMsg && <div style={{ background: '#fee', color: '#c00', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{resetMsg}</div>}
          <form onSubmit={saveNewPassword}>
            <input type="password" placeholder="New password (min 6 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} required
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #dedede', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit' }} />
            <button type="submit" disabled={resetBusy}
              style={{ width: '100%', padding: 14, background: '#8BC43F', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: resetBusy ? 0.6 : 1 }}>
              {resetBusy ? 'Saving...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!user && !guest) {
    return <Auth onAuth={setUser} onGuest={() => setGuest(true)} />;
  }

  return <MealPlanner user={user} guest={guest} onExitGuest={() => setGuest(false)} />;
}

export default App;

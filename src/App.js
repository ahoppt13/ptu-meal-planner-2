import { useState, useEffect } from 'react';
import MealPlanner from './MealPlanner';
import Auth from './Auth';
import { supabase } from './supabase';

function App() {
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) setGuest(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 36, fontWeight: 800 }}>PT<span style={{ color: '#8BC43F' }}>:</span>U</div>
      </div>
    );
  }

  if (!user && !guest) {
    return <Auth onAuth={setUser} onGuest={() => setGuest(true)} />;
  }

  return <MealPlanner user={user} guest={guest} onExitGuest={() => setGuest(false)} />;
}

export default App;

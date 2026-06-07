import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('lb_categories')
          .select('*')
          .eq('is_active', true)
          .order('order', { ascending: true });
        
        if (err) throw err;
        setCategories(data || []);
      } catch (err) {
        console.warn('useCategories error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading, error };
}

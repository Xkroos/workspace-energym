import { useState, useEffect } from 'react';

export function useExchangeRate() {
  const [rate, setRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 3600000);
    return () => clearInterval(interval);
  }, []);

  const fetchRate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/dollar?page=bcv');

      if (!response.ok) {
        throw new Error('Error al obtener la tasa');
      }

      const data = await response.json();

      if (data.monitors?.usd?.price) {
        setRate(parseFloat(data.monitors.usd.price));
        setError(null);
      } else {
        throw new Error('Formato de respuesta inválido');
      }
    } catch (err) {
      console.error('Error fetching exchange rate:', err);
      setError('No se pudo obtener la tasa del BCV');
      setRate(0);
    } finally {
      setLoading(false);
    }
  };

  return { rate, loading, error, refresh: fetchRate };
}

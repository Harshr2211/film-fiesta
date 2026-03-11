import { useState, useEffect } from 'react';

const useFetch = (initialUrl) => {
  const [url, setUrl] = useState(initialUrl);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("useEffect of useFetch Called!");
    const abortController = new AbortController();

    const fetchData = async () => {
        console.log("Fetching data");
      setIsLoading(true);
      try {
        const response = await fetch(url, { signal: abortController.signal });
        if (!response.ok) {
          setError('Failed to fetch data');
          setData(null);
        } else {
          const result = await response.json();
          setData(result);
          setError(null);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          setError(error.message);
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [url]);
  
  return { data, error, isLoading, setUrl };
};

export default useFetch;
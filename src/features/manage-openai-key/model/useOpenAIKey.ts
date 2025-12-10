import { useEffect, useState } from 'react';
import { readSetting, saveSetting } from '@/shared/db/tensionDb';

const OPENAI_KEY_SETTING = 'openai_api_key';

export function useOpenAIKey() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await readSetting<string | undefined>(OPENAI_KEY_SETTING);
        if (!cancelled && stored) {
          setApiKey(stored);
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateKey = async (next: string) => {
    setApiKey(next);
    await saveSetting(OPENAI_KEY_SETTING, next);
  };

  return {
    apiKey,
    isLoaded,
    hasKey: Boolean(apiKey),
    updateKey,
  };
}

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isRunningStandalone() {
  const displayMode = typeof window.matchMedia === 'function'
    && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

function manualInstallInstructions() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'In Safari, tap Share, then choose Add to Home Screen.';
  if (/android/.test(userAgent)) return 'In Chrome, open the ⋮ menu and choose Install app or Add to Home screen.';
  return 'Use your browser menu or address-bar install icon, then choose Install app or Add to Home Screen.';
}

export default function InstallAppAction() {
  const [installed, setInstalled] = useState(() => typeof window !== 'undefined' && isRunningStandalone());
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    setInstalled(isRunningStandalone());

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installOrExplain = async () => {
    if (!installPrompt) {
      setShowInstructions(open => !open);
      return;
    }

    setInstallPrompt(null);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setShowInstructions(false);
      } else {
        setShowInstructions(true);
      }
    } catch {
      setShowInstructions(true);
    }
  };

  if (installed) return null;

  return (
    <div className="install-app-wrap">
      <button
        className="install-app-button"
        type="button"
        onClick={() => { void installOrExplain(); }}
        aria-expanded={showInstructions}
        aria-controls="install-app-instructions"
      >
        <Download size={17} aria-hidden="true" />
        <span>Install Jam Shift</span>
      </button>
      {showInstructions && (
        <div className="install-app-help" id="install-app-instructions" role="status" aria-live="polite">
          <div className="install-app-help-heading">
            <b>Install Jam Shift</b>
            <button type="button" onClick={() => setShowInstructions(false)} aria-label="Close install instructions">
              <X size={16} />
            </button>
          </div>
          <p>{manualInstallInstructions()}</p>
        </div>
      )}
    </div>
  );
}

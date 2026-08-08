import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detecta iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isInStandalone) {
      setInstalled(true);
      return;
    }

    if (ios) {
      setIsIos(true);
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) setShowBanner(true);
      return;
    }

    // Android / Chrome: captura evento beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', '1');
  };

  if (installed || !showBanner) return null;

  return (
    <>
      {/* Banner fixo no topo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-primary shadow-lg px-4 py-3 flex items-center gap-3">
        <Smartphone className="w-5 h-5 text-white flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold leading-tight">La Belle Studio</p>
          <p className="text-white/80 text-xs leading-tight">Adicione à tela inicial para acesso rápido</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="text-xs h-7 px-2 flex-shrink-0"
          onClick={handleInstall}
        >
          <Download className="w-3 h-3 mr-1" />
          Instalar
        </Button>
        <button onClick={handleDismiss} className="text-white/70 flex-shrink-0 transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Guia iOS */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setShowIosGuide(false)}>
          <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-semibold tracking-tight text-base mb-4 text-center">Adicionar à tela inicial</h3>
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <span>Toque no botão <strong>Compartilhar</strong> <span className="text-base">⬆️</span> na barra inferior do Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <span>Role para baixo e toque em <strong>"Adicionar à Tela Início"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <span>Toque em <strong>Adicionar</strong> no canto superior direito</span>
              </li>
            </ol>
            <Button className="w-full mt-6" onClick={() => { setShowIosGuide(false); handleDismiss(); }}>
              Entendi!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
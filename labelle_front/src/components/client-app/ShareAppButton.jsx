import { useState } from "react";
import { Share2, Copy, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShareAppButton({ className }) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // window is only available client-side; compute lazily inside handlers so
  // this component can still render during SSR.
  const getAppUrl = () => `${window.location.origin}/app`;
  const getMessage = () => `✨ Agende seu horário na La Belle Studio!\n\nAcesse agora: ${getAppUrl()}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getAppUrl());
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowMenu(false); }, 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getMessage())}`, "_blank");
    setShowMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "La Belle Studio", text: "Agende seu horário!", url: getAppUrl() });
      setShowMenu(false);
    } else {
      setShowMenu(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleNativeShare}>
        <Share2 className="w-3.5 h-3.5" />
        Compartilhar
      </Button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[180px] space-y-1">
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageCircle className="w-4 h-4 text-green-500" />
              Enviar via WhatsApp
            </button>
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
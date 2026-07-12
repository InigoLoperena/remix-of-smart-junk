import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Recycle, UserCircle, Package, Gavel, LogOut } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MarketplaceFeed from "@/components/MarketplaceFeed";

const DemoPreview = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const goRegister = () => navigate("/auth?mode=register");

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Recycle className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-lg font-bold">{t("appName")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={goRegister}>
              <UserCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goRegister}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Demo banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center text-sm font-medium text-primary">
        {t("demoNotice")}
      </div>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Quick actions row */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          <Button variant="outline" className="shrink-0 gap-2" onClick={goRegister}>
            <Package className="h-4 w-4" /> {t("myRequestsBtn")}
          </Button>
          <Button variant="outline" className="shrink-0 gap-2" onClick={goRegister}>
            <Gavel className="h-4 w-4" /> {t("myBidsBtn")}
          </Button>
        </div>

        {/* Marketplace section */}
        <div>
          <h2 className="font-display text-xl font-bold mb-1">{t("marketplace")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("requestsAndBids")}</p>
          <MarketplaceFeed userLat={40.4168} userLng={-3.7038} />
        </div>
      </main>

      {/* Floating action button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={goRegister}>
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default DemoPreview;

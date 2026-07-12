import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import { Home, Package, Gavel, Wallet, Shield, UserCircle, LogOut, HelpCircle, Recycle, ArrowLeft } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const GlobalNav = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { header } = usePageHeader();

  if (!user) return null;
  if (pathname === "/auth") return null;
  if (pathname === "/" && !user) return null;

  const navBtn = (onClick: () => void, icon: React.ReactNode, label: string, highlight = false) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center px-2 py-1 rounded-lg hover:bg-muted transition-colors min-w-[3rem]"
    >
      <span className={highlight ? "text-primary" : "text-foreground"}>{icon}</span>
      <span className={`text-[10px] mt-0.5 font-medium ${highlight ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
    </button>
  );

  const showBack = header.showBack;

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-2">
        {/* Left: Logo or Back button */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack ? (
            <>
              <button
                onClick={() => {
                  if (typeof header.backTo === "number") navigate(header.backTo as any);
                  else navigate(header.backTo || "/marketplace");
                }}
                className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-muted transition-colors shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-lg font-bold truncate">{header.title}</h1>
                {header.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{header.subtitle}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shrink-0">
                <Recycle className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="font-display text-lg font-bold hidden sm:block">{t("appName")}</h1>
            </>
          )}
        </div>

        {/* Center: page-specific actions */}
        {header.actions && (
          <div className="flex items-center gap-2">
            {header.actions}
          </div>
        )}

        {/* Right: Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navBtn(() => navigate("/marketplace"), <Home className="h-5 w-5" />, t("home"))}
          {navBtn(() => navigate("/my-requests"), <Package className="h-5 w-5" />, t("myRequestsBtn"))}
          {navBtn(() => navigate("/my-bids"), <Gavel className="h-5 w-5" />, t("myBidsBtn"))}
          {navBtn(() => navigate("/wallet"), <Wallet className="h-5 w-5" />, t("wallet"))}
          {navBtn(() => navigate("/"), <HelpCircle className="h-5 w-5" />, t("howItWorks"))}
          {user?.email === "inigoloperena@gmail.com" &&
            navBtn(() => navigate("/admin"), <Shield className="h-5 w-5" />, "Admin", true)}
          <div className="w-px h-8 bg-border mx-1" />
          <LanguageSwitcher />
          <NotificationBell />
          {navBtn(() => navigate("/profile"), <UserCircle className="h-5 w-5" />, t("profile"))}
          {navBtn(() => signOut(), <LogOut className="h-5 w-5" />, t("logout"))}
        </nav>
      </div>
    </header>
  );
};

export default GlobalNav;

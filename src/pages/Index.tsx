import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Recycle, ShoppingBag, LogIn, UserPlus, Mail, MessageCircle, Camera, Gavel, MessageSquare } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import heroIllustration from "@/assets/hero-illustration.png";
const tutorialCreate = "/lovable-uploads/7f4ed7c7-83c3-4794-8080-efccd9374aaa.jpg";
const tutorialMarketplace = "/lovable-uploads/dfce7c03-9ed4-4496-9a4e-1e166c2e8dd0.png";
const tutorialChat = "/lovable-uploads/241d048b-9325-4731-a19e-af2fd8dde4dc.png";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const marketplaceSteps = [
  { img: tutorialCreate, title: t("tutorialStep1Title"), desc: t("tutorialStep1Desc") },
  { img: tutorialMarketplace, title: t("tutorialStep2Title"), desc: t("tutorialStep2Desc") },
  { img: tutorialChat, title: t("tutorialStep3Title"), desc: t("tutorialStep3Desc") }];


  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Auth buttons for non-logged-in users (GlobalNav handles logged-in users) */}
      {!user && (
        <header className="border-b bg-card">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Recycle className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">{t("appName")}</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth?mode=login")}>
                <LogIn className="h-4 w-4 mr-1" /> {t("login")}
              </Button>
              <Button size="sm" onClick={() => navigate("/auth?mode=register")}>
                <UserPlus className="h-4 w-4 mr-1" /> {t("register")}
              </Button>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
            <div className="flex-1 space-y-6 text-center lg:text-left">
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {t("heroTitle")}<br />
                <span className="text-primary">{t("heroHighlight")}</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">{t("heroDescription")}</p>
              <div className="flex justify-center lg:justify-start gap-3">
                <Button size="lg" onClick={() => navigate(user ? "/dashboard" : "/demo")}>
                  {t("startFree")}
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate(user ? "/marketplace" : "/demo")}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> {t("viewMarketplace")}
                </Button>
              </div>
            </div>
            <div className="flex-1 max-w-xl lg:max-w-none">
              <img src={heroIllustration} alt="Junk pickup marketplace illustration" className="w-full h-auto" />
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="border-t bg-card">
          <div className="container mx-auto grid gap-8 px-4 py-16 sm:grid-cols-3">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Camera className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg">{t("featurePublishTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("featurePublishDesc")}</p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20">
                <Gavel className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg">{t("featureBidTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("featureBidDesc")}</p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <MessageSquare className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg">{t("featureChatTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("featureChatDesc")}</p>
            </div>
          </div>
        </section>

        {/* Marketplace Tutorial */}
        <section className="border-t bg-muted/30">
          <div className="container mx-auto px-4 py-20">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
                <ShoppingBag className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                {t("tutorialTitle")}
              </span>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">{t("tutorialTitle")}</h2>
              <p className="mt-4 text-muted-foreground text-lg">{t("tutorialSubtitle")}</p>
            </div>

            <div className="space-y-24">
              {marketplaceSteps.map((step, i) => {
                const imgWidth = i === 0 ? "md:w-1/3" : i === 1 ? "md:w-2/3" : "md:w-1/2";
                const textWidth = i === 0 ? "md:w-1/2" : i === 1 ? "md:w-1/3" : "md:w-2/5";
                return (
                <div key={i} className={`flex flex-col-reverse items-center gap-10 md:flex-row ${i % 2 !== 0 ? "md:flex-row-reverse" : ""}`}>
                  <div className={`w-full ${imgWidth}`}>
                    <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
                      <img src={step.img} alt={step.title} className="w-full h-auto" loading="lazy" />
                    </div>
                  </div>
                  <div className={`w-full ${textWidth} text-center md:text-left space-y-4`}>
                    <h3 className="font-display text-2xl font-bold text-primary">{step.title}</h3>
                    <p className="text-muted-foreground text-base leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="mt-16 text-center">
              <Button size="lg" onClick={() => navigate(user ? "/dashboard" : "/demo")}>{t("startFree")}</Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <Recycle className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-display text-xl font-bold">{t("appName")}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("footerTagline")}</p>
            </div>
            <div className="space-y-4">
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">{t("footerProduct")}</h4>
              <ul className="space-y-2.5 text-sm">
                <li><button onClick={() => navigate("/marketplace")} className="text-muted-foreground hover:text-foreground transition-colors">{t("marketplace")}</button></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">{t("footerContact")}</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                   <a className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors" href="mailto: contact@smartjunk.store">
                     <Mail className="h-4 w-4" /> contact@smartjunk.store
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SmartJunk. {t("footerRights")}</p>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <a
        href="https://api.whatsapp.com/send?phone=34667504944"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20bd5a] transition-colors"
        aria-label="WhatsApp">
        
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>);

};

export default Index;
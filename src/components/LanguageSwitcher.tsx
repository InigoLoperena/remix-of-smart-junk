import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="font-display font-bold text-xs px-2 h-8"
      onClick={() => setLanguage(language === "en" ? "es" : "en")}
    >
      {language === "en" ? "ES" : "EN"}
    </Button>
  );
};

export default LanguageSwitcher;

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const HIDDEN_ROUTES = ["/", "/auth", "/demo"];

const CreateRequestFab = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!user || HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Button
        className="h-12 w-12 sm:w-auto sm:h-auto sm:px-5 sm:py-3 rounded-full shadow-lg gap-2"
        onClick={() => navigate("/marketplace/new")}
      >
        <Plus className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-medium">{t("postRequest")}</span>
      </Button>
    </div>
  );
};

export default CreateRequestFab;

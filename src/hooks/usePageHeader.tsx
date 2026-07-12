import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface PageHeaderInfo {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string | number;
  actions?: ReactNode;
}

interface PageHeaderContextType {
  header: PageHeaderInfo;
  setHeader: (info: PageHeaderInfo) => void;
  clearHeader: () => void;
}

const PageHeaderContext = createContext<PageHeaderContextType>({
  header: {},
  setHeader: () => {},
  clearHeader: () => {},
});

export const PageHeaderProvider = ({ children }: { children: ReactNode }) => {
  const [header, setHeaderState] = useState<PageHeaderInfo>({});
  const setHeader = useCallback((info: PageHeaderInfo) => setHeaderState(info), []);
  const clearHeader = useCallback(() => setHeaderState({}), []);
  return (
    <PageHeaderContext.Provider value={{ header, setHeader, clearHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export const usePageHeader = () => useContext(PageHeaderContext);

import { useCallback, useEffect, useState } from "react";

export function useRouter() {
  const [location, setLocation] = useState(() => ({ pathname: window.location.pathname, search: window.location.search }));

  useEffect(() => {
    const onPopState = () => setLocation({ pathname: window.location.pathname, search: window.location.search });
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to) => {
    window.history.pushState({}, "", to);
    setLocation({ pathname: window.location.pathname, search: window.location.search });
  }, []);

  return { ...location, navigate };
}

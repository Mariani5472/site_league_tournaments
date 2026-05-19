import { mySupabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    mySupabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription }
    } = mySupabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user
  };
}
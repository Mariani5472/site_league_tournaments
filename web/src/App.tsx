import { useEffect } from "react";
import { LoginPage } from "./pages/LoginPage";
import { useAuth } from "./hooks/useAuth";
import { api } from "./services/api";

function App() {
  const { user } = useAuth();

  useEffect(() => {
    api.get("/me").then((response) => {
      console.log(response.data);
    });
  }, []);


  if (!user) {
    return <LoginPage />;
  }

   return (
    <div>
      Usuário logado:
      {user.email ?? ''}
    </div>
  );
}

export default App;
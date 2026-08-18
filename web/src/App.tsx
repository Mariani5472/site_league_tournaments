import { Toaster } from "sonner";
import { AppRoutes } from "./routes/AppRoutes";
import { useTheme } from "./providers/theme-context";
function App() {
    const { resolvedTheme } = useTheme();
    return (
        <>
            <AppRoutes />
            <Toaster richColors theme={resolvedTheme} />
        </>
    );
}
export default App;

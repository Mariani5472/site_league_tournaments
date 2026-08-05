import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";

type FormData = {
  email: string;
  password: string;
};

export function LoginPage() {
  const {
    signIn,
    signUp,
    loading,
    error,
  } = useAuth();

  const {
    register,
    handleSubmit,
  } = useForm<FormData>();

  async function handleLogin(data: FormData) {
    try {
      await signIn(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleRegister(data: FormData) {
    try {
      await signUp(data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <form
      className="flex flex-col gap-4 max-w-sm"
    >
      <input
        {...register("email")}
        type="email"
        placeholder="Email"
        className="border rounded p-2 text-black"
      />

      <input
        {...register("password")}
        type="password"
        placeholder="Password"
        className="border rounded p-2 text-black"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit(handleLogin)}
          disabled={loading}
        >
          Login
        </button>

        <button
          type="button"
          onClick={handleSubmit(handleRegister)}
          disabled={loading}
        >
          Registrar
        </button>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </form>
  );
}

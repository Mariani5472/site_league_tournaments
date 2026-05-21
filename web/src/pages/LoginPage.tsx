import { useForm } from "react-hook-form";
import { mySupabase } from "../lib/supabase/supabase";

type FormData = {
  email: string;
  password: string;
};

export function LoginPage() {
  const { register, handleSubmit } =
    useForm<FormData>();

  async function handleLogin(data: FormData) {
    const { error } =
      await mySupabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

    if (error) {
      console.error(error);
      return;
    }

    alert("Login realizado");
  }

  async function handleRegister(data: FormData) {
    const { error } = await mySupabase.auth.signUp({
      email: data.email,
      password: data.password
    });

    if (error) {
      console.error(error);
      return;
    }

    alert("Conta criada");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        className="flex w-[400px] flex-col gap-4"
        onSubmit={handleSubmit(handleLogin)}
      >
        <input
          placeholder="Email"
          {...register("email")}
          className="border p-2"
        />

        <input
          type="password"
          placeholder="Senha"
          {...register("password")}
          className="border p-2"
        />

        <button
          type="submit"
          className="bg-black text-white p-2"
        >
          Login
        </button>

        <button
          type="button"
          onClick={handleSubmit(handleRegister)}
          className="border p-2"
        >
          Criar conta
        </button>
      </form>
    </div>
  );
}
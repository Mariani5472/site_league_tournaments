import { useForm } from "react-hook-form";

import { useAuth } from "@/hooks/useAuth";

type FormData = {
  email: string;
  password: string;
};

export function LoginPage() {
  const { signIn } = useAuth();

  const {
    register,
    handleSubmit
  } = useForm<FormData>();

  async function handleLogin(data: FormData) {
    try {
      await signIn(data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleLogin)}
      className="flex flex-col gap-4"
    >
      <input {...register("email")} />

      <input
        type="password"
        {...register("password")}
      />

      <button type="submit">
        Login
      </button>
    </form>
  );
}
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-xl font-bold">
            Feudo
          </h1>

          <div className="flex gap-3">
            <a href="/login">
              Entrar
            </a>

            <a href="/login">
              Criar conta
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-3xl space-y-6">
            <h2 className="text-5xl font-bold">
              Organize suas partidas.
              <br />
              Compita com sua liga.
            </h2>

            <p className="text-xl text-muted-foreground">
              Crie ligas, reúna jogadores e organize
              partidas competitivas.
            </p>

            <div className="flex gap-4">
              <a href="/login">
                Começar agora
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
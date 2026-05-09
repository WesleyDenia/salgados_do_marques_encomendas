import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Acesso não autorizado",
};

export default async function UnauthorizedPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ from?: string }>;
}>) {
  const { from } = await searchParams;

  return (
    <section className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 md:px-6">
      <div className="w-full rounded-3xl border border-border/70 bg-card/90 p-8 shadow-sm">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Painel operacional
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Esta área não está disponível para o perfil autenticado.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            O painel validou a sessão, mas a autorização final não permite abrir
            a rota pedida neste momento. A interface permanece alinhada com o
            backend e bloqueia o acesso por omissão sempre que o perfil não é
            suportado, está inactivo ou não corresponde ao modelo live actual.
          </p>
          {from ? (
            <p className="text-sm text-muted-foreground">
              Rota pedida: <code>{from}</code>
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signin">
            <Button>Voltar à autenticação</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Tentar dashboard protegido</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

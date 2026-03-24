import { Building2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function SemEscritorio() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Building2 className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Selecione um Escritório</h2>
      <p className="text-muted-foreground max-w-sm mb-6">
        Para acessar este módulo, você precisa primeiro selecionar o escritório ativo no menu lateral.
      </p>
      <Link href="/escritorio">
        <Button className="bg-primary">Ir para Escritórios</Button>
      </Link>
    </div>
  );
}

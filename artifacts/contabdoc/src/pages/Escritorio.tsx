import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useListarEscritorios, 
  useCriarEscritorio, 
  useAtualizarEscritorio, 
  consultarCnpj, 
  validarCpf 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatters } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Building, Search, CheckCircle2, AlertTriangle } from "lucide-react";

export default function EscritorioPage() {
  const { toast } = useToast();
  const { data: escritorios, isLoading: isLoadingList } = useListarEscritorios();
  const createMutation = useCriarEscritorio();
  const updateMutation = useAtualizarEscritorio();

  const [formData, setFormData] = useState<any>({
    tipo: 'PJ',
    cnpj: '',
    cpf: '',
    razaoSocial: '',
    nomeFantasia: '',
    nomeResponsavel: '',
    email: '',
    telefone: '',
    celular: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    situacao: ''
  });

  const [isSearching, setIsSearching] = useState(false);
  const [existingId, setExistingId] = useState<number | null>(null);

  useEffect(() => {
    if (escritorios && escritorios.length > 0) {
      const e = escritorios[0];
      setExistingId(e.id);
      setFormData({
        tipo: e.tipo || 'PJ',
        cnpj: e.cnpj || '',
        cpf: e.cpf || '',
        razaoSocial: e.razaoSocial || '',
        nomeFantasia: e.nomeFantasia || '',
        nomeResponsavel: e.nomeResponsavel || '',
        email: e.email || '',
        telefone: e.telefone || '',
        celular: e.celular || '',
        cep: e.cep || '',
        logradouro: e.logradouro || '',
        numero: e.numero || '',
        complemento: e.complemento || '',
        bairro: e.bairro || '',
        municipio: e.municipio || '',
        uf: e.uf || '',
        situacao: e.situacao || ''
      });
    }
  }, [escritorios]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    if (name === 'cnpj') formattedValue = formatters.cnpj(value);
    if (name === 'cpf') formattedValue = formatters.cpf(value);
    if (name === 'telefone' || name === 'celular') formattedValue = formatters.phone(value);
    if (name === 'cep') formattedValue = formatters.cep(value);

    setFormData((prev: any) => ({ ...prev, [name]: formattedValue }));
  };

  const handleSearchCnpj = async () => {
    const unmasked = formatters.unmask(formData.cnpj);
    if (unmasked.length !== 14) {
      toast({ title: "CNPJ Inválido", description: "O CNPJ deve ter 14 dígitos", variant: "destructive" });
      return;
    }
    
    setIsSearching(true);
    try {
      const data = await consultarCnpj(unmasked);
      setFormData((prev: any) => ({
        ...prev,
        razaoSocial: data.razaoSocial || prev.razaoSocial,
        nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
        cep: formatters.cep(data.cep || prev.cep),
        logradouro: data.logradouro || prev.logradouro,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        bairro: data.bairro || prev.bairro,
        municipio: data.municipio || prev.municipio,
        uf: data.uf || prev.uf,
        telefone: formatters.phone(data.telefone || prev.telefone),
        email: data.email || prev.email,
        situacao: data.situacao || prev.situacao
      }));
      toast({ title: "Sucesso", description: "Dados da Receita carregados." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível buscar o CNPJ.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchCpf = async () => {
    const unmasked = formatters.unmask(formData.cpf);
    if (unmasked.length !== 11) {
      toast({ title: "CPF Inválido", description: "O CPF deve ter 11 dígitos", variant: "destructive" });
      return;
    }
    
    setIsSearching(true);
    try {
      const data = await validarCpf(unmasked);
      if (data.valido) {
        setFormData((prev: any) => ({
          ...prev,
          nomeResponsavel: data.nome || prev.nomeResponsavel,
          situacao: data.situacao || prev.situacao
        }));
        toast({ title: "CPF Válido", description: "Dados validados na Receita." });
      } else {
        toast({ title: "CPF Inválido", description: "A Receita Federal retornou o CPF como inválido.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao validar CPF.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    try {
      if (existingId) {
        await updateMutation.mutateAsync({ id: existingId, data: formData });
        toast({ title: "Sucesso", description: "Dados do escritório atualizados!" });
      } else {
        const res = await createMutation.mutateAsync({ data: formData });
        setExistingId(res.id);
        toast({ title: "Sucesso", description: "Escritório cadastrado com sucesso!" });
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao salvar dados.", variant: "destructive" });
    }
  };

  if (isLoadingList) return <AppLayout title="Meu Escritório"><div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;

  return (
    <AppLayout title="Meu Escritório">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-card border-border/50 shadow-xl shadow-black/10 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary to-indigo-500 w-full"></div>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center space-x-2">
                  <Building className="w-6 h-6 text-primary" />
                  <span>Perfil do Escritório</span>
                </CardTitle>
                <CardDescription className="mt-1">
                  Mantenha os dados do seu escritório contábil atualizados.
                </CardDescription>
              </div>
              {formData.situacao && (
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 border ${
                  formData.situacao === 'ATIVA' || formData.situacao === 'Regular' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                }`}>
                  {formData.situacao === 'ATIVA' || formData.situacao === 'Regular' ? <CheckCircle2 className="w-4 h-4 mr-1"/> : <AlertTriangle className="w-4 h-4 mr-1"/>}
                  <span>{formData.situacao}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
              <Label className="text-muted-foreground mb-3 block">Tipo de Inscrição</Label>
              <RadioGroup 
                value={formData.tipo} 
                onValueChange={(v) => setFormData({...formData, tipo: v as 'PJ'|'PF'})}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PJ" id="pj" className="text-primary" />
                  <Label htmlFor="pj" className="font-medium cursor-pointer">Pessoa Jurídica (CNPJ)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PF" id="pf" className="text-primary" />
                  <Label htmlFor="pf" className="font-medium cursor-pointer">Pessoa Física (CPF)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.tipo === 'PJ' ? (
                <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                  <Label>CNPJ</Label>
                  <div className="flex space-x-2">
                    <Input 
                      name="cnpj" 
                      value={formData.cnpj} 
                      onChange={handleChange} 
                      placeholder="00.000.000/0000-00"
                      className="bg-background"
                    />
                    <Button onClick={handleSearchCnpj} disabled={isSearching} variant="secondary">
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                      Buscar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                  <Label>CPF</Label>
                  <div className="flex space-x-2">
                    <Input 
                      name="cpf" 
                      value={formData.cpf} 
                      onChange={handleChange} 
                      placeholder="000.000.000-00"
                      className="bg-background"
                    />
                    <Button onClick={handleSearchCpf} disabled={isSearching} variant="secondary">
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Validar
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Razão Social / Nome Completo</Label>
                <Input name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} className="bg-background" />
              </div>

              {formData.tipo === 'PJ' && (
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} className="bg-background" />
                </div>
              )}

              <div className="space-y-2">
                <Label>Nome do Responsável</Label>
                <Input name="nomeResponsavel" value={formData.nomeResponsavel} onChange={handleChange} className="bg-background" />
              </div>

              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleChange} className="bg-background" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone Fixo</Label>
                  <Input name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 0000-0000" className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Celular / WhatsApp</Label>
                  <Input name="celular" value={formData.celular} onChange={handleChange} placeholder="(00) 00000-0000" className="bg-background" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input name="cep" value={formData.cep} onChange={handleChange} placeholder="00000-000" className="bg-background" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Logradouro</Label>
                  <Input name="logradouro" value={formData.logradouro} onChange={handleChange} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input name="numero" value={formData.numero} onChange={handleChange} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input name="complemento" value={formData.complemento} onChange={handleChange} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input name="bairro" value={formData.bairro} onChange={handleChange} className="bg-background" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Município</Label>
                  <Input name="municipio" value={formData.municipio} onChange={handleChange} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input name="uf" value={formData.uf} onChange={handleChange} className="bg-background" maxLength={2} />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 shadow-lg shadow-primary/20 px-8"
              >
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

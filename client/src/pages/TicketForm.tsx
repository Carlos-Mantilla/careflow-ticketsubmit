import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
}

interface TicketFormData {
  categoria: string;
  clienteId: string;
  clienteNombre: string;
  descripcion: string;
  prioridad: string;
  attachments: File[];
}

export default function TicketForm() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<TicketFormData>({
    categoria: "",
    clienteId: "",
    clienteNombre: "",
    descripcion: "",
    prioridad: "",
    attachments: [],
  });
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  // Fetch contacts with "won" tag
  const { data: contactsData, isLoading: isLoadingContacts } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["/api/ghl/contacts/won", clientSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientSearchQuery) {
        params.append("query", clientSearchQuery);
      }
      const response = await fetch(`/api/ghl/contacts/won?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  const contacts = contactsData?.contacts || [];

  // No hacer filtrado adicional en el cliente - el servidor ya filtra
  // El componente Command tiene su propio filtrado, pero lo deshabilitaremos
  const filteredContacts = contacts;

  // Submit ticket mutation
  const submitTicketMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      const formDataToSend = new FormData();
      formDataToSend.append("categoria", data.categoria);
      formDataToSend.append("clienteId", data.clienteId);
      formDataToSend.append("clienteNombre", data.clienteNombre);
      formDataToSend.append("descripcion", data.descripcion);
      formDataToSend.append("prioridad", data.prioridad);
      
      // Append attachments
      data.attachments.forEach((file) => {
        formDataToSend.append("attachments", file);
      });

      const response = await fetch("/api/tickets", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear el ticket");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ticket creado exitosamente",
        description: "El ticket ha sido enviado correctamente.",
      });
      // Reset form
      setFormData({
        categoria: "",
        clienteId: "",
        clienteNombre: "",
        descripcion: "",
        prioridad: "",
        attachments: [],
      });
      setClientSearchQuery("");
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear el ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoria || !formData.clienteId || !formData.descripcion || !formData.prioridad) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    submitTicketMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Careflow Ticket</CardTitle>
          <CardDescription>
            Crea tu ticket de soporte para clientes Careflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Categoría */}
            <div className="space-y-2">
              <Label htmlFor="categoria">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, categoria: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option ..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Soporte Técnico">Soporte Técnico</SelectItem>
                  <SelectItem value="Facturación">Facturación</SelectItem>
                  <SelectItem value="Videollamada">Videollamada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label htmlFor="cliente">
                Cliente <span className="text-red-500">*</span>
              </Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="w-full justify-between"
                  >
                    {formData.clienteNombre || "Selecciona un cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar cliente..."
                      value={clientSearchQuery}
                      onValueChange={setClientSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isLoadingContacts ? "Cargando..." : "No se encontraron clientes."}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredContacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={`${contact.contactName} ${contact.companyName} ${contact.email} ${contact.phone}`}
                            onSelect={() => {
                              setFormData((prev) => ({
                                ...prev,
                                clienteId: contact.id,
                                clienteNombre: contact.contactName || contact.companyName || "",
                              }));
                              setClientSearchOpen(false);
                              setClientSearchQuery("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.clienteId === contact.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{contact.contactName || contact.companyName}</span>
                              {contact.companyName && contact.contactName && (
                                <span className="text-xs text-muted-foreground">
                                  {contact.companyName}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Describe el problema..."
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                rows={5}
                className="resize-none"
              />
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <Label htmlFor="prioridad">
                Prioridad <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.prioridad}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, prioridad: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option ..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1</SelectItem>
                  <SelectItem value="P2">P2</SelectItem>
                  <SelectItem value="P3">P3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Adjuntos */}
            <div className="space-y-2">
              <Label htmlFor="attachments">Adjuntos</Label>
              <div className="space-y-2">
                <Input
                  ref={fileInputRef}
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-100 rounded-md"
                      >
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={submitTicketMutation.isPending}
            >
              {submitTicketMutation.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


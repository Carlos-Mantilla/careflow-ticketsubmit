import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
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
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  telefonoContacto: string;
  descripcion: string;
  prioridad: string;
  attachments: File[];
}

export default function TicketForm() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phonePattern = /^\+?\d{10,}$/;
  const [formData, setFormData] = useState<TicketFormData>({
    categoria: "",
    clienteId: "",
    clienteNombre: "",
    telefonoContacto: "",
    descripcion: "",
    prioridad: "",
    attachments: [],
  });
  const [telefonoContactoError, setTelefonoContactoError] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      formDataToSend.append("telefonoContacto", data.telefonoContacto);
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
        telefonoContacto: "",
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
    
    if (
      !formData.categoria ||
      !formData.clienteId ||
      !formData.telefonoContacto ||
      !formData.descripcion ||
      !formData.prioridad
    ) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    if (!phonePattern.test(formData.telefonoContacto)) {
      toast({
        title: "Telefono inválido",
        description: "Ingresa un teléfono válido (mínimo 10 dígitos, + opcional).",
        variant: "destructive",
      });
      return;
    }

    setIsConfirmationOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));

    // Reset input so the same files can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setFormData((prev) => {
      const updatedAttachments = prev.attachments.filter((_, i) => i !== index);
      return {
        ...prev,
        attachments: updatedAttachments,
      };
    });

    // Reset the file input so the label clears and the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Shared Command content for client search
  const renderCommandContent = () => (
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
  );

  const confirmationMessage =
    formData.prioridad === "P1" ? (
      <span>
        <strong>
          Vas a crear un ticket con{" "}
          <span className="text-red-600">Prioridad P1</span>.
        </strong>{" "}
        Esto se reserva solo para cuando el bot no contesta (y ya lo comprobaste)
        o cuando esta agendado mal. ¿Estas seguro?
      </span>
    ) : (
      "Recuerda que entre más detallado esté el ticket, más facil será su resolución. ¿Estas seguro que estas listo para enviarlo?"
    );

  const prioridadTriggerClassName = cn(
    formData.prioridad === "P1" && "bg-red-50 text-red-700 border-red-200 font-semibold",
    formData.prioridad === "P2" && "bg-orange-50 text-orange-700 border-orange-200",
    formData.prioridad === "P3" && "bg-yellow-50 text-yellow-800 border-yellow-200"
  );

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
              
              {isMobile ? (
                <Dialog open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSearchOpen}
                      className="w-full justify-between"
                    >
                      {formData.clienteNombre || "Selecciona un cliente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-2rem)] p-0 sm:max-w-[400px] top-[20%] translate-y-0">
                    {renderCommandContent()}
                  </DialogContent>
                </Dialog>
              ) : (
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
                  <PopoverContent 
                    className="w-[400px] p-0" 
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    avoidCollisions={false}
                  >
                    {renderCommandContent()}
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Telefono del Contacto */}
            <div className="space-y-2">
              <Label htmlFor="telefonoContacto">
                Telefono del Contacto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="telefonoContacto"
                placeholder="Numero de telefono del contacto que presentó el problema"
                value={formData.telefonoContacto}
                className={cn(
                  telefonoContactoError &&
                    "border-red-500 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                )}
                onChange={(e) =>
                  setFormData((prev) => {
                    const nextValue = e.target.value;
                    if (telefonoContactoError && phonePattern.test(nextValue)) {
                      setTelefonoContactoError(null);
                    }
                    return {
                      ...prev,
                      telefonoContacto: nextValue,
                    };
                  })
                }
                onBlur={() => {
                  const value = formData.telefonoContacto;
                  if (!value) {
                    setTelefonoContactoError(null);
                    return;
                  }
                  if (!phonePattern.test(value)) {
                    setTelefonoContactoError(
                      "Ingresa un teléfono válido (mínimo 10 dígitos, + opcional)."
                    );
                    return;
                  }
                  setTelefonoContactoError(null);
                }}
              />
              {telefonoContactoError && (
                <p className="text-xs text-red-600">{telefonoContactoError}</p>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Se muy detallado al explicar."
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Ej: El Dr reporta que el bot no responde a ningun paciente. Luego de revisar las ultimas conversaciones veo que los contactos no tiene el tag de bot_off y el whatsapp esta conectado.
              </p>
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
                <SelectTrigger className={prioridadTriggerClassName}>
                  <SelectValue placeholder="Selecciona una opcion..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1" className="text-red-600 font-semibold focus:text-red-600">
                    P1
                  </SelectItem>
                  <SelectItem value="P2" className="text-orange-600 focus:text-orange-600">
                    P2
                  </SelectItem>
                  <SelectItem value="P3" className="text-yellow-600 focus:text-yellow-600">
                    P3
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Adjuntos */}
            <div className="space-y-2">
              <Label htmlFor="attachments">Adjuntos</Label>
              <p className="text-xs text-muted-foreground">
                Agrega una captura de la conversación con problema y aparte otra captura con el mensaje del Dr si aplica.
              </p>
              <div className="space-y-2">
                <Input
                  ref={fileInputRef}
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {formData.attachments.length > 0
                    ? `${formData.attachments.length} archivo${formData.attachments.length > 1 ? "s" : ""} seleccionado${formData.attachments.length > 1 ? "s" : ""}`
                    : "Seleccionar archivos"}
                </Button>
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

      <ConfirmationModal
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        message={confirmationMessage}
        confirmText="Enviar"
        cancelText="Regresar"
        onConfirm={() => {
          setIsConfirmationOpen(false);
          submitTicketMutation.mutate(formData);
        }}
        onCancel={() => setIsConfirmationOpen(false)}
      />
    </div>
  );
}


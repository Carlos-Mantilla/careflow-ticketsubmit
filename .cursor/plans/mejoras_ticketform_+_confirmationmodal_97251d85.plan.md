---
name: Mejoras TicketForm + ConfirmationModal
overview: Agregar campo requerido de teléfono, actualizar placeholders/hints, colorear opciones de Prioridad y mostrar un modal de confirmación reutilizable antes de enviar el ticket (con copy especial para P1), propagando el nuevo campo también al backend/webhook.
todos:
  - id: fe-phone-field
    content: Agregar campo requerido “Telefono del Contacto” con placeholder y validación ^\+?\d{10,}$ en `client/src/pages/TicketForm.tsx`.
    status: completed
  - id: fe-hints-placeholders
    content: Actualizar placeholder/hint de “Descripción” y agregar hint bajo “Adjuntos”.
    status: completed
  - id: fe-priority-colors
    content: Aplicar estilos de color por opción (P1 rojo+negrita, P2 naranja, P3 amarillo) en el `SelectItem` de Prioridad.
    status: completed
  - id: fe-confirmation-modal
    content: Crear `client/src/components/ui/ConfirmationModal.tsx` (reutilizable) basado en `AlertDialog` y conectarlo al submit con texto especial para P1.
    status: completed
  - id: be-telefono-contacto
    content: Propagar y validar `telefonoContacto` en `server/routes.ts` dentro de `POST /api/tickets` y añadirlo al payload para n8n.
    status: completed
isProject: false
---

## Contexto (estado actual)

- El formulario está en `[client/src/pages/TicketForm.tsx](client/src/pages/TicketForm.tsx)` y usa `useState` + validación manual con `toast`.
- El envío se hace con `FormData` a `POST /api/tickets`.
- El backend está en `[server/routes.ts](server/routes.ts)` y valida `categoria`, `clienteId`, `descripcion`, `prioridad` antes de construir el payload para n8n.
- Ya existe infraestructura de modal tipo confirmación en `[client/src/components/ui/alert-dialog.tsx](client/src/components/ui/alert-dialog.tsx)`, ideal para reutilizar.

## Cambios en Frontend

### 1) Campo “Telefono del Contacto” (requerido + validación)

- Actualizar el tipo `TicketFormData` y el `useState` inicial en `[client/src/pages/TicketForm.tsx](client/src/pages/TicketForm.tsx)` para incluir `telefonoContacto: string`.
- Insertar un nuevo bloque de UI (entre “Cliente” y “Descripción”) con:
  - `Label`: `Telefono del Contacto *`
  - `Input` con `placeholder`: `"Numero de telefono del contacto que presentó el problema"`
- Validación básica en `handleSubmit`:
  - Requerido (incluido en el check actual de requeridos).
  - Regex propuesta: `^\+?\d{10,}$` (acepta `+` opcional y mínimo 10 dígitos; sin separadores).
  - Si falla: `toast` destructivo con mensaje tipo “Ingresa un teléfono válido (mínimo 10 dígitos, + opcional)”.

### 2) Descripción: nuevo placeholder + hint debajo

- Cambiar `placeholder` del `Textarea` de “Descripción” a: `"Se muy detallado al explicar."`.
- Agregar debajo del `Textarea` un texto pequeño (hint) con estilo `text-xs text-muted-foreground`:
  - `"Ej: El Dr reporta que el bot no responde a ningun paciente. Luego de revisar las ultimas conversaciones veo que los contactos no tiene el tag de bot_off y el whatsapp esta conectado."`

### 3) Adjuntos: hint debajo del label

- Debajo de `Label` “Adjuntos”, agregar un hint (mismo estilo `text-xs text-muted-foreground`):
  - `"Agrega una captura de la conversación con problema y aparte otra captura con el mensaje del Dr si aplica."`

### 4) Prioridad: colorear opciones P1/P2/P3

- En el `SelectContent` de Prioridad, pasar `className` a cada `SelectItem`:
  - P1: `text-red-600 font-semibold focus:text-red-600`
  - P2: `text-orange-600 focus:text-orange-600`
  - P3: `text-yellow-600 focus:text-yellow-600`

### 5) Modal de confirmación antes de enviar

- Crear componente reutilizable `[client/src/components/ui/ConfirmationModal.tsx](client/src/components/ui/ConfirmationModal.tsx)` basado en `AlertDialog`.
  - Props sugeridas:
    - `open: boolean`
    - `onOpenChange: (open: boolean) => void`
    - `message: string`
    - `confirmText?: string` (default `"Aceptar"`)
    - `cancelText?: string` (default `"Cancelar"`)
    - `onConfirm: () => void`
    - `onCancel?: () => void`
  - Botones:
    - Confirm: estilo default de `Button` (ya es `bg-primary`).
    - Cancel: `Button variant="secondary"` (gris claro).
- Integrar en `[client/src/pages/TicketForm.tsx](client/src/pages/TicketForm.tsx)`:
  - Cambiar `handleSubmit` para que, tras pasar validaciones, **abra el modal** en lugar de llamar `mutate`.
  - En `onConfirm` del modal: llamar `submitTicketMutation.mutate(formData)` y cerrar.
  - En `onCancel`: cerrar.
  - Texto del modal:
    - Si `prioridad === "P1"`: `"Vas a crear un ticket con prioridad P1. Esto se reserva solo para cuando el bot no contesta (y ya lo comprobaste) o cuando esta agendado mal. ¿Estas seguro?"`
    - Caso normal: `"Recuerda que entre más detallado esté el ticket, más facil será su resolución. ¿Estas seguro que estas listo para enviarlo?"`
  - Para este formulario se pasarán textos de botones: `confirmText="Enviar"` y `cancelText="Regresar"`.

## Cambios en Backend

- En `[server/routes.ts](server/routes.ts)` dentro de `POST /api/tickets`:
  - Leer `telefonoContacto` desde `req.body`.
  - Agregarlo a la validación de requeridos.
  - Incluirlo en `payloadItem.json` con llave: `"Teléfono del Contacto"` (misma convención en español que el resto del payload).

## Snippets relevantes (para ubicar cambios)

- Validación y envío actual en `TicketForm.tsx`:

```156:169:client/src/pages/TicketForm.tsx
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
```

- Endpoint del ticket en backend (donde se agrega el nuevo campo):

```496:531:server/routes.ts
  app.post("/api/tickets", upload.array('attachments', 10), async (req, res) => {
    try {
      const { categoria, clienteId, descripcion, prioridad } = req.body;
      
      // Validate required fields
      if (!categoria || !clienteId || !descripcion || !prioridad) {
        return res.status(400).json({ 
          error: "categoria, clienteId, descripcion, and prioridad are required" 
        });
      }

      const payloadItem: any = {
        json: {
          "Categoría": categoria,
          "Cliente": req.body.clienteNombre || '',
          "customerId": clienteId,
          "Descripción": descripcion,
          "Prioridad": prioridad,
          "submittedAt": new Date().toISOString(),
          "formMode": process.env.FORM_MODE || "production"
        }
      };
```


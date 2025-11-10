# Careflow Ticket Form

Aplicación web para crear y gestionar tickets de soporte para clientes Careflow.

## Características

- **Creación de tickets**: Formulario para crear tickets con categoría, cliente, descripción y prioridad
- **Búsqueda de clientes**: Búsqueda inteligente de clientes con tag "won" en GoHighLevel
- **Adjuntos**: Soporte para múltiples archivos adjuntos (hasta 10)
- **Integración con n8n**: Los tickets se envían automáticamente a webhook de n8n

## Categorías

- Soporte Técnico
- Facturación
- Videollamada

## Prioridades

- P1 (Alta)
- P2 (Media)
- P3 (Baja)


## Configuración

Variables de entorno requeridas:

```env
GHL_API_TOKEN=tu_token
GHL_LOCATION_ID=tu_location_id
N8N_TICKET_WEBHOOK_URL=url_del_webhook
FORM_MODE=production
```

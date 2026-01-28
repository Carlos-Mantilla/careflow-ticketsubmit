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

Variables de entorno requeridas- Updated on 28/01/2026:

```env
SESSION_SECRET="DG2SKFm25Ponr2kLN1aS6dUOUl8LHB/DvZZzlxEnGWMi5pbN7H89cyiJiuhwS3/R2U26uj3TsJff7FGtZCwnJw=="
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DEFAULT_OBJECT_STORAGE_BUCKET_ID="replit-objstore-6c0779d9-437a-4397-a2f1-895d0079dd90"
PUBLIC_OBJECT_SEARCH_PATHS="/replit-objstore-6c0779d9-437a-4397-a2f1-895d0079dd90/public"
PRIVATE_OBJECT_DIR="/replit-objstore-6c0779d9-437a-4397-a2f1-895d0079dd90/.private"
N8N_WEBHOOK_URL="https://automation.gotiger.ai/webhook/378ba3cf-a0f0-442c-85e7-91916b88aee0"
OPENAI_API_KEY=
GHL_CALENDAR_ID="d2SjQPa0hP8ziqgCUfyA"
GHL_LOCATION_ID="pFEJKkFrQALedVPG7m62"
GHL_USER_KEY="q0cYsAT9xiDL7J9h6eF6"
GHL_API_TOKEN=token_de_ghl
NODE_ENV="production"
```

import type { Express } from "express";
import { createServer, type Server } from "http";
import { ObjectStorageService } from "./objectStorage";
import { transcriptionService } from "./transcriptionService";
import { ghlService } from "./ghlService";
import multer from "multer";
import axios from "axios";

const upload = multer({ storage: multer.memoryStorage() });

/**
 * Send data to n8n webhook
 */
async function sendToN8nWebhook(data: any) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('⚠️ N8N_WEBHOOK_URL not configured, skipping webhook');
    return;
  }

  try {
    console.log('📤 Enviando datos a n8n webhook:', webhookUrl);
    console.log('📤 Datos a enviar:', JSON.stringify(data, null, 2));
    
    const response = await axios.post(webhookUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CareflowSurvey/1.0'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('✅ Datos enviados exitosamente a n8n:', response.status);
    console.log('📤 Respuesta de n8n:', response.data);
    
  } catch (error) {
    console.error('❌ Error enviando datos a n8n:', error);
    if ((error as any).response) {
      console.error('❌ Respuesta de error de n8n:', (error as any).response.status, (error as any).response.data);
    }
    // Don't throw error - webhook failure shouldn't break the appointment creation
  }
}

/**
 * Sanitize string for filename (remove special characters)
 */
function sanitizeFileName(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim()
    .substring(0, 50); // Limit length
}


export async function registerRoutes(app: Express): Promise<Server> {
  let objectStorageService: ObjectStorageService | null = null;
  
  try {
    objectStorageService = new ObjectStorageService();
  } catch (error) {
    console.warn("Object storage not available:", error);
  }

  // Endpoint to get presigned URL for audio upload
  app.post("/api/audio/upload-url", async (req, res) => {
    if (!objectStorageService) {
      return res.status(503).json({ error: "Object storage not configured" });
    }
    
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Error generating upload URL" });
    }
  });

  // Endpoint to transcribe audio blobs directly for drafts (no object storage URL needed)
  app.post("/api/drafts/transcribe", upload.fields([
    { name: 'servicesAudio', maxCount: 1 },
    { name: 'whatsappWorkflowAudio', maxCount: 1 },
    { name: 'firstPatientServicesAudio', maxCount: 1 },
    { name: 'doctorCalendarAudio', maxCount: 1 },
    { name: 'patientVolumeAudio', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const servicesAudio = files?.servicesAudio?.[0];
      const whatsappWorkflowAudio = files?.whatsappWorkflowAudio?.[0];
      const firstPatientServicesAudio = files?.firstPatientServicesAudio?.[0];
      const doctorCalendarAudio = files?.doctorCalendarAudio?.[0];
      const patientVolumeAudio = files?.patientVolumeAudio?.[0];

      let transcripts: {
        servicesTranscript?: string;
        whatsappWorkflowTranscript?: string;
        firstPatientServicesTranscript?: string;
        doctorCalendarTranscript?: string;
        patientVolumeTranscript?: string;
      } = {};

      if (servicesAudio || whatsappWorkflowAudio || firstPatientServicesAudio || doctorCalendarAudio || patientVolumeAudio) {
        transcripts = await transcriptionService.transcribeMultipleAudios({
          servicesAudio: servicesAudio ? new Blob([servicesAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
          whatsappWorkflowAudio: whatsappWorkflowAudio ? new Blob([whatsappWorkflowAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
          firstPatientServicesAudio: firstPatientServicesAudio ? new Blob([firstPatientServicesAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
          doctorCalendarAudio: doctorCalendarAudio ? new Blob([doctorCalendarAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
          patientVolumeAudio: patientVolumeAudio ? new Blob([patientVolumeAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
        });
      }

      return res.json({ transcripts });
    } catch (error) {
      console.error("Error transcribing draft audios:", error);
      return res.status(500).json({ error: "Error transcribing draft audios" });
    }
  });

  // Endpoint to get available calendar slots
  app.get("/api/calendar/slots", async (req, res) => {
    try {
      const { startDate, endDate, timezone = 'America/Chihuahua' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      const slots = await ghlService.getAvailableSlots(
        startDate as string,
        endDate as string,
        timezone as string
      );

      res.json(slots);
    } catch (error) {
      console.error("Error getting calendar slots:", error);
      res.status(500).json({ error: "Error getting calendar slots" });
    }
  });

  // GHL: Add tags to contact
  app.post("/api/ghl/contacts/:contactId/tags", async (req, res) => {
    try {
      const { contactId } = req.params;
      const { tags } = req.body as { tags: string[] };
      if (!contactId || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: "contactId y tags son requeridos" });
      }
      const result = await ghlService.addTagsToContact(contactId, tags);
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error adding tags in GHL:", error);
      res.status(500).json({ error: "Error adding tags" });
    }
  });

  // GHL: Remove tags from contact
  app.delete("/api/ghl/contacts/:contactId/tags", async (req, res) => {
    try {
      const { contactId } = req.params;
      const { tags } = req.body as { tags: string[] };
      if (!contactId || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ error: "contactId y tags son requeridos" });
      }
      const result = await ghlService.removeTagsFromContact(contactId, tags);
      res.json({ success: true, result });
    } catch (error) {
      console.error("Error removing tags in GHL:", error);
      res.status(500).json({ error: "Error removing tags" });
    }
  });

  // Endpoint to create an appointment
  app.post("/api/calendar/appointment", async (req, res) => {
    try {
      console.log('📅 Recibiendo solicitud de cita:', req.body);
      
      const { contactId, startTime, endTime, title, description, surveyData } = req.body;
      
      console.log('📅 Datos extraídos:', {
        contactId,
        startTime,
        endTime,
        title,
        description,
        hasSurveyData: !!surveyData
      });
      
      if (!contactId || !startTime || !endTime || !title) {
        console.error('❌ Faltan campos requeridos:', {
          contactId: !!contactId,
          startTime: !!startTime,
          endTime: !!endTime,
          title: !!title
        });
        return res.status(400).json({ 
          error: "contactId, startTime, endTime, and title are required" 
        });
      }

      console.log('📅 Creando cita en GoHighLevel...');
      
      // Create appointment in GoHighLevel
      const appointment = await ghlService.createAppointment({
        calendarId: process.env.GHL_CALENDAR_ID || '',
        contactId,
        startTime,
        endTime,
        title,
        description,
        timezone: 'America/Mexico_City' // GHL calendar is configured for GMT-6
      });

      console.log('✅ Cita creada en GoHighLevel:', appointment);

      // Remove pending tag and add completed tag in GHL
      try {
        if (contactId) {
          await ghlService.removeTagsFromContact(contactId, ['survey_pending']);
          await ghlService.addTagsToContact(contactId, ['survey_completed']);
        }
      } catch (tagError) {
        console.warn('⚠️ No se pudieron actualizar las tags en GHL:', tagError);
      }

      // Get contact information for webhook
      let contactInfo = null;
      if (contactId) {
        try {
          // Get contact details from the survey data if available, or fetch from GHL
          if (surveyData?.contactInfo) {
            contactInfo = surveyData.contactInfo;
            console.log('📋 Usando información del contacto de la encuesta:', contactInfo);
          } else {
            // Fallback: get contact info from GHL (this would require a new function)
            console.log('⚠️ No se encontró información del contacto en surveyData');
          }
        } catch (contactError) {
          console.error('⚠️ Error obteniendo información del contacto:', contactError);
          // Don't fail the appointment creation if contact info fails
        }
      }

      // If surveyData is provided, send to n8n webhook
      if (surveyData) {
        try {
          console.log('📋 Enviando datos de encuesta a n8n...');
          
          // Send data to n8n webhook with appointment details
          await sendToN8nWebhook({
            ...surveyData,
            appointment: appointment,
            contactId: contactId,
            contactInfo: contactInfo,
            scheduledDate: startTime.split('T')[0],
            scheduledTime: startTime.split('T')[1].split('-')[0],
            submittedAt: new Date().toISOString()
          });
          
        } catch (webhookError) {
          console.error("Error sending survey to n8n:", webhookError);
          // Don't fail the appointment creation if webhook fails
        }
      }

      res.json({
        ...appointment,
        surveySaved: !!surveyData
      });
    } catch (error) {
      console.error("❌ Error creating appointment:", error);
      res.status(500).json({ error: "Error creating appointment" });
    }
  });

  // Endpoint to get calendar info
  app.get("/api/calendar/info", async (req, res) => {
    try {
      const calendarInfo = await ghlService.getCalendarInfo();
      res.json(calendarInfo);
    } catch (error) {
      console.error("Error getting calendar info:", error);
      res.status(500).json({ error: "Error getting calendar info" });
    }
  });

  // Endpoint to find contact by phone
  app.post("/api/contact/find-by-phone", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const contactInfo = await ghlService.findContactIdByPhone(phone);
      
      res.json({ 
        success: true, 
        contactId: contactInfo?.id || null,
        contactInfo: contactInfo,
        found: !!contactInfo
      });
    } catch (error) {
      console.error("Error finding contact by phone:", error);
      res.status(500).json({ error: "Error finding contact by phone" });
    }
  });


  // Endpoint to serve audio files
  app.get("/objects/:fileName(*)", async (req, res) => {
    if (!objectStorageService) {
      return res.status(503).json({ error: "Object storage not configured" });
    }
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error: any) {
      console.error("Error serving audio file:", error);
      if (error.name === "ObjectNotFoundError") {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Error serving file" });
    }
  });

  // POST /api/audio/transcribe - transcribe an audio file from a given URL
  app.post("/api/audio/transcribe", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      // Download the file
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data);
      // Use a random fileName (could extract from url for debugging)
      const fileName = `transcribed-${Date.now()}.webm`;
      // Use the transcriptionService (force buffer to be accepted as Blob as in Node)
      const transcript = await transcriptionService.transcribeAudio(new Blob([buffer], { type: "audio/webm" }) as any, fileName);
      return res.json({ transcript });
    } catch (error) {
      console.error("Error transcribing audio from URL:", error);
      return res.status(500).json({ error: "Failed to transcribe audio from URL" });
    }
  });

  // Main survey submission endpoint
  app.post("/api/survey", upload.fields([
    { name: 'servicesAudio', maxCount: 1 },
    { name: 'whatsappWorkflowAudio', maxCount: 1 },
    { name: 'firstPatientServicesAudio', maxCount: 1 },
    { name: 'doctorCalendarAudio', maxCount: 1 },
    { name: 'patientVolumeAudio', maxCount: 1 }
  ]), async (req, res) => {
    try {
      // Parse addresses from JSON string
      let addresses = null;
      if (req.body.addresses) {
        try {
          addresses = JSON.parse(req.body.addresses);
        } catch (e) {
          addresses = [req.body.addresses];
        }
      }

      // Extract audio files from request
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const servicesAudio = files.servicesAudio?.[0];
      const whatsappWorkflowAudio = files.whatsappWorkflowAudio?.[0];
      const firstPatientServicesAudio = files.firstPatientServicesAudio?.[0];
      const doctorCalendarAudio = files.doctorCalendarAudio?.[0];
      const patientVolumeAudio = files.patientVolumeAudio?.[0];

      // Transcribe audio files
      let transcripts: {
        servicesTranscript?: string;
        whatsappWorkflowTranscript?: string;
        firstPatientServicesTranscript?: string;
        doctorCalendarTranscript?: string;
        patientVolumeTranscript?: string;
      } = {};
      if (servicesAudio || whatsappWorkflowAudio || firstPatientServicesAudio || doctorCalendarAudio || patientVolumeAudio) {
        try {
          transcripts = await transcriptionService.transcribeMultipleAudios({
            servicesAudio: servicesAudio ? new Blob([servicesAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
            whatsappWorkflowAudio: whatsappWorkflowAudio ? new Blob([whatsappWorkflowAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
            firstPatientServicesAudio: firstPatientServicesAudio ? new Blob([firstPatientServicesAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
            doctorCalendarAudio: doctorCalendarAudio ? new Blob([doctorCalendarAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
            patientVolumeAudio: patientVolumeAudio ? new Blob([patientVolumeAudio.buffer as unknown as ArrayBuffer], { type: 'audio/webm' }) : undefined,
          });
        } catch (transcriptionError) {
          console.error('Transcription error:', transcriptionError);
          return res.status(500).json({ error: 'Error transcribing audio files' });
        }
      }

      // Prepare survey data
      const surveyData = {
        businessName: req.body.businessName,
        managerName: req.body.managerName,
        managerWhatsapp: req.body.managerWhatsapp,
        email: req.body.email,
        servicesTranscript: transcripts.servicesTranscript || req.body.servicesTranscript || null,
        addresses: addresses,
        hasCurrentSystem: req.body.hasCurrentSystem || null,
        currentSystemDetails: req.body.currentSystemDetails || null,
        doctorCount: req.body.doctorCount || null,
        hasWebsiteFacebook: req.body.hasWebsiteFacebook || null,
        websiteFacebookUrl: req.body.websiteFacebookUrl || null,
        socialMediaCampaigns: req.body.socialMediaCampaigns === 'si' ? true : req.body.socialMediaCampaigns === 'no' ? false : null,
        patientVolume: req.body.patientVolume || null,
        newProspects: req.body.newProspects || null,
        botExpectations: req.body.botExpectations || null,
        marketingAgency: req.body.marketingAgency === 'si' ? true : req.body.marketingAgency === 'no' ? false : null,
        botName: req.body.botName,
        whatsappWorkflowTranscript: transcripts.whatsappWorkflowTranscript || req.body.whatsappWorkflowTranscript || null,
        firstPatientServicesTranscript: transcripts.firstPatientServicesTranscript || req.body.firstPatientServicesTranscript || null,
        doctorCalendarTranscript: transcripts.doctorCalendarTranscript || req.body.doctorCalendarTranscript || null,
        patientVolumeTranscript: transcripts.patientVolumeTranscript || req.body.patientVolumeTranscript || null,
        scheduledDate: req.body.scheduledDate || null,
        scheduledTime: req.body.scheduledTime || null,
      };

      // Find contact in GoHighLevel by phone
      let ghlContactId = null;
      let contactInfo = null;
      if (process.env.GHL_API_TOKEN && surveyData.managerWhatsapp) {
        try {
          contactInfo = await ghlService.findContactIdByPhone(surveyData.managerWhatsapp);
          ghlContactId = contactInfo?.id || null;
          console.log("🔍 Contacto buscado en GoHighLevel:", contactInfo ? "Encontrado" : "No encontrado");
          if (contactInfo) {
            console.log("📋 Información del contacto:", {
              id: contactInfo.id,
              firstName: contactInfo.firstName,
              lastName: contactInfo.lastName,
              contactName: contactInfo.contactName,
              phone: contactInfo.phone,
              email: contactInfo.email
            });
          }
        } catch (ghlError) {
          console.error("Error finding contact in GoHighLevel:", ghlError);
          // Don't fail the request if GHL fails
        }
      } else {
        console.warn("⚠️ GHL_API_TOKEN o managerWhatsapp no está configurado");
      }

      // Send to n8n webhook directly
      await sendToN8nWebhook({
        ...surveyData,
        ghlContactId: ghlContactId,
        contactInfo: contactInfo,
        transcripts: transcripts,
        submittedAt: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        ghlContactId: ghlContactId,
        contactInfo: contactInfo,
        message: "Encuesta procesada exitosamente y enviada a n8n.",
        transcripts: transcripts
      });
    } catch (error) {
      console.error("Error processing survey:", error);
      res.status(500).json({ error: "Error processing survey submission" });
    }
  });


  // Get contacts with "won" tag for ticket form
  app.get("/api/ghl/contacts/won", async (req, res) => {
    try {
      const { query } = req.query;
      const searchQuery = query as string | undefined;
      
      const contacts = await ghlService.getContactsByTag('won', searchQuery, 100);
      res.json({ success: true, contacts });
    } catch (error) {
      console.error("Error fetching contacts with 'won' tag:", error);
      res.status(500).json({ error: "Error fetching contacts" });
    }
  });

  // Submit ticket endpoint
  app.post("/api/tickets", upload.array('attachments', 10), async (req, res) => {
    try {
      const { categoria, clienteId, descripcion, prioridad } = req.body;
      
      // Validate required fields
      if (!categoria || !clienteId || !descripcion || !prioridad) {
        return res.status(400).json({ 
          error: "categoria, clienteId, descripcion, and prioridad are required" 
        });
      }

      // Get contact info from GHL
      let contactInfo = null;
      try {
        const contact = await ghlService.findContactIdByPhone(''); // We'll need to get by ID instead
        // For now, we'll just use the clienteId
      } catch (ghlError) {
        console.warn('⚠️ Could not fetch contact info from GHL:', ghlError);
      }

      // Process attachments
      const files = req.files as Express.Multer.File[] || [];
      
      // Prepare payload for webhook in n8n format with binary data
      // n8n expects items with json and binary fields
      const payloadItem: any = {
        json: {
          "Categoría": categoria,
          "Cliente": req.body.clienteNombre || '',
          "customerId": clienteId, // GHL contact ID
          "Descripción": descripcion,
          "Prioridad": prioridad,
          "submittedAt": new Date().toISOString(),
          "formMode": process.env.FORM_MODE || "production"
        }
      };

      // Add binary data for attachments if any
      if (files.length > 0) {
        payloadItem.binary = {};
        payloadItem.json.Adjuntos = files.map((file) => {
          const filename = file.originalname || `attachment_${Date.now()}`;
          
          // Use filename as key in binary (or a sanitized version)
          // The n8n code will match by fileName property, so we ensure it matches
          const binaryKey = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
          
          // Store binary data with fileName matching the filename in Adjuntos
          payloadItem.binary[binaryKey] = {
            data: file.buffer.toString('base64'),
            mimeType: file.mimetype || 'application/octet-stream',
            fileName: filename // This must match file.filename in Adjuntos
          };
          
          // Return the file info in the format expected by n8n code
          return {
            filename: filename,
            mimetype: file.mimetype || 'application/octet-stream',
            size: file.size
          };
        });
      } else {
        payloadItem.json.Adjuntos = null;
      }

      const payload = [payloadItem];

      // Send to n8n webhook
      const webhookUrl = process.env.N8N_TICKET_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
      
      if (webhookUrl) {
        try {
          console.log('📤 Enviando ticket a webhook:', webhookUrl);
          console.log('📤 Payload del ticket:', JSON.stringify({
            json: payload[0].json,
            binary: files.length > 0 ? `[${files.length} archivos binarios]` : 'null'
          }, null, 2));
          
          const response = await axios.post(webhookUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'CareflowTicket/1.0'
            },
            timeout: 30000 // 30 second timeout for file uploads
          });
          
          console.log('✅ Ticket enviado exitosamente al webhook:', response.status);
        } catch (webhookError) {
          console.error('❌ Error enviando ticket al webhook:', webhookError);
          if ((webhookError as any).response) {
            console.error('❌ Respuesta de error del webhook:', (webhookError as any).response.status, (webhookError as any).response.data);
          }
          // Don't fail the request if webhook fails
        }
      } else {
        console.warn('⚠️ N8N_TICKET_WEBHOOK_URL o N8N_WEBHOOK_URL no está configurado');
      }

      res.status(201).json({
        success: true,
        message: "Ticket creado exitosamente",
        ticket: payload
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Error creating ticket" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

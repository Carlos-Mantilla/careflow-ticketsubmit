import axios from 'axios';

export class GHLService {
  private apiToken: string;
  private baseUrl: string = 'https://services.leadconnectorhq.com';
  private calendarId: string;

  constructor() {
    this.apiToken = process.env.GHL_API_TOKEN || '';
    this.calendarId = process.env.GHL_CALENDAR_ID || '';
    
    if (!this.apiToken) {
      console.warn('⚠️ GHL_API_TOKEN no está configurado en las variables de entorno');
    }
    if (!this.calendarId) {
      console.warn('⚠️ GHL_CALENDAR_ID no está configurado en las variables de entorno');
    }
  }

  /**
   * Crear un contacto en GoHighLevel
   */
  async createContact(contactData: {
    businessName: string;
    managerName: string;
    managerWhatsapp: string;
    email: string;
    addresses?: string;
    hasCurrentSystem?: string;
    currentSystemDetails?: string;
    doctorCount?: string;
    hasWebsiteFacebook?: string;
    websiteFacebookUrl?: string;
    socialMediaCampaigns?: boolean;
    newProspects?: string;
    botExpectations?: string;
    marketingAgency?: boolean;
    botName?: string;
    servicesTranscript?: string;
    whatsappWorkflowTranscript?: string;
    firstPatientServicesTranscript?: string;
    doctorCalendarTranscript?: string;
    patientVolumeTranscript?: string;
  }) {
    try {
      if (!this.apiToken) {
        throw new Error('GHL_API_TOKEN no está configurado');
      }

      const response = await axios.post(
        `${this.baseUrl}/contacts/`,
        {
          name: contactData.managerName,
          email: contactData.email,
          phone: contactData.managerWhatsapp,
          companyName: contactData.businessName,
          customFields: {
            business_name: contactData.businessName,
            manager_name: contactData.managerName,
            manager_whatsapp: contactData.managerWhatsapp,
            email: contactData.email,
            addresses: contactData.addresses || '',
            has_current_system: contactData.hasCurrentSystem || '',
            current_system_details: contactData.currentSystemDetails || '',
            doctor_count: contactData.doctorCount || '',
            has_website_facebook: contactData.hasWebsiteFacebook || '',
            website_facebook_url: contactData.websiteFacebookUrl || '',
            social_media_campaigns: contactData.socialMediaCampaigns || false,
            new_prospects: contactData.newProspects || '',
            bot_expectations: contactData.botExpectations || '',
            marketing_agency: contactData.marketingAgency || false,
            bot_name: contactData.botName || '',
            services_transcript: contactData.servicesTranscript || '',
            whatsapp_workflow_transcript: contactData.whatsappWorkflowTranscript || '',
            first_patient_services_transcript: contactData.firstPatientServicesTranscript || '',
            doctor_calendar_transcript: contactData.doctorCalendarTranscript || '',
            patient_volume_transcript: contactData.patientVolumeTranscript || ''
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          }
        }
      );

      console.log('✅ Contacto creado en GHL:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando contacto en GHL:', error);
      throw error;
    }
  }

  /**
   * Crear una oportunidad en GoHighLevel
   */
  async createOpportunity(opportunityData: {
    contactId: string;
    businessName: string;
    managerName: string;
    managerWhatsapp: string;
    email: string;
    // ... otros campos
  }) {
    try {
      if (!this.apiToken) {
        throw new Error('GHL_API_TOKEN no está configurado');
      }

      const response = await axios.post(
        `${this.baseUrl}/opportunities/`,
        {
          contactId: opportunityData.contactId,
          name: `Kickoff - ${opportunityData.businessName}`,
          status: 'New',
          source: 'Survey Form',
          customFields: {
            business_name: opportunityData.businessName,
            manager_name: opportunityData.managerName,
            manager_whatsapp: opportunityData.managerWhatsapp,
            email: opportunityData.email
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          }
        }
      );

      console.log('✅ Oportunidad creada en GHL:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando oportunidad en GHL:', error);
      throw error;
    }
  }

  /**
   * Obtener slots disponibles del calendario
   */
  async getAvailableSlots(startDate: string, endDate: string, timezone: string = 'America/Chihuahua') {
    try {
      if (!this.apiToken || !this.calendarId) {
        throw new Error('GHL_API_TOKEN o GHL_CALENDAR_ID no están configurados');
      }

      const response = await axios.get(
        `${this.baseUrl}/calendars/${this.calendarId}/free-slots`,
        {
          params: {
            startDate,
            endDate,
            timezone
          },
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Version': '2021-07-28'
          }
        }
      );

      console.log('✅ Slots disponibles obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo slots disponibles:', error);
      throw error;
    }
  }

  /**
   * Crear una cita en el calendario
   */
  async createAppointment(appointmentData: {
    calendarId: string;
    contactId: string;
    startTime: string;
    endTime: string;
    title: string;
    description?: string;
    timezone?: string;
  }) {
    try {
      if (!this.apiToken) {
        throw new Error('GHL_API_TOKEN no está configurado');
      }

      console.log('📅 Creando cita en GHL con datos:', {
        calendarId: appointmentData.calendarId,
        contactId: appointmentData.contactId,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        title: appointmentData.title,
        description: appointmentData.description,
        timezone: appointmentData.timezone || 'America/Mexico_City'
      });

      const payload = {
        title: appointmentData.title,
        meetingLocationType: "gmeet",
        meetingLocationId: "default", 
        overrideLocationConfig: true,
        appointmentStatus: "confirmed",
        assignedUserId: process.env.GHL_USER_ID || '',
        description: appointmentData.description || '',
        ignoreDateRange: false,
        toNotify: false,
        ignoreFreeSlotValidation: true,
        calendarId: appointmentData.calendarId,
        locationId: process.env.GHL_LOCATION_ID || appointmentData.calendarId,
        contactId: appointmentData.contactId,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime
      };

      console.log('📅 Payload enviado a GHL:', payload);

      const response = await axios.post(
        `${this.baseUrl}/calendars/events/appointments`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Version': '2021-04-15',
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      console.log('✅ Cita creada en GHL:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando cita en GHL:', error);
      if ((error as any).response) {
        console.error('❌ Error response:', (error as any).response.data);
        console.error('❌ Error status:', (error as any).response.status);
      }
      throw error;
    }
  }

  /**
   * Add tags to a contact in GoHighLevel
   */
  async addTagsToContact(contactId: string, tags: string[]): Promise<any> {
    try {
      if (!this.apiToken) {
        throw new Error('GHL_API_TOKEN no está configurado');
      }

      const response = await axios.post(
        `${this.baseUrl}/contacts/${encodeURIComponent(contactId)}/tags`,
        { tags },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
            ...(process.env.GHL_LOCATION_ID ? { 'LocationId': process.env.GHL_LOCATION_ID } : {}),
          }
        }
      );

      console.log('✅ Tags agregados en GHL:', { contactId, tags, data: response.data });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error('❌ Error agregando tags en GHL:', error.response.status, error.response.data);
      } else {
        console.error('❌ Error agregando tags en GHL:', error);
      }
      throw error;
    }
  }

  /**
   * Remove tags from a contact in GoHighLevel
   */
  async removeTagsFromContact(contactId: string, tags: string[]): Promise<any> {
    try {
      if (!this.apiToken) {
        throw new Error('GHL_API_TOKEN no está configurado');
      }

      const response = await axios.delete(
        `${this.baseUrl}/contacts/${encodeURIComponent(contactId)}/tags`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
            ...(process.env.GHL_LOCATION_ID ? { 'LocationId': process.env.GHL_LOCATION_ID } : {}),
          },
          data: { tags }
        }
      );

      console.log('✅ Tags removidos en GHL:', { contactId, tags, data: response.data });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error('❌ Error removiendo tags en GHL:', error.response.status, error.response.data);
      } else {
        console.error('❌ Error removiendo tags en GHL:', error);
      }
      throw error;
    }
  }

  /**
   * Obtener información del calendario
   */
  async getCalendarInfo() {
    try {
      if (!this.apiToken || !this.calendarId) {
        throw new Error('GHL_API_TOKEN o GHL_CALENDAR_ID no están configurados');
      }

      const response = await axios.get(
        `${this.baseUrl}/calendars/${this.calendarId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Version': '2021-07-28'
          }
        }
      );

      console.log('✅ Información del calendario obtenida:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo información del calendario:', error);
      throw error;
    }
  }

  /**
   * Buscar contacto por teléfono en GoHighLevel usando query parameter
   */
  async findContactByPhone(phone: string) {
    try {
      if (!this.apiToken) {
        throw new Error('GHL_API_TOKEN no está configurado');
      }

      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = phone.replace(/\D/g, '');
      
      console.log('🔍 Buscando contacto con teléfono:', cleanPhone);

      // Generate different phone number variations to search for
      const phoneVariations = this.generatePhoneVariations(cleanPhone);
      
      // Try each variation until we find a match
      for (const phoneQuery of phoneVariations) {
        console.log('🔍 Probando búsqueda con:', phoneQuery);
        
        try {
          // Build URL with query parameters directly in the URL (as shown in the example)
          const locationId = process.env.GHL_LOCATION_ID || this.calendarId;
          const url = `${this.baseUrl}/contacts/?locationId=${locationId}&query=${phoneQuery}&limit=2`;
          
          console.log('🌐 URL de búsqueda:', url);
          
          const response = await axios.get(url, {
            headers: {
              'Accept': 'application/json',
              'Version': '2021-07-28',
              'Authorization': `Bearer ${this.apiToken}`
            }
          });

          console.log('📞 Respuesta de búsqueda de contactos:', response.data);

          // Search for contact by phone in the results
          if (response.data.contacts && response.data.contacts.length > 0) {
            console.log('📞 Total de contactos encontrados:', response.data.contacts.length);
            
            const foundContact = response.data.contacts.find((contact: any) => {
              if (!contact.phone) return false;
              
              // Clean the contact's phone number
              const contactPhone = contact.phone.replace(/\D/g, '');
              
              console.log('🔍 Comparando:', {
                buscando: cleanPhone,
                contacto: contactPhone,
                contactoOriginal: contact.phone,
                contactoNombre: contact.contactName
              });
              
              // Check if phones match using our comprehensive matching logic
              const matches = this.phoneNumbersMatch(cleanPhone, contactPhone);
              
              if (matches) {
                console.log('✅ Teléfono coincide:', contact.phone);
              }
              
              return matches;
            });

            if (foundContact) {
              console.log('✅ Contacto encontrado:', {
                id: foundContact.id,
                name: foundContact.contactName,
                phone: foundContact.phone,
                email: foundContact.email
              });
              return foundContact;
            }
          }
        } catch (queryError) {
          console.log('⚠️ Error con query específica, probando siguiente variación:', (queryError as Error).message);
          continue; // Try next variation
        }
      }

      console.log('❌ No se encontró contacto con teléfono:', phone);
      return null;
    } catch (error) {
      console.error('❌ Error buscando contacto por teléfono:', error);
      throw error;
    }
  }

  /**
   * Generate different phone number variations for searching
   */
  private generatePhoneVariations(cleanPhone: string): string[] {
    const variations: string[] = [];
    
    // Original number
    variations.push(cleanPhone);
    
    // Add +52 prefix (Mexico country code)
    variations.push(`+52${cleanPhone}`);
    variations.push(`52${cleanPhone}`);
    
    // If number starts with 52, try without it
    if (cleanPhone.startsWith('52')) {
      variations.push(cleanPhone.substring(2));
    }
    
    // If number doesn't start with 52, try adding it
    if (!cleanPhone.startsWith('52')) {
      variations.push(`52${cleanPhone}`);
    }
    
    // Handle Mexican mobile numbers with 1 prefix (like +5216611126239)
    if (cleanPhone.length === 10) {
      // Add 1 prefix for mobile numbers
      variations.push(`1${cleanPhone}`);
      variations.push(`+521${cleanPhone}`);
      variations.push(`521${cleanPhone}`);
    }
    
    // If number starts with 1, try without it
    if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
      variations.push(cleanPhone.substring(1));
    }
    
    // Remove duplicates and encode for URL
    const uniqueVariations = Array.from(new Set(variations));
    return uniqueVariations.map(variation => {
      // Encode + as %2B for URL query parameter
      return variation.replace(/\+/g, '%2B');
    });
  }

  /**
   * Check if two phone numbers match considering different formats
   */
  private phoneNumbersMatch(searchPhone: string, contactPhone: string): boolean {
    // Direct match
    if (searchPhone === contactPhone) return true;
    
    // Remove country codes and compare
    const searchWithoutCountry = searchPhone.replace(/^52/, '').replace(/^1/, '');
    const contactWithoutCountry = contactPhone.replace(/^52/, '').replace(/^1/, '');
    
    if (searchWithoutCountry === contactWithoutCountry) return true;
    
    // Try adding country codes
    if (`52${searchPhone}` === contactPhone) return true;
    if (`1${searchPhone}` === contactPhone) return true;
    if (`521${searchPhone}` === contactPhone) return true;
    
    if (`52${contactPhone}` === searchPhone) return true;
    if (`1${contactPhone}` === searchPhone) return true;
    if (`521${contactPhone}` === searchPhone) return true;
    
    return false;
  }

  /**
   * Buscar contacto por teléfono y obtener información básica
   */
  async findContactIdByPhone(phone: string) {
    try {
      const contact = await this.findContactByPhone(phone);
      if (contact) {
        return {
          id: contact.id,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          contactName: contact.contactName || '',
          phone: contact.phone || '',
          email: contact.email || '',
          companyName: contact.companyName || null, // Agregar companyName
          customFields: contact.customFields || [] // Agregar customFields completo
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo información del contacto por teléfono:', error);
      throw error;
    }
  }

  /**
   * Obtener contactos con un tag específico
   * Implementa paginación para obtener todos los contactos
   * Si hay searchQuery, filtra en el servidor después de obtener todos los contactos
   */
  async getContactsByTag(tag: string, searchQuery?: string, limit: number = 100) {
    try {
      if (!this.apiToken) {
        throw new Error('GHL_API_TOKEN no está configurado');
      }

      const locationId = process.env.GHL_LOCATION_ID || this.calendarId;
      const allContacts: any[] = [];
      let hasMorePages = true;
      let startAfter: string | undefined = undefined;
      let startAfterId: string | undefined = undefined;
      let pageNumber = 1;

      console.log('🔍 Buscando contactos con tag:', tag, 'searchQuery:', searchQuery);

      // Siempre buscar solo por tag, sin combinar con searchQuery
      // El searchQuery se aplicará después en el filtrado del servidor
      while (hasMorePages) {
        const params: any = {
          locationId,
          limit,
          query: tag, // Solo usar el tag en la query de GHL
        };

        // Agregar parámetros de paginación si existen
        if (startAfter) {
          params.startAfter = startAfter;
        }
        if (startAfterId) {
          params.startAfterId = startAfterId;
        }

        const url = `${this.baseUrl}/contacts/`;
        const queryString = new URLSearchParams(params).toString();
        
        console.log(`📄 Obteniendo página ${pageNumber}...`);

        const response = await axios.get(`${url}?${queryString}`, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Accept': 'application/json',
            'Version': '2021-07-28',
            ...(locationId ? { 'LocationId': locationId } : {}),
          }
        });

        const contacts = response.data.contacts || [];
        const meta = response.data.meta || {};

        console.log(`📋 Página ${pageNumber}: ${contacts.length} contactos obtenidos`);

        // Filtrar contactos que tengan el tag especificado (por si acaso)
        const filteredContacts = contacts.filter((contact: any) => {
          const tags = contact.tags || [];
          return tags.some((contactTag: any) => {
            // Handle both string tags and object tags (with name property)
            const tagName = typeof contactTag === 'string' 
              ? contactTag 
              : contactTag?.name || contactTag?.tag || '';
            return tagName.toLowerCase() === tag.toLowerCase();
          });
        });

        allContacts.push(...filteredContacts);

        // Verificar si hay más páginas
        if (meta.nextPageUrl || (meta.startAfter && meta.startAfterId)) {
          startAfter = meta.startAfter;
          startAfterId = meta.startAfterId;
          pageNumber++;
          console.log(`➡️ Hay más páginas. Continuando...`);
        } else {
          hasMorePages = false;
          console.log(`✅ No hay más páginas. Total obtenido: ${allContacts.length} contactos`);
        }
      }

      console.log(`✅ Total: ${allContacts.length} contactos encontrados con tag "${tag}"`);

      // Si hay un searchQuery, filtrar ANTES de mapear para buscar en todos los campos originales
      let contactsToMap = allContacts;
      if (searchQuery && searchQuery.trim()) {
        const normalizeString = (value: string) =>
          value
            .toLowerCase()
            .normalize("NFD")
            // Remove combining diacritical marks without requiring Unicode flags
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        const query = normalizeString(searchQuery);
        const tokens = query.split(/\s+/).filter(Boolean);
        const beforeFilter = allContacts.length;
        
        // Filtrar en el objeto original de GHL para buscar en TODOS los campos posibles
        contactsToMap = allContacts.filter((contact: any) => {
          // Buscar en todos los campos posibles del contacto original
          const searchableFields = [
            contact.contactName,
            contact.name,
            contact.firstName,
            contact.lastName,
            contact.email,
            contact.phone,
            contact.companyName,
            // También buscar en campos anidados si existen
            contact.customFields ? JSON.stringify(contact.customFields) : '',
          ].filter(Boolean);

          const searchableText = normalizeString(searchableFields.join(" "));
          
          // Para mejorar la coincidencia parcial, asegurarnos de que todos los tokens aparezcan
          return tokens.every((token) => searchableText.includes(token));
        });
        
        console.log(`🔍 Filtrado por "${searchQuery}": ${beforeFilter} → ${contactsToMap.length} contactos`);
        
        // Log de ejemplo para debug (solo si hay resultados)
        if (contactsToMap.length > 0 && contactsToMap.length < 5) {
          console.log('📋 Contactos encontrados:', contactsToMap.map((c: any) => ({
            id: c.id,
            contactName: c.contactName || c.name,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
          })));
        }
      }

      // Mapear a formato simplificado
      let mappedContacts = contactsToMap.map((contact: any) => ({
        id: contact.id,
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        contactName: contact.contactName || contact.name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        companyName: contact.companyName || '',
      }));

      return mappedContacts;
    } catch (error) {
      console.error('❌ Error obteniendo contactos por tag:', error);
      if ((error as any).response) {
        console.error('❌ Error response:', (error as any).response.status, (error as any).response.data);
      }
      throw error;
    }
  }

  /**
   * Enviar datos a GHL después de completar la encuesta
   */
  async processSurveyData(surveyData: any) {
    try {
      // Crear contacto
      const contact = await this.createContact(surveyData);
      
      // Crear oportunidad
      const opportunity = await this.createOpportunity({
        contactId: contact.id,
        ...surveyData
      });

      return {
        contact,
        opportunity
      };
    } catch (error) {
      console.error('❌ Error procesando datos de encuesta en GHL:', error);
      throw error;
    }
  }
}

export const ghlService = new GHLService();

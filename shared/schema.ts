import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Draft surveys for save/resume functionality
export const draftSurveys = pgTable("draft_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  formData: jsonb("form_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDraftSurveySchema = createInsertSchema(draftSurveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDraftSurvey = z.infer<typeof insertDraftSurveySchema>;
export type DraftSurvey = typeof draftSurveys.$inferSelect;

// Survey responses table
export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic business information
  businessName: text("business_name").notNull(),
  managerName: text("manager_name").notNull(),
  managerWhatsapp: text("manager_whatsapp").notNull(),
  email: text("email").notNull(),
  
  // Business details
  servicesTranscript: text("services_transcript"),
  addresses: jsonb("addresses"),
  hasCurrentSystem: text("has_current_system"),
  currentSystemDetails: text("current_system_details"),
  doctorCount: text("doctor_count"),
  hasWebsiteFacebook: text("has_website_facebook"),
  websiteFacebookUrl: text("website_facebook_url"),
  
  // Marketing and operations
  socialMediaCampaigns: boolean("social_media_campaigns"),
  patientVolume: text("patient_volume"),
  patientVolumeTranscript: text("patient_volume_transcript"),
  newProspects: text("new_prospects"),
  botExpectations: text("bot_expectations"),
  
  // Agency and naming
  marketingAgency: boolean("marketing_agency"),
  botName: text("bot_name").notNull(),
  
  // Transcripts
  whatsappWorkflowTranscript: text("whatsapp_workflow_transcript"),
  firstPatientServicesTranscript: text("first_patient_services_transcript"),
  doctorCalendarTranscript: text("doctor_calendar_transcript"),
  
  // Scheduling
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  ghlContactId: text("ghl_contact_id"), // Add GHL contact ID field
  
  // Metadata
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  sentToN8n: boolean("sent_to_n8n").default(false),
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  submittedAt: true,
  sentToN8n: true,
});

export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

// QA Survey tables
export const careflowQasurveyResponses = pgTable("careflow_qasurvey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doctorName: text("doctor_name").notNull(),
  doctorEmail: text("doctor_email").notNull(),
  doctorWhatsapp: text("doctor_whatsapp"),
  businessName: text("business_name"),
  botName: text("bot_name"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  sentToN8n: boolean("sent_to_n8n").default(false),
});

export const careflowQasurveyItems = pgTable("careflow_qasurvey_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: varchar("response_id").notNull().references(() => careflowQasurveyResponses.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQasurveyResponseSchema = createInsertSchema(careflowQasurveyResponses).omit({
  id: true,
  submittedAt: true,
  sentToN8n: true,
});

export type InsertQasurveyResponse = z.infer<typeof insertQasurveyResponseSchema>;
export type QasurveyResponse = typeof careflowQasurveyResponses.$inferSelect;
export type QasurveyItem = typeof careflowQasurveyItems.$inferSelect;

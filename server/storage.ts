import { type SurveyResponse, type InsertSurveyResponse, type DraftSurvey, type InsertDraftSurvey } from "@shared/schema";
import { supabase } from "./db";

// Helper function to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper function to convert object keys from camelCase to snake_case
function keysToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToSnakeCase);
  if (typeof obj !== 'object') return obj;
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

// Helper function to convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper function to convert object keys from snake_case to camelCase
function keysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamelCase);
  if (typeof obj !== 'object') return obj;
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = keysToCamelCase(value);
  }
  return result;
}

export interface IStorage {
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyResponse(id: string): Promise<SurveyResponse | undefined>;
  updateSurveyResponse(id: string, updates: Partial<SurveyResponse>): Promise<SurveyResponse>;
  getAllSurveyResponses(): Promise<SurveyResponse[]>;
  
  saveDraft(draft: InsertDraftSurvey): Promise<DraftSurvey>;
  getDraftByEmail(email: string): Promise<DraftSurvey | undefined>;
  updateDraft(id: string, draft: Partial<DraftSurvey>): Promise<DraftSurvey>;
  deleteDraft(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const dbData = keysToSnakeCase(response);
    const { data, error } = await supabase
      .from('survey_responses')
      .insert(dbData)
      .select()
      .single();
    
    if (error) throw error;
    return keysToCamelCase(data) as SurveyResponse;
  }

  async getSurveyResponse(id: string): Promise<SurveyResponse | undefined> {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    return keysToCamelCase(data) as SurveyResponse;
  }

  async updateSurveyResponse(id: string, updates: Partial<SurveyResponse>): Promise<SurveyResponse> {
    const dbData = keysToSnakeCase(updates);
    const { data, error } = await supabase
      .from('survey_responses')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return keysToCamelCase(data) as SurveyResponse;
  }

  async getAllSurveyResponses(): Promise<SurveyResponse[]> {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(keysToCamelCase) as SurveyResponse[];
  }

  async saveDraft(draft: InsertDraftSurvey): Promise<DraftSurvey> {
    const existing = await this.getDraftByEmail(draft.email);
    
    if (existing) {
      return await this.updateDraft(existing.id, {
        currentStep: draft.currentStep,
        formData: draft.formData,
        updatedAt: new Date(),
      });
    }
    
    const dbData = keysToSnakeCase(draft);
    const { data, error } = await supabase
      .from('draft_surveys')
      .insert(dbData)
      .select()
      .single();
    
    if (error) throw error;
    return keysToCamelCase(data) as DraftSurvey;
  }

  async getDraftByEmail(email: string): Promise<DraftSurvey | undefined> {
    const { data, error } = await supabase
      .from('draft_surveys')
      .select('*')
      .eq('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined; // Not found
      throw error;
    }
    if (!data) return undefined;
    return keysToCamelCase(data) as DraftSurvey;
  }

  async updateDraft(id: string, updates: Partial<DraftSurvey>): Promise<DraftSurvey> {
    const dbData = keysToSnakeCase({
      ...updates,
      updatedAt: updates.updatedAt || new Date(),
    });
    const { data, error } = await supabase
      .from('draft_surveys')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return keysToCamelCase(data) as DraftSurvey;
  }

  async deleteDraft(id: string): Promise<void> {
    const { error } = await supabase
      .from('draft_surveys')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export const storage = new DatabaseStorage();

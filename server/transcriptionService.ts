import 'dotenv/config';
import OpenAI from 'openai';
import { ObjectStorageService } from './objectStorage';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class TranscriptionService {
  private openai: OpenAI;
  private objectStorage: ObjectStorageService;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY must be set in environment variables');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.objectStorage = new ObjectStorageService();
  }

  async transcribeAudio(audioBlob: Blob, fileName: string): Promise<string> {
    let tempFilePath: string | null = null;
    
    try {
      // Convert Blob to Buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`Transcribing audio: ${fileName}, size: ${buffer.length} bytes`);

      // Create temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      tempFilePath = path.join(tempDir, `${uuidv4()}.webm`);
      fs.writeFileSync(tempFilePath, buffer);

      // Create File object from the temporary file
      const audioFile = fs.createReadStream(tempFilePath) as any;
      audioFile.name = fileName;
      audioFile.type = 'audio/webm';

      console.log(`Created temp file: ${tempFilePath}`);

      // Transcribe using Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'es', // Spanish
        response_format: 'text',
      });

      console.log(`Transcription completed for ${fileName}: "${transcription}"`);
      return transcription as string;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Try without language specification
      try {
        console.log('Retrying without language specification...');
        if (!tempFilePath) {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const tempDir = path.join(process.cwd(), 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          tempFilePath = path.join(tempDir, `${uuidv4()}.webm`);
          fs.writeFileSync(tempFilePath, buffer);
        }

        const audioFile = fs.createReadStream(tempFilePath) as any;
        audioFile.name = fileName;
        audioFile.type = 'audio/webm';

        const transcription = await this.openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          response_format: 'text',
        });

        console.log(`Transcription completed (retry) for ${fileName}: "${transcription}"`);
        return transcription as string;
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
        throw new Error(`Failed to transcribe audio: ${(error as Error).message}`);
      }
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          console.log(`Cleaned up temp file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
      }
    }
  }

  async transcribeMultipleAudios(audioData: {
    servicesAudio?: Blob;
    whatsappWorkflowAudio?: Blob;
    firstPatientServicesAudio?: Blob;
    doctorCalendarAudio?: Blob;
    patientVolumeAudio?: Blob;
  }): Promise<{
    servicesTranscript?: string;
    whatsappWorkflowTranscript?: string;
    firstPatientServicesTranscript?: string;
    doctorCalendarTranscript?: string;
    patientVolumeTranscript?: string;
  }> {
    const results: any = {};

    try {
      // Transcribe services audio (optional)
      if (audioData.servicesAudio) {
        results.servicesTranscript = await this.transcribeAudio(
          audioData.servicesAudio, 
          'services-audio.webm'
        );
      }

      // Transcribe WhatsApp workflow audio (required)
      if (audioData.whatsappWorkflowAudio) {
        results.whatsappWorkflowTranscript = await this.transcribeAudio(
          audioData.whatsappWorkflowAudio, 
          'whatsapp-workflow-audio.webm'
        );
      }

      // Transcribe first patient services audio (required)
      if (audioData.firstPatientServicesAudio) {
        results.firstPatientServicesTranscript = await this.transcribeAudio(
          audioData.firstPatientServicesAudio, 
          'first-patient-services-audio.webm'
        );
      }

      // Transcribe doctor calendar audio (conditional)
      if (audioData.doctorCalendarAudio) {
        results.doctorCalendarTranscript = await this.transcribeAudio(
          audioData.doctorCalendarAudio, 
          'doctor-calendar-audio.webm'
        );
      }

      // Transcribe patient volume audio (required)
      if (audioData.patientVolumeAudio) {
        results.patientVolumeTranscript = await this.transcribeAudio(
          audioData.patientVolumeAudio, 
          'patient-volume-audio.webm'
        );
      }

      return results;
    } catch (error) {
      console.error('Error transcribing multiple audios:', error);
      throw error as Error;
    }
  }
}

export const transcriptionService = new TranscriptionService();

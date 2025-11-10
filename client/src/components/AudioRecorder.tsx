import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, RotateCcw } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  existingAudio?: Blob | null;
}

export function AudioRecorder({ onRecordingComplete, existingAudio }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(existingAudio || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update audioBlob when existingAudio changes
  useEffect(() => {
    setAudioBlob(existingAudio || null);
  }, [existingAudio]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setDuration(recordingTime);
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("No se pudo acceder al micrófono. Por favor, permite el acceso al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const playAudio = () => {
    if (audioBlob) {
      if (!audioRef.current) {
        audioRef.current = new Audio(URL.createObjectURL(audioBlob));
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setPlaybackTime(0);
          if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        };
      }
      
      audioRef.current.play();
      setIsPlaying(true);
      
      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(Math.floor(audioRef.current.currentTime));
        }
      }, 100);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
  };

  const resetRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioBlob(null);
    setIsPlaying(false);
    setRecordingTime(0);
    setPlaybackTime(0);
    setDuration(0);
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-8">
      {!audioBlob ? (
        <>
          <div className="relative">
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              size="icon"
              variant={isRecording ? "destructive" : "default"}
              className={`h-24 w-24 rounded-full ${isRecording ? 'animate-pulse-ring' : ''}`}
              data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
            >
              {isRecording ? (
                <Square className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </Button>
          </div>
          
          {isRecording && (
            <div className="text-center space-y-2 animate-fade-in">
              <p className="text-2xl font-semibold text-destructive">
                {formatTime(recordingTime)}
              </p>
              <p className="text-sm text-muted-foreground">Grabando...</p>
            </div>
          )}
          
          {!isRecording && (
            <p className="text-muted-foreground text-center">
              Toca el botón para comenzar a grabar
            </p>
          )}
        </>
      ) : (
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <div className="flex items-center justify-center space-x-4">
            <Button
              type="button"
              onClick={isPlaying ? pauseAudio : playAudio}
              size="icon"
              variant="default"
              className="h-16 w-16 rounded-full"
              data-testid={isPlaying ? "button-pause-audio" : "button-play-audio"}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>
            
            <Button
              type="button"
              onClick={resetRecording}
              size="icon"
              variant="outline"
              className="h-16 w-16 rounded-full"
              data-testid="button-reset-recording"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(playbackTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Audio grabado correctamente
          </p>
        </div>
      )}
    </div>
  );
}

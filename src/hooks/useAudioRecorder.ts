import { useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';

export interface UseAudioRecorderResult {
  isRecording: boolean;
  recordingTime: number;
  audioData: string | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
  clearRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioData, setAudioData] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async (): Promise<boolean> => {
    if (Platform.OS !== 'web') {
      console.warn('Audio recording is optimized for Web platform in this setup.');
      return false;
    }

    try {
      setAudioData(null);
      chunksRef.current = [];
      setRecordingTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm' // Standard format supported widely on chrome/mac browsers
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Get chunks every 250ms
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      return false;
    }
  };

  const stopRecording = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setAudioData(base64String);
          setIsRecording(false);
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          resolve(base64String);
        };

        reader.onerror = () => {
          setIsRecording(false);
          resolve(null);
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  };

  const clearRecording = () => {
    setAudioData(null);
    setRecordingTime(0);
    setIsRecording(false);
    chunksRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  return {
    isRecording,
    recordingTime,
    audioData,
    startRecording,
    stopRecording,
    clearRecording
  };
}

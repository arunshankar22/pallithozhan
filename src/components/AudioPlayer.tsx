import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { ThemedText } from './themed-text';
import { getGlassStyle } from '@/app/sharedTypes';

interface AudioPlayerProps {
  voiceUrl: string;
  colors: any;
  isDark?: boolean;
  compact?: boolean;
}

export function AudioPlayer({ voiceUrl, colors, isDark = false, compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Standard browser audio object instantiation
    const audio = new Audio(voiceUrl);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onCanPlay = () => {
      setLoading(false);
    };

    const onWaiting = () => {
      setLoading(true);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('ended', onEnded);

    // Try to load duration
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('ended', onEnded);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [voiceUrl]);

  const updateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.paused) {
        setIsPlaying(false);
      } else {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }).catch(err => {
        console.warn('Playback failed:', err);
      });
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Waveform bars
  const waveBarsCount = compact ? 12 : 24;
  
  return (
    <View style={[
      styles.playerContainer,
      getGlassStyle(colors.cardBg || 'rgba(255, 255, 255, 0.4)', isDark, 0.45, 15),
      { borderColor: colors.border }
    ]}>
      {/* Control Button */}
      <Pressable
        onPress={handlePlayPause}
        style={({ pressed }) => [
          styles.playBtn,
          { backgroundColor: isPlaying ? colors.secondary : colors.primary, opacity: pressed ? 0.8 : 1 }
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : isPlaying ? (
          <Pause size={14} color="#FFF" fill="#FFF" />
        ) : (
          <Play size={14} color="#FFF" fill="#FFF" style={{ marginLeft: 2 }} />
        )}
      </Pressable>

      {/* Scrubber & Waveform visualizer */}
      <View style={styles.waveWrapper}>
        <View style={styles.waveBarContainer}>
          {Array.from({ length: waveBarsCount }).map((_, idx) => {
            const barProgress = (idx / waveBarsCount) * 100;
            const isCompleted = percentage >= barProgress;
            
            // Generate some nice heights for a mock waveform
            const baseHeight = 4 + Math.sin(idx * 0.5) * 8 + Math.cos(idx * 0.3) * 6 + 12;
            const pulseHeight = isPlaying ? baseHeight + (Math.sin(Date.now() / 150 + idx) * 3) : baseHeight;
            const finalHeight = Math.max(4, Math.min(24, pulseHeight));

            return (
              <View
                key={idx}
                style={[
                  styles.waveBar,
                  {
                    height: compact ? finalHeight * 0.7 : finalHeight,
                    backgroundColor: isCompleted 
                      ? (isPlaying ? colors.secondary : colors.primary) 
                      : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                  }
                ]}
              />
            );
          })}
        </View>

        {/* Progress bar background slider */}
        <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
          <View style={[
            styles.progressBarFill, 
            { 
              width: `${percentage}%`, 
              backgroundColor: isPlaying ? colors.secondary : colors.primary 
            }
          ]} />
        </View>
      </View>

      {/* Time indicators */}
      <View style={styles.timeWrapper}>
        <ThemedText style={[styles.timeText, { color: colors.textSecondary }]}>
          {formatTime(currentTime)}
        </ThemedText>
        <ThemedText style={[styles.timeText, { color: colors.textSecondary }]}>
          {formatTime(duration)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginVertical: 4,
    minHeight: 48,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'flex-start',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveWrapper: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  waveBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 2,
    opacity: 0.85,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
  },
  progressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  timeWrapper: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 32,
  },
  timeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

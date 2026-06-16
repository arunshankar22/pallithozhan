import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// Dynamically import expo-video only on native platforms to prevent build errors on Web.
let useVideoPlayer: any;
let VideoView: any;

if (Platform.OS !== 'web') {
  try {
    const expoVideo = require('expo-video');
    useVideoPlayer = expoVideo.useVideoPlayer;
    VideoView = expoVideo.VideoView;
  } catch (e) {
    console.warn('Failed to load expo-video:', e);
  }
}

interface VideoPlayerProps {
  url: string;
  style?: any;
  onPlayingStateChange?: (isPlaying: boolean) => void;
}

export function VideoPlayer({ url, style, onPlayingStateChange }: VideoPlayerProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <video
          src={url}
          controls
          playsInline
          onPlay={() => onPlayingStateChange?.(true)}
          onPause={() => onPlayingStateChange?.(false)}
          onEnded={() => onPlayingStateChange?.(false)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', backgroundColor: '#000' }}
        />
      </View>
    );
  }

  // Native mobile rendering using expo-video
  if (useVideoPlayer && VideoView) {
    return <NativeVideoView url={url} style={style} onPlayingStateChange={onPlayingStateChange} />;
  }

  // Fallback if expo-video fails to load
  return (
    <View style={[styles.fallback, style]} />
  );
}

function NativeVideoView({ 
  url, 
  style, 
  onPlayingStateChange 
}: { 
  url: string; 
  style?: any; 
  onPlayingStateChange?: (isPlaying: boolean) => void;
}) {
  try {
    const player = useVideoPlayer(url, (playerInstance: any) => {
      playerInstance.loop = false;
      playerInstance.playsInteractiveHeaders = true;
    });

    React.useEffect(() => {
      const subscription = player.addListener('playingChange', (event: any) => {
        const isPlaying = event?.isPlaying ?? false;
        onPlayingStateChange?.(isPlaying);
      });
      const endSubscription = player.addListener('playToEnd', () => {
        onPlayingStateChange?.(false);
      });
      return () => {
        subscription.remove();
        endSubscription.remove();
      };
    }, [player, onPlayingStateChange]);

    return (
      <VideoView
        player={player}
        style={[styles.video, style]}
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
      />
    );
  } catch (err) {
    console.warn('Failed to initialize native VideoPlayer:', err);
    return <View style={[styles.fallback, style]} />;
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  fallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
});

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface LiveCameraFeedHandle {
  captureFrame: () => Promise<string | null>;
}

interface LiveCameraFeedProps {
  onPermissionGranted?: () => void;
  facing?: 'back' | 'front';
}

// ─── Native Camera Renderer (Android & iOS) ──────────────────────────────────
// Uses Expo Camera exclusively. ARCore path has been removed.

const NativeCameraViewRenderer = forwardRef<
  LiveCameraFeedHandle,
  { facing: 'back' | 'front'; onPermissionGranted?: () => void }
>(({ facing, onPermissionGranted }, ref) => {
  const cameraRef = useRef<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // ── Permission check on mount ─────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const checkAndRequestPermission = async () => {
      try {
        // First check existing permission status
        const existing = await Camera.getCameraPermissionsAsync();
        if (existing.granted) {
          if (isMounted) {
            setHasPermission(true);
            setIsChecking(false);
            onPermissionGranted?.();
          }
          return;
        }

        // Not yet granted — request it
        const result = await Camera.requestCameraPermissionsAsync();
        if (isMounted) {
          setHasPermission(result.granted);
          setIsChecking(false);
          if (result.granted) {
            onPermissionGranted?.();
          }
        }
      } catch (err) {
        console.warn('[LiveCameraFeed] Permission error:', err);
        if (isMounted) {
          setHasPermission(false);
          setIsChecking(false);
        }
      }
    };

    checkAndRequestPermission();
    return () => { isMounted = false; };
  }, []);

  // ── Capture guard ─────────────────────────────────────────────────────────
  const isCapturingRef = useRef(false);
  const lastErrorLogRef = useRef(0);

  useImperativeHandle(ref, () => ({
    captureFrame: async () => {
      if (isCapturingRef.current) return null;
      if (!cameraRef.current) return null;

      isCapturingRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.35,       // Low quality = small payload for Gemini
          skipProcessing: true, // Faster capture
          shutterSound: false,  // Prevent "click" sound on Android
        });
        return photo?.base64 ?? null;
      } catch (e: any) {
        const now = Date.now();
        // Rate-limit error logs to once per 2 s to avoid spamming
        if (now - lastErrorLogRef.current > 2000) {
          console.warn('[LiveCameraFeed] captureFrame error:', e?.message ?? e);
          lastErrorLogRef.current = now;
        }
        return null;
      } finally {
        isCapturingRef.current = false;
      }
    },
  }));

  // ── Manual re-request handler ─────────────────────────────────────────────
  const handleRequestPermission = async () => {
    try {
      const result = await Camera.requestCameraPermissionsAsync();
      setHasPermission(result.granted);
      if (result.granted) {
        onPermissionGranted?.();
      }
    } catch (e) {
      console.warn('[LiveCameraFeed] Permission request error:', e);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (isChecking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF671F" />
        <Text style={styles.loadingText}>Initializing camera...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ fontSize: 44, marginBottom: 16 }}>📹</Text>
        <Text style={styles.errorTitle}>Camera Permission Required</Text>
        <Text style={styles.errorSub}>
          RailIo AI Navigation requires camera access for live visual guidance.
        </Text>
        <TouchableOpacity style={styles.grantBtn} onPress={handleRequestPermission}>
          <Text style={styles.grantBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <CameraView
      ref={cameraRef}
      style={StyleSheet.absoluteFillObject}
      facing={facing}
    />
  );
});

// ─── Error Boundary ───────────────────────────────────────────────────────────

export class LiveCameraFeedErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('[LiveCameraFeed] Error caught by boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Camera unavailable</Text>
          <Text style={styles.errorSub}>Please restart the app and try again.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Public LiveCameraFeed Component ─────────────────────────────────────────

export const LiveCameraFeed = forwardRef<LiveCameraFeedHandle, LiveCameraFeedProps>(
  ({ onPermissionGranted, facing = 'back' }, ref) => {
    // ── Web platform (browser) ──────────────────────────────────────────────
    const [webStream, setWebStream] = useState<MediaStream | null>(null);
    const [webError, setWebError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(Platform.OS === 'web');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const nativeRef = useRef<LiveCameraFeedHandle | null>(null);

    useEffect(() => {
      if (Platform.OS === 'web') {
        initWebCamera();
      }
      return () => {
        if (webStream) {
          webStream.getTracks().forEach((t) => t.stop());
        }
      };
    }, [facing]);

    useEffect(() => {
      if (Platform.OS === 'web' && videoRef.current && webStream) {
        videoRef.current.srcObject = webStream;
        videoRef.current.play().catch(() => {});
      }
    }, [webStream]);

    const initWebCamera = async () => {
      setIsInitializing(true);
      setWebError(null);
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          if (webStream) webStream.getTracks().forEach((t) => t.stop());
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facing === 'back' ? { ideal: 'environment' } : 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
          setWebStream(stream);
          setIsInitializing(false);
          onPermissionGranted?.();
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        } else {
          setWebError('MediaDevices API not available.');
          setIsInitializing(false);
        }
      } catch (err: any) {
        setWebError(err?.message ?? 'Camera access denied.');
        setIsInitializing(false);
      }
    };

    // ── captureFrame works for both Web and Native ──────────────────────────
    useImperativeHandle(ref, () => ({
      captureFrame: async () => {
        if (Platform.OS === 'web') {
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = Math.min(800, videoRef.current.videoWidth);
              canvas.height = Math.round(
                canvas.width * (videoRef.current.videoHeight / videoRef.current.videoWidth)
              );
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                return dataUrl.split(',')[1] ?? null;
              }
            } catch (err) {
              console.warn('[LiveCameraFeed] Web frame capture error:', err);
            }
          }
          return null;
        }
        // Native — delegate to NativeCameraViewRenderer
        return nativeRef.current?.captureFrame() ?? null;
      },
    }));

    // ── Web render ──────────────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      if (isInitializing) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF671F" />
            <Text style={styles.loadingText}>Initializing camera...</Text>
          </View>
        );
      }
      if (webError) {
        return (
          <View style={styles.centerContainer}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>📷</Text>
            <Text style={styles.errorTitle}>Camera Permission Required</Text>
            <Text style={styles.errorSub}>{webError}</Text>
            <TouchableOpacity style={styles.grantBtn} onPress={initWebCamera}>
              <Text style={styles.grantBtnText}>Grant Camera Access</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={StyleSheet.absoluteFillObject}>
          {/* @ts-ignore — web video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
        </View>
      );
    }

    // ── Native mobile render ────────────────────────────────────────────────
    return (
      <LiveCameraFeedErrorBoundary>
        <NativeCameraViewRenderer
          ref={nativeRef}
          facing={facing}
          onPermissionGranted={onPermissionGranted}
        />
      </LiveCameraFeedErrorBoundary>
    );
  }
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 2,
  },
  loadingText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    fontFamily: 'monospace',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  grantBtn: {
    backgroundColor: '#FF671F',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  grantBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

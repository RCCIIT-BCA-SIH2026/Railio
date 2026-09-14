import { positionEstimator } from './PositionEstimator';
import { MotionFusionEngine, MovementMode as EngineMovementMode, MotionState } from './MotionFusionEngine';
import { haversineDistanceMeters } from '../../utils/RailwayMatcher';
import { Accelerometer } from 'expo-sensors';
import { PermissionsAndroid, Platform, Linking, AppState, AppStateStatus } from 'react-native';

export type MovementMode = 'walking' | 'running' | 'train' | 'vehicle' | 'station' | 'indoor' | 'unknown' | 'transition' | 'train_stopped';
export type LiveNavStatus =
  | 'navigating'
  | 'arrived'
  | 'paused'
  | 'signal_lost'
  | 'idle'
  | 'waiting_for_gps'
  | 'waiting_for_first_fix'
  | 'location_permission_required'
  | 'location_services_disabled'
  | 'destination_unavailable';

export interface NavigationDataHealth {
  hasDestination: boolean;
  hasValidDestinationCoordinates: boolean;
  hasCurrentLocation: boolean;
  gpsWatcherActive: boolean;
  hasRecentGpsFix: boolean;
  distanceAvailable: boolean;
  speedAvailable: boolean;
  etaAvailable: boolean;
  locationPermission?: 'granted' | 'denied' | 'undetermined';
  locationServicesEnabled?: boolean;
}

export interface LiveNavigationState {
  isNavigating: boolean;
  isFullScreen?: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    altitude?: number;
    timestamp?: number;
  } | null;
  destination: {
    latitude: number;
    longitude: number;
    name?: string;
  } | null;
  speedKmh: number | null;
  derivedSpeedKmh?: number | null;
  rawGpsSpeedKmh?: number | null;
  remainingDistanceMeters: number | null;
  etaSeconds: number | null;
  bearing?: number;
  accuracyMeters?: number;
  lastGpsFixTimestamp?: number;
  progressPercent: number;
  movementMode: MovementMode;
  status: LiveNavStatus;
  
  locationPermission?: 'granted' | 'denied' | 'undetermined';
  locationServicesEnabled?: boolean;
  
  dataHealth: NavigationDataHealth;
  motionDebug?: MotionState;
}

export function isValidCoordinate(latitude?: number | null, longitude?: number | null): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function isValidLocation(location: any): boolean {
  if (!location) return false;
  const lat = location.coords?.latitude ?? location.latitude;
  const lng = location.coords?.longitude ?? location.longitude;
  const ts = location.timestamp ?? Date.now();
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Number.isFinite(ts) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function getExpoLocationModule(): any {
  try {
    // Check if NativeModules or global.expo.modules contains ExpoLocation before requiring
    const { NativeModules } = require('react-native');
    const globalExpoModules = typeof global !== 'undefined' ? (global as any).expo?.modules : null;

    const isNativeLocationAvailable = !!(
      (NativeModules && (NativeModules.ExpoLocation || NativeModules.ExpoLocationModule)) ||
      (globalExpoModules && (globalExpoModules.ExpoLocation || globalExpoModules.Location))
    );

    if (!isNativeLocationAvailable) {
      console.log('[NAV][EXPO_LOCATION] Native ExpoLocation module binary not present in runtime. Safe fallback to Geolocation API.');
      return null;
    }

    const Location = require('expo-location');
    if (Location && (typeof Location.getCurrentPositionAsync === 'function' || typeof Location.watchPositionAsync === 'function')) {
      return Location;
    }
  } catch (e) {
    console.warn('[NAV][EXPO_LOCATION] Native module check failed, falling back to Geolocation:', e);
  }
  return null;
}

type Subscriber = (state: LiveNavigationState) => void;

class LiveNavigationService {
  private state: LiveNavigationState = this.getInitialState();
  private subscribers: Set<Subscriber> = new Set();
  
  private locationSubscription: any = null;
  private gpsWatchId: number | null = null;
  private indoorPoseUnsubscribe: (() => void) | null = null;
  private accelSubscription: any = null;
  private isRequestingPermission: boolean = false;
  
  private initialDistanceMeters: number = 0;
  private motionEngine = new MotionFusionEngine();
  
  private arrivalThresholds: Record<MovementMode, number> = {
    walking: 15,
    running: 15,
    vehicle: 25,
    train: 50,
    train_stopped: 50,
    station: 25,
    indoor: 5,
    unknown: 15,
    transition: 15,
  };

  constructor() {
    this.setupAppStateListener();
  }

  private setupAppStateListener() {
    try {
      AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && this.state.isNavigating && this.state.locationPermission !== 'granted') {
          console.log('[NAV][APP_STATE] App returned to foreground. Performing passive permission check...');
          if (Platform.OS === 'android') {
            const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).catch(() => false);
            if (alreadyGranted) {
              console.log('[NAV][APP_STATE] Passive check confirmed Android location permission granted! Starting GPS watcher...');
              this.state.locationPermission = 'granted';
              this.startGpsTracking();
            }
          }
        }
      });
    } catch (e) {}
  }

  private getInitialState(): LiveNavigationState {
    return {
      isNavigating: false,
      currentLocation: null,
      destination: null,
      speedKmh: null,
      derivedSpeedKmh: null,
      rawGpsSpeedKmh: null,
      remainingDistanceMeters: null,
      etaSeconds: null,
      progressPercent: 0,
      movementMode: 'unknown',
      status: 'idle',
      locationPermission: 'undetermined',
      locationServicesEnabled: true,
      dataHealth: {
        hasDestination: false,
        hasValidDestinationCoordinates: false,
        hasCurrentLocation: false,
        gpsWatcherActive: false,
        hasRecentGpsFix: false,
        distanceAvailable: false,
        speedAvailable: false,
        etaAvailable: false,
        locationPermission: 'undetermined',
        locationServicesEnabled: true,
      },
    };
  }

  public getState(): LiveNavigationState {
    return this.state;
  }

  public subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    for (const sub of this.subscribers) {
      sub({ ...this.state });
    }
  }

  private computeDataHealth(): NavigationDataHealth {
    const hasDestination = this.state.destination !== null;
    const hasValidDestinationCoordinates = hasDestination && isValidCoordinate(this.state.destination?.latitude, this.state.destination?.longitude);
    const hasCurrentLocation = this.state.currentLocation !== null && isValidCoordinate(this.state.currentLocation?.latitude, this.state.currentLocation?.longitude);
    const gpsWatcherActive = this.gpsWatchId !== null || this.locationSubscription !== null;
    const now = Date.now();
    const hasRecentGpsFix = hasCurrentLocation && (this.state.lastGpsFixTimestamp ? (now - this.state.lastGpsFixTimestamp) < 30000 : false);
    const distanceAvailable = this.state.remainingDistanceMeters !== null;
    const speedAvailable = this.state.speedKmh !== null;
    const etaAvailable = this.state.etaSeconds !== null;

    return {
      hasDestination,
      hasValidDestinationCoordinates,
      hasCurrentLocation,
      gpsWatcherActive,
      hasRecentGpsFix,
      distanceAvailable,
      speedAvailable,
      etaAvailable,
      locationPermission: this.state.locationPermission,
      locationServicesEnabled: this.state.locationServicesEnabled,
    };
  }

  public async openSystemSettings(): Promise<void> {
    try {
      console.log('[NAV][SETTINGS] Opening system settings for location permission...');
      await Linking.openSettings();
    } catch (err) {
      console.warn('[NAV][SETTINGS] Failed to open system settings:', err);
    }
  }

  public async requestGpsPermissionAndStart(): Promise<void> {
    console.log('[NAV][PERMISSION_REQUEST] Requesting GPS location tracking...');
    await this.startGpsTracking();
  }

  public openFullScreen() {
    if (!this.state.isNavigating) {
      this.startLiveTrackingWithoutDestination();
    }
    this.state.isFullScreen = true;
    this.notifySubscribers();
  }

  public closeFullScreen() {
    this.state.isFullScreen = false;
    this.notifySubscribers();
  }

  public toggleFullScreen() {
    if (!this.state.isNavigating) {
      this.startLiveTrackingWithoutDestination();
      this.state.isFullScreen = true;
    } else {
      this.state.isFullScreen = !this.state.isFullScreen;
    }
    this.notifySubscribers();
  }

  public startLiveTrackingWithoutDestination() {
    console.log('[NAV][START_NO_DEST] Starting live GPS & Motion Tracking without target destination...');
    this.motionEngine = new MotionFusionEngine();
    this.initialDistanceMeters = 0;

    this.state = {
      ...this.getInitialState(),
      isNavigating: true,
      destination: null,
      remainingDistanceMeters: null,
      etaSeconds: null,
      progressPercent: 0,
      movementMode: 'station',
      status: 'waiting_for_gps',
      isFullScreen: this.state.isFullScreen ?? false,
    };

    this.requestGpsPermissionAndStart().catch((err: any) => {
      console.warn('[NAV][START_NAV] Error requesting GPS:', err);
      this.startWebGpsTracking();
    });
    this.startIndoorTracking();
    this.startMotionTracking();
    this.notifySubscribers();
  }

  public startNavigation(
    destination: { latitude: number; longitude: number; name?: string },
    mode: MovementMode = 'walking'
  ) {
    console.log('[NAV][START]', {
      name: destination?.name,
      latitude: destination?.latitude,
      longitude: destination?.longitude,
      mode,
    });

    if (this.state.isNavigating) {
      if (
        this.state.destination &&
        this.state.destination.latitude === destination?.latitude &&
        this.state.destination.longitude === destination?.longitude &&
        (this.locationSubscription !== null || this.gpsWatchId !== null)
      ) {
        console.log('[NAV][START] Already navigating to identical destination. Maintaining active GPS session.');
        return;
      }
      this.stopNavigation();
    }

    if (!destination || !isValidCoordinate(destination.latitude, destination.longitude)) {
      console.warn('[NAV][DESTINATION] Invalid coordinates provided:', destination);
      this.state = {
        ...this.getInitialState(),
        isNavigating: true,
        destination: destination ? { latitude: destination.latitude, longitude: destination.longitude, name: destination.name } : null,
        movementMode: mode,
        status: 'destination_unavailable',
      };
      this.state.dataHealth = this.computeDataHealth();
      this.notifySubscribers();
      return;
    }

    this.motionEngine = new MotionFusionEngine();
    this.initialDistanceMeters = 0;

    this.state = {
      ...this.getInitialState(),
      isNavigating: true,
      destination: {
        latitude: destination.latitude,
        longitude: destination.longitude,
        name: destination.name || 'Destination',
      },
      movementMode: mode,
      status: 'waiting_for_gps',
    };

    this.state.dataHealth = this.computeDataHealth();

    this.requestGpsPermissionAndStart().catch((err: any) => {
      console.warn('[NAV][START_NAV] Error requesting GPS:', err);
      this.startWebGpsTracking();
    });
    this.startIndoorTracking();
    this.startMotionTracking();
    this.notifySubscribers();
  }

  public setInvalidDestination(name?: string) {
    console.warn('[NAV][DESTINATION] Destination unavailable:', name);
    this.state = {
      ...this.getInitialState(),
      isNavigating: true,
      destination: name ? { latitude: NaN, longitude: NaN, name } : null,
      status: 'destination_unavailable',
    };
    this.state.dataHealth = this.computeDataHealth();
    this.notifySubscribers();
  }

  public retryGps() {
    console.log('[NAV][LOCATION_PERMISSION] User manually triggered Allow GPS / Retry');
    this.state.status = 'waiting_for_gps';
    this.notifySubscribers();
    this.requestGpsPermissionAndStart().catch((err: any) => {
      console.warn('[NAV][RETRY_GPS] Error:', err);
      this.startWebGpsTracking();
    });
  }

  public stopNavigation() {
    console.log('[NAV][STOP_NAVIGATION]');
    this.stopGpsTracking();
    this.stopIndoorTracking();
    this.stopMotionTracking();
    
    this.state = {
      ...this.getInitialState(),
      isNavigating: false,
      status: 'idle',
    };
    this.notifySubscribers();
  }

  private syncEngineState() {
    const engineState = this.motionEngine.getState();
    this.state.speedKmh = engineState.speedKmh;
    this.state.derivedSpeedKmh = engineState.derivedSpeedKmh;
    this.state.rawGpsSpeedKmh = engineState.rawSpeedKmh;
    this.state.movementMode = engineState.mode.toLowerCase() as MovementMode;
    this.state.motionDebug = engineState;

    console.log('[NAV][SPEED]', {
      rawSpeedKmh: engineState.rawSpeedKmh,
      derivedSpeedKmh: engineState.derivedSpeedKmh,
      smoothedSpeedKmh: engineState.speedKmh,
    });

    this.updateEtaAndProgress();
    this.checkArrival();
    this.state.dataHealth = this.computeDataHealth();

    console.log('[NAV][ETA]', { etaSeconds: this.state.etaSeconds });
    console.log('[NAV][STATE]', this.state);

    this.notifySubscribers();
  }

  private startMotionTracking() {
    try {
      Accelerometer.setUpdateInterval(500);
      this.accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
        if (!this.state.isNavigating || this.state.status === 'arrived') return;
        
        this.motionEngine.addObservation({
          timestamp: Date.now(),
          accelerometer: { x, y, z }
        });
        
        this.syncEngineState();
      });
    } catch (err) {
      console.warn('[NAV][ACCEL] Accelerometer tracking error:', err);
    }
  }

  private stopMotionTracking() {
    if (this.accelSubscription) {
      try {
        this.accelSubscription.remove();
      } catch (e) {}
      this.accelSubscription = null;
    }
  }

  private async startGpsTracking(): Promise<void> {
    console.log('[NAV][GPS_START]', {
      navigationActive: this.state.isNavigating,
    });

    const LocationModule = getExpoLocationModule();

    if (LocationModule) {
      try {
        // 1. Location Services Check
        let servicesEnabled = true;
        if (typeof LocationModule.hasServicesEnabledAsync === 'function') {
          servicesEnabled = await LocationModule.hasServicesEnabledAsync().catch((err: any) => {
            console.warn('[NAV][LOCATION_SERVICES_CHECK_ERROR]', err);
            return true;
          });
        }

        console.log('[NAV][LOCATION_SERVICES_CHECK]', { servicesEnabled });
        this.state.locationServicesEnabled = servicesEnabled;

        if (!servicesEnabled) {
          console.warn('[NAV][LOCATION_SERVICES_DISABLED]');
          this.state.status = 'location_services_disabled';
          this.state.dataHealth = this.computeDataHealth();
          this.notifySubscribers();
          return;
        }

        // 2. Foreground Location Permission Request
        console.log('[NAV][PERMISSION_REQUEST]');
        let permResult: any = {
          granted: true,
          status: 'granted',
          canAskAgain: true,
          expires: 'never',
        };

        if (typeof LocationModule.requestForegroundPermissionsAsync === 'function') {
          permResult = await LocationModule.requestForegroundPermissionsAsync().catch((err: any) => {
            console.warn('[NAV][PERMISSION_ERROR]', err);
            return {
              granted: false,
              status: 'denied',
              canAskAgain: false,
              expires: 'never',
            };
          });
        }

        console.log('[NAV][PERMISSION_RESULT]', {
          status: permResult.status,
          granted: permResult.granted,
          canAskAgain: permResult.canAskAgain,
        });

        this.state.locationPermission = permResult.granted ? 'granted' : 'denied';

        if (!permResult.granted) {
          console.warn('[NAV][GPS_PERMISSION_DENIED]', {
            status: permResult.status,
            canAskAgain: permResult.canAskAgain,
          });
          this.state.status = 'location_permission_required';
          this.state.dataHealth = this.computeDataHealth();
          this.notifySubscribers();
          return;
        }

        this.state.status = 'waiting_for_first_fix';
        this.state.dataHealth = this.computeDataHealth();
        this.notifySubscribers();

        // 3. Request Immediate First Location Fix
        try {
          console.log('[NAV][FIRST_FIX_REQUEST]');
          const initialPos = await LocationModule.getCurrentPositionAsync({
            accuracy: LocationModule.Accuracy ? LocationModule.Accuracy.High : 4,
          }).catch(async () => {
            return (LocationModule.getLastKnownPositionAsync ? await LocationModule.getLastKnownPositionAsync().catch(() => null) : null);
          });

          if (initialPos && initialPos.coords) {
            console.log('[NAV][FIRST_FIX_SUCCESS]', {
              latitude: initialPos.coords.latitude,
              longitude: initialPos.coords.longitude,
              accuracy: initialPos.coords.accuracy,
              speed: initialPos.coords.speed,
              timestamp: initialPos.timestamp,
            });
            this.handleLocationUpdate({
              coords: {
                latitude: initialPos.coords.latitude,
                longitude: initialPos.coords.longitude,
                accuracy: initialPos.coords.accuracy ?? 10,
                speed: initialPos.coords.speed ?? null,
                heading: initialPos.coords.heading ?? null,
                altitude: initialPos.coords.altitude ?? null,
              },
              timestamp: initialPos.timestamp,
            });
          } else {
            console.warn('[NAV][FIRST_FIX_PENDING] Initial fix returned null, awaiting continuous watcher...');
          }
        } catch (err: any) {
          console.warn('[NAV][GPS_FIRST_FIX_ERROR]', { code: err?.code, message: err?.message });
        }

        // 4. Continuous Location Watcher
        if (this.locationSubscription) {
          console.log('[NAV][GPS_WATCHER_ALREADY_ACTIVE]');
          return;
        }

        this.locationSubscription = await LocationModule.watchPositionAsync(
          {
            accuracy: LocationModule.Accuracy ? LocationModule.Accuracy.High : 4,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (location: any) => {
            if (location && location.coords) {
              console.log('[NAV][GPS_UPDATE]', {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                speed: location.coords.speed,
                timestamp: location.timestamp,
              });
              this.handleLocationUpdate({
                coords: {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  accuracy: location.coords.accuracy ?? 10,
                  speed: location.coords.speed ?? null,
                  heading: location.coords.heading ?? null,
                  altitude: location.coords.altitude ?? null,
                },
                timestamp: location.timestamp,
              });
            }
          }
        ).catch((err: any) => {
          console.warn('[NAV][GPS_ERROR]', { code: err?.code, message: err?.message });
          return null;
        });

        if (this.locationSubscription) {
          console.log('[NAV][GPS_WATCHER_CREATED]', { watcherActive: true });
          this.state.dataHealth = this.computeDataHealth();
          this.notifySubscribers();
          return;
        }
      } catch (err: any) {
        console.warn('[NAV][GPS_ERROR] Location setup error:', { code: err?.code, message: err?.message });
      }
    }

    // Fallback to Geolocation API if native Expo Location module is missing in Expo Go
    await this.startWebGpsTracking();
  }

  private async startWebGpsTracking() {
    if (this.isRequestingPermission) {
      console.log('[NAV][LOCATION_PERMISSION] Permission request already in progress, skipping concurrent call.');
      return;
    }

    this.isRequestingPermission = true;

    try {
      // 1. Android Permission Check FIRST via PermissionsAndroid.check
      if (Platform.OS === 'android') {
        try {
          const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          console.log('[NAV][LOCATION_PERMISSION] Android PermissionsAndroid.check result:', alreadyGranted);

          if (alreadyGranted) {
            this.state.locationPermission = 'granted';
          } else {
            console.log('[NAV][LOCATION_PERMISSION] Requesting Android ACCESS_FINE_LOCATION permission via PermissionsAndroid.request...');
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              {
                title: 'RailIo Location Permission',
                message: 'RailIo needs access to your location to track train speed, platform distance, and live ETA.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              }
            );
            console.log('[NAV][ANDROID_PERM_RESULT]', granted);

            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              console.warn('[NAV][GPS_PERMISSION_DENIED] Android Location permission denied by user:', granted);
              this.state.locationPermission = 'denied';
              this.state.status = 'location_permission_required';
              this.state.dataHealth = this.computeDataHealth();
              this.notifySubscribers();
              return;
            }

            this.state.locationPermission = 'granted';
          }
        } catch (err) {
          console.warn('[NAV][ANDROID_PERM_ERROR]', err);
        }
      } else {
        this.state.locationPermission = 'granted';
      }

      const geo = typeof navigator !== 'undefined' && navigator.geolocation ? navigator.geolocation : (global as any)?.navigator?.geolocation;

      if (geo) {
        console.log('[NAV][GPS_START] Geolocation Watcher requested');
        this.state.locationServicesEnabled = true;
        this.state.status = 'waiting_for_first_fix';
        this.state.dataHealth = this.computeDataHealth();
        this.notifySubscribers();

        try {
          geo.getCurrentPosition(
            (pos: any) => {
              console.log('[NAV][FIRST_FIX_SUCCESS] Initial geolocation fix received:', pos?.coords);
              if (pos && pos.coords) {
                this.handleLocationUpdate(pos);
              }
            },
            (err: any) => {
              console.warn('[NAV][GPS_ERROR] Initial geolocation fix error:', { code: err?.code, message: err?.message });
              if (this.state.status === 'waiting_for_first_fix' || this.state.status === 'waiting_for_gps') {
                if (err?.code === 1) {
                  this.state.status = 'location_permission_required';
                  this.state.locationPermission = 'denied';
                } else {
                  this.state.status = 'waiting_for_gps';
                }
                this.state.dataHealth = this.computeDataHealth();
                this.notifySubscribers();
              }
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 5000 }
          );

          if (this.gpsWatchId === null) {
            this.gpsWatchId = geo.watchPosition(
              (pos: any) => {
                console.log('[NAV][GPS_UPDATE] Geolocation watcher fix received:', pos?.coords);
                if (pos && pos.coords) {
                  this.handleLocationUpdate(pos);
                }
              },
              (err: any) => {
                console.warn('[NAV][GPS_ERROR] Geolocation watcher error:', { code: err?.code, message: err?.message });
                if (err?.code === 1) {
                  this.state.status = 'location_permission_required';
                  this.state.locationPermission = 'denied';
                }
                this.state.dataHealth = this.computeDataHealth();
                this.notifySubscribers();
              },
              { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
            );
          }

          if (this.gpsWatchId !== null) {
            console.log('[NAV][GPS_WATCHER_CREATED]', { watcherActive: true, watchId: this.gpsWatchId });
            this.state.dataHealth = this.computeDataHealth();
            this.notifySubscribers();
          }
        } catch (err: any) {
          console.warn('[NAV][GPS_ERROR] Geolocation API execution error:', err);
        }
      } else {
        console.warn('[NAV][GPS_ERROR] Geolocation API unavailable on device');
        this.state.status = 'waiting_for_gps';
        this.state.dataHealth = this.computeDataHealth();
        this.notifySubscribers();
      }
    } finally {
      this.isRequestingPermission = false;
    }
  }

  private stopGpsTracking() {
    console.log('[NAV][GPS_STOP]');
    if (this.locationSubscription) {
      try {
        if (typeof this.locationSubscription.remove === 'function') {
          this.locationSubscription.remove();
        }
      } catch (e) {}
      this.locationSubscription = null;
    }
    if (this.gpsWatchId !== null) {
      const geo = typeof navigator !== 'undefined' && navigator.geolocation ? navigator.geolocation : (global as any)?.navigator?.geolocation;
      if (geo && typeof geo.clearWatch === 'function') {
        try {
          geo.clearWatch(this.gpsWatchId);
        } catch (e) {}
      }
      this.gpsWatchId = null;
    }
  }

  private startIndoorTracking() {
    let lastDistanceWalked = positionEstimator.getPose()?.distanceWalkedMeters || 0;
    
    this.indoorPoseUnsubscribe = (() => {
       const timer = setInterval(() => {
         if (!this.state.isNavigating || this.state.status === 'arrived') return;
         
         const pose = positionEstimator.getPose();
         if (!pose) return;
         
         const dx = pose.distanceWalkedMeters - lastDistanceWalked;
         if (dx > 0.1) {
            lastDistanceWalked = pose.distanceWalkedMeters;
            if (this.state.remainingDistanceMeters !== null) {
              this.state.remainingDistanceMeters = Math.max(0, this.state.remainingDistanceMeters - dx);
            }
            this.updateEtaAndProgress();
            this.checkArrival();
            this.notifySubscribers();
         }
       }, 1000);
       return () => clearInterval(timer);
    })();
  }

  private stopIndoorTracking() {
    if (this.indoorPoseUnsubscribe) {
      this.indoorPoseUnsubscribe();
      this.indoorPoseUnsubscribe = null;
    }
  }

  public handleLocationUpdate(pos: GeolocationPosition | { coords: { latitude: number; longitude: number; accuracy?: number; speed?: number | null; heading?: number | null; altitude?: number | null }; timestamp?: number }) {
    if (!this.state.isNavigating || this.state.status === 'arrived') return;

    const coords = pos.coords;
    const latitude = coords.latitude;
    const longitude = coords.longitude;
    const accuracy = coords.accuracy ?? 10;
    const rawSpeed = coords.speed;
    const gpsSpeedMps = rawSpeed !== undefined && rawSpeed !== null && rawSpeed >= 0 && Number.isFinite(rawSpeed) ? rawSpeed : undefined;
    const heading = coords.heading !== undefined && coords.heading !== null && !isNaN(coords.heading) ? coords.heading : undefined;
    const timestamp = pos.timestamp ?? Date.now();

    if (!isValidCoordinate(latitude, longitude)) {
      console.warn('[NAV][GPS_UPDATE_IGNORED] Invalid coordinate fix:', latitude, longitude);
      return;
    }

    const firstFix = !this.state.currentLocation;
    this.state.currentLocation = {
      latitude,
      longitude,
      altitude: coords.altitude ?? undefined,
      timestamp,
    };
    this.state.accuracyMeters = accuracy;
    this.state.lastGpsFixTimestamp = timestamp;
    if (heading !== undefined) {
      this.state.bearing = heading;
    }

    if (this.state.status === 'waiting_for_gps' || this.state.status === 'waiting_for_first_fix') {
      this.state.status = 'navigating';
    }

    console.log('[NAV][GPS_UPDATE_SUCCESS]', {
      latitude,
      longitude,
      accuracy,
      speedMps: gpsSpeedMps,
      timestamp,
      isFirstFix: firstFix,
    });

    // Add observation to MotionFusionEngine
    this.motionEngine.addObservation({
      timestamp,
      latitude,
      longitude,
      gpsSpeedMps,
      gpsAccuracyMeters: accuracy,
      bearingDegrees: heading,
    });

    // Pure direct distance calculation from current GPS to destination
    if (this.state.destination && isValidCoordinate(this.state.destination.latitude, this.state.destination.longitude)) {
      const distMeters = haversineDistanceMeters(
        latitude,
        longitude,
        this.state.destination.latitude,
        this.state.destination.longitude
      );

      const roundedDist = Math.round(distMeters);
      this.state.remainingDistanceMeters = roundedDist;

      console.log('[NAV][DISTANCE]', {
        remainingDistanceMeters: roundedDist,
        latitude,
        longitude,
        destLat: this.state.destination.latitude,
        destLng: this.state.destination.longitude,
      });

      if (this.initialDistanceMeters === 0 || firstFix) {
        this.initialDistanceMeters = roundedDist;
      }
    }

    this.syncEngineState();
  }

  private prevEtaSeconds: number | null = null;

  private updateEtaAndProgress() {
    if (this.initialDistanceMeters > 0 && this.state.remainingDistanceMeters !== null) {
      const traveled = this.initialDistanceMeters - this.state.remainingDistanceMeters;
      const pct = (traveled / this.initialDistanceMeters) * 100;
      this.state.progressPercent = Math.min(100, Math.max(0, Math.round(pct)));
    } else {
      this.state.progressPercent = 0;
    }

    if (this.state.remainingDistanceMeters === null) {
      this.state.etaSeconds = null;
      this.prevEtaSeconds = null;
      return;
    }

    if (this.state.remainingDistanceMeters <= 5) {
      this.state.etaSeconds = 0;
      this.prevEtaSeconds = 0;
      return;
    }

    // Mode-aware speed floor to prevent ETA spikes during platform stops or slow crawls
    const isTrainMode = this.state.movementMode === 'train' || (this.state.movementMode as string) === 'train_stopped' || (this.state.movementMode as string) === 'TRAIN' || (this.state.movementMode as string) === 'TRAIN_STOPPED';
    
    let defaultSpeedKmh = isTrainMode ? 35 : 4.5;
    let currentSpeedKmh = this.state.speedKmh && this.state.speedKmh > 0.8 ? this.state.speedKmh : 0;

    let effectiveSpeedKmh = currentSpeedKmh > 0.8 ? currentSpeedKmh : defaultSpeedKmh;

    if (isTrainMode && currentSpeedKmh > 0 && currentSpeedKmh < 10) {
      // Train slow crawl / platform stop transition: maintain realistic suburban train average speed (25-35 km/h)
      effectiveSpeedKmh = 30;
    }

    const speedMps = (effectiveSpeedKmh / 3.6);
    const rawEtaSeconds = Math.round(this.state.remainingDistanceMeters / speedMps);

    // Apply EMA hysteresis smoothing to ETA countdown to prevent wild jumping
    if (this.prevEtaSeconds !== null && this.prevEtaSeconds > 0) {
      const smoothedEta = Math.round(this.prevEtaSeconds * 0.75 + rawEtaSeconds * 0.25);
      // Bound max rate of jump to +/- 10 seconds per update
      const maxDelta = 10;
      const boundedEta = Math.max(
        this.prevEtaSeconds - maxDelta,
        Math.min(this.prevEtaSeconds + maxDelta, smoothedEta)
      );
      this.state.etaSeconds = boundedEta;
      this.prevEtaSeconds = boundedEta;
    } else {
      this.state.etaSeconds = rawEtaSeconds;
      this.prevEtaSeconds = rawEtaSeconds;
    }
  }

  private checkArrival() {
    if (this.state.remainingDistanceMeters === null) return;
    const threshold = this.arrivalThresholds[this.state.movementMode] || 15;
    if (this.state.remainingDistanceMeters <= threshold) {
      this.state.status = 'arrived';
      this.state.progressPercent = 100;
      this.state.remainingDistanceMeters = 0;
      this.state.etaSeconds = 0;
      this.prevEtaSeconds = 0;
      this.stopGpsTracking();
      this.stopMotionTracking();
    }
  }
}

export const liveNavigationService = new LiveNavigationService();

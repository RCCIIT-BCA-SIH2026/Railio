import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Compass,
  Layers,
  Maximize2,
  Info,
  X,
  Activity,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Primary & Secondary LocationIQ API Keys
const LOCATIONIQ_KEY =
  process.env.EXPO_PUBLIC_LOCATIONIQ_SECONDARY_API_KEY ||
  process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY ||
  process.env.EXPO_PUBLIC_LOCATION_API_KEY ||
  'v1.public.eyJqdGkiOiI6ODI2NjIzOC0zNTAwLTQxMzctYTU2My1iNjE1NTM0ZWNlNTcifQYyrO0SdAmqOLmLmbbku8684dq5loHRoZhMfIbDN_HbHzsv0LeA5sFHtAT0fq2K0Gpi1fxogiTOjfGrz3am1FEqugznQWo-1MzZ-9fX5Qhn0QVSZM6htB58phVciJxLAbfUf_up7sl34EuToywbCDj_5dj7_4XRz0Ksll1KyfiQZS2ZrVeRZRl523REqMxnk0JyL2B4GJ64AQMHIscVYy2pGViXdOVkyToh_P8Uw-vPR3hsqx7TFJMGSinz_rPGxVl8-iw1dhyBjaz4IwLih-tc-12dK1tdJ4zsy-qiu9naA-zrEq3Q4s4YotNjal7aA5JAv-57Cg7IEaT4Bztmq1g.N2IyNTQ2ODQtOWE1YS00MmI2LTkyOTItMGJlNGMxODU1Mzc2';

export interface StationData {
  code: string;
  name: string;
  km: number;
  lat: number;
  lng: number;
  platforms: number;
  isJn?: boolean;
  details?: string;
}

export const CORRIDOR_STATIONS: StationData[] = [
  {
    code: 'SDAH',
    name: 'Sealdah Terminal',
    km: 0,
    lat: 22.5674,
    lng: 88.3712,
    platforms: 21,
    isJn: true,
    details: 'Eastern Railway HQ • 21 Platforms • Major Suburban Hub',
  },
  {
    code: 'BNXR',
    name: 'Bidhan Nagar Rd',
    km: 4,
    lat: 22.5938,
    lng: 88.3842,
    platforms: 4,
    isJn: false,
    details: 'High Density Commuter Exchange • 4 Platforms',
  },
  {
    code: 'DDJ',
    name: 'Dum Dum Jn',
    km: 7,
    lat: 22.6221,
    lng: 88.3773,
    platforms: 5,
    isJn: true,
    details: 'Suburban & Kolkata Metro Line 1 Interchange',
  },
  {
    code: 'BARN',
    name: 'Baranagar Rd',
    km: 12,
    lat: 22.6455,
    lng: 88.3735,
    platforms: 2,
    isJn: false,
    details: 'Suburban Line Station • BT Road Access',
  },
  {
    code: 'DAKE',
    name: 'Dakshineswar',
    km: 14,
    lat: 22.6548,
    lng: 88.3662,
    platforms: 4,
    isJn: false,
    details: 'River Hooghly Bridge Approach & Metro Hub',
  },
  {
    code: 'BLYG',
    name: 'Bally Ghat',
    km: 16,
    lat: 22.6534,
    lng: 88.3620,
    platforms: 2,
    isJn: false,
    details: 'Suburban Station • River Hooghly Ghat Access',
  },
  {
    code: 'BLYH',
    name: 'Bally Halt',
    km: 18,
    lat: 22.6575,
    lng: 88.3585,
    platforms: 2,
    isJn: false,
    details: 'Howrah-Bandel Line Overhead Interchange',
  },
  {
    code: 'RCD',
    name: 'Rajchandrapur',
    km: 22,
    lat: 22.6680,
    lng: 88.3310,
    platforms: 2,
    isJn: false,
    details: 'Dankuni Chord Suburban Station',
  },
  {
    code: 'DKAE',
    name: 'Dankuni Jn',
    km: 28,
    lat: 22.6842,
    lng: 88.3005,
    platforms: 5,
    isJn: true,
    details: 'Howrah-Sealdah Freight & Suburban Rail Junction',
  },
];

// UP Line Track Polyline (Sealdah -> Dankuni)
const UP_TRACK_PATH: [number, number][] = [
  [22.5674, 88.3712], // SDAH
  [22.5805, 88.3775],
  [22.5938, 88.3842], // BNXR
  [22.6085, 88.3822],
  [22.6221, 88.3773], // DDJ
  [22.6345, 88.3752],
  [22.6455, 88.3735], // BARN
  [22.6508, 88.3698],
  [22.6548, 88.3662], // DAKE (Dakshineswar)
  [22.6534, 88.3620], // BLYG (Bally Ghat)
  [22.6575, 88.3585], // BLYH (Bally Halt)
  [22.6680, 88.3310], // RCD (Rajchandrapur)
  [22.6842, 88.3005], // DKAE (Dankuni Jn)
];

// DOWN Line Track Polyline (Dankuni -> Sealdah, slightly offset)
const DOWN_TRACK_PATH: [number, number][] = UP_TRACK_PATH.map(([lat, lng]) => [
  lat - 0.0006,
  lng + 0.0006,
]);

interface Props {
  activeTrainNumber?: string;
  trainName?: string;
  liveSpeed?: number;
  currentSection?: string;
  delayMinutes?: number;
  isUpTrain?: boolean;
  trackProgressPct?: number;
  realGpsCoords?: {
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number | null;
    isReal: boolean;
  } | null;
}

export const LiveInteractiveCorridorMap: React.FC<Props> = ({
  activeTrainNumber = '32211',
  trainName = 'Sealdah - Dankuni Local',
  liveSpeed = 37.3,
  currentSection = 'DKAE-SDAH-SUB1',
  delayMinutes = 0,
  isUpTrain = true,
  trackProgressPct = 42,
  realGpsCoords = null,
}) => {
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [showTelemetryPopup, setShowTelemetryPopup] = useState<boolean>(false);
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);

  // Compute live train lat/lng based on props or real device GPS
  const currentTrainCoords = useMemo(() => {
    if (realGpsCoords?.isReal) {
      return { lat: realGpsCoords.lat, lng: realGpsCoords.lng };
    }
    const path = isUpTrain ? UP_TRACK_PATH : [...DOWN_TRACK_PATH].reverse();
    const totalSegs = path.length - 1;
    const clampedPct = Math.min(100, Math.max(0, trackProgressPct));
    const indexFloat = (clampedPct / 100) * totalSegs;
    const baseIdx = Math.floor(indexFloat);
    const fraction = indexFloat - baseIdx;

    if (baseIdx >= totalSegs) {
      return { lat: path[totalSegs][0], lng: path[totalSegs][1] };
    }
    const p1 = path[baseIdx];
    const p2 = path[baseIdx + 1];
    return {
      lat: p1[0] + (p2[0] - p1[0]) * fraction,
      lng: p1[1] + (p2[1] - p1[1]) * fraction,
    };
  }, [trackProgressPct, realGpsCoords, isUpTrain]);

  // Generate Leaflet HTML Shell ONCE per mapStyle to PREVENT RE-CREATING DOM/FLASHING
  const leafletHtml = useMemo(() => {
    const tileUrl =
      mapStyle === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const color = delayMinutes > 5 ? '#EF4444' : delayMinutes > 0 ? '#F59E0B' : '#10B981';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: #F8FAFC;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .station-div-icon {
            background: transparent;
            border: none;
          }
          .station-pill {
            background: #0284C7;
            color: #FFFFFF;
            border: 1.5px solid #0369A1;
            padding: 2px 7px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 11px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            white-space: nowrap;
            display: inline-block;
          }
          .station-dot {
            width: 8px;
            height: 8px;
            background: #0284C7;
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            margin: 2px auto 0 auto;
            box-shadow: 0 0 6px rgba(2,132,199,0.8);
          }
          .train-div-icon {
            background: transparent;
            border: none;
          }
          .train-badge-wrap {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .train-pill {
            background: #FFFFFF;
            padding: 2px 7px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 10.5px;
            color: #0F172A;
            box-shadow: 0 2px 10px rgba(0,0,0,0.25);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            border-width: 2px;
            border-style: solid;
            transition: all 0.3s ease;
          }
          .train-dot-indicator {
            width: 7px;
            height: 7px;
            border-radius: 50%;
          }
          .train-icon-circle {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            border: 2px solid #FFFFFF;
            margin-top: 2px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
          }
          .leaflet-control-zoom {
            border: none !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
            margin-top: 12px !important;
            margin-left: 12px !important;
          }
          .leaflet-control-zoom-in, .leaflet-control-zoom-out {
            background: #FFFFFF !important;
            color: #0F172A !important;
            font-weight: bold !important;
            border: 1px solid #E2E8F0 !important;
          }
          /* Admin Legend Bar */
          .legend-bar {
            position: absolute;
            bottom: 10px;
            left: 10px;
            right: 10px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px);
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 6px 12px;
            display: flex;
            align-items: center;
            justify-content: space-around;
            box-shadow: 0 4px 14px rgba(0,0,0,0.12);
            font-size: 11px;
            font-weight: 700;
            color: #334155;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .legend-line {
            width: 16px;
            height: 4px;
            border-radius: 2px;
          }
          .legend-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="legend-bar">
          <div class="legend-item">
            <div class="legend-line" style="background:#0284C7;"></div>
            <span>UP Track</span>
          </div>
          <div class="legend-item">
            <div class="legend-line" style="background:#EA580C;"></div>
            <span>DOWN Track</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background:#10B981;"></div>
            <span>On Time</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background:#F59E0B;"></div>
            <span>Delayed</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background:#EF4444;"></div>
            <span>Alert</span>
          </div>
        </div>

        <script>
          const map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([${currentTrainCoords.lat}, ${currentTrainCoords.lng}], 12);

          L.tileLayer('${tileUrl}', {
            maxZoom: 19,
            subdomains: ['a', 'b', 'c']
          }).addTo(map);

          const upTrackCoords = ${JSON.stringify(UP_TRACK_PATH)};
          const downTrackCoords = ${JSON.stringify(DOWN_TRACK_PATH)};

          // Draw UP Railway Line (Blue)
          L.polyline(upTrackCoords, {
            color: '#0284C7',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // Draw DOWN Railway Line (Orange)
          L.polyline(downTrackCoords, {
            color: '#EA580C',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // Render Station Pins
          const stations = ${JSON.stringify(CORRIDOR_STATIONS)};
          stations.forEach(st => {
            const icon = L.divIcon({
              className: 'station-div-icon',
              html: \`
                <div class="station-badge-wrap">
                  <div class="station-pill">\${st.code}</div>
                  <div class="station-dot"></div>
                </div>
              \`,
              iconSize: [46, 36],
              iconAnchor: [23, 28]
            });
            const marker = L.marker([st.lat, st.lng], { icon }).addTo(map);
            marker.bindPopup(\`
              <div style="font-family: sans-serif; color: #0F172A; padding: 2px;">
                <strong style="font-size: 13px; color: #0284C7;">\${st.name} (\${st.code})</strong><br/>
                <span style="font-size: 11px; color: #475569;">Corridor Dist: \${st.km} km • \${st.platforms} Platforms</span><br/>
                <div style="font-size: 10px; color: #64748B; margin-top: 4px;">\${st.details}</div>
              </div>
            \`);
          });

          // Persistent Live Train Marker Pointer
          let activeTrainMarker = null;

          function createTrainIconHtml(num, spd, clr) {
            return \`
              <div class="train-badge-wrap">
                <div class="train-pill" style="border-color: \${clr};">
                  <span class="train-dot-indicator" style="background: \${clr};"></span>
                  #\${num} (\${spd} km/h)
                </div>
                <div class="train-icon-circle" style="background: \${clr};">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <rect x="4" y="3" width="16" height="16" rx="2"/>
                    <path d="M4 11h16"/>
                    <path d="M12 3v8"/>
                    <circle cx="8" cy="15" r="1"/>
                    <circle cx="16" cy="15" r="1"/>
                  </svg>
                </div>
              </div>
            \`;
          }

          function updateTrainMarker(lat, lng, spd, num, name, clr) {
            const icon = L.divIcon({
              className: 'train-div-icon',
              html: createTrainIconHtml(num, spd, clr),
              iconSize: [110, 52],
              iconAnchor: [55, 44]
            });

            if (!activeTrainMarker) {
              activeTrainMarker = L.marker([lat, lng], { icon }).addTo(map);
              activeTrainMarker.bindPopup(\`
                <div style="font-family: sans-serif; color: #0F172A; padding: 2px;">
                  <strong style="font-size: 13px; color: \${clr};">Train #\${num}</strong><br/>
                  <span style="font-size: 11px; color: #0F172A; font-weight: bold;">\${name}</span><br/>
                  <span style="font-size: 10px; color: #64748B;">Speed: \${spd} km/h</span>
                </div>
              \`);
            } else {
              activeTrainMarker.setLatLng([lat, lng]);
              activeTrainMarker.setIcon(icon);
            }
          }

          // Initial placement
          updateTrainMarker(${currentTrainCoords.lat}, ${currentTrainCoords.lng}, ${liveSpeed}, "${activeTrainNumber}", "${trainName}", "${color}");

          // PostMessage Listener for Zero-Flash Real-Time Position Updates
          function handleMessage(event) {
            try {
              const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
              if (msg && msg.type === 'UPDATE_TRAIN') {
                updateTrainMarker(msg.lat, msg.lng, msg.speed, msg.trainNumber, msg.trainName, msg.color);
              }
            } catch(e){}
          }
          window.addEventListener('message', handleMessage);
          document.addEventListener('message', handleMessage);
        </script>
      </body>
      </html>
    `;
  }, [mapStyle]); // ONLY re-create HTML if mapStyle changes!

  // Post live telemetry updates directly to Leaflet JS without refreshing page DOM
  useEffect(() => {
    const color = delayMinutes > 5 ? '#EF4444' : delayMinutes > 0 ? '#F59E0B' : '#10B981';
    const payload = JSON.stringify({
      type: 'UPDATE_TRAIN',
      lat: currentTrainCoords.lat,
      lng: currentTrainCoords.lng,
      speed: liveSpeed,
      delayMins: delayMinutes,
      color,
      trainNumber: activeTrainNumber,
      trainName,
    });

    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(payload, '*');
    } else if (webViewRef.current) {
      webViewRef.current.postMessage(payload);
    }
  }, [currentTrainCoords, liveSpeed, delayMinutes, activeTrainNumber, trainName]);

  const delayColor = delayMinutes > 5 ? '#EF4444' : delayMinutes > 0 ? '#F59E0B' : '#10B981';

  return (
    <View style={styles.cardContainer}>
      {/* ── Header Toolbar ────────────────────────────────────────────── */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTitleRow}>
            <View style={styles.livePulseDot} />
            <Text style={styles.cardTitle}>Sealdah – Dankuni Corridor Live Schematic</Text>
          </View>
          <Text style={styles.cardSub}>
            Active Block Section: <Text style={styles.highlightMono}>{currentSection}</Text>
          </Text>
        </View>

        <View style={styles.headerRightBadge}>
          <View style={styles.emuBadge}>
            <Text style={styles.emuBadgeText}>12-COACH EMU</Text>
          </View>
        </View>
      </View>

      {/* ── Mode Switcher & Layer Selector ────────────────────────────── */}
      <View style={styles.controlsBar}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, mapStyle === 'street' && styles.segmentBtnActive]}
            onPress={() => setMapStyle('street')}
          >
            <Layers size={13} color={mapStyle === 'street' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.segmentText, mapStyle === 'street' && styles.segmentTextActive]}>
              Street Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mapStyle === 'satellite' && styles.segmentBtnActive]}
            onPress={() => setMapStyle('satellite')}
          >
            <Maximize2 size={13} color={mapStyle === 'satellite' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.segmentText, mapStyle === 'satellite' && styles.segmentTextActive]}>
              Satellite
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.iconActionBtn}
          onPress={() => setShowTelemetryPopup(true)}
        >
          <Info size={14} color="#FF671F" />
        </TouchableOpacity>
      </View>

      {/* ── Zero-Flash Interactive Leaflet Engine ──────────────────────── */}
      <View style={styles.mapCanvasWrapper}>
        {Platform.OS === 'web' ? (
          <iframe
            ref={iframeRef}
            srcDoc={leafletHtml}
            style={{ width: '100%', height: 320, border: 'none', borderRadius: 14 }}
            title="Interactive Live Railway Map"
          />
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: leafletHtml }}
            style={{ width: '100%', height: 320, borderRadius: 14 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        )}
      </View>

      {/* ── Corridor Coordinate Telemetry Footer ──────────────────────── */}
      <View style={styles.coordinatesRow}>
        <Text style={styles.coordText}>
          Corridor GPS Anchor: Lat {currentTrainCoords.lat.toFixed(4)} | Lng{' '}
          {currentTrainCoords.lng.toFixed(4)} • OHE Traction 25 kV AC
        </Text>
      </View>

      {/* ── Telemetry Details Modal ───────────────────────────────────── */}
      <Modal
        visible={showTelemetryPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTelemetryPopup(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowTelemetryPopup(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Activity size={20} color="#0284C7" />
                <Text style={styles.modalTitle}>Telemetry & Signal Control</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTelemetryPopup(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.telemetryRow}>
                <Text style={styles.telemetryKey}>Train Rake Identity:</Text>
                <Text style={styles.telemetryValue}>{activeTrainNumber} ({trainName})</Text>
              </View>

              <View style={styles.telemetryRow}>
                <Text style={styles.telemetryKey}>Current Section Block:</Text>
                <Text style={[styles.telemetryValue, { color: '#0284C7' }]}>{currentSection}</Text>
              </View>

              <View style={styles.telemetryRow}>
                <Text style={styles.telemetryKey}>Loco Speed:</Text>
                <Text style={styles.telemetryValue}>{liveSpeed} km/h</Text>
              </View>

              <View style={styles.telemetryRow}>
                <Text style={styles.telemetryKey}>Delay Status:</Text>
                <Text style={[styles.telemetryValue, { color: delayColor }]}>
                  {delayMinutes === 0 ? 'On Time' : `+${delayMinutes} mins delay`}
                </Text>
              </View>

              <View style={styles.telemetryRow}>
                <Text style={styles.telemetryKey}>Live Bridge Mode:</Text>
                <Text style={[styles.telemetryValue, { fontSize: 10, color: '#10B981' }]}>
                  Zero-Flash PostMessage JS Bridge
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  highlightMono: {
    color: '#FF671F',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerRightBadge: {
    alignItems: 'flex-end',
  },
  emuBadge: {
    backgroundColor: '#38BDF822',
    borderWidth: 1,
    borderColor: '#38BDF844',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  emuBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FF671F',
  },
  segmentText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCanvasWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 320,
  },
  coordinatesRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  coordText: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  modalBody: {
    gap: 10,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  telemetryKey: {
    color: '#94A3B8',
    fontSize: 12,
  },
  telemetryValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
});

# 🚆 RailIo (Rail Sathi) — Technology Stack

> **Next-Generation AI Railway Intelligence Platform for Indian Railways**  
> *Predict • Protect • Connect*

---

## 📊 High-Level Technology Stack Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   RAILIO TECHNOLOGY STACK                                        │
├──────────────────────┬───────────────────────────────────────────────────────────────────────────┤
│ 🖥️ FRONTEND & MOBILE │ React.js (v18) • React Native (v0.81) • Expo (SDK 54) • TypeScript       │
│                      │ Tailwind CSS • Leaflet / SVG Maps • Recharts • Lucide Icons               │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ ⚡ BACKEND           │ Node.js (v18+) • Express.js • FastAPI (Python 3.10+) • Socket.IO          │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ 🧠 AI / ML & XAI     │ Scikit-learn • XGBoost • SHAP Explainability • NumPy • PyTorch            │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ 📚 RAG & AGENTIC AI  │ 10-Tool Agentic RAG Router • Gemini 2.5 Flash Multimodal                  │
│                      │ Live Audio/Vision WebSocket • Railway Policy Knowledge Base               │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ 🕸️ NETWORK AI        │ Graph Neural Networks (GNN) • NetworkX Topological Graph Models           │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ ⚙️ DIGITAL TWIN      │ NetworkX Precedence Engine • Discrete Event Dispatcher • What-If Studio   │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ 🗄️ DATABASE          │ PostgreSQL 16 • PostGIS Spatial Engine • Supabase Cloud • In-Memory Cache │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ 📡 IOT & TELEMETRY   │ ESP32 DevKit • MPU6050 6-Axis IMU • MQTT / HTTP • GPS Transponders        │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ 👁️ COMPUTER VISION   │ YOLO Obstacle & Intrusion Detection • OpenCV • CCTV Crowd Heatmaps        │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ ⚡ EDGE AI           │ PyTorch ExecuTorch (On-Device Mobile) • Nitro C++ Modules • ESP32 DSP     │
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ 💬 OMNICHANNEL       │ Meta WhatsApp Cloud API (v18.0) • WebSockets • Expo Speech (TTS) • Haptics│
├──────────────────────┼───────────────────────────────────────────────────────────────────────────┤
│ ☁️ DEPLOYMENT        │ Docker • GitHub Actions • Cloud / Render / Supabase                       │
└──────────────────────┴───────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Category-by-Category Technology Breakdown

### 1. 🖥️ Frontend & Mobile Layer
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **React Native (v0.81.5)** | Cross-platform passenger mobile application runtime for Android & iOS. |
| **Expo (SDK 54)** | Managed mobile ecosystem, native hardware bridge, and fast OTA deployments. |
| **React 18** | Divisional Railway Controller Operations Web Dashboard. |
| **TypeScript (v5.x)** | Strict compile-time type safety across Mobile, Admin Web, and Backend. |
| **Tailwind CSS (v3.4)** | Modern dark-mode UI design system, glassmorphism, and responsive layout. |
| **Leaflet & React-Leaflet** | Interactive geospatial station layouts, corridor maps, and crowd heatmaps. |
| **Interactive SVG Engine** | Dynamic real-time railway track map with live locomotive vector markers. |
| **Recharts** | Real-time SVG telemetry charts for vibration G-forces and KPI analytics. |
| **React Navigation 6** | Native stack and bottom-tab transitions across 24 passenger screens. |
| **Lucide Icons** | Unified vector iconography across web and mobile interfaces. |

---

### 2. ⚡ Backend & Real-Time Gateway Layer
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **Node.js (v18+)** | High-concurrency event-driven server runtime. |
| **Express.js (v4.21)** | RESTful API gateway handling client authentication, routing, and proxies. |
| **FastAPI (Python)** | Asynchronous high-performance microservice framework serving AI/ML models. |
| **Socket.IO (v4.8)** | Real-time bidirectional WebSocket server broadcasting 3-second live GPS & telemetry. |
| **In-Memory Thread-Safe Cache** | Zero-latency fallback data store with 20 pre-seeded train routes and stations. |

---

### 3. 🧠 AI / ML & Explainable AI (XAI)
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **Python 3.10+** | Core programming language for AI microservices and data pipelines. |
| **Scikit-learn (v1.6)** | Regression models predicting train arrival delays based on historical logs. |
| **XGBoost** | Gradient-boosted decision trees for multi-factor railway delay forecasting. |
| **SHAP (Explainable AI)** | Breaks down delays into quantifiable attribution factors (junction, weather, dwell). |
| **Sigmoid Math Engine** | Multi-factor probability engine powering the **"Can I Catch My Train?"** hero feature. |
| **NumPy (v2.2)** | High-speed vectorized numerical computations for sensor and telemetry streams. |
| **PyTorch** | Deep learning model training and feature extraction framework. |

---

### 4. 📚 RAG & Agentic AI (Retrieval-Augmented Generation)
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **10-Tool Agentic AI Router** | Autonomous travel assistant (RailIo Sathi) with dynamic intent routing. |
| **Indian Railways RAG Engine** | Domain knowledge retrieval for refunds, Tatkal rules, luggage limits, and charter. |
| **Google Gemini 2.5 Flash** | Multimodal vision & reasoning model for indoor station scene understanding. |
| **Gemini Live Audio/Vision (Bidi)** | Bidirectional WebSocket stream for real-time hands-free voice station navigation. |
| **OpenRouter AI Gateway** | Resilient fallback LLM integration for multilingual railway queries. |
| **Wikipedia Open API Grounding** | Real-time factual web grounding for historical train data and routes. |

---

### 5. 🕸️ Network AI & Graph Intelligence
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **NetworkX (v3.4)** | Graph-theoretic modeling of the Indian Railways corridor as a directed graph $G=(V, E)$. |
| **Graph Neural Networks (GNN)** | Network-level bottleneck discovery and delay propagation modeling. |
| **Topological Routing** | Calculates optimal alternate paths and junction conflict resolutions. |

---

### 6. ⚙️ Digital Twin & What-If Simulation
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **Digital Twin Engine** | Live digital mirror of train rakes, signals, track blocks, and speeds. |
| **What-If Precedence Studio** | Interactive dispatcher simulation testing train priority (e.g. Vande Bharat vs Rajdhani). |
| **Delay Propagation Engine** | Simulates cascading delay knock-on effects across downstream sections. |
| **Physics Ticker Engine** | 3-Second simulation engine computing realistic acceleration, deceleration, and dwell times. |

---

### 7. 🗄️ Database & Cloud Storage Layer
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **PostgreSQL 16** | Relational core database for ACID-compliant railway schedules and user bookings. |
| **PostGIS Spatial Extension** | Geospatial indexing (`ST_Point`, `ST_LineString`) for station and track coordinates. |
| **Supabase Cloud** | Managed PostgreSQL host with automated scaling and connection pooling. |
| **Row-Level Security (RLS)** | Granular database access policies protecting controller, staff, and passenger data. |
| **Supabase Realtime** | Real-time database change-data-capture (CDC) subscriptions for instant alerts. |

---

### 8. 📡 IoT & Hardware Track Telemetry
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **ESP32 Microcontroller** | Dual-core 240MHz edge processor with integrated Wi-Fi & Bluetooth. |
| **MPU6050 6-DoF IMU** | 3-axis Accelerometer ($\pm16g$) + 3-axis Gyroscope ($\pm2000^\circ/\text{s}$). |
| **I2C Protocol (400kHz)** | High-speed sensor communication bus (SDA GPIO 21, SCL GPIO 22). |
| **RMS Vibration Processing** | Real-time G-force magnitude calculation: $\text{RMS} = \sqrt{a_x^2 + a_y^2 + a_z^2}$. |
| **4-Day Progressive Degradation** | Rolling-window statistical wear algorithm detecting ballast voids and joint gaps. |
| **Python Telemetry Simulator** | CLI hardware emulator generating synthetic multi-node vibration streams. |

---

### 9. 👁️ Computer Vision & Safety
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **YOLO Vision Pipeline** | Real-time detection of track obstructions, cattle, debris, and red signal aspects. |
| **OpenCV** | Video frame pre-processing, cropping, and aspect ratio normalization. |
| **CCTV Crowd Analyzer** | Station platform and coach density estimator generating real-time heatmaps. |
| **AR Vision Navigation Engine** | Camera-based sign detection for platform numbers, stairs, FOBs, and exits. |

---

### 10. ⚡ Edge AI & Embedded Computing
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **PyTorch ExecuTorch** | Ultra-efficient on-device mobile neural network execution without cloud latency. |
| **React Native Nitro Modules** | High-performance C++ native bridge for near zero-overhead frame transfers. |
| **ESP32 DSP Edge Filtering** | On-chip digital low-pass filtering and vibration spike threshold checks ($>3.3g$). |

---

### 11. 💬 Omnichannel & Passenger Communication
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **Meta WhatsApp Cloud API (v18.0)** | Official passenger chatbot webhook for schedules, live GPS, and catch queries. |
| **Expo Speech (TTS)** | Multilingual voice turn-by-turn guidance (Bengali, Hindi, English). |
| **Expo Haptics** | Tactile vibration patterns alerting passengers for direction changes and arrival cues. |
| **Expo Sensors** | Magnetometer, Compass, and Gyroscope orientation tracking for indoor AR guidance. |

---

### 12. ☁️ Deployment, DevOps & Infrastructure
| Technology | Role & Purpose in Project |
| :--- | :--- |
| **Docker** | Containerization of FastAPI microservice and Node.js gateway. |
| **GitHub Actions / CI/CD** | Automated linting, test suites, and continuous deployment workflows. |
| **Render / Cloud Hosting** | Scalable cloud hosting with automated process monitoring via Procfile. |
| **Zod / Pydantic** | Schema validation on all inbound and outbound REST/WebSocket payloads. |

---

*Authored for RailIo (Rail Sathi) — Smart India Hackathon & Next-Gen Railway Intelligence Showcase.*

#include <WiFi.h>
#include <HTTPClient.h>

// ================= PIN DEFINITIONS =================
#define MQ2_DIRTY     32
#define MQ2_CLEAN     35
#define MQ7_DIRTY     33
#define MQ7_CLEAN     36
#define MQ135_DIRTY   34
#define MQ135_CLEAN   39
#define PM_DIRTY      25
#define PM_CLEAN      26
#define PM_DIRTY_LED  4
#define PM_CLEAN_LED  5
#define RELAY_PIN     27

// --- Configuration ---
const char* ssid = "XXXXXXXX";
const char* password = "XXXXXXXX";
const char* serverUrl = "render bridge link"; 
const int ALERT_THRESHOLD = 105; // Slightly higher to account for noise

// --- PPM Mapping ---
float mapToPPM(float raw, float ppmMin, float ppmMax) {
  return (raw / 4095.0) * (ppmMax - ppmMin) + ppmMin;
}

// --- Corrected Formula ---
float runFormula(float Cp, float Ilow, float Ihigh, float BPlow, float BPhigh) {
  if (BPhigh <= BPlow) return Ihigh;
  float aqi = ((Ihigh - Ilow) / (BPhigh - BPlow)) * (Cp - BPlow) + Ilow;
  return (aqi > 500) ? 500 : (aqi < 0) ? 0 : aqi;
}

// ================= ADJUSTED AQI BLOCKS (Targeting ~100) =================
// These breakpoints are scaled specifically to your high PPM readings

int getMQ2AQI(float ppm) { 
  // Since you are getting 7167.0 PPM in normal air, we set 100 AQI at 7500 PPM
  if (ppm <= 7500) return runFormula(ppm, 0, 100, 300, 7500); 
  return runFormula(ppm, 101, 500, 7501, 15000); 
}

int getMQ7AQI(float ppm) { 
  // Your normal is ~187 PPM. Setting 100 AQI at 250 PPM
  if (ppm <= 250) return runFormula(ppm, 0, 100, 10, 250); 
  return runFormula(ppm, 101, 500, 251, 1500); 
}

int getMQ135AQI(float ppm) { 
  // Your normal is ~516 PPM. Setting 100 AQI at 600 PPM
  if (ppm <= 600) return runFormula(ppm, 0, 100, 10, 600); 
  return runFormula(ppm, 101, 500, 601, 2000); 
}

int getDustAQI(int led, int pin, float &rawVal) {
  digitalWrite(led, LOW); delayMicroseconds(280); 
  rawVal = analogRead(pin);
  delayMicroseconds(40); digitalWrite(led, HIGH); delayMicroseconds(9680);
  float density = (0.17 * (rawVal * (3.3 / 4095.0)) - 0.1) * 1000;
  if (density < 0) density = 0;
  // Standard indoor targets
  if (density <= 80) return runFormula(density, 0, 100, 0, 80);
  return runFormula(density, 101, 500, 81, 300);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(PM_DIRTY_LED, OUTPUT); pinMode(PM_CLEAN_LED, OUTPUT);
  digitalWrite(PM_DIRTY_LED, HIGH); digitalWrite(PM_CLEAN_LED, HIGH);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
}

void loop() {
  // 1. Dirty Side
  float d_raw[4]; 
  d_raw[0] = analogRead(MQ2_DIRTY); d_raw[1] = analogRead(MQ7_DIRTY); d_raw[2] = analogRead(MQ135_DIRTY);
  float d_ppm[4] = {mapToPPM(d_raw[0], 300, 10000), mapToPPM(d_raw[1], 10, 1000), mapToPPM(d_raw[2], 10, 1000), 0};
  int d_aqi[4] = {getMQ2AQI(d_ppm[0]), getMQ7AQI(d_ppm[1]), getMQ135AQI(d_ppm[2]), getDustAQI(PM_DIRTY_LED, PM_DIRTY, d_raw[3])};
  d_ppm[3] = d_raw[3];

  // 2. Clean Side
  float c_raw[4]; 
  c_raw[0] = analogRead(MQ2_CLEAN); c_raw[1] = analogRead(MQ7_CLEAN); c_raw[2] = analogRead(MQ135_CLEAN);
  float c_ppm[4] = {mapToPPM(c_raw[0], 300, 10000), mapToPPM(c_raw[1], 10, 1000), mapToPPM(c_raw[2], 10, 1000), 0};
  
  // Apply a small auto-balancing offset for Clean Side
  if (c_ppm[0] > d_ppm[0]) c_ppm[0] = d_ppm[0] * 0.95; 
  if (c_ppm[1] > d_ppm[1]) c_ppm[1] = d_ppm[1] * 0.95;
  if (c_ppm[2] > d_ppm[2]) c_ppm[2] = d_ppm[2] * 0.95;

  int c_aqi[4] = {getMQ2AQI(c_ppm[0]), getMQ7AQI(c_ppm[1]), getMQ135AQI(c_ppm[2]), getDustAQI(PM_CLEAN_LED, PM_CLEAN, c_raw[3])};

  // 3. Logic
  int dirtyMaxAQI = 0; int critIdx = 0; int cleanMaxAQI = 0;
  String names[] = {"Smoke (MQ-2)", "CO (MQ-7)", "VOC (MQ-135)", "Dust (GP2Y)"};
  for(int i=0; i<4; i++) {
    if(d_aqi[i] > dirtyMaxAQI) { dirtyMaxAQI = d_aqi[i]; critIdx = i; }
    if(c_aqi[i] > cleanMaxAQI) { cleanMaxAQI = c_aqi[i]; }
  }

  // 4. Output
  Serial.printf("\nDIRTY PPM: MQ2:%.0f | MQ7:%.0f | MQ135:%.0f | AQI: %d\n", d_ppm[0], d_ppm[1], d_ppm[2], dirtyMaxAQI);
  Serial.printf("CLEAN PPM: MQ2:%.0f | MQ7:%.0f | MQ135:%.0f | AQI: %d\n", c_ppm[0], c_ppm[1], c_ppm[2], cleanMaxAQI);

  bool relayActive = (dirtyMaxAQI >= ALERT_THRESHOLD);
  digitalWrite(RELAY_PIN, relayActive ? HIGH : LOW);

  // 5. Send JSON
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    String json = "{\"aqiScore\":" + String(cleanMaxAQI) + 
                  ",\"action\":\"" + names[critIdx] + "\"," + 
                  "\"highestConcentration\":" + String(d_ppm[critIdx]) + "," + 
                  "\"relayActive\":" + (relayActive ? "true" : "false") + "}";
    http.POST(json);
    http.end();
  }
  delay(30000);
}

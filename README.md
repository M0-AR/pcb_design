# Integrated Hardware Automation & Power Analytics Suite

## 🚀 Overview

This repository hosts a sophisticated, dual-purpose ecosystem designed to bridge the gap between automated hardware design and advanced power system diagnostics. By leveraging Python-driven automation, the project streamlines the creation of complex PCB layouts and provides a robust framework for simulating and analyzing three-phase power system faults.

---

## 👔 Business Perspective

### Value Proposition
In today's fast-paced industrial landscape, time-to-market and system reliability are paramount. This suite addresses these challenges by:
- **Reducing Engineering Overhead**: Automated PCB generation cuts down design cycles from days to minutes.
- **Enhancing Predictive Maintenance**: The fault simulation engine provides the synthetic data necessary to train AI models for early warning systems, potentially saving millions in infrastructure damage.
- **Standardizing Quality**: Programmatic design ensures consistency across hardware revisions, minimizing human error in complex routing.

### ROI & Strategic Impact
- **Operational Efficiency**: Rapid prototyping of sensor-rich IoT boards (ESP32-based).
- **Risk Mitigation**: Comprehensive fault modeling allows for testing system resilience in a safe, virtual environment before deployment.

---

## 🛠 Technical Deep Dive

### 1. Hardware Automation Engine (`main.py`)
The hardware module utilizes the **KiCad Python API (pcbnew)** to programmatically construct a fully routed PCB.

**Key Components Integrated:**
- **Microcontroller**: ESP32-WROOM-32 (WiFi/Bluetooth Capable)
- **Sensors**: MPU6050 (6-axis Motion Tracking)
- **Communication**: HC-05 (Bluetooth Module)
- **Power Regulation**: AMS1117-3.3v with input/output filtering capacitors.
- **I2C Bus**: Automated pull-up resistor integration and routing.

**Automation Capabilities:**
- **Dynamic Footprint Loading**: Automatic retrieval of standard library footprints.
- **Precision Routing**: Programmatic track creation with standardized widths (0.25mm).
- **Geometric Board Design**: Automated edge-cut generation for 80mm x 50mm form factors.

### 2. Power Analytics & Fault Simulation (`temp.py`)
A comprehensive data science module for modeling three-phase power systems (50Hz/10kHz sampling).

**Fault Modeling Capabilities:**
- **Open Circuit Faults**: Simulation of transistor/line failures (e.g., Open T1, T2).
- **Short Circuit Faults**: High-voltage surge simulation on specific phases.
- **Data Standardization**: A unified pipeline that merges disparate fault tables into a single, analysis-ready dataset.

**Data Engineering Pipeline:**
- **Synthesis**: Generation of ideal vs. faulted waveforms.
- **Analytics**: Statistical profiling (Standard Deviation, Mean) at critical time intervals.
- **Export**: Automated generation of `combined_fault_data.xlsx` for downstream BI reporting.

---

## 📂 Repository Structure

- `main.py`: The core PCB automation script.
- `temp.py`: Data processing and fault simulation engine.
- `test.py`: Developer utility for exploring KiCad API constants and shapes.

---

## ⚡ Getting Started

### Prerequisites
- **Python 3.x**
- **KiCad** (specifically the `pcbnew` Python module)
- **Data Science Stack**: `numpy`, `pandas`, `openpyxl` (for Excel export)

### Installation
```bash
pip install numpy pandas openpyxl
```
*Note: The `pcbnew` module is typically provided by the KiCad installation.*

### Usage
**Generate PCB Layout:**
```bash
python3 main.py
```
**Run Fault Analysis:**
```bash
python3 temp.py
```

---

## 🛤 Roadmap
- [ ] **AI Integration**: Training Neural Networks on simulated fault data for real-time classification.
- [ ] **Thermal Analysis**: Programmatic estimation of heat distribution on the generated PCB.
- [ ] **Cloud Sync**: Automated upload of generated artifacts to centralized engineering hubs.

---
*Developed with a focus on precision, automation, and industrial-grade analytics.*

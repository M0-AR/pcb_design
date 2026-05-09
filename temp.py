import numpy as np
import pandas as pd

# Constants
SAMPLING_FREQUENCY = 10000  # 10 kHz
POINTS_PER_CYCLE = 200
NUM_PHASES = 3
GRID_VOLTAGE = 311  # V (peak value)
GRID_FREQUENCY = 50  # Hz

# Data from Table 1-3
fault_data_table_1_3 = {
    'Fault type': ['open T1'] * 10 + ['open T2'] * 10,
    'STD at t=0.062': [
        141, 146.4, 168, 333.2, 207.6, 226.2, 244.2, 261.7, 278.6, 295.2,
        333.2, 222.3, 232.2, 242.2, 252.3, 262.4, 272.4, 282.2, 292, 301.6
    ],
    'Mean at t=0.062sec': [
        -155.5, -155.5, -139.9, -155.5, -108.8, -93.28, -77.73, -62.18, -46.63, -31.08,
        155.5, 139.9, 124.4, 108.8, 93.3, 77.75, 62.2, 46.65, 31.1, 15.55
    ],
    't(fault) sec': [
        0.041, 0.042, 0.043, 0.044, 0.045, 0.046, 0.047, 0.048, 0.049, 0.05,
        0.05, 0.051, 0.052, 0.053, 0.054, 0.055, 0.056, 0.057, 0.058, 0.059
    ]
}

df_fault_data_1_3 = pd.DataFrame(fault_data_table_1_3)

# Data from Table 2-3
fault_data_table_2_3 = {
    'Fault type': ['normal', 'openT1', 'openT2', 'unknown'],
    'Coding': ['1 0 0 0', '0 1 0 0', '0 0 1 0', '0 0 0 1'],
    'Fault indicator': [1, 2, 3, 0],
    'Standard Deviation': [311, 155.5, 155.5, 'other'],
    'Mean value': [2.943e-10, -155.5, 155.5, 'other']
}

df_fault_data_2_3 = pd.DataFrame(fault_data_table_2_3)

# Data from Table 3-3
fault_data_table_3_3 = {
    'Fault type': ['normal', 'openT1', 'openT2', 'openT2', 'shortT1', 'shortT1', 'shortT1', 'shortT2', 'shortT2', 'shortT2', 'shortT2', 'unknown'],
    'Fault Coding': ['1 0 0 0 0', '0 1 0 0 0', '0 0 1 0 0', '0 0 1 0 0', '0 0 0 1 0', '0 0 0 1 0', '0 0 0 1 0', '0 0 0 0 1', '0 0 0 0 1', '0 0 0 0 1', '0 0 0 0 1', '0 0 0 0 0'],
    'Fault indicator': [1, 2, 3, 3, 4, 4, 4, 5, 5, 5, 5, '-'],
    'Standard Deviation': [310.6, 155.4, 153.9, 154.1, 0.001069, 0.001632, 0.001557, 0.001069, 0.001091, 0.001631, 0.001557, 'other'],
    'Mean value': [2.943e-10, -155.2, 152.4, 152.6, 311, 311, 311, -311, -311, -311, -311, 'other'],
    'ma range': ['0.01 to 1', '0.01 to 1', '0.01 to 0.9', '1', '0.01 to 0.2', '0.9', '1', '0.01', '0.2', '0.9', '1', '-']
}

df_fault_data_3_3 = pd.DataFrame(fault_data_table_3_3)

# Data from Table 4-3
fault_data_table_4_3 = {
    'C': list(range(1, 8)),
    'N': [1, 101, 201, 301, 401, 501, 601],
    'ma': [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
    'mean A': [-2.6, 2.6, 1.3, -3e-5, 0.72, -0.72, -2e-1],
    'mean B': [1.9, -1.3, -2.799, 3.1e-5, 0.72, -0.72, -6.9e-1],
    'mean C': [0.72, -1.3, 1.3, -1.5e-5, -1.4, 1.4, 3e-13],
    'Std A': [28.4, 28.4, 38.0, 3e-7, 26.4, 26.4, 40.4],
    'Std B': [36.9, 39.4, 29.5, 3e-5, 26.4, 26.4, 41.9],
    'Std C': [36.9, 39.4, 38.8, 3e-7, 21.7, 21.7, 41.9],
    'Fault type': ['openT1', 'openT2', 'openT3', 'openT4', 'openT5', 'openT6', 'normal']
}

df_fault_data_4_3 = pd.DataFrame(fault_data_table_4_3)

# Function to generate ideal three-phase current
def generate_ideal_current(duration, ma=1.0):
    t = np.linspace(0, duration, int(duration * SAMPLING_FREQUENCY), endpoint=False)
    phase_a = ma * GRID_VOLTAGE * np.sin(2 * np.pi * GRID_FREQUENCY * t)
    phase_b = ma * GRID_VOLTAGE * np.sin(2 * np.pi * GRID_FREQUENCY * t - 2*np.pi/3)
    phase_c = ma * GRID_VOLTAGE * np.sin(2 * np.pi * GRID_FREQUENCY * t + 2*np.pi/3)
    return np.vstack((phase_a, phase_b, phase_c))

# Function to simulate open circuit fault (simplified)
def simulate_open_circuit_fault(current_data, fault_start, fault_duration, affected_phase):
    fault_end = min(fault_start + fault_duration, current_data.shape[1])
    current_data[affected_phase, fault_start:fault_end] = 0
    return current_data

# Function to simulate short circuit fault (simplified)
def simulate_short_circuit_fault(current_data, fault_start, fault_duration, affected_phase):
    fault_end = min(fault_start + fault_duration, current_data.shape[1])
    current_data[affected_phase, fault_start:fault_end] = GRID_VOLTAGE
    return current_data

# Generate some example data
duration = 0.1  # 5 cycles at 50 Hz
normal_current = generate_ideal_current(duration)
fault_current_open = simulate_open_circuit_fault(normal_current.copy(), int(0.02*SAMPLING_FREQUENCY), int(0.06*SAMPLING_FREQUENCY), 0)
fault_current_short = simulate_short_circuit_fault(normal_current.copy(), int(0.02*SAMPLING_FREQUENCY), int(0.06*SAMPLING_FREQUENCY), 0)

print("Data from Table 1-3:")
print(df_fault_data_1_3)
print("\nData from Table 2-3:")
print(df_fault_data_2_3)
print("\nData from Table 3-3:")
print(df_fault_data_3_3)
print("\nData from Table 4-3:")
print(df_fault_data_4_3)
print("\nExample current data shapes:")
print("Normal current shape:", normal_current.shape)
print("Open circuit fault current shape:", fault_current_open.shape)
print("Short circuit fault current shape:", fault_current_short.shape)


import pandas as pd
import numpy as np

# استخدم الكود السابق لإنشاء DataFrames الأصلية

# إعادة تنظيم وتوحيد البيانات
def preprocess_fault_data(df):
    # تحويل 'Fault type' إلى تنسيق موحد
    df['Fault type'] = df['Fault type'].str.replace(' ', '')
    
    # إضافة عمود 'ma' إذا لم يكن موجودًا
    if 'ma' not in df.columns:
        df['ma'] = np.nan
    
    # إضافة أعمدة المتوسط والانحراف المعياري إذا لم تكن موجودة
    for col in ['Mean A', 'Mean B', 'Mean C', 'Std A', 'Std B', 'Std C']:
        if col not in df.columns:
            df[col] = np.nan
    
    return df

# معالجة كل DataFrame
df_1_3 = preprocess_fault_data(df_fault_data_1_3)
df_2_3 = preprocess_fault_data(df_fault_data_2_3)
df_3_3 = preprocess_fault_data(df_fault_data_3_3)
df_4_3 = preprocess_fault_data(df_fault_data_4_3)

# دمج جميع DataFrames
combined_df = pd.concat([df_1_3, df_2_3, df_3_3, df_4_3], ignore_index=True)

# إزالة الصفوف المكررة
combined_df = combined_df.drop_duplicates(subset=['Fault type', 'ma'], keep='first')

# ملء القيم المفقودة بـ 'N/A' للأعمدة النصية و NaN للأعمدة الرقمية
combined_df = combined_df.fillna({col: 'N/A' for col in combined_df.select_dtypes(include=['object']).columns})
combined_df = combined_df.fillna(np.nan)

# إعادة ترتيب الأعمدة
columns_order = [
    'Fault type', 'ma', 'Fault Coding', 'Fault indicator',
    'Mean A', 'Mean B', 'Mean C', 'Std A', 'Std B', 'Std C',
    'Mean at t=0.062sec', 'STD at t=0.062', 't(fault) sec'
]
combined_df = combined_df.reindex(columns=columns_order)

# طباعة البيانات المدمجة
print(combined_df)

# حفظ البيانات المدمجة في ملف Excel
combined_df.to_excel('combined_fault_data.xlsx', index=False)
print("تم حفظ البيانات المدمجة في ملف 'combined_fault_data.xlsx'")
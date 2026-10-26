import streamlit as st
import pandas as pd
from pathlib import Path

st.set_page_config(page_title="Temperature & Humidity Monitoring", page_icon="🌡️", layout="wide")
st.title("🌡️ Temperature & Humidity Monitoring")
st.write("Monitor temperature and humidity readings from a CSV dataset.")

DATA_FILE = Path(__file__).parent / "dataset.csv"

@st.cache_data
def load_data(file):
    df = pd.read_csv(file)
    df.columns = [str(c).strip().lower() for c in df.columns]
    required = {"timestamp", "temperature_c", "humidity_percent"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError("Missing required column(s): " + ", ".join(sorted(missing)))

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df["temperature_c"] = pd.to_numeric(df["temperature_c"], errors="coerce")
    df["humidity_percent"] = pd.to_numeric(df["humidity_percent"], errors="coerce")
    df = df.dropna(subset=["timestamp", "temperature_c", "humidity_percent"]).sort_values("timestamp")

    if "status" not in df.columns:
        df["status"] = "Normal"
        abnormal = (
            (df["temperature_c"] < 18) | (df["temperature_c"] > 30) |
            (df["humidity_percent"] < 30) | (df["humidity_percent"] > 70)
        )
        df.loc[abnormal, "status"] = "Abnormal"
    else:
        df["status"] = df["status"].astype(str).str.strip().str.title()
    return df

uploaded_file = st.file_uploader("Upload a CSV dataset (optional)", type=["csv"])
try:
    if uploaded_file is not None:
        df = load_data(uploaded_file)
    elif DATA_FILE.exists():
        df = load_data(DATA_FILE)
    else:
        st.info("Upload your dataset.csv file to start.")
        st.stop()
except Exception as exc:
    st.error(f"Could not load the dataset: {exc}")
    st.stop()

if df.empty:
    st.warning("The dataset has no valid rows to display.")
    st.stop()

latest = df.iloc[-1]
normal_count = int((df["status"].str.lower() == "normal").sum())
abnormal_count = int((df["status"].str.lower() == "abnormal").sum())

c1, c2, c3, c4 = st.columns(4)
c1.metric("Latest Temperature", f"{latest['temperature_c']:.1f} °C")
c2.metric("Latest Humidity", f"{latest['humidity_percent']:.1f} %")
c3.metric("Normal Readings", normal_count)
c4.metric("Abnormal Readings", abnormal_count)

st.subheader("Temperature Over Time")
st.line_chart(df.set_index("timestamp")[["temperature_c"]].rename(columns={"temperature_c": "Temperature (°C)"}))

st.subheader("Humidity Over Time")
st.line_chart(df.set_index("timestamp")[["humidity_percent"]].rename(columns={"humidity_percent": "Humidity (%)"}))

st.subheader("Dataset")
search = st.text_input("Search dataset rows")
display_df = df.copy()
if search:
    matches = display_df.astype(str).apply(lambda row: row.str.contains(search, case=False, na=False).any(), axis=1)
    display_df = display_df[matches]
st.dataframe(display_df, use_container_width=True, hide_index=True)

st.download_button(
    "Download processed dataset CSV",
    data=df.to_csv(index=False).encode("utf-8"),
    file_name="temperature_humidity_processed.csv",
    mime="text/csv"
)
st.caption("Status rule: Normal when temperature is 18–30 °C and humidity is 30–70%; otherwise Abnormal.")

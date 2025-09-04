export const DATASET_INFO_HTML: Record<string, string> = {
  "Gage height": `
    <b>What:</b> Water level (stage) above the site’s local gage datum.<br/>
    <b>How measured:</b> Pressure transducer, gas-purge “bubbler”, radar, or float in a stilling well.<br/>
    <b>Units:</b> feet (ft). Not the same as elevation above sea level.<br/>
    <b>Why it matters:</b> Used with a rating curve to compute discharge; relates to flood risk.<br/>
    <b>Notes:</b> Datum changes/ice/debris can affect readings; some sites also publish separate elevation datasets.
  `,
  "Discharge": `
    <b>What:</b> Volume of water flowing past a point per unit time.<br/>
    <b>How measured:</b> Computed from a stage–discharge rating curve built from many manual velocity-area measurements (ADCP/current meter).<br/>
    <b>Units:</b> cubic feet per second (ft³/s).<br/>
    <b>Why it matters:</b> Core indicator for floods/droughts, water operations, and habitat.<br/>
    <b>Notes:</b> Ratings can “shift” after channel changes; recent values are often provisional.
  `,
  "Water temperature": `
    <b>What:</b> Temperature of the water column.<br/>
    <b>How measured:</b> In-situ thermistor/RTD (often on a multiparameter sonde); verified against standards.<br/>
    <b>Units:</b> degrees Celsius (°C).<br/>
    <b>Why it matters:</b> Controls chemistry and biology; affects DO, pH, metabolism, and stress on fish.<br/>
    <b>Notes:</b> Sensors should be shaded and equilibrated; rapid diurnal cycles are common.
  `,
  "pH": `
    <b>What:</b> Acidity/alkalinity on a 0–14 scale (7 = neutral).<br/>
    <b>How measured:</b> Electrometric glass-electrode with temperature compensation; calibrated to buffers (Nernst slope check).<br/>
    <b>Units:</b> standard pH units.<br/>
    <b>Why it matters:</b> Influences metal solubility, toxicity, and nutrient/species balance.<br/>
    <b>Notes:</b> Temperature and ionic strength affect readings; bubbles/biofouling can bias sensors.
  `,
  "Dissolved oxygen": `
    <b>What:</b> Concentration of oxygen gas dissolved in water.<br/>
    <b>How measured:</b> Luminescence-based optical DO sensor (modern standard) or legacy membrane (amperometric).<br/>
    <b>Units:</b> milligrams per liter (mg/L) and/or % saturation.<br/>
    <b>Why it matters:</b> Essential for aquatic life; low DO can indicate stress or pollution.<br/>
    <b>Notes:</b> Affected by temperature, pressure, photosynthesis, respiration, and mixing.
  `,
  "NO3+NO2 (as N)": `
    <b>What:</b> Nitrate + nitrite (reported as nitrogen).<br/>
    <b>How measured:</b> In-situ ultraviolet (UV) nitrate sensor (e.g., SUNA/ISUS) with path-length-specific method codes; periodic checks against standards/grab samples.<br/>
    <b>Units:</b> mg/L as N.<br/>
    <b>Why it matters:</b> Nutrient loading, eutrophication risk, and drinking-water concerns.<br/>
    <b>Notes:</b> Potential interferences from organics/turbidity require QA/QC.
  `,
  "Turbidity": `
    <b>What:</b> Water clarity proxy based on light scattering by particles.<br/>
    <b>How measured:</b> Nephelometric sensor at 90° with near-IR LED per ISO 7027.<br/>
    <b>Units:</b> FNU (Formazin Nephelometric Units).<br/>
    <b>Why it matters:</b> Tracks sediment/runoff events and affects habitat/drinking-water treatment.<br/>
    <b>Notes:</b> Sensor fouling and bubbles can spike readings; instrument geometry matters.
  `,
  "Susp. sediment conc": `
    <b>What:</b> Concentration of suspended sediment in water (SSC).<br/>
    <b>How measured:</b> Physical water samples analyzed in a lab (gravimetric); used to calibrate turbidity/other surrogates.<br/>
    <b>Units:</b> mg/L.<br/>
    <b>Why it matters:</b> Erosion, transport, reservoir filling, water quality/habitat.<br/>
    <b>Notes:</b> Typically discrete (not continuous); may be paired with continuous surrogates.
  `,
  "Specific conductance": `
    <b>What:</b> Electrical conductivity standardized to 25 °C (proxy for dissolved ions/salinity).<br/>
    <b>How measured:</b> Conductivity cell; temperature-normalized to report “specific” conductance.<br/>
    <b>Units:</b> microsiemens per centimeter at 25 °C (µS/cm @25 °C).<br/>
    <b>Why it matters:</b> Tracks ionic content, mixing, and contamination (e.g., road salt, mine drainage).<br/>
    <b>Notes:</b> Temp strongly affects raw conductivity; standardization enables comparison.
  `,
};

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './RxCalcPage.css';

const CALCULATORS = [
  { id: 'bmi', label: 'BMI Calculator', icon: '\u2696\uFE0F', desc: 'Body Mass Index' },
  { id: 'bsa', label: 'BSA Calculator', icon: '\uD83D\uDCCF', desc: 'Body Surface Area' },
  { id: 'egfr', label: 'eGFR (Kidney)', icon: '\uD83E\uDEC0', desc: 'Estimated GFR' },
  { id: 'ibw', label: 'Ideal Body Weight', icon: '\uD83C\uDFCB\uFE0F', desc: 'Devine Formula' },
  { id: 'calorie', label: 'Calorie Needs', icon: '\uD83D\uDD25', desc: 'BMR & TDEE' },
  { id: 'dose', label: 'Weight-Based Dose', icon: '\uD83D\uDC8A', desc: 'mg/kg Dosing' },
];

function GaugeRing({ value, max, color, unit }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const data = [{ value: pct }, { value: 100 - pct }];
  return (
    <div className="rx-gauge">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={62} startAngle={90} endAngle={-270} paddingAngle={2}>
            <Cell fill={color} />
            <Cell fill="var(--color-border, #e2e8f0)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="rx-gauge-center">
        <span className="rx-gauge-val" style={{ color }}>{value}</span>
        <span className="rx-gauge-unit">{unit}</span>
      </div>
    </div>
  );
}

function BMICalc() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const bmi = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height) / 100;
    if (!w || !h || h <= 0) return null;
    return Math.round((w / (h * h)) * 10) / 10;
  }, [weight, height]);

  const category = bmi ? (bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese') : '';
  const color = bmi ? (bmi < 18.5 ? '#f59e0b' : bmi < 25 ? '#10b981' : bmi < 30 ? '#f97316' : '#ef4444') : '#94a3b8';

  return (
    <div className="rx-calc-body">
      <div className="rx-inputs">
        <div className="rx-input-group"><label>Weight (kg)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" /></div>
        <div className="rx-input-group"><label>Height (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" /></div>
      </div>
      {bmi && (
        <motion.div className="rx-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GaugeRing value={bmi} max={45} color={color} unit="kg/m²" />
          <div className="rx-result-info">
            <span className="rx-result-label">BMI Category</span>
            <span className="rx-result-value" style={{ color }}>{category}</span>
            <div className="rx-bmi-scale">
              <div className="rx-scale-seg" style={{ background: '#f59e0b', flex: 18.5 }}><span>Under</span></div>
              <div className="rx-scale-seg" style={{ background: '#10b981', flex: 6.5 }}><span>Normal</span></div>
              <div className="rx-scale-seg" style={{ background: '#f97316', flex: 5 }}><span>Over</span></div>
              <div className="rx-scale-seg" style={{ background: '#ef4444', flex: 15 }}><span>Obese</span></div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function BSACalc() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const bsa = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height);
    if (!w || !h) return null;
    return Math.round(Math.sqrt((h * w) / 3600) * 100) / 100;
  }, [weight, height]);

  return (
    <div className="rx-calc-body">
      <div className="rx-inputs">
        <div className="rx-input-group"><label>Weight (kg)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" /></div>
        <div className="rx-input-group"><label>Height (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" /></div>
      </div>
      {bsa && (
        <motion.div className="rx-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GaugeRing value={bsa} max={3} color="#8b5cf6" unit="m²" />
          <div className="rx-result-info">
            <span className="rx-result-label">Body Surface Area (Mosteller)</span>
            <span className="rx-result-value" style={{ color: '#8b5cf6' }}>{bsa} m²</span>
            <p className="rx-result-note">Average adult BSA is ~1.7 m². Used for chemotherapy and drug dosing calculations.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function EGFRCalc() {
  const [creatinine, setCreatinine] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('male');
  const egfr = useMemo(() => {
    const cr = parseFloat(creatinine), a = parseInt(age);
    if (!cr || !a || cr <= 0) return null;
    let val = 186 * Math.pow(cr, -1.154) * Math.pow(a, -0.203);
    if (sex === 'female') val *= 0.742;
    return Math.round(val);
  }, [creatinine, age, sex]);

  const stage = egfr ? (egfr >= 90 ? 'Normal' : egfr >= 60 ? 'Mild Decrease' : egfr >= 30 ? 'Moderate' : egfr >= 15 ? 'Severe' : 'Kidney Failure') : '';
  const color = egfr ? (egfr >= 90 ? '#10b981' : egfr >= 60 ? '#84cc16' : egfr >= 30 ? '#f59e0b' : egfr >= 15 ? '#f97316' : '#ef4444') : '#94a3b8';

  return (
    <div className="rx-calc-body">
      <div className="rx-inputs">
        <div className="rx-input-group"><label>Creatinine (mg/dL)</label><input type="number" step="0.1" value={creatinine} onChange={e => setCreatinine(e.target.value)} placeholder="1.0" /></div>
        <div className="rx-input-group"><label>Age (years)</label><input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="45" /></div>
        <div className="rx-input-group">
          <label>Sex</label>
          <div className="rx-toggle-row">
            <button type="button" className={`rx-toggle ${sex === 'male' ? 'active' : ''}`} onClick={() => setSex('male')}>Male</button>
            <button type="button" className={`rx-toggle ${sex === 'female' ? 'active' : ''}`} onClick={() => setSex('female')}>Female</button>
          </div>
        </div>
      </div>
      {egfr && (
        <motion.div className="rx-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GaugeRing value={egfr} max={150} color={color} unit="mL/min" />
          <div className="rx-result-info">
            <span className="rx-result-label">Kidney Function (MDRD)</span>
            <span className="rx-result-value" style={{ color }}>{stage}</span>
            <p className="rx-result-note">eGFR {'\u2265'} 90 is normal. Lower values indicate reduced kidney function.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function IBWCalc() {
  const [height, setHeight] = useState('');
  const [sex, setSex] = useState('male');
  const ibw = useMemo(() => {
    const h = parseFloat(height);
    if (!h) return null;
    const inches = h / 2.54;
    if (inches <= 60) return null;
    const val = sex === 'male' ? 50 + 2.3 * (inches - 60) : 45.5 + 2.3 * (inches - 60);
    return Math.round(val * 10) / 10;
  }, [height, sex]);

  return (
    <div className="rx-calc-body">
      <div className="rx-inputs">
        <div className="rx-input-group"><label>Height (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" /></div>
        <div className="rx-input-group">
          <label>Sex</label>
          <div className="rx-toggle-row">
            <button type="button" className={`rx-toggle ${sex === 'male' ? 'active' : ''}`} onClick={() => setSex('male')}>Male</button>
            <button type="button" className={`rx-toggle ${sex === 'female' ? 'active' : ''}`} onClick={() => setSex('female')}>Female</button>
          </div>
        </div>
      </div>
      {ibw && (
        <motion.div className="rx-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GaugeRing value={ibw} max={120} color="#06b6d4" unit="kg" />
          <div className="rx-result-info">
            <span className="rx-result-label">Ideal Body Weight (Devine)</span>
            <span className="rx-result-value" style={{ color: '#06b6d4' }}>{ibw} kg</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CalorieCalc() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('male');
  const [activity, setActivity] = useState(1.55);

  const bmr = useMemo(() => {
    const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age);
    if (!w || !h || !a) return null;
    return sex === 'male' ? Math.round(10 * w + 6.25 * h - 5 * a + 5) : Math.round(10 * w + 6.25 * h - 5 * a - 161);
  }, [weight, height, age, sex]);

  const tdee = bmr ? Math.round(bmr * activity) : null;

  return (
    <div className="rx-calc-body">
      <div className="rx-inputs">
        <div className="rx-input-group"><label>Weight (kg)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" /></div>
        <div className="rx-input-group"><label>Height (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" /></div>
        <div className="rx-input-group"><label>Age</label><input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="30" /></div>
        <div className="rx-input-group">
          <label>Sex</label>
          <div className="rx-toggle-row">
            <button type="button" className={`rx-toggle ${sex === 'male' ? 'active' : ''}`} onClick={() => setSex('male')}>Male</button>
            <button type="button" className={`rx-toggle ${sex === 'female' ? 'active' : ''}`} onClick={() => setSex('female')}>Female</button>
          </div>
        </div>
        <div className="rx-input-group">
          <label>Activity Level</label>
          <select value={activity} onChange={e => setActivity(parseFloat(e.target.value))} className="rx-select">
            <option value={1.2}>Sedentary</option>
            <option value={1.375}>Light</option>
            <option value={1.55}>Moderate</option>
            <option value={1.725}>Active</option>
            <option value={1.9}>Very Active</option>
          </select>
        </div>
      </div>
      {bmr && (
        <motion.div className="rx-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GaugeRing value={tdee} max={4000} color="#f97316" unit="kcal/day" />
          <div className="rx-result-info">
            <span className="rx-result-label">Daily Calorie Needs (Mifflin-St Jeor)</span>
            <div className="rx-calorie-split">
              <span><strong>BMR:</strong> {bmr} kcal/day</span>
              <span><strong>TDEE:</strong> {tdee} kcal/day</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DoseCalc() {
  const [weight, setWeight] = useState('');
  const [dosePerKg, setDosePerKg] = useState('');
  const [frequency, setFrequency] = useState(1);

  const singleDose = useMemo(() => {
    const w = parseFloat(weight), d = parseFloat(dosePerKg);
    if (!w || !d) return null;
    return Math.round(w * d * 10) / 10;
  }, [weight, dosePerKg]);

  const dailyDose = singleDose ? Math.round(singleDose * frequency * 10) / 10 : null;

  return (
    <div className="rx-calc-body">
      <div className="rx-inputs">
        <div className="rx-input-group"><label>Weight (kg)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" /></div>
        <div className="rx-input-group"><label>Dose (mg/kg)</label><input type="number" step="0.1" value={dosePerKg} onChange={e => setDosePerKg(e.target.value)} placeholder="5" /></div>
        <div className="rx-input-group">
          <label>Frequency/day</label>
          <select value={frequency} onChange={e => setFrequency(parseInt(e.target.value))} className="rx-select">
            <option value={1}>Once daily</option>
            <option value={2}>Twice daily</option>
            <option value={3}>Three times</option>
            <option value={4}>Four times</option>
          </select>
        </div>
      </div>
      {singleDose && (
        <motion.div className="rx-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GaugeRing value={dailyDose} max={2000} color="#ec4899" unit="mg/day" />
          <div className="rx-result-info">
            <span className="rx-result-label">Weight-Based Dosing</span>
            <div className="rx-calorie-split">
              <span><strong>Single Dose:</strong> {singleDose} mg</span>
              <span><strong>Daily Total:</strong> {dailyDose} mg</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const CALC_COMPONENTS = { bmi: BMICalc, bsa: BSACalc, egfr: EGFRCalc, ibw: IBWCalc, calorie: CalorieCalc, dose: DoseCalc };

function RxCalcPage() {
  const [active, setActive] = useState('bmi');
  const ActiveCalc = CALC_COMPONENTS[active];

  return (
    <div className="rx-page">
      <div className="rx-hero">
        <span className="rx-hero-badge">RxCalc</span>
        <h1 className="rx-title">Medical Calculator Suite</h1>
        <p className="rx-subtitle">Essential clinical calculators for BMI, body surface area, kidney function, dosing & more</p>
      </div>

      <div className="rx-calc-grid">
        {CALCULATORS.map((c) => (
          <motion.button
            key={c.id}
            className={`rx-calc-tab ${active === c.id ? 'active' : ''}`}
            onClick={() => setActive(c.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="rx-tab-icon">{c.icon}</span>
            <span className="rx-tab-label">{c.label}</span>
            <span className="rx-tab-desc">{c.desc}</span>
          </motion.button>
        ))}
      </div>

      <motion.div className="rx-active-calc" key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h2 className="rx-calc-heading">{CALCULATORS.find(c => c.id === active)?.label}</h2>
        <ActiveCalc />
      </motion.div>

      <div className="rx-disclaimer">
        <span>{'\u26A0\uFE0F'}</span>
        <span>These calculators are for educational and reference purposes only. Always consult a healthcare professional for clinical decisions.</span>
      </div>
    </div>
  );
}

export default RxCalcPage;

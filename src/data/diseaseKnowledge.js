const DISEASE_KNOWLEDGE = {
  diabetes: {
    precautions: [
      'Monitor blood sugar levels regularly with a glucometer',
      'Take prescribed insulin or oral medication on time',
      'Engage in at least 30 minutes of physical activity daily',
      'Attend regular eye, kidney, and foot check-ups',
      'Avoid skipping meals to prevent blood sugar fluctuations',
    ],
    diet: {
      recommended: [
        'Leafy greens (spinach, kale)',
        'Whole grains (brown rice, oats, quinoa)',
        'Lean proteins (chicken breast, fish, tofu)',
        'Legumes and lentils',
        'Nuts (almonds, walnuts)',
        'Berries and citrus fruits in moderation',
      ],
      avoid: [
        'Refined sugar and sugary beverages',
        'White bread and processed carbs',
        'Fried and deep-fried foods',
        'Fruit juices with added sugar',
        'Alcohol in excess',
      ],
    },
    awareness: [
      'Frequent urination, excessive thirst, and unexplained weight loss are early warning signs',
      'Type 2 diabetes can often be managed or reversed with lifestyle changes',
      'Uncontrolled diabetes can lead to neuropathy, retinopathy, and kidney failure',
      'HbA1c test every 3 months helps track long-term blood sugar control',
    ],
  },

  hypertension: {
    precautions: [
      'Monitor blood pressure at home at least twice a week',
      'Reduce sodium intake to less than 2,300 mg per day',
      'Manage stress through meditation, yoga, or breathing exercises',
      'Avoid smoking and limit alcohol consumption',
      'Maintain a healthy body weight (BMI 18.5–24.9)',
    ],
    diet: {
      recommended: [
        'Bananas and potassium-rich foods',
        'Dark leafy greens',
        'Beets and beet juice',
        'Low-fat dairy products',
        'Fatty fish (salmon, mackerel)',
        'Garlic and olive oil',
      ],
      avoid: [
        'Processed and canned foods (high sodium)',
        'Red meat in large quantities',
        'Caffeine in excess',
        'Pickles and salty snacks',
        'Fast food and frozen meals',
      ],
    },
    awareness: [
      'Hypertension is called the "silent killer" — often has no symptoms until damage is done',
      'Normal blood pressure is below 120/80 mmHg',
      'Chronic hypertension increases risk of stroke, heart attack, and kidney disease',
      'DASH diet is clinically proven to lower blood pressure',
    ],
  },

  anemia: {
    precautions: [
      'Get iron levels and complete blood count (CBC) tested regularly',
      'Pair iron-rich foods with vitamin C to improve absorption',
      'Avoid drinking tea or coffee immediately after meals (inhibits iron absorption)',
      'Take iron supplements only as prescribed by a doctor',
      'Report fatigue, dizziness, or pale skin to your healthcare provider',
    ],
    diet: {
      recommended: [
        'Red meat, liver, and organ meats',
        'Spinach and dark leafy greens',
        'Lentils, chickpeas, and beans',
        'Fortified cereals and breads',
        'Dried fruits (raisins, apricots)',
        'Eggs and shellfish',
      ],
      avoid: [
        'Excessive dairy with iron-rich meals',
        'Tea and coffee with meals',
        'Calcium supplements at the same time as iron supplements',
        'Highly processed foods low in nutrients',
        'Excess alcohol',
      ],
    },
    awareness: [
      'Iron-deficiency anemia is the most common type worldwide',
      'Women, children, and vegetarians are at higher risk',
      'Symptoms include fatigue, weakness, shortness of breath, and cold hands/feet',
      'Severe anemia can cause heart complications if left untreated',
    ],
  },

  cancer: {
    precautions: [
      'Attend all recommended cancer screenings (mammogram, colonoscopy, Pap smear)',
      'Avoid tobacco in all forms',
      'Use sunscreen and avoid prolonged UV exposure',
      'Limit alcohol consumption',
      'Report any persistent lumps, unusual bleeding, or unexplained weight loss',
    ],
    diet: {
      recommended: [
        'Cruciferous vegetables (broccoli, cauliflower, cabbage)',
        'Berries (blueberries, strawberries) rich in antioxidants',
        'Tomatoes (lycopene-rich)',
        'Green tea',
        'Turmeric and ginger',
        'Whole grains and high-fiber foods',
      ],
      avoid: [
        'Processed meats (bacon, sausage, hot dogs)',
        'Charred or heavily grilled meats',
        'Excess red meat',
        'Sugary foods and drinks',
        'Alcohol in excess',
      ],
    },
    awareness: [
      'Early detection dramatically improves survival rates for most cancers',
      'Lifestyle factors account for roughly 30-50% of all cancer cases',
      'Unexplained weight loss, persistent fatigue, or chronic pain warrant medical evaluation',
      'Family history increases risk — discuss genetic screening with your doctor',
    ],
  },

  'thyroid disorder': {
    precautions: [
      'Get thyroid function tests (TSH, T3, T4) annually',
      'Take thyroid medication on an empty stomach, 30 min before breakfast',
      'Avoid self-adjusting medication dosage',
      'Monitor for sudden weight changes, fatigue, or mood swings',
      'Inform your doctor about all supplements you take (especially iodine and biotin)',
    ],
    diet: {
      recommended: [
        'Iodized salt (in moderation)',
        'Seafood and seaweed',
        'Brazil nuts (selenium source)',
        'Eggs and dairy products',
        'Lean meats',
        'Fresh fruits and vegetables',
      ],
      avoid: [
        'Excess soy products (may interfere with thyroid medication)',
        'Raw cruciferous vegetables in large amounts (goitrogens)',
        'Highly processed foods',
        'Excess caffeine',
        'Gluten (if you have Hashimoto\'s — consult your doctor)',
      ],
    },
    awareness: [
      'Hypothyroidism causes fatigue, weight gain, and cold intolerance',
      'Hyperthyroidism causes weight loss, rapid heartbeat, and anxiety',
      'Thyroid disorders are 5-8 times more common in women',
      'Untreated thyroid conditions can affect heart health and fertility',
    ],
  },

  'kidney disease': {
    precautions: [
      'Monitor kidney function with regular blood tests (creatinine, GFR)',
      'Stay well-hydrated — drink adequate water daily',
      'Control blood pressure and blood sugar levels',
      'Avoid over-the-counter painkillers (NSAIDs) without medical advice',
      'Limit protein intake as advised by your nephrologist',
    ],
    diet: {
      recommended: [
        'Cabbage, cauliflower, and bell peppers',
        'Blueberries and cranberries',
        'Egg whites',
        'Fish (in controlled portions)',
        'Olive oil',
        'Garlic and onions',
      ],
      avoid: [
        'High-sodium processed foods',
        'Bananas and oranges (high potassium — in advanced stages)',
        'Dark-colored sodas (high phosphorus)',
        'Dairy in excess',
        'Canned and processed meats',
      ],
    },
    awareness: [
      'Kidney disease often has no symptoms until 70-80% of function is lost',
      'Diabetes and hypertension are the leading causes of chronic kidney disease',
      'Dark, foamy, or bloody urine and persistent swelling are warning signs',
      'Early detection can slow progression and avoid dialysis',
    ],
  },

  'liver disease': {
    precautions: [
      'Limit or eliminate alcohol consumption',
      'Get vaccinated for Hepatitis A and B',
      'Avoid sharing needles or personal hygiene items',
      'Monitor liver function tests (ALT, AST, bilirubin) regularly',
      'Use medications cautiously — many are metabolized by the liver',
    ],
    diet: {
      recommended: [
        'Coffee (shown to protect the liver)',
        'Oatmeal and whole grains',
        'Green tea',
        'Grapefruit and berries',
        'Fatty fish (omega-3)',
        'Leafy greens and beetroot',
      ],
      avoid: [
        'Alcohol',
        'Fried and fatty foods',
        'Excess salt',
        'Raw or undercooked shellfish',
        'High-sugar foods and sodas',
      ],
    },
    awareness: [
      'Non-alcoholic fatty liver disease (NAFLD) is rising rapidly globally',
      'Yellowing of skin/eyes (jaundice), dark urine, and abdominal swelling are red flags',
      'Hepatitis B and C are major causes of liver cirrhosis and cancer',
      'The liver can regenerate, but chronic damage leads to irreversible scarring',
    ],
  },

  'heart disease': {
    precautions: [
      'Get regular cardiac check-ups (ECG, lipid panel, blood pressure)',
      'Exercise at least 150 minutes per week (moderate intensity)',
      'Quit smoking — it doubles the risk of heart disease',
      'Manage stress and get 7-8 hours of quality sleep',
      'Know the warning signs of a heart attack and act fast',
    ],
    diet: {
      recommended: [
        'Fatty fish (salmon, sardines)',
        'Olive oil and avocado',
        'Nuts and seeds (flaxseed, chia)',
        'Whole grains (oats, barley)',
        'Berries and dark chocolate (in moderation)',
        'Legumes and beans',
      ],
      avoid: [
        'Trans fats and partially hydrogenated oils',
        'Excess sodium and processed foods',
        'Sugary drinks and pastries',
        'Red meat in excess',
        'Full-fat dairy in large amounts',
      ],
    },
    awareness: [
      'Heart disease is the #1 cause of death worldwide',
      'Chest pain, shortness of breath, and jaw/arm pain require immediate medical attention',
      'Women may experience atypical symptoms like nausea, extreme fatigue, and back pain',
      'A healthy lifestyle can prevent up to 80% of heart disease cases',
    ],
  },

  tuberculosis: {
    precautions: [
      'Complete the full course of TB medication (usually 6-9 months)',
      'Cover your mouth when coughing or sneezing',
      'Ensure good ventilation in living and work spaces',
      'Get tested if you have been in close contact with a TB patient',
      'Take BCG vaccination where recommended',
    ],
    diet: {
      recommended: [
        'High-calorie, high-protein meals (eggs, chicken, fish)',
        'Whole grains and complex carbohydrates',
        'Fruits rich in Vitamin C (oranges, kiwi)',
        'Green leafy vegetables',
        'Milk and dairy products',
        'Nuts and seeds',
      ],
      avoid: [
        'Alcohol (interferes with TB medication)',
        'Tobacco and smoking',
        'Refined sugar and processed foods',
        'Trans fats and fried foods',
        'Excess caffeine',
      ],
    },
    awareness: [
      'TB is caused by bacteria spread through airborne droplets',
      'Persistent cough for more than 2 weeks, night sweats, and weight loss are key symptoms',
      'Drug-resistant TB is a growing global concern',
      'TB is curable if treatment is completed fully and on time',
    ],
  },

  malaria: {
    precautions: [
      'Use insecticide-treated bed nets, especially at night',
      'Apply mosquito repellent on exposed skin',
      'Wear long sleeves and pants in endemic areas',
      'Take antimalarial prophylaxis when traveling to high-risk zones',
      'Eliminate stagnant water around your home',
    ],
    diet: {
      recommended: [
        'Fluids — coconut water, ORS, clear broths',
        'Easily digestible foods (rice porridge, khichdi)',
        'Vitamin C-rich fruits (oranges, papaya)',
        'Lean proteins',
        'Iron-rich foods after recovery',
        'Herbal teas (ginger, tulsi)',
      ],
      avoid: [
        'Oily and spicy foods during active infection',
        'Heavy meals',
        'Caffeinated and carbonated drinks',
        'Processed foods',
        'Alcohol',
      ],
    },
    awareness: [
      'Malaria is transmitted by the Anopheles mosquito, mainly active at dusk and dawn',
      'Symptoms include high fever with chills, headache, and body aches',
      'Severe malaria can cause organ failure and death if untreated',
      'Rapid diagnostic tests (RDTs) allow quick detection',
    ],
  },

  dengue: {
    precautions: [
      'Prevent mosquito breeding by removing standing water',
      'Use mosquito repellent and wear protective clothing',
      'Watch for warning signs: persistent vomiting, bleeding gums, severe abdominal pain',
      'Stay hydrated with ORS and fluids during infection',
      'Avoid aspirin and ibuprofen — they can worsen bleeding risk',
    ],
    diet: {
      recommended: [
        'Papaya leaf juice (shown to boost platelet count)',
        'Coconut water and ORS',
        'Kiwi and pomegranate',
        'Spinach and broccoli',
        'Light soups and broths',
        'Turmeric milk',
      ],
      avoid: [
        'Oily and fried foods',
        'Spicy foods',
        'Caffeinated drinks',
        'Alcohol',
        'Processed and junk food',
      ],
    },
    awareness: [
      'Dengue is spread by the Aedes aegypti mosquito, active during daytime',
      'Dengue fever can progress to hemorrhagic fever — seek immediate care if platelets drop',
      'There is no specific antiviral treatment; care is supportive',
      'Second infections with a different dengue serotype can be more severe',
    ],
  },

  'high cholesterol': {
    precautions: [
      'Get a lipid profile test at least once a year',
      'Exercise regularly — at least 30 minutes most days',
      'Maintain a healthy weight',
      'Take statin medications as prescribed if recommended',
      'Quit smoking — it lowers HDL (good cholesterol)',
    ],
    diet: {
      recommended: [
        'Oats and barley (soluble fiber)',
        'Fatty fish (omega-3)',
        'Almonds, walnuts, and flaxseed',
        'Olive oil and avocado',
        'Beans and lentils',
        'Soy products (tofu, soy milk)',
      ],
      avoid: [
        'Trans fats (baked goods, margarine)',
        'Saturated fats (butter, cream, fatty meats)',
        'Fried foods',
        'Full-fat dairy products',
        'Processed and fast food',
      ],
    },
    awareness: [
      'High cholesterol has no symptoms — blood test is the only way to know',
      'LDL ("bad") cholesterol above 160 mg/dL significantly increases heart risk',
      'HDL ("good") cholesterol above 60 mg/dL is protective',
      'Lifestyle changes can reduce cholesterol by 10-20% without medication',
    ],
  },

  'vitamin deficiency': {
    precautions: [
      'Get a comprehensive vitamin panel blood test annually',
      'Spend 15-20 minutes in morning sunlight for Vitamin D',
      'Supplement only after confirming deficiency with blood work',
      'Eat a varied, colorful diet with fruits, vegetables, and proteins',
      'Consult a doctor if you experience chronic fatigue, hair loss, or weakness',
    ],
    diet: {
      recommended: [
        'Citrus fruits and bell peppers (Vitamin C)',
        'Eggs, fatty fish, and fortified milk (Vitamin D)',
        'Leafy greens (folate, Vitamin K)',
        'Nuts and seeds (Vitamin E)',
        'Meat, poultry, and shellfish (Vitamin B12)',
        'Carrots and sweet potatoes (Vitamin A)',
      ],
      avoid: [
        'Highly processed foods with empty calories',
        'Excess alcohol (depletes B vitamins)',
        'Crash diets and extreme food restrictions',
        'Excessive tea/coffee (reduces mineral absorption)',
        'Relying solely on supplements without dietary changes',
      ],
    },
    awareness: [
      'Vitamin D deficiency affects over 1 billion people worldwide',
      'B12 deficiency is common in vegetarians and older adults',
      'Symptoms vary widely: fatigue, tingling, mood changes, bone pain, poor wound healing',
      'Over-supplementation of fat-soluble vitamins (A, D, E, K) can be toxic',
    ],
  },

  'urinary tract infection': {
    precautions: [
      'Drink plenty of water — at least 8-10 glasses daily',
      'Urinate frequently and do not hold urine for prolonged periods',
      'Practice proper hygiene (front-to-back wiping)',
      'Complete the full course of antibiotics if prescribed',
      'Avoid irritating feminine hygiene products',
    ],
    diet: {
      recommended: [
        'Water and herbal teas (plenty of fluids)',
        'Cranberry juice (unsweetened)',
        'Probiotic-rich foods (yogurt, kefir)',
        'Vitamin C-rich fruits',
        'Garlic (natural antimicrobial)',
        'High-fiber whole grains',
      ],
      avoid: [
        'Caffeine and alcohol',
        'Spicy foods',
        'Artificial sweeteners',
        'Sugary foods and drinks',
        'Carbonated beverages',
      ],
    },
    awareness: [
      'UTIs are far more common in women than men due to shorter urethra',
      'Burning sensation during urination, frequent urge, and cloudy urine are classic symptoms',
      'Untreated UTIs can spread to kidneys and cause serious complications',
      'Recurrent UTIs may need preventive strategies — consult a urologist',
    ],
  },

  pneumonia: {
    precautions: [
      'Get vaccinated (pneumococcal vaccine and annual flu shot)',
      'Practice good hand hygiene and respiratory etiquette',
      'Avoid smoking — it damages lung defenses',
      'Complete the full course of prescribed antibiotics',
      'Rest and stay hydrated during recovery',
    ],
    diet: {
      recommended: [
        'Warm soups and broths',
        'Honey and warm lemon water',
        'Protein-rich foods for tissue repair',
        'Probiotic foods (yogurt)',
        'Vitamin C-rich fruits and vegetables',
        'Ginger and turmeric tea',
      ],
      avoid: [
        'Cold and frozen foods',
        'Dairy (may thicken mucus in some individuals)',
        'Fried and greasy foods',
        'Excess salt',
        'Alcohol and caffeine',
      ],
    },
    awareness: [
      'Pneumonia is a leading cause of death in children under 5 worldwide',
      'Symptoms include fever, cough with phlegm, chest pain, and difficulty breathing',
      'Older adults, smokers, and immunocompromised individuals are at highest risk',
      'Seek emergency care if you experience bluish lips, high fever, or confusion',
    ],
  },

  asthma: {
    precautions: [
      'Always carry a rescue inhaler (bronchodilator)',
      'Identify and avoid personal triggers (dust, pollen, smoke, cold air)',
      'Follow your asthma action plan prescribed by your doctor',
      'Use a peak flow meter to monitor lung function',
      'Keep living spaces clean and dust-free',
    ],
    diet: {
      recommended: [
        'Fruits and vegetables rich in antioxidants',
        'Fatty fish (omega-3 reduces inflammation)',
        'Ginger and turmeric',
        'Magnesium-rich foods (spinach, pumpkin seeds)',
        'Apples and bananas',
        'Green tea',
      ],
      avoid: [
        'Sulfite-containing foods (wine, dried fruits, pickles)',
        'Gas-producing foods if they worsen symptoms',
        'Excess dairy (if it triggers mucus in your case)',
        'Processed foods with preservatives',
        'Cold drinks (can trigger bronchospasm)',
      ],
    },
    awareness: [
      'Asthma cannot be cured, but can be effectively controlled with medication',
      'Wheezing, chest tightness, shortness of breath, and nighttime coughing are key symptoms',
      'Exercise-induced asthma can be managed with proper warm-up and pre-exercise inhaler use',
      'Air pollution and allergens are major triggers — check air quality index regularly',
    ],
  },

  COPD: {
    precautions: [
      'Quit smoking immediately — it is the #1 cause of COPD',
      'Use prescribed inhalers and oxygen therapy as directed',
      'Get annual flu and pneumonia vaccinations',
      'Practice pulmonary rehabilitation exercises',
      'Avoid exposure to air pollution, dust, and chemical fumes',
    ],
    diet: {
      recommended: [
        'High-protein foods (eggs, fish, lean meat)',
        'Complex carbohydrates (whole grains, sweet potatoes)',
        'Healthy fats (olive oil, avocado)',
        'Small, frequent meals instead of large ones',
        'Potassium-rich foods (bananas, potatoes)',
        'Adequate fluids (water, herbal tea)',
      ],
      avoid: [
        'Carbonated beverages (cause bloating and breathing difficulty)',
        'Excess salt (causes water retention)',
        'Fried and processed foods',
        'Foods that cause gas (beans, cabbage — in large amounts)',
        'Large heavy meals',
      ],
    },
    awareness: [
      'COPD includes chronic bronchitis and emphysema',
      'Progressive shortness of breath, chronic cough, and mucus production are hallmarks',
      'COPD is the 3rd leading cause of death globally',
      'Lung damage is irreversible, but treatment slows progression significantly',
    ],
  },

  arthritis: {
    precautions: [
      'Stay physically active with low-impact exercises (swimming, cycling, yoga)',
      'Maintain a healthy body weight to reduce joint stress',
      'Use assistive devices (braces, ergonomic tools) as needed',
      'Apply heat or cold packs to relieve joint pain and stiffness',
      'Take medications as prescribed and report side effects',
    ],
    diet: {
      recommended: [
        'Fatty fish (salmon, tuna) — omega-3 reduces inflammation',
        'Extra virgin olive oil',
        'Berries, cherries, and grapes (anthocyanins)',
        'Turmeric and ginger',
        'Leafy greens and broccoli',
        'Nuts (walnuts, almonds)',
      ],
      avoid: [
        'Processed sugar and sweets',
        'Fried foods and trans fats',
        'Refined carbohydrates (white bread, pastries)',
        'Excessive red meat',
        'Alcohol in excess',
      ],
    },
    awareness: [
      'There are over 100 types of arthritis — osteoarthritis and rheumatoid arthritis are most common',
      'Morning stiffness lasting over 30 minutes may indicate inflammatory arthritis',
      'Early treatment of rheumatoid arthritis prevents joint deformity',
      'Regular exercise improves joint mobility and reduces pain long-term',
    ],
  },

  osteoporosis: {
    precautions: [
      'Get a bone density scan (DEXA) if you are over 50 or have risk factors',
      'Ensure adequate calcium (1,000-1,200 mg/day) and Vitamin D intake',
      'Do weight-bearing and resistance exercises regularly',
      'Prevent falls by removing hazards at home and wearing proper footwear',
      'Avoid smoking and limit alcohol to 1 drink per day',
    ],
    diet: {
      recommended: [
        'Dairy products (milk, cheese, yogurt)',
        'Calcium-fortified plant milks',
        'Sardines and salmon (with bones)',
        'Tofu (calcium-set)',
        'Leafy greens (kale, bok choy)',
        'Almonds and sesame seeds',
      ],
      avoid: [
        'Excess caffeine (may increase calcium loss)',
        'High-sodium foods',
        'Carbonated soft drinks',
        'Excess alcohol',
        'Very high-protein diets without adequate calcium',
      ],
    },
    awareness: [
      'Osteoporosis is called the "silent disease" — bone loss occurs without symptoms',
      'Fractures of the hip, spine, and wrist are the most common consequences',
      'Women lose up to 20% of bone density in the 5-7 years after menopause',
      'Weight-bearing exercise at any age helps build and maintain bone strength',
    ],
  },

  'HIV/AIDS': {
    precautions: [
      'Practice safe sex — use condoms consistently',
      'Get tested regularly if you are at risk',
      'Never share needles or syringes',
      'Take antiretroviral therapy (ART) as prescribed without missing doses',
      'Pre-exposure prophylaxis (PrEP) is available for high-risk individuals',
    ],
    diet: {
      recommended: [
        'High-protein foods (lean meats, beans, eggs)',
        'Whole grains and complex carbohydrates',
        'Fruits and vegetables (variety of colors)',
        'Healthy fats (olive oil, nuts, avocado)',
        'Probiotic foods (yogurt, fermented foods)',
        'Adequate hydration',
      ],
      avoid: [
        'Raw or undercooked meat and eggs (infection risk)',
        'Unpasteurized dairy products',
        'Excess sugar and processed foods',
        'Alcohol (interacts with ART)',
        'Grapefruit (interacts with some medications)',
      ],
    },
    awareness: [
      'HIV is a manageable chronic condition with proper ART — life expectancy is near-normal',
      'Undetectable viral load means untransmittable (U=U)',
      'Early detection through testing is critical for effective treatment',
      'Stigma remains a barrier — support and education are essential',
    ],
  },

  hepatitis: {
    precautions: [
      'Get vaccinated against Hepatitis A and B',
      'Avoid sharing razors, toothbrushes, or needles',
      'Practice safe sex',
      'Get tested if you have risk factors or symptoms',
      'Avoid alcohol completely if diagnosed with hepatitis',
    ],
    diet: {
      recommended: [
        'Fresh fruits and vegetables',
        'Whole grains (brown rice, oats)',
        'Lean protein (chicken, fish, tofu)',
        'Coffee (shown to slow liver fibrosis)',
        'Healthy fats (olive oil, walnuts)',
        'Adequate water intake',
      ],
      avoid: [
        'Alcohol (all types)',
        'Raw shellfish',
        'High-fat and fried foods',
        'Excess iron supplements (unless prescribed)',
        'Processed and packaged snacks',
      ],
    },
    awareness: [
      'Hepatitis B and C can become chronic and lead to cirrhosis and liver cancer',
      'Hepatitis C is now curable with direct-acting antivirals (DAAs)',
      'Many people with hepatitis are asymptomatic for years',
      'Fatigue, jaundice, dark urine, and abdominal pain are common symptoms',
    ],
  },

  stroke: {
    precautions: [
      'Control blood pressure — it is the #1 risk factor for stroke',
      'Manage diabetes and cholesterol levels',
      'Exercise regularly and maintain a healthy weight',
      'Know the signs of stroke using FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency',
      'Take blood thinners or anticoagulants as prescribed',
    ],
    diet: {
      recommended: [
        'Fruits and vegetables (5+ servings daily)',
        'Whole grains',
        'Fatty fish',
        'Potassium-rich foods (sweet potatoes, bananas)',
        'Olive oil',
        'Nuts and seeds',
      ],
      avoid: [
        'High-sodium foods',
        'Trans fats and saturated fats',
        'Excess red meat',
        'Sugary beverages',
        'Processed and fast food',
      ],
    },
    awareness: [
      'Stroke is a medical emergency — every minute counts ("time is brain")',
      'FAST test: Face drooping, Arm weakness, Speech difficulty, Time to call emergency',
      'Ischemic stroke (blood clot) accounts for 87% of all strokes',
      'Stroke rehabilitation can help regain lost functions with early intervention',
    ],
  },

  epilepsy: {
    precautions: [
      'Take anti-seizure medications consistently at the same time daily',
      'Get adequate sleep — sleep deprivation is a common seizure trigger',
      'Avoid flashing lights and screens in dark rooms if photosensitive',
      'Wear a medical ID bracelet',
      'Never swim or drive alone if seizures are not fully controlled',
    ],
    diet: {
      recommended: [
        'Ketogenic diet (high fat, low carb) — clinically proven for some epilepsy types',
        'Fresh fruits and vegetables',
        'Lean proteins',
        'Healthy fats (coconut oil, olive oil, avocado)',
        'Nuts and seeds',
        'Adequate hydration',
      ],
      avoid: [
        'Alcohol (lowers seizure threshold)',
        'Caffeine in excess',
        'Artificial sweeteners (aspartame may trigger seizures in some)',
        'Processed and high-sugar foods',
        'Grapefruit (interacts with some anti-seizure drugs)',
      ],
    },
    awareness: [
      'Epilepsy affects 50 million people worldwide',
      'Not all seizures involve convulsions — some cause brief staring spells',
      'Most people with epilepsy can live normal lives with proper medication',
      'First aid during a seizure: protect the person from injury, do NOT put anything in their mouth',
    ],
  },

  'Parkinson disease': {
    precautions: [
      'Take dopamine medications on time — timing is critical for Parkinson\'s',
      'Engage in regular physical activity (walking, tai chi, dancing)',
      'Work with a physical and occupational therapist',
      'Use safety measures at home to prevent falls (grab bars, non-slip mats)',
      'Report any changes in mood, sleep, or movement to your neurologist',
    ],
    diet: {
      recommended: [
        'High-fiber foods (whole grains, vegetables, fruits) to prevent constipation',
        'Adequate fluids throughout the day',
        'Antioxidant-rich foods (berries, green tea)',
        'Omega-3 fatty acids (fish, flaxseed)',
        'Calcium and Vitamin D for bone health',
        'Small, frequent meals',
      ],
      avoid: [
        'High-protein meals close to medication time (protein can block levodopa absorption)',
        'Processed foods',
        'Excess dairy (linked to higher PD risk in some studies)',
        'Iron supplements close to medication time',
        'Alcohol',
      ],
    },
    awareness: [
      'Parkinson\'s is a progressive neurological disorder affecting movement',
      'Tremor, stiffness, slowness of movement, and balance problems are cardinal signs',
      'Non-motor symptoms (depression, sleep disturbance, constipation) often appear years before motor symptoms',
      'Exercise has been shown to slow disease progression',
    ],
  },

  'Alzheimer disease': {
    precautions: [
      'Stay mentally active with puzzles, reading, and social interaction',
      'Exercise regularly — physical activity is neuroprotective',
      'Manage cardiovascular risk factors (hypertension, diabetes, cholesterol)',
      'Ensure quality sleep and treat sleep apnea if present',
      'Create a safe, structured environment for patients',
    ],
    diet: {
      recommended: [
        'Mediterranean and MIND diet foods',
        'Leafy green vegetables (kale, spinach)',
        'Berries (blueberries, strawberries)',
        'Fatty fish and walnuts (omega-3)',
        'Olive oil',
        'Whole grains, beans, and poultry',
      ],
      avoid: [
        'Trans fats and processed foods',
        'Excess red meat',
        'Butter and full-fat cheese in excess',
        'Sweets and pastries',
        'Fried and fast food',
      ],
    },
    awareness: [
      'Alzheimer\'s accounts for 60-80% of all dementia cases',
      'Memory loss, confusion, difficulty with familiar tasks, and personality changes are key symptoms',
      'There is no cure yet, but early treatment and lifestyle changes can slow progression',
      'Caregivers need support too — caregiver burnout is a serious concern',
    ],
  },

  PCOS: {
    precautions: [
      'Get regular hormonal panels (LH, FSH, testosterone, insulin)',
      'Maintain a healthy weight — even 5-10% weight loss improves symptoms',
      'Monitor for insulin resistance with fasting glucose and HbA1c tests',
      'Track your menstrual cycle and report irregularities',
      'Discuss fertility planning early with your gynecologist',
    ],
    diet: {
      recommended: [
        'Anti-inflammatory foods (berries, fatty fish, turmeric)',
        'High-fiber vegetables (broccoli, Brussels sprouts)',
        'Lean proteins (chicken, fish, eggs)',
        'Whole grains (quinoa, brown rice)',
        'Cinnamon (may improve insulin sensitivity)',
        'Healthy fats (avocado, nuts, olive oil)',
      ],
      avoid: [
        'Refined carbohydrates (white bread, pasta, pastries)',
        'Sugary drinks and snacks',
        'Processed and fried foods',
        'Excess dairy (may worsen hormonal acne in some)',
        'Excess caffeine',
      ],
    },
    awareness: [
      'PCOS affects 1 in 10 women of reproductive age',
      'Irregular periods, acne, excess hair growth, and weight gain are common symptoms',
      'PCOS is a leading cause of infertility but is treatable',
      'Long-term risks include Type 2 diabetes, heart disease, and endometrial cancer',
    ],
  },

  jaundice: {
    precautions: [
      'Identify the underlying cause (liver disease, bile duct obstruction, hemolysis)',
      'Stay well hydrated',
      'Avoid self-medication — especially paracetamol in liver-related jaundice',
      'Get liver function tests (LFT) monitored regularly',
      'Rest and avoid strenuous activity during acute phase',
    ],
    diet: {
      recommended: [
        'Fresh fruit juices (sugarcane, carrot, beet)',
        'Light, easily digestible foods (rice, dal, soups)',
        'Lemon water',
        'Papaya and banana',
        'Coconut water',
        'Green vegetables (bitter gourd, radish leaves)',
      ],
      avoid: [
        'Alcohol completely',
        'Oily, fried, and spicy foods',
        'Heavy non-vegetarian meals',
        'Processed and packaged foods',
        'Butter and ghee in excess',
      ],
    },
    awareness: [
      'Jaundice is a symptom (yellow skin/eyes) — not a disease itself',
      'It indicates elevated bilirubin levels in the blood',
      'Newborn jaundice is common and usually resolves, but severe cases need phototherapy',
      'In adults, persistent jaundice warrants immediate liver and biliary investigation',
    ],
  },

  sepsis: {
    precautions: [
      'Treat infections early and completely — do not skip antibiotics',
      'Get vaccinated (flu, pneumonia) to prevent common infections',
      'Clean and monitor wounds — watch for redness, swelling, or pus',
      'Seek immediate medical care for high fever with rapid heartbeat and confusion',
      'Immunocompromised individuals should take extra precautions',
    ],
    diet: {
      recommended: [
        'High-protein foods for immune recovery',
        'Vitamin C-rich fruits and vegetables',
        'Zinc-rich foods (seeds, nuts, legumes)',
        'Probiotic foods to rebuild gut flora after antibiotics',
        'Adequate fluids and electrolytes',
        'Small, frequent meals during recovery',
      ],
      avoid: [
        'Processed and junk food',
        'Excess sugar (suppresses immune function)',
        'Alcohol',
        'Raw or undercooked foods (during recovery)',
        'Highly processed meats',
      ],
    },
    awareness: [
      'Sepsis is a life-threatening emergency — it kills more people than cancer annually',
      'Signs: fever or hypothermia, rapid breathing, fast heart rate, confusion',
      'Sepsis can develop from any infection — even a small cut or UTI',
      'Every hour of delayed treatment increases mortality by 7-8%',
    ],
  },

  meningitis: {
    precautions: [
      'Get vaccinated (meningococcal, pneumococcal, Hib vaccines)',
      'Avoid sharing drinks, utensils, or lip products',
      'Practice good hand hygiene',
      'Seek immediate emergency care for neck stiffness with fever and headache',
      'Take prophylactic antibiotics if exposed to bacterial meningitis',
    ],
    diet: {
      recommended: [
        'Fluids — water, broths, electrolyte drinks',
        'Soft, easily digestible foods during recovery',
        'Vitamin-rich fruits (oranges, berries)',
        'Protein for tissue repair (eggs, lean meat)',
        'Probiotic foods',
        'Omega-3 rich foods (anti-inflammatory)',
      ],
      avoid: [
        'Heavy, greasy meals',
        'Processed foods',
        'Alcohol',
        'Caffeine in excess',
        'Foods that cause nausea (varies by individual)',
      ],
    },
    awareness: [
      'Bacterial meningitis is a medical emergency — can be fatal within hours',
      'Classic triad: severe headache, neck stiffness, and high fever',
      'A non-blanching rash (glass test) may indicate meningococcal septicemia',
      'Viral meningitis is less severe and usually resolves on its own',
    ],
  },

  lupus: {
    precautions: [
      'Protect yourself from sunlight — UV exposure triggers flares',
      'Take immunosuppressive medications as prescribed',
      'Get regular monitoring (blood counts, kidney function, inflammation markers)',
      'Manage stress and get adequate rest',
      'Report new symptoms promptly — lupus can affect any organ',
    ],
    diet: {
      recommended: [
        'Anti-inflammatory foods (fatty fish, turmeric, ginger)',
        'Fruits and vegetables (wide variety)',
        'Whole grains',
        'Calcium and Vitamin D foods (for bone health — steroids increase osteoporosis risk)',
        'Olive oil and nuts',
        'Green tea',
      ],
      avoid: [
        'Alfalfa sprouts (contain L-canavanine, which can trigger flares)',
        'Excess salt (if kidney involvement)',
        'Processed and fried foods',
        'Excess alcohol',
        'Saturated fats and trans fats',
      ],
    },
    awareness: [
      'Lupus is an autoimmune disease — the immune system attacks healthy tissue',
      'The butterfly-shaped facial rash is a hallmark but not always present',
      'Lupus primarily affects women of childbearing age (15-44)',
      'Flares and remissions are characteristic — triggers include stress, sunlight, and infections',
    ],
  },
};

export function getDiseaseInfo(diseaseName) {
  const key = Object.keys(DISEASE_KNOWLEDGE).find(
    (k) => k.toLowerCase() === diseaseName.toLowerCase(),
  );
  return key ? DISEASE_KNOWLEDGE[key] : null;
}

export { DISEASE_KNOWLEDGE };

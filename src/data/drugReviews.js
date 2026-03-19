export const DRUG_REVIEWS = {
  metformin: [
    { rating: 4, text: "Been on it for 2 years, blood sugar is much better controlled. Some stomach upset at first but it went away.", condition: "Type 2 Diabetes", date: "2024-01" },
    { rating: 5, text: "Life changing medication. A1C dropped from 9.2 to 6.5 in 6 months. Minimal side effects.", condition: "Type 2 Diabetes", date: "2024-02" },
    { rating: 3, text: "Works for blood sugar but the GI side effects are rough. Had to take extended release version.", condition: "Type 2 Diabetes", date: "2023-11" },
    { rating: 4, text: "Good medication overall. Lost some weight too which was a bonus. Recommend taking with food.", condition: "Type 2 Diabetes", date: "2023-12" },
    { rating: 2, text: "Couldn't tolerate it. Severe diarrhea and nausea. Had to switch to something else.", condition: "Type 2 Diabetes", date: "2024-01" },
    { rating: 5, text: "Excellent for PCOS. Helped regulate my cycles and I've lost 15 pounds.", condition: "PCOS", date: "2023-10" },
    { rating: 4, text: "Doctor said it's one of the safest diabetes meds. Been taking it for 5 years with no issues.", condition: "Type 2 Diabetes", date: "2024-03" },
    { rating: 3, text: "It works but I feel tired all the time. Not sure if it's the medication or my diabetes.", condition: "Type 2 Diabetes", date: "2023-09" },
  ],
  ozempic: [
    { rating: 5, text: "Amazing results! Lost 30 pounds in 4 months. Appetite is completely different now.", condition: "Type 2 Diabetes", date: "2024-02" },
    { rating: 4, text: "Great for blood sugar control. The weight loss is a nice bonus. Some nausea first few weeks.", condition: "Type 2 Diabetes", date: "2024-01" },
    { rating: 5, text: "This medication changed my life. A1C from 8.5 to 5.9. Down 45 lbs.", condition: "Type 2 Diabetes", date: "2024-03" },
    { rating: 2, text: "Terrible nausea and vomiting. Couldn't eat anything for days after each injection.", condition: "Type 2 Diabetes", date: "2023-12" },
    { rating: 4, text: "Works well but very expensive without insurance. Had to fight to get it covered.", condition: "Weight Management", date: "2024-01" },
    { rating: 3, text: "Lost weight but also lost muscle mass. Make sure to eat enough protein and exercise.", condition: "Weight Management", date: "2023-11" },
    { rating: 5, text: "Finally something that works for my diabetes AND weight. Worth every penny.", condition: "Type 2 Diabetes", date: "2024-02" },
    { rating: 1, text: "Caused severe gastroparesis. Was hospitalized. Do not recommend.", condition: "Type 2 Diabetes", date: "2023-10" },
    { rating: 4, text: "Slow and steady weight loss. Better than crash diets. Food noise is gone.", condition: "Weight Management", date: "2024-03" },
  ],
  lisinopril: [
    { rating: 5, text: "Been on it 10 years for high blood pressure. Works great, no side effects.", condition: "Hypertension", date: "2024-01" },
    { rating: 4, text: "Good blood pressure control. Developed a dry cough but manageable.", condition: "Hypertension", date: "2023-12" },
    { rating: 2, text: "The cough was unbearable. Sounded like I was sick all the time. Had to switch.", condition: "Hypertension", date: "2024-02" },
    { rating: 5, text: "Cheap, effective, once a day. What more could you ask for?", condition: "Hypertension", date: "2023-11" },
    { rating: 4, text: "Helps protect my kidneys according to my doctor. Taking it for diabetes-related kidney issues.", condition: "Diabetic Nephropathy", date: "2024-01" },
    { rating: 3, text: "Works for BP but makes me dizzy when I stand up too fast.", condition: "Hypertension", date: "2023-10" },
    { rating: 5, text: "Generic is super affordable. My BP went from 160/95 to 120/80.", condition: "Hypertension", date: "2024-03" },
  ],
  atorvastatin: [
    { rating: 5, text: "Cholesterol dropped 100 points in 3 months. No side effects.", condition: "High Cholesterol", date: "2024-02" },
    { rating: 4, text: "Works well for cholesterol. Some muscle aches but tolerable.", condition: "High Cholesterol", date: "2024-01" },
    { rating: 2, text: "Severe muscle pain and weakness. Could barely walk up stairs. Had to stop.", condition: "High Cholesterol", date: "2023-12" },
    { rating: 5, text: "LDL went from 180 to 85. Doctor is very happy with results.", condition: "High Cholesterol", date: "2024-03" },
    { rating: 3, text: "Helps cholesterol but I have to take CoQ10 for the muscle cramps.", condition: "High Cholesterol", date: "2023-11" },
    { rating: 4, text: "Generic is very affordable. Taking 40mg at night as prescribed.", condition: "High Cholesterol", date: "2024-01" },
    { rating: 1, text: "Caused liver enzyme elevation. Had to discontinue after blood work.", condition: "High Cholesterol", date: "2023-09" },
  ],
  lexapro: [
    { rating: 5, text: "Saved my life. Anxiety is 90% better. Wish I started it sooner.", condition: "Anxiety", date: "2024-02" },
    { rating: 4, text: "Good for depression but weight gain is real. Up 15 lbs in a year.", condition: "Depression", date: "2024-01" },
    { rating: 3, text: "Helps with anxiety but sexual side effects are frustrating.", condition: "Anxiety", date: "2023-12" },
    { rating: 5, text: "Finally feel like myself again. Depression lifted after about 4 weeks.", condition: "Depression", date: "2024-03" },
    { rating: 2, text: "Made me feel like a zombie. No emotions at all. Switched to something else.", condition: "Depression", date: "2023-11" },
    { rating: 4, text: "Works well but withdrawal is tough. Don't stop cold turkey.", condition: "Anxiety", date: "2024-01" },
    { rating: 5, text: "10mg is perfect for my panic attacks. Haven't had one in 6 months.", condition: "Panic Disorder", date: "2024-02" },
    { rating: 3, text: "First few weeks were rough - increased anxiety, insomnia. Got better after.", condition: "Anxiety", date: "2023-10" },
  ],
  adderall: [
    { rating: 5, text: "Finally can focus at work. Life changing for my ADHD.", condition: "ADHD", date: "2024-02" },
    { rating: 4, text: "Works great but appetite suppression is significant. Lost 10 lbs.", condition: "ADHD", date: "2024-01" },
    { rating: 3, text: "Effective but crash in afternoon is rough. Trying extended release.", condition: "ADHD", date: "2023-12" },
    { rating: 5, text: "Went from failing classes to Dean's List. Proper diagnosis changed everything.", condition: "ADHD", date: "2024-03" },
    { rating: 2, text: "Made my anxiety so much worse. Heart racing all day.", condition: "ADHD", date: "2023-11" },
    { rating: 4, text: "Good medication but tolerance builds up. Have to take breaks.", condition: "ADHD", date: "2024-01" },
    { rating: 1, text: "Couldn't sleep for days. Felt like my heart would explode.", condition: "ADHD", date: "2023-09" },
  ],
  humira: [
    { rating: 5, text: "Rheumatoid arthritis pain is 80% better. Can use my hands again.", condition: "Rheumatoid Arthritis", date: "2024-02" },
    { rating: 4, text: "Works well for Crohn's. In remission for 2 years now.", condition: "Crohn's Disease", date: "2024-01" },
    { rating: 3, text: "Effective but injections burn and I get injection site reactions.", condition: "Psoriasis", date: "2023-12" },
    { rating: 5, text: "Psoriasis cleared up completely. Best medication I've tried.", condition: "Psoriasis", date: "2024-03" },
    { rating: 2, text: "Got frequent infections while on it. Doctor took me off.", condition: "Rheumatoid Arthritis", date: "2023-11" },
    { rating: 4, text: "Expensive but patient assistance program helped. Life changing for my AS.", condition: "Ankylosing Spondylitis", date: "2024-01" },
  ],
  gabapentin: [
    { rating: 4, text: "Good for nerve pain from diabetes. Takes the edge off.", condition: "Diabetic Neuropathy", date: "2024-02" },
    { rating: 3, text: "Helps with pain but makes me drowsy and foggy.", condition: "Nerve Pain", date: "2024-01" },
    { rating: 5, text: "Stopped my restless legs at night. Finally sleeping well.", condition: "RLS", date: "2023-12" },
    { rating: 2, text: "Weight gain and swelling in feet. Had to stop.", condition: "Fibromyalgia", date: "2023-11" },
    { rating: 4, text: "Works for anxiety too. Calms me down without being sedating.", condition: "Anxiety", date: "2024-03" },
    { rating: 3, text: "Be careful - withdrawal is no joke. Taper slowly.", condition: "Nerve Pain", date: "2024-01" },
  ],
};

export const POPULAR_DRUGS = [
  'metformin', 'ozempic', 'lisinopril', 'atorvastatin', 'lexapro',
  'adderall', 'humira', 'gabapentin', 'ibuprofen', 'omeprazole',
  'sertraline', 'amlodipine', 'losartan', 'levothyroxine', 'prednisone',
];

export function analyzeSentiment(text) {
  const positiveWords = ['amazing', 'great', 'excellent', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'recommend', 'effective', 'works', 'helped', 'better', 'improved', 'saved', 'life changing', 'cleared', 'remission', 'finally', 'happy'];
  const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'hate', 'bad', 'painful', 'sick', 'nausea', 'vomiting', 'diarrhea', 'headache', 'dizzy', 'tired', 'exhausted', 'couldn\'t', 'stopped', 'discontinued', 'hospitalized', 'unbearable', 'severe', 'rough'];

  const lower = text.toLowerCase();
  let score = 0;
  let posCount = 0;
  let negCount = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) { score += 1; posCount++; }
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) { score -= 1; negCount++; }
  }

  if (score > 1) return { label: 'Positive', score: Math.min(score / 5, 1), posCount, negCount };
  if (score < -1) return { label: 'Negative', score: Math.max(score / 5, -1), posCount, negCount };
  return { label: 'Neutral', score: 0, posCount, negCount };
}

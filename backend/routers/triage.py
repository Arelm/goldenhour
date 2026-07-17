from openai import OpenAI
import json, os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM = """You are an expert emergency medical triage AI for Lagos, Nigeria.
Return ONLY valid JSON with this structure:
{
  "emergency_type": "CARDIAC_ARREST|STROKE|TRAUMA|SEPSIS|RESPIRATORY|PEDIATRIC|OBSTETRIC|GENERAL",
  "urgency_level": "CRITICAL|HIGH|MODERATE|LOW",
  "specialist_needed": "cardiologist|neurologist|trauma_surgeon|general_surgeon|pediatrician|none",
  "key_requirements": ["list of: icu, cath_lab, ct_scanner, blood_bank, generator"],
  "red_flags": ["critical warning signs from the symptoms"],
  "summary": "One sentence triage summary for the dispatcher"
}
For cardiac/STEMI: require cath_lab and cardiologist.
For stroke: require ct_scanner and neurologist — time is brain.
For trauma: require trauma_surgeon and blood_bank.
CRITICAL and HIGH always require ICU."""


async def run_triage(symptoms, patient_age=None, additional_info=None):
    age = f"Patient age: {patient_age}. " if patient_age else ""
    extra = f"Additional info: {additional_info}. " if additional_info else ""
    response = client.chat.completions.create(
        model="gpt-5.6",
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"{age}{extra}Emergency symptoms: {symptoms}"}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)
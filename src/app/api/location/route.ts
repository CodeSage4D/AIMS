import { NextResponse } from "next/server";
import { Country, State, City } from "country-state-city";

const REGION_MAP: Record<string, string> = {
  // Asia
  IN: "Asia", JP: "Asia", CN: "Asia", SG: "Asia", MY: "Asia", TH: "Asia", ID: "Asia", VN: "Asia", PH: "Asia", KR: "Asia", PK: "Asia", BD: "Asia", LK: "Asia", NP: "Asia", HK: "Asia", TW: "Asia",
  // Middle East
  AE: "Middle East", SA: "Middle East", QA: "Middle East", OM: "Middle East", KW: "Middle East", BH: "Middle East", IL: "Middle East", TR: "Middle East", EG: "Middle East",
  // Europe
  GB: "Europe", DE: "Europe", FR: "Europe", IT: "Europe", ES: "Europe", NL: "Europe", CH: "Europe", SE: "Europe", NO: "Europe", FI: "Europe", DK: "Europe", IE: "Europe", PL: "Europe", BE: "Europe", AT: "Europe", GR: "Europe", PT: "Europe", RU: "Europe", UA: "Europe", CZ: "Europe", HU: "Europe", RO: "Europe",
  // North America
  US: "North America", CA: "North America", MX: "North America", PR: "North America",
  // South America
  BR: "South America", AR: "South America", CL: "South America", CO: "South America", PE: "South America", VE: "South America", EC: "South America", UY: "South America", BO: "South America", PY: "South America",
  // Central America & Caribbean
  CR: "Central America", GT: "Central America", PA: "Central America", JM: "Caribbean", BS: "Caribbean", CU: "Caribbean", DO: "Caribbean",
  // Africa
  ZA: "Africa", NG: "Africa", KE: "Africa", GH: "Africa", MA: "Africa", DZ: "Africa", TN: "Africa", UG: "Africa", TZ: "Africa", ET: "Africa", SN: "Africa",
  // Oceania
  AU: "Oceania", NZ: "Oceania", FJ: "Oceania", PG: "Oceania"
};

function getRegionForCountry(country: any): string {
  const code = country.isoCode || "";
  if (REGION_MAP[code]) return REGION_MAP[code];
  
  // Fallbacks based on phone code ranges
  const phone = country.phonecode || "";
  if (phone.startsWith("+")) {
    const raw = phone.slice(1);
    if (raw.startsWith("7") || raw.startsWith("3") || raw.startsWith("4")) return "Europe";
    if (raw.startsWith("9")) return "Asia";
    if (raw.startsWith("2")) return "Africa";
    if (raw.startsWith("5")) return "South America";
    if (raw.startsWith("6")) return "Oceania";
    if (raw.startsWith("1")) return "North America";
  } else {
    if (phone.startsWith("7") || phone.startsWith("3") || phone.startsWith("4")) return "Europe";
    if (phone.startsWith("9")) return "Asia";
    if (phone.startsWith("2")) return "Africa";
    if (phone.startsWith("5")) return "South America";
    if (phone.startsWith("6")) return "Oceania";
    if (phone.startsWith("1")) return "North America";
  }
  
  return "Asia"; // default fallback
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "countries") {
      const allCountries = Country.getAllCountries().map((c) => ({
        name: c.name,
        code: c.isoCode,
        dialCode: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
        region: getRegionForCountry(c)
      }));
      return NextResponse.json(allCountries, { status: 200 });
    }

    if (type === "states") {
      const countryCode = searchParams.get("countryCode");
      if (!countryCode) {
        return NextResponse.json({ error: "Missing countryCode param" }, { status: 400 });
      }
      const states = State.getStatesOfCountry(countryCode).map((s) => ({
        name: s.name,
        code: s.isoCode
      }));
      return NextResponse.json(states, { status: 200 });
    }

    if (type === "cities") {
      const countryCode = searchParams.get("countryCode");
      const stateCode = searchParams.get("stateCode");
      if (!countryCode || !stateCode) {
        return NextResponse.json({ error: "Missing countryCode or stateCode param" }, { status: 400 });
      }
      const cities = City.getCitiesOfState(countryCode, stateCode).map((c) => ({
        name: c.name
      }));
      return NextResponse.json(cities, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid type param" }, { status: 400 });
  } catch (error: any) {
    console.error("Location API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

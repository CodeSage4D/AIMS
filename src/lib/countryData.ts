export interface City {
  name: string;
}

export interface State {
  name: string;
  cities: City[];
}

export interface Country {
  name: string;
  code: string;
  dialCode: string;
  region: string;
  states: State[];
}

export const COUNTRIES: Country[] = [
  {
    name: "India",
    code: "IN",
    dialCode: "+91",
    region: "Asia",
    states: [
      {
        name: "Maharashtra",
        cities: [{ name: "Mumbai" }, { name: "Pune" }, { name: "Nagpur" }],
      },
      {
        name: "Delhi",
        cities: [{ name: "New Delhi" }, { name: "Delhi" }],
      },
      {
        name: "Karnataka",
        cities: [{ name: "Bengaluru" }, { name: "Mysuru" }],
      },
      {
        name: "Tamil Nadu",
        cities: [{ name: "Chennai" }, { name: "Coimbatore" }],
      },
      {
        name: "Telangana",
        cities: [{ name: "Hyderabad" }, { name: "Warangal" }],
      }
    ],
  },
  {
    name: "United States",
    code: "US",
    dialCode: "+1",
    region: "North America",
    states: [
      {
        name: "California",
        cities: [{ name: "Los Angeles" }, { name: "San Francisco" }, { name: "San Diego" }],
      },
      {
        name: "New York",
        cities: [{ name: "New York City" }, { name: "Buffalo" }],
      },
      {
        name: "Texas",
        cities: [{ name: "Houston" }, { name: "Austin" }, { name: "Dallas" }],
      }
    ],
  },
  {
    name: "United Kingdom",
    code: "GB",
    dialCode: "+44",
    region: "Europe",
    states: [
      {
        name: "England",
        cities: [{ name: "London" }, { name: "Manchester" }, { name: "Birmingham" }],
      },
      {
        name: "Scotland",
        cities: [{ name: "Edinburgh" }, { name: "Glasgow" }],
      }
    ],
  },
  {
    name: "Australia",
    code: "AU",
    dialCode: "+61",
    region: "Asia Pacific",
    states: [
      {
        name: "New South Wales",
        cities: [{ name: "Sydney" }, { name: "Newcastle" }],
      },
      {
        name: "Victoria",
        cities: [{ name: "Melbourne" }, { name: "Geelong" }],
      }
    ],
  },
  {
    name: "Canada",
    code: "CA",
    dialCode: "+1",
    region: "North America",
    states: [
      {
        name: "Ontario",
        cities: [{ name: "Toronto" }, { name: "Ottawa" }],
      },
      {
        name: "British Columbia",
        cities: [{ name: "Vancouver" }, { name: "Victoria" }],
      }
    ],
  },
  {
    name: "Germany",
    code: "DE",
    dialCode: "+49",
    region: "Europe",
    states: [
      {
        name: "Bavaria",
        cities: [{ name: "Munich" }, { name: "Nuremberg" }],
      },
      {
        name: "Berlin",
        cities: [{ name: "Berlin" }],
      }
    ],
  },
  {
    name: "Singapore",
    code: "SG",
    dialCode: "+65",
    region: "Asia Pacific",
    states: [
      {
        name: "Singapore",
        cities: [{ name: "Singapore" }],
      }
    ]
  },
  {
    name: "United Arab Emirates",
    code: "AE",
    dialCode: "+971",
    region: "Middle East",
    states: [
      {
        name: "Dubai",
        cities: [{ name: "Dubai" }],
      },
      {
        name: "Abu Dhabi",
        cities: [{ name: "Abu Dhabi" }],
      }
    ]
  }
];

// Fallback timezones based on country code
export const TIMEZONES: Record<string, string> = {
  "IN": "Asia/Kolkata",
  "US": "America/New_York",
  "GB": "Europe/London",
  "AU": "Australia/Sydney",
  "CA": "America/Toronto",
  "DE": "Europe/Berlin",
  "SG": "Asia/Singapore",
  "AE": "Asia/Dubai"
};

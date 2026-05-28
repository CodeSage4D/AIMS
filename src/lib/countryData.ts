export interface Country {
  name: string;
  code: string;
  dialCode: string;
  region: string;
  timezone: string;
  states: {
    [stateName: string]: string[];
  };
}

export const countryData: Country[] = [
  {
    name: "India",
    code: "IN",
    dialCode: "+91",
    region: "Asia",
    timezone: "Asia/Kolkata",
    states: {
      "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik"],
      "Karnataka": ["Bengaluru", "Mysore", "Hubli", "Mangaluru"],
      "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy"],
      "Delhi": ["New Delhi", "Noida", "Gurugram"],
      "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
      "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
      "West Bengal": ["Kolkata", "Howrah", "Darjeeling"],
      "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi"],
      "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur"]
    }
  },
  {
    name: "United States",
    code: "US",
    dialCode: "+1",
    region: "North America",
    timezone: "America/New_York",
    states: {
      "California": ["Los Angeles", "San Francisco", "San Jose", "San Diego", "Sacramento"],
      "New York": ["New York City", "Buffalo", "Rochester", "Albany"],
      "Texas": ["Houston", "Austin", "Dallas", "San Antonio", "Fort Worth"],
      "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville"],
      "Illinois": ["Chicago", "Springfield", "Peoria"]
    }
  },
  {
    name: "United Kingdom",
    code: "GB",
    dialCode: "+44",
    region: "EU",
    timezone: "Europe/London",
    states: {
      "England": ["London", "Manchester", "Birmingham", "Leeds", "Liverpool"],
      "Scotland": ["Edinburgh", "Glasgow", "Aberdeen", "Dundee"],
      "Wales": ["Cardiff", "Swansea", "Newport"],
      "Northern Ireland": ["Belfast", "Derry"]
    }
  },
  {
    name: "Germany",
    code: "DE",
    dialCode: "+49",
    region: "EU",
    timezone: "Europe/Berlin",
    states: {
      "Bavaria": ["Munich", "Nuremberg", "Augsburg"],
      "Berlin": ["Berlin"],
      "Hamburg": ["Hamburg"],
      "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund", "Essen"]
    }
  },
  {
    name: "Australia",
    code: "AU",
    dialCode: "+61",
    region: "Asia-Pacific",
    timezone: "Australia/Sydney",
    states: {
      "New South Wales": ["Sydney", "Newcastle", "Wollongong"],
      "Victoria": ["Melbourne", "Geelong", "Ballarat"],
      "Queensland": ["Brisbane", "Gold Coast", "Cairns"],
      "Western Australia": ["Perth"]
    }
  },
  {
    name: "Singapore",
    code: "SG",
    dialCode: "+65",
    region: "Asia-Pacific",
    timezone: "Asia/Singapore",
    states: {
      "Central Region": ["Singapore"],
      "East Region": ["Singapore"],
      "North Region": ["Singapore"]
    }
  },
  {
    name: "Canada",
    code: "CA",
    dialCode: "+1",
    region: "North America",
    timezone: "America/Toronto",
    states: {
      "Ontario": ["Toronto", "Ottawa", "Mississauga", "Hamilton"],
      "British Columbia": ["Vancouver", "Victoria", "Burnaby", "Surrey"],
      "Quebec": ["Montreal", "Quebec City", "Laval"],
      "Alberta": ["Calgary", "Edmonton"]
    }
  },
  {
    name: "Japan",
    code: "JP",
    dialCode: "+81",
    region: "Asia-Pacific",
    timezone: "Asia/Tokyo",
    states: {
      "Tokyo": ["Tokyo", "Hachioji"],
      "Osaka": ["Osaka", "Sakai"],
      "Kyoto": ["Kyoto"],
      "Kanagawa": ["Yokohama", "Kawasaki"]
    }
  }
];

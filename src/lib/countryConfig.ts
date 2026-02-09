/**
 * Country-specific configuration for address, bank, and tax fields
 * Used for dynamic form rendering in Profile.tsx
 */

export type CountryCode = 'DE' | 'UK';

/**
 * German states (Bundesländer) for state dropdown
 * Important for holiday calculations
 */
export const GERMAN_STATES = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
] as const;

/**
 * Mapping of German state names to ISO state codes for date-holidays library
 * Format: Full name → ISO code (e.g., "Bayern" → "BY")
 */
export const GERMAN_STATE_CODES: Record<string, string> = {
  'Baden-Württemberg': 'BW',
  'Bayern': 'BY',
  'Berlin': 'BE',
  'Brandenburg': 'BB',
  'Bremen': 'HB',
  'Hamburg': 'HH',
  'Hessen': 'HE',
  'Mecklenburg-Vorpommern': 'MV',
  'Niedersachsen': 'NI',
  'Nordrhein-Westfalen': 'NW',
  'Rheinland-Pfalz': 'RP',
  'Saarland': 'SL',
  'Sachsen': 'SN',
  'Sachsen-Anhalt': 'ST',
  'Schleswig-Holstein': 'SH',
  'Thüringen': 'TH',
};

/**
 * Mapping of German state names to holidayRegion codes
 * Used to automatically update holidayRegion when user changes their state in Profile
 * Format: "Bayern" → "de-by"
 */
export const STATE_TO_HOLIDAY_REGION: Record<string, string> = {
  'Baden-Württemberg': 'de-bw',
  'Bayern': 'de-by',
  'Berlin': 'de-be',
  'Brandenburg': 'de-bb',
  'Bremen': 'de-hb',
  'Hamburg': 'de-hh',
  'Hessen': 'de-he',
  'Mecklenburg-Vorpommern': 'de-mv',
  'Niedersachsen': 'de-ni',
  'Nordrhein-Westfalen': 'de-nw',
  'Rheinland-Pfalz': 'de-rp',
  'Saarland': 'de-sl',
  'Sachsen': 'de-sn',
  'Sachsen-Anhalt': 'de-st',
  'Schleswig-Holstein': 'de-sh',
  'Thüringen': 'de-th',
};

/**
 * Helper: Parse holidayRegion string to extract state code
 * Format: "de-by" → "BY"
 */
export function parseHolidayRegion(holidayRegion: string): string | null {
  if (!holidayRegion) return null;
  
  const parts = holidayRegion.split('-');
  if (parts.length !== 2) return null;
  
  const stateCode = parts[1].toUpperCase();
  return stateCode;
}

interface AddressConfig {
  zipLabel: string;
  stateLabel: string;
  hasStateDropdown: boolean;
  stateOptions?: readonly string[];
  zipRegex: RegExp;
  zipPlaceholder: string;
}

interface BankConfig {
  showIBAN: boolean;
  showSortCode: boolean;
}

interface TaxConfig {
  taxIdLabel: string;
  showTaxClass: boolean;
  socialSecurityLabel: string | null;
}

interface CountryConfiguration {
  name: string;
  locale: string;
  address: AddressConfig;
  bank: BankConfig;
  tax: TaxConfig;
}

/**
 * Country-specific configuration
 * Source of truth for form field rendering
 */
export const COUNTRY_CONFIG: Record<CountryCode, CountryConfiguration> = {
  DE: {
    name: 'Germany',
    locale: 'de-DE',
    address: {
      zipLabel: 'PLZ',
      stateLabel: 'Bundesland',
      hasStateDropdown: true,
      stateOptions: GERMAN_STATES,
      zipRegex: /^\d{5}$/,
      zipPlaceholder: '12345',
    },
    bank: {
      showIBAN: true,
      showSortCode: false,
    },
    tax: {
      taxIdLabel: 'Steuer-ID',
      showTaxClass: true,
      socialSecurityLabel: 'Sozialversicherungsnummer',
    },
  },
  UK: {
    name: 'United Kingdom',
    locale: 'en-GB',
    address: {
      zipLabel: 'Postcode',
      stateLabel: 'County / Region',
      hasStateDropdown: false,
      zipRegex: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
      zipPlaceholder: 'SW1A 1AA',
    },
    bank: {
      showIBAN: false,
      showSortCode: true,
    },
    tax: {
      taxIdLabel: 'National Insurance Number',
      showTaxClass: false,
      socialSecurityLabel: null,
    },
  },
};

/**
 * Get country configuration by code
 */
export function getCountryConfig(countryCode: CountryCode = 'DE'): CountryConfiguration {
  return COUNTRY_CONFIG[countryCode];
}

/**
 * Validate ZIP/Postcode based on country
 */
export function validateZipCode(zip: string, countryCode: CountryCode): boolean {
  const config = getCountryConfig(countryCode);
  return config.address.zipRegex.test(zip);
}

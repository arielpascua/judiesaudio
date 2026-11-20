// lib/countries.ts
//
// ALL_COUNTRIES is the complete ISO 3166-1 alpha-2 reference set, all 249
// officially assigned entries. COUNTRIES / COUNTRY_NAMES, which is what the
// checkout dropdown offers and the API validates against, is that set MINUS the
// handful of comprehensively embargoed destinations in RESTRICTED_COUNTRY_CODES
// (see the end of this file).
//
// WHY SUCH A LONG LIST. A short dropdown becomes a pricing table: a customer in
// Spain or Brazil could not complete a checkout at all. A supplier can quote
// and arrange delivery to almost anywhere once payment is reconciled, so a
// quotable destination and a selectable destination are different things, and
// conflating them would turn an unquoted destination into a lost order.
//
// WHY A COMMITTED LITERAL AND NOT `Intl.DisplayNames` AT RUNTIME. These names
// are written into `ja_orders.shipping_address` and are what a packing list,
// an invoice and a customs form read. ICU data ships with Node, so resolving
// names at runtime would let a Node upgrade silently change the spelling of a
// country between deploys — orders placed either side of it would disagree,
// and nothing would flag it. Written out once, reviewed, frozen. The names
// follow CLDR English at the time of writing, with a few hand edits; the script
// that produced the literal is not kept in this repository, so edit the literal
// itself if a name needs to change (and expect old orders to keep the old spelling).
//
// NOT A SANCTIONS SCREEN. The reference list includes every country; only the
// comprehensive-embargo codes are withheld from the dropdown, and that is a
// blunt commercial safeguard, not a compliance programme (see the end of this
// file). Export-control and screening obligations beyond that are a business
// decision and belong in front of fulfilment, not in a <select>; the payment
// processor and the courier apply their own controls too.

export interface Country {
  /** ISO 3166-1 alpha-2. Stable — use this for customs and shipping, not the name. */
  code: string;
  /** The display name, and what is stored on an order. */
  name: string;
}

/** The full ISO 3166-1 reference set, sorted by name. Includes restricted
 *  destinations — this is reference data, not the list the checkout offers. */
export const ALL_COUNTRIES: readonly Country[] = [
  { code: 'AF', name: "Afghanistan" },
  { code: 'AX', name: "Åland Islands" },
  { code: 'AL', name: "Albania" },
  { code: 'DZ', name: "Algeria" },
  { code: 'AS', name: "American Samoa" },
  { code: 'AD', name: "Andorra" },
  { code: 'AO', name: "Angola" },
  { code: 'AI', name: "Anguilla" },
  { code: 'AQ', name: "Antarctica" },
  { code: 'AG', name: "Antigua & Barbuda" },
  { code: 'AR', name: "Argentina" },
  { code: 'AM', name: "Armenia" },
  { code: 'AW', name: "Aruba" },
  { code: 'AU', name: "Australia" },
  { code: 'AT', name: "Austria" },
  { code: 'AZ', name: "Azerbaijan" },
  { code: 'BS', name: "Bahamas" },
  { code: 'BH', name: "Bahrain" },
  { code: 'BD', name: "Bangladesh" },
  { code: 'BB', name: "Barbados" },
  { code: 'BY', name: "Belarus" },
  { code: 'BE', name: "Belgium" },
  { code: 'BZ', name: "Belize" },
  { code: 'BJ', name: "Benin" },
  { code: 'BM', name: "Bermuda" },
  { code: 'BT', name: "Bhutan" },
  { code: 'BO', name: "Bolivia" },
  { code: 'BA', name: "Bosnia & Herzegovina" },
  { code: 'BW', name: "Botswana" },
  { code: 'BV', name: "Bouvet Island" },
  { code: 'BR', name: "Brazil" },
  { code: 'IO', name: "British Indian Ocean Territory" },
  { code: 'VG', name: "British Virgin Islands" },
  { code: 'BN', name: "Brunei" },
  { code: 'BG', name: "Bulgaria" },
  { code: 'BF', name: "Burkina Faso" },
  { code: 'BI', name: "Burundi" },
  { code: 'KH', name: "Cambodia" },
  { code: 'CM', name: "Cameroon" },
  { code: 'CA', name: "Canada" },
  { code: 'CV', name: "Cape Verde" },
  { code: 'BQ', name: "Caribbean Netherlands" },
  { code: 'KY', name: "Cayman Islands" },
  { code: 'CF', name: "Central African Republic" },
  { code: 'TD', name: "Chad" },
  { code: 'CL', name: "Chile" },
  { code: 'CN', name: "China" },
  { code: 'CX', name: "Christmas Island" },
  { code: 'CC', name: "Cocos (Keeling) Islands" },
  { code: 'CO', name: "Colombia" },
  { code: 'KM', name: "Comoros" },
  { code: 'CG', name: "Congo (Brazzaville)" },
  { code: 'CD', name: "Congo (Kinshasa)" },
  { code: 'CK', name: "Cook Islands" },
  { code: 'CR', name: "Costa Rica" },
  { code: 'CI', name: "Côte d’Ivoire" },
  { code: 'HR', name: "Croatia" },
  { code: 'CU', name: "Cuba" },
  { code: 'CW', name: "Curaçao" },
  { code: 'CY', name: "Cyprus" },
  { code: 'CZ', name: "Czechia" },
  { code: 'DK', name: "Denmark" },
  { code: 'DJ', name: "Djibouti" },
  { code: 'DM', name: "Dominica" },
  { code: 'DO', name: "Dominican Republic" },
  { code: 'EC', name: "Ecuador" },
  { code: 'EG', name: "Egypt" },
  { code: 'SV', name: "El Salvador" },
  { code: 'GQ', name: "Equatorial Guinea" },
  { code: 'ER', name: "Eritrea" },
  { code: 'EE', name: "Estonia" },
  { code: 'SZ', name: "Eswatini" },
  { code: 'ET', name: "Ethiopia" },
  { code: 'FK', name: "Falkland Islands" },
  { code: 'FO', name: "Faroe Islands" },
  { code: 'FJ', name: "Fiji" },
  { code: 'FI', name: "Finland" },
  { code: 'FR', name: "France" },
  { code: 'GF', name: "French Guiana" },
  { code: 'PF', name: "French Polynesia" },
  { code: 'TF', name: "French Southern Territories" },
  { code: 'GA', name: "Gabon" },
  { code: 'GM', name: "Gambia" },
  { code: 'GE', name: "Georgia" },
  { code: 'DE', name: "Germany" },
  { code: 'GH', name: "Ghana" },
  { code: 'GI', name: "Gibraltar" },
  { code: 'GR', name: "Greece" },
  { code: 'GL', name: "Greenland" },
  { code: 'GD', name: "Grenada" },
  { code: 'GP', name: "Guadeloupe" },
  { code: 'GU', name: "Guam" },
  { code: 'GT', name: "Guatemala" },
  { code: 'GG', name: "Guernsey" },
  { code: 'GN', name: "Guinea" },
  { code: 'GW', name: "Guinea-Bissau" },
  { code: 'GY', name: "Guyana" },
  { code: 'HT', name: "Haiti" },
  { code: 'HM', name: "Heard & McDonald Islands" },
  { code: 'HN', name: "Honduras" },
  { code: 'HK', name: "Hong Kong" },
  { code: 'HU', name: "Hungary" },
  { code: 'IS', name: "Iceland" },
  { code: 'IN', name: "India" },
  { code: 'ID', name: "Indonesia" },
  { code: 'IR', name: "Iran" },
  { code: 'IQ', name: "Iraq" },
  { code: 'IE', name: "Ireland" },
  { code: 'IM', name: "Isle of Man" },
  { code: 'IL', name: "Israel" },
  { code: 'IT', name: "Italy" },
  { code: 'JM', name: "Jamaica" },
  { code: 'JP', name: "Japan" },
  { code: 'JE', name: "Jersey" },
  { code: 'JO', name: "Jordan" },
  { code: 'KZ', name: "Kazakhstan" },
  { code: 'KE', name: "Kenya" },
  { code: 'KI', name: "Kiribati" },
  { code: 'KW', name: "Kuwait" },
  { code: 'KG', name: "Kyrgyzstan" },
  { code: 'LA', name: "Laos" },
  { code: 'LV', name: "Latvia" },
  { code: 'LB', name: "Lebanon" },
  { code: 'LS', name: "Lesotho" },
  { code: 'LR', name: "Liberia" },
  { code: 'LY', name: "Libya" },
  { code: 'LI', name: "Liechtenstein" },
  { code: 'LT', name: "Lithuania" },
  { code: 'LU', name: "Luxembourg" },
  { code: 'MO', name: "Macao" },
  { code: 'MG', name: "Madagascar" },
  { code: 'MW', name: "Malawi" },
  { code: 'MY', name: "Malaysia" },
  { code: 'MV', name: "Maldives" },
  { code: 'ML', name: "Mali" },
  { code: 'MT', name: "Malta" },
  { code: 'MH', name: "Marshall Islands" },
  { code: 'MQ', name: "Martinique" },
  { code: 'MR', name: "Mauritania" },
  { code: 'MU', name: "Mauritius" },
  { code: 'YT', name: "Mayotte" },
  { code: 'MX', name: "Mexico" },
  { code: 'FM', name: "Micronesia" },
  { code: 'MD', name: "Moldova" },
  { code: 'MC', name: "Monaco" },
  { code: 'MN', name: "Mongolia" },
  { code: 'ME', name: "Montenegro" },
  { code: 'MS', name: "Montserrat" },
  { code: 'MA', name: "Morocco" },
  { code: 'MZ', name: "Mozambique" },
  { code: 'MM', name: "Myanmar (Burma)" },
  { code: 'NA', name: "Namibia" },
  { code: 'NR', name: "Nauru" },
  { code: 'NP', name: "Nepal" },
  { code: 'NL', name: "Netherlands" },
  { code: 'NC', name: "New Caledonia" },
  { code: 'NZ', name: "New Zealand" },
  { code: 'NI', name: "Nicaragua" },
  { code: 'NE', name: "Niger" },
  { code: 'NG', name: "Nigeria" },
  { code: 'NU', name: "Niue" },
  { code: 'NF', name: "Norfolk Island" },
  { code: 'KP', name: "North Korea" },
  { code: 'MK', name: "North Macedonia" },
  { code: 'MP', name: "Northern Mariana Islands" },
  { code: 'NO', name: "Norway" },
  { code: 'OM', name: "Oman" },
  { code: 'PK', name: "Pakistan" },
  { code: 'PW', name: "Palau" },
  { code: 'PS', name: "Palestinian Territories" },
  { code: 'PA', name: "Panama" },
  { code: 'PG', name: "Papua New Guinea" },
  { code: 'PY', name: "Paraguay" },
  { code: 'PE', name: "Peru" },
  { code: 'PH', name: "Philippines" },
  { code: 'PN', name: "Pitcairn Islands" },
  { code: 'PL', name: "Poland" },
  { code: 'PT', name: "Portugal" },
  { code: 'PR', name: "Puerto Rico" },
  { code: 'QA', name: "Qatar" },
  { code: 'RE', name: "Réunion" },
  { code: 'RO', name: "Romania" },
  { code: 'RU', name: "Russia" },
  { code: 'RW', name: "Rwanda" },
  { code: 'WS', name: "Samoa" },
  { code: 'SM', name: "San Marino" },
  { code: 'ST', name: "São Tomé & Príncipe" },
  { code: 'SA', name: "Saudi Arabia" },
  { code: 'SN', name: "Senegal" },
  { code: 'RS', name: "Serbia" },
  { code: 'SC', name: "Seychelles" },
  { code: 'SL', name: "Sierra Leone" },
  { code: 'SG', name: "Singapore" },
  { code: 'SX', name: "Sint Maarten" },
  { code: 'SK', name: "Slovakia" },
  { code: 'SI', name: "Slovenia" },
  { code: 'SB', name: "Solomon Islands" },
  { code: 'SO', name: "Somalia" },
  { code: 'ZA', name: "South Africa" },
  { code: 'GS', name: "South Georgia & South Sandwich Islands" },
  { code: 'KR', name: "South Korea" },
  { code: 'SS', name: "South Sudan" },
  { code: 'ES', name: "Spain" },
  { code: 'LK', name: "Sri Lanka" },
  { code: 'BL', name: "St. Barthélemy" },
  { code: 'SH', name: "St. Helena" },
  { code: 'KN', name: "St. Kitts & Nevis" },
  { code: 'LC', name: "St. Lucia" },
  { code: 'MF', name: "St. Martin" },
  { code: 'PM', name: "St. Pierre & Miquelon" },
  { code: 'VC', name: "St. Vincent & Grenadines" },
  { code: 'SD', name: "Sudan" },
  { code: 'SR', name: "Suriname" },
  { code: 'SJ', name: "Svalbard & Jan Mayen" },
  { code: 'SE', name: "Sweden" },
  { code: 'CH', name: "Switzerland" },
  { code: 'SY', name: "Syria" },
  { code: 'TW', name: "Taiwan" },
  { code: 'TJ', name: "Tajikistan" },
  { code: 'TZ', name: "Tanzania" },
  { code: 'TH', name: "Thailand" },
  { code: 'TL', name: "Timor-Leste" },
  { code: 'TG', name: "Togo" },
  { code: 'TK', name: "Tokelau" },
  { code: 'TO', name: "Tonga" },
  { code: 'TT', name: "Trinidad & Tobago" },
  { code: 'TN', name: "Tunisia" },
  { code: 'TR', name: "Türkiye" },
  { code: 'TM', name: "Turkmenistan" },
  { code: 'TC', name: "Turks & Caicos Islands" },
  { code: 'TV', name: "Tuvalu" },
  { code: 'UM', name: "U.S. Outlying Islands" },
  { code: 'VI', name: "U.S. Virgin Islands" },
  { code: 'UG', name: "Uganda" },
  { code: 'UA', name: "Ukraine" },
  { code: 'AE', name: "United Arab Emirates" },
  { code: 'GB', name: "United Kingdom" },
  { code: 'US', name: "United States" },
  { code: 'UY', name: "Uruguay" },
  { code: 'UZ', name: "Uzbekistan" },
  { code: 'VU', name: "Vanuatu" },
  { code: 'VA', name: "Vatican City" },
  { code: 'VE', name: "Venezuela" },
  { code: 'VN', name: "Vietnam" },
  { code: 'WF', name: "Wallis & Futuna" },
  { code: 'EH', name: "Western Sahara" },
  { code: 'YE', name: "Yemen" },
  { code: 'ZM', name: "Zambia" },
  { code: 'ZW', name: "Zimbabwe" },
];

// ---------------------------------------------------------------------------
// Destinations we will not ship to
// ---------------------------------------------------------------------------
//
// THE CRITERION IS A COMPREHENSIVE EMBARGO — a whole-territory prohibition,
// not sanctions against named individuals, a government, or one industry.
// Under one of these, a commercial furniture shipment is prohibited outright
// and the card rails behind Maya will decline the payment regardless, so
// offering the destination produces a checkout that cannot complete and an
// order nobody can fulfil.
//
// Listed by ISO code rather than name so a future rename cannot quietly
// un-restrict one.
//
// DELIBERATELY NOT INCLUDED, because their sanctions are targeted or sectoral
// rather than comprehensive, and shipping furniture to a private buyer there is
// not itself prohibited:
//
//   Russia (RU), Belarus (BY)  — extensive sectoral sanctions, and the Visa and
//                                Mastercard suspensions mean a card payment is
//                                likely to fail in practice. Add them here if
//                                you would rather not offer them at all; that
//                                is a commercial call, not a legal one.
//   Afghanistan (AF)           — targeted at the Taliban; banking is difficult
//                                but trade is not comprehensively barred.
//   Venezuela (VE), Myanmar (MM) — targeted at the state and named entities.
//
// The Philippines implements UN Security Council measures, of which only the
// North Korea regime is a comprehensive trade embargo. The other three are
// included because they reach any transaction touching US or EU banking, which
// every international card payment does.
//
// WHAT THIS CANNOT DO. Sanctions on Crimea, Donetsk, Luhansk, Zaporizhzhia and
// Kherson are territorial, and those regions have no ISO 3166-1 code of their
// own — they sit inside Ukraine. A country dropdown cannot express them, so
// they must be caught at fulfilment by reading the address. The same is true of
// screening against named-person lists, which no country field can do.
//
// This is a blunt commercial safeguard, NOT a compliance programme.
export const RESTRICTED_COUNTRY_CODES: readonly string[] = [
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea
  'SY', // Syria
];

const RESTRICTED = new Set(RESTRICTED_COUNTRY_CODES);

/** Is this a real country that we will not ship to? */
export function isRestrictedCountry(name: string): boolean {
  const match = ALL_COUNTRIES.find((c) => c.name === name);
  return match ? RESTRICTED.has(match.code) : false;
}

/**
 * The countries the checkout actually offers — every ISO country except the
 * embargoed ones. This is what the <select> renders and what the API validates
 * against, so a restricted destination is refused at both, not merely hidden.
 */
export const COUNTRIES: readonly Country[] = ALL_COUNTRIES.filter(
  (c) => !RESTRICTED.has(c.code),
);

/** Just the names of the offered countries: what the checkout stores and the API validates against. */
export const COUNTRY_NAMES: readonly string[] = COUNTRIES.map((c) => c.name);

/**
 * ISO code for a country name, for shipping and customs paperwork.
 *
 * Resolves against the FULL list, including restricted destinations: this
 * answers "what is the code for this name", and an order already on file for a
 * since-restricted country still needs its paperwork to come out right.
 */
export function countryCode(name: string): string | null {
  return ALL_COUNTRIES.find((c) => c.name === name)?.code ?? null;
}

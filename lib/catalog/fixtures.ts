// THE CATALOGUE. Prices and specifications live here, in code, and nowhere else:
// the checkout route reads its prices from this module and from no request.
//
// LAUNCH SEED DATA: every model, specification and price below is illustrative.
// THE OWNER MUST REPLACE EACH ONE with the real product data before a real
// payment is taken. No ratings, reviews, awards or comparison prices exist here,
// on purpose.
//
// Naming: each family is named in Filipino for what it does. Himig is melody
// (full-range), Dagundong a low rumble (subwoofers), Haligi a pillar (column
// arrays), Langit the sky (ceiling), Ulan rain (weatherproof), Lakas strength
// (amplification) and Tipon "to gather" (complete systems).

import { PACK_PRESETS, packPrice } from './packs';
import type {
  Application, ArtKind, Category, Finish, Mounting, PackId, Product, Specs,
} from './types';

const BLACK: Finish = { name: 'Matte Black', family: 'black', hex: '#1B1D20' };
const WHITE: Finish = { name: 'Gallery White', family: 'white', hex: '#ECEBE6' };
const GREY: Finish = { name: 'Weathered Grey', family: 'grey', hex: '#7C8186' };

interface Seed {
  id: string;
  name: string;
  series: string;
  category: Category;
  art: ArtKind;
  mounting: Mounting;
  finish: Finish;
  applications: Application[];
  /** Price of ONE unit in whole pesos; pack prices are derived by packPrice(). */
  unit: number;
  packs: PackId[];
  specs: Specs;
  short: string;
  blurb: string;
  install?: string[];
}

const SPEAKER_INSTALL = [
  'Mount to a structure rated for at least four times the unit weight.',
  'Use speaker cable sized for the run length; keep low-impedance runs short.',
  'Wipe the grille with a dry, soft brush. Do not spray cleaner onto the cabinet.',
];
const CEILING_INSTALL = [
  'Cut-out and mounting depth are in the specification table.',
  'On a constant-voltage line, total the tap wattages and keep the sum under the amplifier rating.',
  'Wipe the grille with a dry, soft brush.',
];
const OUTDOOR_INSTALL = [
  'Point the cable gland downward and form a drip loop before it enters the housing.',
  'The IP rating covers the housing, not the cable joint: seal any outdoor splice in a rated enclosure.',
  'Rinse salt and dust from the grille with fresh water; let it dry before powering up.',
];
const RACK_INSTALL = [
  'Leave 1U of clear space above and below an amplifier in the rack.',
  'Bring the amplifier up last, after sources and processors are on, and down first.',
  'Keep the intake and exhaust vents clear.',
];

const SEEDS: Seed[] = [
  // ---- full-range: Himig -------------------------------------------------
  { id: 'ja-fr-01', name: 'Himig 6', series: 'Himig', category: 'full-range', art: 'cabinet', mounting: 'wall', finish: BLACK,
    applications: ['restaurant-bar', 'retail', 'hospitality', 'corporate'], unit: 7800, packs: ['single', 'pair', 'pack-4'],
    specs: { lowHz: 65, highHz: 20000, maxSplDb: 118, powerW: 120, impedanceOhm: 8, constantVoltage: true, coverage: '100° × 80°',
      drivers: '1 × 6.5″ woofer, 1 × 1″ soft-dome tweeter', ip: null, weightKg: 4.6, dimensionsMm: [225, 340, 215], woofers: 1, wooferIn: 6.5 },
    short: 'A compact two-way for background and foreground music.',
    blurb: 'A small two-way cabinet with wide, even coverage, built for dining rooms, shops and meeting rooms where the music should fill the space without drawing the eye.',
    install: SPEAKER_INSTALL },
  { id: 'ja-fr-02', name: 'Himig 8', series: 'Himig', category: 'full-range', art: 'cabinet', mounting: 'wall', finish: WHITE,
    applications: ['restaurant-bar', 'hospitality', 'fitness', 'education'], unit: 13500, packs: ['single', 'pair', 'pack-4'],
    specs: { lowHz: 55, highHz: 20000, maxSplDb: 124, powerW: 250, impedanceOhm: 8, constantVoltage: true, coverage: '90° × 60°',
      drivers: '1 × 8″ woofer, 1 × 1″ compression driver', ip: null, weightKg: 8.4, dimensionsMm: [260, 420, 250], woofers: 1, wooferIn: 8 },
    short: 'An 8-inch two-way with a constant-voltage tap.',
    blurb: 'A wall or stand cabinet with a horn-loaded high-frequency driver for speech clarity at distance, and a transformer tap so it drops onto a 70 V or 100 V line.',
    install: SPEAKER_INSTALL },
  { id: 'ja-fr-03', name: 'Himig 12', series: 'Himig', category: 'full-range', art: 'cabinet', mounting: 'stand', finish: BLACK,
    applications: ['venues', 'worship', 'corporate', 'education'], unit: 26000, packs: ['single', 'pair'],
    specs: { lowHz: 48, highHz: 19000, maxSplDb: 129, powerW: 600, impedanceOhm: 8, constantVoltage: false, coverage: '75° × 50°',
      drivers: '1 × 12″ woofer, 1 × 1.4″ compression driver', ip: null, weightKg: 17.5, dimensionsMm: [370, 610, 340], woofers: 1, wooferIn: 12 },
    short: 'A 12-inch two-way for halls, stages and fixed installs.',
    blurb: 'A plywood-cabinet 12-inch with a pole socket and rigging points, for speech and live music in rooms up to a few hundred seats.',
    install: SPEAKER_INSTALL },
  { id: 'ja-fr-04', name: 'Himig 15A', series: 'Himig', category: 'full-range', art: 'cabinet', mounting: 'stand', finish: BLACK,
    applications: ['venues', 'worship', 'fitness'], unit: 48000, packs: ['single', 'pair'],
    specs: { lowHz: 45, highHz: 20000, maxSplDb: 132, powerW: 1000, impedanceOhm: null, constantVoltage: false, coverage: '90° × 60°',
      drivers: '1 × 15″ woofer, 1 × 1.75″ compression driver, built-in Class-D amplifier', ip: null, weightKg: 24.8, dimensionsMm: [440, 700, 380], woofers: 1, wooferIn: 15 },
    short: 'A powered 15-inch with the amplifier and DSP built in.',
    blurb: 'A self-powered two-way: Class-D amplification, a limiter and speaker-tuned DSP in the cabinet, so one speaker and one cable make a PA.',
    install: SPEAKER_INSTALL },
  // ---- subwoofers: Dagundong ---------------------------------------------
  { id: 'ja-sw-01', name: 'Dagundong 12S', series: 'Dagundong', category: 'subwoofer', art: 'subwoofer', mounting: 'surface', finish: BLACK,
    applications: ['restaurant-bar', 'retail', 'hospitality', 'fitness'], unit: 24000, packs: ['single', 'pair'],
    specs: { lowHz: 38, highHz: 150, maxSplDb: 127, powerW: 400, impedanceOhm: 8, constantVoltage: false, coverage: null,
      drivers: '1 × 12″ long-excursion woofer, front-ported', ip: null, weightKg: 19.6, dimensionsMm: [400, 450, 450], woofers: 1, wooferIn: 12 },
    short: 'A compact sub that gives small speakers a floor.',
    blurb: 'A front-ported 12-inch sub for rooms where the satellites are small: bars, boutiques and studios that need low end without a stack of cabinets.',
    install: SPEAKER_INSTALL },
  { id: 'ja-sw-02', name: 'Dagundong 18S', series: 'Dagundong', category: 'subwoofer', art: 'subwoofer', mounting: 'surface', finish: BLACK,
    applications: ['venues', 'worship', 'fitness'], unit: 52000, packs: ['single', 'pair'],
    specs: { lowHz: 30, highHz: 120, maxSplDb: 134, powerW: 1200, impedanceOhm: 4, constantVoltage: false, coverage: null,
      drivers: '1 × 18″ long-excursion woofer, bass-reflex', ip: null, weightKg: 42, dimensionsMm: [560, 660, 700], woofers: 1, wooferIn: 18 },
    short: 'An 18-inch reflex sub for stages, halls and dance floors.',
    blurb: 'A birch-ply 18-inch subwoofer with recessed handles and a pole-mount socket, tuned for the 30 to 120 Hz range where a hall is won or lost.',
    install: SPEAKER_INSTALL },
  // ---- column arrays: Haligi ---------------------------------------------
  { id: 'ja-ca-01', name: 'Haligi C8', series: 'Haligi', category: 'column-array', art: 'column', mounting: 'wall', finish: WHITE,
    applications: ['worship', 'corporate', 'education', 'hospitality'], unit: 19500, packs: ['single', 'pair'],
    specs: { lowHz: 100, highHz: 18000, maxSplDb: 120, powerW: 200, impedanceOhm: 8, constantVoltage: true, coverage: '120° × 30°',
      drivers: '8 × 3″ full-range drivers in line', ip: null, weightKg: 7.2, dimensionsMm: [95, 740, 105], woofers: 8, wooferIn: 3 },
    short: 'A slim column that throws speech down the room, not at the ceiling.',
    blurb: 'Eight small drivers in a line give wide horizontal and narrow vertical coverage, which keeps speech intelligible in rooms with hard walls and long reverberation.',
    install: SPEAKER_INSTALL },
  { id: 'ja-ca-02', name: 'Haligi C16', series: 'Haligi', category: 'column-array', art: 'column', mounting: 'wall', finish: WHITE,
    applications: ['worship', 'education', 'venues'], unit: 34000, packs: ['single', 'pair'],
    specs: { lowHz: 90, highHz: 18000, maxSplDb: 124, powerW: 400, impedanceOhm: 8, constantVoltage: true, coverage: '120° × 20°',
      drivers: '16 × 3″ full-range drivers in line', ip: null, weightKg: 13.4, dimensionsMm: [95, 1400, 105], woofers: 16, wooferIn: 3 },
    short: 'The long-throw column for naves, auditoria and atriums.',
    blurb: 'Sixteen drivers make a tall, tightly controlled vertical beam that carries to the back of a long room while leaving the walls and ceiling alone.',
    install: SPEAKER_INSTALL },
  // ---- ceiling: Langit ---------------------------------------------------
  { id: 'ja-ce-01', name: 'Langit 6C', series: 'Langit', category: 'ceiling', art: 'ceiling', mounting: 'ceiling', finish: WHITE,
    applications: ['retail', 'hospitality', 'corporate', 'restaurant-bar'], unit: 4200, packs: ['single', 'pack-10'],
    specs: { lowHz: 70, highHz: 20000, maxSplDb: 102, powerW: 30, impedanceOhm: null, constantVoltage: true, coverage: '160°',
      drivers: '1 × 6.5″ woofer with 1″ tweeter on a pivot', ip: null, weightKg: 2.1, dimensionsMm: [225, 90, 225], woofers: 1, wooferIn: 6.5 },
    short: 'The in-ceiling workhorse for shops, offices and corridors.',
    blurb: 'A 6.5-inch in-ceiling speaker with 70 V and 100 V taps and a pivoting tweeter, sold by the carton for fit-outs that need dozens.',
    install: CEILING_INSTALL },
  { id: 'ja-ce-02', name: 'Langit 8C', series: 'Langit', category: 'ceiling', art: 'ceiling', mounting: 'ceiling', finish: WHITE,
    applications: ['retail', 'hospitality', 'corporate', 'education'], unit: 6600, packs: ['single', 'pack-4', 'pack-10'],
    specs: { lowHz: 55, highHz: 20000, maxSplDb: 106, powerW: 60, impedanceOhm: null, constantVoltage: true, coverage: '150°',
      drivers: '1 × 8″ coaxial driver', ip: null, weightKg: 3.4, dimensionsMm: [290, 105, 290], woofers: 1, wooferIn: 8 },
    short: 'A coaxial 8-inch for higher ceilings and fuller sound.',
    blurb: 'A coaxial in-ceiling speaker with more low end and level than the 6C, for ceilings above three metres and rooms where music matters.',
    install: CEILING_INSTALL },
  { id: 'ja-ce-03', name: 'Langit 4S Pendant', series: 'Langit', category: 'ceiling', art: 'pendant', mounting: 'ceiling', finish: BLACK,
    applications: ['restaurant-bar', 'hospitality', 'retail'], unit: 5400, packs: ['single', 'pair', 'pack-4'],
    specs: { lowHz: 85, highHz: 20000, maxSplDb: 104, powerW: 40, impedanceOhm: null, constantVoltage: true, coverage: '180°',
      drivers: '1 × 4″ full-range driver in a sealed sphere', ip: null, weightKg: 1.6, dimensionsMm: [170, 190, 170], woofers: 1, wooferIn: 4 },
    short: 'A hanging sphere for open ceilings with no tiles to cut.',
    blurb: 'A sealed sphere on a steel cable for exposed-slab ceilings in cafés, studios and showrooms, where a cut-out speaker has nowhere to go.',
    install: CEILING_INSTALL },
  // ---- outdoor: Ulan -----------------------------------------------------
  { id: 'ja-ou-01', name: 'Ulan 5W', series: 'Ulan', category: 'outdoor', art: 'cabinet', mounting: 'wall', finish: GREY,
    applications: ['restaurant-bar', 'hospitality', 'fitness', 'retail'], unit: 6900, packs: ['single', 'pair', 'pack-4'],
    specs: { lowHz: 80, highHz: 20000, maxSplDb: 108, powerW: 40, impedanceOhm: null, constantVoltage: true, coverage: '110° × 90°',
      drivers: '1 × 5.25″ woofer, 0.75″ tweeter, UV-stable housing', ip: 'IP55', weightKg: 2.9, dimensionsMm: [190, 270, 170], woofers: 1, wooferIn: 5.25 },
    short: 'A weatherproof wall speaker for patios and pool decks.',
    blurb: 'A UV-stable, IP55 housing with a stainless grille for terraces, pool decks and covered walkways that see rain and salt air.',
    install: OUTDOOR_INSTALL },
  { id: 'ja-ou-02', name: 'Ulan 8H', series: 'Ulan', category: 'outdoor', art: 'horn', mounting: 'pole', finish: GREY,
    applications: ['venues', 'education', 'fitness', 'hospitality'], unit: 17800, packs: ['single', 'pair'],
    specs: { lowHz: 120, highHz: 16000, maxSplDb: 121, powerW: 150, impedanceOhm: null, constantVoltage: true, coverage: '90° × 90°',
      drivers: '1 × 8″ driver on a moulded horn', ip: 'IP65', weightKg: 6.8, dimensionsMm: [340, 330, 380], woofers: 1, wooferIn: 8 },
    short: 'A horn-loaded speaker for courts, yards and open grounds.',
    blurb: 'A pole- or bracket-mounted horn for announcements and music across open ground, where level and speech clarity beat fidelity.',
    install: OUTDOOR_INSTALL },
  { id: 'ja-ou-03', name: 'Ulan Sub 10', series: 'Ulan', category: 'outdoor', art: 'subwoofer', mounting: 'surface', finish: GREY,
    applications: ['hospitality', 'fitness', 'restaurant-bar'], unit: 21500, packs: ['single', 'pair'],
    specs: { lowHz: 42, highHz: 160, maxSplDb: 123, powerW: 250, impedanceOhm: 8, constantVoltage: false, coverage: null,
      drivers: '1 × 10″ woofer, sealed marine-grade enclosure', ip: 'IP55', weightKg: 14.2, dimensionsMm: [360, 400, 360], woofers: 1, wooferIn: 10 },
    short: 'A sealed outdoor sub that sits low and takes the weather.',
    blurb: 'A sealed 10-inch subwoofer in a marine-grade enclosure to pair with the Ulan 5W on terraces and pool areas.',
    install: OUTDOOR_INSTALL },
  // ---- amplification & processing: Lakas ---------------------------------
  { id: 'ja-am-01', name: 'Lakas D4-600', series: 'Lakas', category: 'amplification', art: 'rack', mounting: 'rack', finish: BLACK,
    applications: ['restaurant-bar', 'retail', 'hospitality', 'corporate', 'education'], unit: 38500, packs: ['single'],
    specs: { lowHz: null, highHz: null, maxSplDb: null, powerW: 600, impedanceOhm: 4, constantVoltage: true, coverage: null,
      drivers: '4 channels × 150 W, Class-D; each channel 4–16 Ω or 70/100 V', ip: null, weightKg: 4.1, dimensionsMm: [483, 44, 330], woofers: 0, wooferIn: 0 },
    short: 'A four-channel 1U amplifier for multi-zone background music.',
    blurb: 'Four independent 150 W channels, each switchable between low-impedance and constant-voltage output, so one rack unit can run four zones of ceiling speakers.',
    install: RACK_INSTALL },
  { id: 'ja-am-02', name: 'Lakas A2-1200', series: 'Lakas', category: 'amplification', art: 'rack', mounting: 'rack', finish: BLACK,
    applications: ['venues', 'worship', 'fitness'], unit: 44000, packs: ['single'],
    specs: { lowHz: null, highHz: null, maxSplDb: null, powerW: 1200, impedanceOhm: 4, constantVoltage: false, coverage: null,
      drivers: '2 channels × 600 W into 4 Ω, Class-D, bridgeable', ip: null, weightKg: 5.6, dimensionsMm: [483, 44, 380], woofers: 0, wooferIn: 0 },
    short: 'A two-channel 1U power amplifier for subs and full-range cabinets.',
    blurb: 'A light, efficient two-channel amplifier with speaker protection and a bridge mode, for driving a pair of full-range cabinets or a single large subwoofer.',
    install: RACK_INSTALL },
  { id: 'ja-am-03', name: 'Lakas M8 Matrix', series: 'Lakas', category: 'amplification', art: 'processor', mounting: 'rack', finish: BLACK,
    applications: ['restaurant-bar', 'retail', 'hospitality', 'corporate', 'education'], unit: 29000, packs: ['single'],
    specs: { lowHz: null, highHz: null, maxSplDb: null, powerW: 0, impedanceOhm: null, constantVoltage: false, coverage: null,
      drivers: '8-in / 8-out DSP matrix: crossover, EQ, delay and limiter on every output', ip: null, weightKg: 2.2, dimensionsMm: [483, 44, 230], woofers: 0, wooferIn: 0 },
    short: 'An 8×8 DSP matrix that routes and tunes every zone.',
    blurb: 'Eight inputs, eight outputs and a processor on each: set zone volumes, EQ and delay once, then lock the front panel so staff cannot undo it.',
    install: RACK_INSTALL },
  // ---- complete systems: Tipon -------------------------------------------
  { id: 'ja-sy-01', name: 'Tipon Café 4-Zone', series: 'Tipon', category: 'system', art: 'system', mounting: 'ceiling', finish: WHITE,
    applications: ['restaurant-bar', 'hospitality', 'retail'], unit: 98000, packs: ['single'],
    specs: { lowHz: 70, highHz: 20000, maxSplDb: 102, powerW: 600, impedanceOhm: null, constantVoltage: true, coverage: null,
      drivers: '8 × Langit 6C, 1 × Lakas D4-600, 1 × Lakas M8 Matrix', ip: null, weightKg: 22, dimensionsMm: [483, 44, 330], woofers: 8, wooferIn: 6.5 },
    short: 'Background music for four zones: dining, bar, entrance, terrace-side.',
    blurb: 'Eight ceiling speakers, a four-channel amplifier and a DSP matrix, specified together so the zones, taps and headroom already add up.',
    install: [...CEILING_INSTALL, 'Supplied as a kit list; cable, brackets and a rack are specified separately for the site.'] },
  { id: 'ja-sy-02', name: 'Tipon Sanctuary', series: 'Tipon', category: 'system', art: 'system', mounting: 'wall', finish: WHITE,
    applications: ['worship', 'education', 'corporate'], unit: 186000, packs: ['single'],
    specs: { lowHz: 38, highHz: 18000, maxSplDb: 124, powerW: 1600, impedanceOhm: null, constantVoltage: false, coverage: null,
      drivers: '2 × Haligi C16, 2 × Dagundong 12S, 1 × Lakas A2-1200, 1 × Lakas M8 Matrix', ip: null, weightKg: 96, dimensionsMm: [483, 44, 380], woofers: 4, wooferIn: 12 },
    short: 'A speech-first system for a hall of up to roughly 400 seats.',
    blurb: 'Two long-throw columns for the words, two compact subs for the music, one amplifier and a DSP to tie them together; sized for reverberant rooms with hard surfaces.',
    install: [...SPEAKER_INSTALL, 'Seat count is a planning figure: the room is measured before the system is confirmed.'] },
  { id: 'ja-sy-03', name: 'Tipon Studio Floor', series: 'Tipon', category: 'system', art: 'system', mounting: 'wall', finish: BLACK,
    applications: ['fitness', 'venues', 'restaurant-bar'], unit: 142000, packs: ['single'],
    specs: { lowHz: 38, highHz: 20000, maxSplDb: 124, powerW: 1800, impedanceOhm: null, constantVoltage: false, coverage: null,
      drivers: '4 × Himig 8, 2 × Dagundong 12S, 1 × Lakas D4-600, 1 × Lakas A2-1200', ip: null, weightKg: 88, dimensionsMm: [483, 88, 380], woofers: 6, wooferIn: 8 },
    short: 'High-level music and a mic for group classes and dance floors.',
    blurb: 'Four wall cabinets and two subs on dedicated amplifiers, built to hold a clear instructor voice over loud music across a studio floor.',
    install: SPEAKER_INSTALL },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function build(seed: Seed): Product {
  return {
    id: seed.id,
    slug: slugify(seed.name),
    name: seed.name,
    series: seed.series,
    category: seed.category,
    applications: [...seed.applications],
    mounting: seed.mounting,
    finish: { ...seed.finish },
    art: seed.art,
    specs: { ...seed.specs, dimensionsMm: [...seed.specs.dimensionsMm] },
    packs: seed.packs.map((id) => ({
      id,
      label: PACK_PRESETS[id].label,
      units: PACK_PRESETS[id].units,
      price: id === 'single' ? seed.unit : packPrice(id, seed.unit),
    })),
    inStock: true,
    shortDescription: seed.short,
    description: [
      seed.blurb,
      `Shown in ${seed.finish.name}. Specifications are nominal and are confirmed on the datasheet supplied with your order.`,
    ],
    install: [...(seed.install ?? SPEAKER_INSTALL)],
  };
}

export const PRODUCTS: readonly Product[] = SEEDS.map(build);

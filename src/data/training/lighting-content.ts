/**
 * Lighting Training Content
 * Rich training material for LED Lighting & Networked Controls
 * 
 * NOW INTEGRATED WITH MASTER BULB TYPE DATABASE
 * See: src/data/lighting/bulb-types.ts for complete bulb catalog
 * See: src/data/lighting/replacement-logic.ts for replacement decision engine
 */

import { ALL_BULB_TYPES, findBulbType, getBulbTypesByCategory } from '../lighting/bulb-types';
import { calculateReplacement, COMPANY_REPLACEMENT_RULES } from '../lighting/replacement-logic';

export interface TechPageData {
  title: string;
  subtitle: string;
  introduction?: {
    whatItIs: string;
    whereItIsSeen: string[];
    typicalLocations: string[];
    keyConcepts: string[];
    whyItMatters: string;
    commonApplications: string[];
  };
  chiefEngineerQuote: string;
  compressorTypes?: {
    name: string;
    desc: string;
    range: string;
    application: string;
    color: 'blue' | 'emerald' | 'purple' | 'slate' | 'red' | 'orange' | 'indigo';
  }[];
  schematicTitle: string;
  tooltipData: Record<string, {
    title: string;
    desc: string;
    stats: string;
    style: { [key: string]: string | number };
  }>;
  cycleSteps?: { step: number; title: string; text: string }[];
  realWorldImage: {
    src: string;
    alt: string;
    caption: string;
  };
  vocabulary: {
    term: string;
    definition: string;
    salesHook: string;
  }[];
  retrofitStrategy?: {
    title: string;
    oldWay: { title: string; desc: string; items: string[] };
    newWay: { title: string; desc: string; items: string[] };
    utilityBenefit: { title: string; desc: string };
  };
  identificationGuide?: {
    feature: string;
    standard: string;
    highEff: string;
  }[];
  bulbTypes?: {
    name: string;
    type: string;
    imageUrl: string;
    identification: string;
    typicalLocations: string[];
    typicalUseCases: string[];
    replacement: string;
    wattageRange: string;
    lifeSpan: string;
    efficiency: string;
    notes: string;
    catalogPosition?: string;
  }[];
  
  // Master database integration
  masterDatabase?: {
    enabled: boolean;
    totalBulbTypes: number;
    categories: string[];
  };
  bestPractices?: {
    title: string;
    sections: {
      heading: string;
      content: string;
      items?: string[];
    }[];
  };
  roiAndLowHangingFruit?: {
    typicalROI: {
      project: string;
      payback: string;
      annualSavings: string;
      notes: string;
    }[];
    lowHangingFruit: {
      opportunity: string;
      effort: 'Low' | 'Medium' | 'High';
      savings: string;
      payback: string;
      description: string;
    }[];
  };
  optimizationVsReplacement?: {
    optimizationOpportunities: string[];
    whenToReplace: string[];
    optimizationBenefits: string;
    replacementBenefits: string;
  };

  /**
   * Optional long-form training sections (used by some technologies).
   * Content is stored as text/markdown and rendered as formatted text in the UI.
   */
  sections?: {
    id: string;
    title: string;
    icon?: string;
    summary?: string;
    content: string;
    details?: string[];
    estimatedTime?: number;
    roles?: Array<'sales' | 'engineer' | 'field'>;
    tags?: string[];
  }[];

  /**
   * Optional quick overview cards for fast navigation.
   */
  overviewCards?: {
    id: string;
    title: string;
    description: string;
    icon?: string;
    accent?: 'blue' | 'indigo' | 'purple' | 'pink' | 'emerald' | 'teal' | 'orange';
    jumpToSectionId?: string;
    roles?: Array<'sales' | 'engineer' | 'field'>;
  }[];

  /**
   * Allow feature-specific extensions without fighting excess property checks.
   */
  [key: string]: unknown;
}

export const lightingContent: TechPageData = {
  title: "LED Lighting & Networked Controls - Master Compendium",
  subtitle: "Complete reference for lighting auditors, sales, and engineers. All bulb types, identification guides, replacement logic, and best practices.",
  chiefEngineerQuote: "Light is not just watts. It's lumens per watt, it's color rendering, it's safety. An LED retrofit isn't just an energy project; it's a productivity upgrade. If you aren't talking about CRI and Kelvin temperature, you're selling commodities, not engineering solutions. And if you aren't installing controls, you're leaving 40% of the savings on the table. This compendium contains EVERY lighting type you'll encounter in the field - from legacy incandescent to cutting-edge LED - with complete identification guides, replacement logic, and company-specific customization.",
  
  // Master database integration
  masterDatabase: {
    enabled: true,
    totalBulbTypes: ALL_BULB_TYPES.length,
    categories: Array.from(new Set(ALL_BULB_TYPES.map(b => b.category))),
  },
  schematicTitle: "Active Control: Daylight Harvesting Logic",
  
  compressorTypes: [
    { name: "LED Troffer", desc: "Standard office fixture (2x4, 2x2). Replaces fluorescent.", range: "20W - 40W", application: "Office, School, Hospital", color: "blue" },
    { name: "High Bay", desc: "Industrial powerhouses. Replaces 400W Metal Halide.", range: "100W - 300W", application: "Warehouse, Manufacturing", color: "emerald" },
    { name: "Area Light", desc: "Parking lot & exterior. Critical for safety & aesthetics.", range: "100W - 400W", application: "Parking, Roadway, Security", color: "purple" },
    { name: "Linear Strip", desc: "Utility lighting. Continuous runs.", range: "20W - 60W", application: "Retail aisles, Hallways", color: "slate" }
  ],
  
  cycleSteps: [
    { step: 1, title: "Detection", text: "Photosensor detects available natural sunlight entering the space via windows/skylights." },
    { step: 2, title: "Calculation", text: "Controller compares total light (sun + electric) against the 'Setpoint' (e.g. 50 foot-candles)." },
    { step: 3, title: "Dimming", text: "0-10V signal sent to LED driver to reduce power output proportionally to maintain setpoint." },
    { step: 4, title: "Savings", text: "Electric consumption drops near zero during peak daylight hours, shedding peak load." }
  ],
  
  tooltipData: {
    sensor: { 
      title: "PHOTOSENSOR", 
      desc: "The 'Eye'. Measures reflected light (Closed Loop) or incoming daylight (Open Loop).", 
      stats: "Input: Lux/Foot-candles", 
      style: { top: '20px', left: '20px', borderColor: '#fbbf24' } 
    },
    driver: { 
      title: "DIMMING DRIVER", 
      desc: "The 'Muscle'. Converts AC power to DC for LEDs. Must be 0-10V or DALI compatible for dimming.", 
      stats: "Eff: >90% | PF: >0.9", 
      style: { top: '20px', right: '20px', borderColor: '#3b82f6' } 
    },
    window: { 
      title: "DAYLIGHT ZONE", 
      desc: "The area within ~15ft of the window. This is where 'Harvesting' happens. Interior zones usually just use Occupancy sensors.", 
      stats: "Priority: High Savings", 
      style: { bottom: '20px', left: '20px', borderColor: '#60a5fa' } 
    },
    grid: { 
      title: "GRID LOAD", 
      desc: "During the day, lighting load drops as the sun does the work. This shaves 'Peak Demand' charges.", 
      stats: "Reduction: Up to 80%", 
      style: { bottom: '20px', right: '20px', borderColor: '#ef4444' } 
    }
  },
  
  realWorldImage: {
    src: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop",
    alt: "Modern Office Lighting",
    caption: "Fig 1. Integrated LED Troffers with individual occupancy and daylight sensors (LLC - Luminaire Level Control)."
  },
  
  vocabulary: [
    { term: "Luminous Efficacy", definition: "Lumens per Watt (lm/W). How much light you get for your electricity.", salesHook: "Old T8s are 85 lm/W. Our DLC Premium LEDs are 150+ lm/W. That's 40% less energy for the same light." },
    { term: "L70 Lifetime", definition: "Hours until the light output drops to 70% of initial brightness.", salesHook: "Fluorescents burn out in 20k hours. These LEDs last 100k hours (L70). You won't change a bulb for 15 years." },
    { term: "CRI", definition: "Color Rendering Index (0-100). How 'true' colors look compared to sunlight.", salesHook: "Low CRI makes merchandise look dull and people look sick. We specify 80+ CRI standard." },
    { term: "DLC Premium", definition: "DesignLights Consortium highest rating. Requires high efficacy & L70.", salesHook: "This badge unlocks the highest utility rebates. Standard LEDs might get $0." }
  ],
  
  retrofitStrategy: {
    title: "Strategic Retrofit: The 'Smart' Upgrade",
    oldWay: { title: "The 'dumb' Swap", desc: "Just swapping tubes (Type A/B) retains the old ballast points of failure and limits control options.", items: ["Tube Swap (Type A)", "Ballast Bypass (Type B)"] },
    newWay: { title: "The Engineered Solution", desc: "Full fixture replacement with integrated intelligence.", items: ["New Fixtures (Kit/New)", "Integrated Sensors (LLC)", "Wireless Grouping"] },
    utilityBenefit: { title: "Why Utilities Love It", desc: "Permanent peak load reduction. Reliable, verifiable savings via NLC data." }
  },
  
  identificationGuide: [
    { feature: "Tech", standard: "Fluorescent T8/T12", highEff: "LED + NLC" },
    { feature: "Life", standard: "20,000 Hours", highEff: ">100,000 Hours" },
    { feature: "Controls", standard: "On/Off Switch", highEff: "Dimming/Occ/Daylight" }
  ],
  
  bulbTypes: [
    {
      name: "T12 Fluorescent",
      type: "T12 (1.5\" diameter)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "LINEAR FLUORESCENTS section (bottom row), T12",
      identification: "Largest diameter fluorescent tube (1.5 inches). Often has 2 pins at each end. Older technology, typically uses magnetic ballasts. Look for 'F' designation (e.g., F40T12 = 40W, T12).",
      typicalLocations: ["Old office buildings (pre-2000)", "Warehouses", "Retail stores (older)", "Schools (pre-2000 construction)", "Basements and maintenance areas"],
      typicalUseCases: ["General overhead lighting in older buildings", "Warehouse high-bay fixtures", "Older retail display areas"],
      replacement: "LED T8 tube (ballast bypass) or full LED troffer fixture. T12 fixtures can often accept T8 tubes with ballast replacement.",
      wattageRange: "40W (4'), 60W (5'), 75W (6'), 110W (8')",
      lifeSpan: "20,000 hours",
      efficiency: "65-75 lumens/watt",
      notes: "T12s are being phased out. Magnetic ballasts often hum and have poor power factor. Priority replacement candidate."
    },
    {
      name: "T8 Fluorescent (2-Pin)",
      type: "T8 (1\" diameter, 2-pin)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "LINEAR FLUORESCENTS section (bottom row), T8",
      identification: "Medium diameter tube (1 inch). Two pins at each end. Requires electronic ballast. Most common fluorescent in commercial buildings. Look for 'F32T8' (32W) or 'F25T8' (25W) designation.",
      typicalLocations: ["Modern office buildings (2000-2015)", "Hospitals", "Schools", "Retail stores", "Government buildings"],
      typicalUseCases: ["2x4 troffer fixtures in offices", "2x2 troffer fixtures in corridors", "General overhead lighting"],
      replacement: "LED T8 tube (Type A, B, or C) or full LED troffer. Type B (ballast bypass) recommended for best efficiency and reliability.",
      wattageRange: "25W (3'), 32W (4'), 40W (5'), 58W (8')",
      lifeSpan: "20,000-30,000 hours",
      efficiency: "80-95 lumens/watt",
      notes: "Most common fluorescent type. Good candidate for LED retrofit. Check ballast type before retrofit (electronic vs magnetic)."
    },
    {
      name: "T8 Fluorescent (4-Pin)",
      type: "T8 (1\" diameter, 4-pin)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "LINEAR FLUORESCENTS section (bottom row), T8",
      identification: "T8 tube with four pins (two at each end). Used with programmed-start ballasts for frequent on/off cycling. Common in areas with occupancy sensors.",
      typicalLocations: ["Office buildings with occupancy sensors", "Conference rooms", "Bathrooms", "Areas with frequent switching"],
      typicalUseCases: ["Fixtures controlled by occupancy sensors", "Areas requiring instant-on capability", "Applications with frequent cycling"],
      replacement: "LED T8 tube (Type B recommended for ballast bypass) or full LED fixture with occupancy sensor integration.",
      wattageRange: "25W (3'), 32W (4'), 40W (5')",
      lifeSpan: "20,000-30,000 hours (longer with programmed-start ballast)",
      efficiency: "80-95 lumens/watt",
      notes: "4-pin design prevents tube rotation (ensures proper pin alignment). Programmed-start ballasts extend life in cycling applications."
    },
    {
      name: "T5 Fluorescent",
      type: "T5 (5/8\" diameter)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "T SERIES (fourth row) or LINEAR FLUORESCENTS section, T5",
      identification: "Smaller diameter tube (5/8 inch). More efficient than T8. Requires electronic ballast. Look for 'F28T5' or 'F54T5' designation. Often in smaller fixtures.",
      typicalLocations: ["Modern office buildings (2010+)", "Hospitals (task lighting)", "Retail display areas", "High-end commercial spaces"],
      typicalUseCases: ["Task lighting", "Display lighting", "Under-cabinet lighting", "High-efficiency general lighting"],
      replacement: "LED T5 replacement tube or LED linear strip. T5 fixtures are newer, so check if retrofit makes sense vs full fixture replacement.",
      wattageRange: "14W (1'), 21W (2'), 28W (3'), 54W (4')",
      lifeSpan: "20,000-30,000 hours",
      efficiency: "90-100 lumens/watt",
      notes: "T5 is already fairly efficient. Evaluate full fixture replacement vs tube retrofit. T5HO (high output) versions are also common."
    },
    {
      name: "CFL (Compact Fluorescent)",
      type: "CFL (Spiral/Twist)",
      imageUrl: "/images/bulb-types/bulb-types-2.png",
      catalogPosition: "Catalog 2: Energy Saving Light Bulb, or Catalog 1: COMPACT FLUORESCENT COILS section",
      identification: "Spiral or twisted tube design. Screws into standard Edison base (E26/E27). May have integrated ballast (self-ballasted) or require separate ballast. Look for spiral/twist tube shape.",
      typicalLocations: ["Residential buildings", "Small commercial spaces", "Table lamps", "Ceiling fixtures", "Older retrofits"],
      typicalUseCases: ["Residential lighting", "Small office spaces", "Task lighting in commercial settings"],
      replacement: "LED A19 or A21 bulb (direct screw-in replacement). Ensure base matches (E26 standard).",
      wattageRange: "13W (60W equivalent), 18W (75W equivalent), 23W (100W equivalent)",
      lifeSpan: "8,000-12,000 hours",
      efficiency: "50-70 lumens/watt",
      notes: "Contains mercury (disposal concern). Slow warm-up time. LED replacement is straightforward and provides better light quality."
    },
    {
      name: "2-Pin CFL",
      type: "CFL 2-Pin (Plug-in)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      identification: "CFL with two pins at base. Plugs into dedicated socket (not screw-in). Requires separate ballast. Often in downlights or specialty fixtures.",
      typicalLocations: ["Recessed downlights", "Track lighting", "Specialty fixtures", "Older commercial installations"],
      typicalUseCases: ["Recessed ceiling fixtures", "Track lighting systems", "Decorative fixtures"],
      replacement: "LED retrofit kit or LED downlight fixture. May require fixture modification.",
      wattageRange: "13W, 18W, 26W",
      lifeSpan: "8,000-12,000 hours",
      efficiency: "50-70 lumens/watt",
      notes: "2-pin design indicates separate ballast (often in fixture). Check ballast compatibility for LED retrofit."
    },
    {
      name: "4-Pin CFL",
      type: "CFL 4-Pin (Plug-in)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      identification: "CFL with four pins at base. Requires electronic ballast with 4-pin socket. More reliable than 2-pin. Common in downlights.",
      typicalLocations: ["Recessed downlights", "Track lighting", "Modern commercial fixtures", "Task lighting"],
      typicalUseCases: ["Recessed ceiling fixtures", "Track lighting", "High-quality commercial lighting"],
      replacement: "LED retrofit kit or LED downlight. 4-pin design indicates better ballast (may support dimming).",
      wattageRange: "13W, 18W, 26W, 42W",
      lifeSpan: "10,000-15,000 hours",
      efficiency: "55-75 lumens/watt",
      notes: "4-pin design allows for better ballast control. Check if ballast is dimmable before LED retrofit."
    },
    {
      name: "Metal Halide",
      type: "Metal Halide (HID)",
      imageUrl: "/images/bulb-types/bulb-types-2.png",
      catalogPosition: "Catalog 2: Metal Halide Bulb",
      identification: "Large bulb with ceramic arc tube inside. High-intensity discharge (HID) technology. Often in large fixtures. Requires ballast and igniter. Very bright, white/blue-white light.",
      typicalLocations: ["Warehouses", "Manufacturing facilities", "Parking lots", "High-bay industrial spaces", "Gymnasiums"],
      typicalUseCases: ["High-bay warehouse lighting", "Outdoor area lighting", "Industrial task lighting", "Sports facilities"],
      replacement: "LED high-bay fixture or LED retrofit kit. Priority replacement - huge energy savings opportunity.",
      wattageRange: "175W, 250W, 400W, 1000W",
      lifeSpan: "15,000-20,000 hours",
      efficiency: "80-100 lumens/watt",
      notes: "Huge energy savings opportunity. 400W metal halide can be replaced with 100-150W LED high-bay. 70-75% energy reduction. Long warm-up time (5-10 minutes)."
    },
    {
      name: "High Pressure Sodium",
      type: "High Pressure Sodium (HPS)",
      imageUrl: "/images/bulb-types/bulb-types-2.png",
      catalogPosition: "Catalog 2: Sodium Light Bulb",
      identification: "Orange/yellow glow. HID technology. Requires ballast. Often in parking lot or street lighting fixtures. Distinctive warm orange color.",
      typicalLocations: ["Parking lots", "Street lighting", "Outdoor area lighting", "Industrial exterior"],
      typicalUseCases: ["Parking lot lighting", "Roadway lighting", "Security lighting", "Outdoor industrial areas"],
      replacement: "LED area light or LED parking lot fixture. Significant energy savings and better light quality (white vs orange).",
      wattageRange: "150W, 250W, 400W, 1000W",
      lifeSpan: "24,000 hours",
      efficiency: "100-130 lumens/watt",
      notes: "Poor color rendering (everything looks orange). 400W HPS can be replaced with 120-180W LED. 55-70% energy savings. Also eliminates warm-up time."
    },
    {
      name: "Incandescent A19",
      type: "Incandescent (Standard)",
      imageUrl: "/images/bulb-types/bulb-types-2.png",
      catalogPosition: "Catalog 2: Incandescent Light Bulb - Catalog 1: A SERIES (top row), A19",
      identification: "Traditional bulb with visible filament inside. Screw-in base (E26). Clear or frosted glass. Low efficiency, high heat output.",
      typicalLocations: ["Residential buildings", "Older commercial buildings", "Table lamps", "Decorative fixtures"],
      typicalUseCases: ["General household lighting", "Decorative lighting", "Residential applications"],
      replacement: "LED A19 bulb (direct screw-in replacement). Instant 80-90% energy savings.",
      wattageRange: "40W, 60W, 75W, 100W",
      lifeSpan: "1,000 hours",
      efficiency: "10-17 lumens/watt",
      notes: "Very inefficient. Phased out in many jurisdictions. LED replacement is straightforward and provides massive energy savings."
    },
    {
      name: "Halogen MR16",
      type: "Halogen MR16 (12V/120V)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "MR SERIES (third row): MR8, MR11, MR16, MR20 - Catalog 2: Halogen Lamp",
      identification: "Small reflector bulb with two pins at base. Multifaceted Reflector (MR). 12V (GX5.3/GZ4 bi-pin) or 120V (GU10 twist-lock). Often in track lighting or recessed fixtures. Very hot operation, concentrated directional beam.",
      typicalLocations: ["Track lighting", "Recessed downlights", "Display lighting", "Retail stores", "Landscaping (path lights)"],
      typicalUseCases: ["Accent lighting", "Display lighting", "Task lighting", "Retail merchandising", "Path and driveway lighting"],
      replacement: "LED MR16 bulb (ensure voltage matches - 12V or 120V). May require fixture modification if transformer incompatibility. Wide color temperature range available.",
      wattageRange: "20W, 35W, 50W (12V); 50W, 75W (120V)",
      lifeSpan: "2,000-4,000 hours",
      efficiency: "15-20 lumens/watt",
      notes: "Runs very hot. LED replacement eliminates heat issues and provides better efficiency. Check transformer compatibility for 12V versions. Base types: GX5.3/GZ4 (low voltage), GU10 (120V)."
    },
    {
      name: "Type A LED",
      type: "A19, A15, A21, A25 (LED)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "A SERIES (top row), A15, A19, A21, A23 - Catalog 2: LED Light Bulb",
      identification: "Standard household LED bulb shape. A19 is most common (19/8\" = 2.375\" diameter). A15 is smaller, A21/A25 are larger. Screw-in base (E26/E27 standard). Frosted or clear glass/plastic cover.",
      typicalLocations: ["Household fixtures", "Ceiling fans", "Table lamps", "Hall lighting", "General purpose fixtures"],
      typicalUseCases: ["Standard household lighting", "Ceiling fixtures", "Lamps", "General illumination"],
      replacement: "Direct replacement for incandescent A19 bulbs. Choose wattage equivalent (60W incandescent = 8-10W LED). Ensure base matches (E26 standard).",
      wattageRange: "6-12W (equivalent to 40-60W incandescent)",
      lifeSpan: "15,000-25,000 hours (LED)",
      efficiency: "80-100+ lumens/watt (LED)",
      notes: "A19 is the standard household bulb size. LED versions provide instant-on, dimmable options, and 80-90% energy savings vs incandescent. Most common replacement."
    },
    {
      name: "Type B/C Candle Bulbs",
      type: "B10, C7, C9, C15, CA10 (Candle)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "B SERIES (B8, B10, B11, B13) or C SERIES (C6, C7, C9, C11, C15) - top row",
      identification: "Elongated bulb with pointed tip resembling candle flame. Decorative style. B and C shapes similar. Screw-in base (E12 candelabra, E26 medium, or E17 intermediate).",
      typicalLocations: ["Chandeliers", "Wall sconces", "Pendant lights", "Decorative fixtures", "Dining rooms"],
      typicalUseCases: ["Decorative lighting", "Chandelier lighting", "Ambient lighting", "Vintage-style fixtures"],
      replacement: "LED candle bulbs available in B and C shapes. Direct replacement for incandescent/halogen versions. Check base type (E12/E17/E26).",
      wattageRange: "3-7W (LED equivalent to 25-40W incandescent)",
      lifeSpan: "15,000-25,000 hours (LED)",
      efficiency: "80-100+ lumens/watt (LED)",
      notes: "Primarily decorative. LED versions eliminate heat issues and provide better efficiency. Clear or frosted options available."
    },
    {
      name: "BR/R Reflector Bulbs",
      type: "BR20/R20, BR30, BR40 (Reflector)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "R SERIES (R12-R40) or BR SERIES (BR25, BR30, BR38, BR40) - third row",
      identification: "Bulged Reflector (BR) or Reflector (R) bulbs. BR30 is most common (30/8\" = 3.75\" diameter). Wide flood beam pattern. Screw-in base (E26/E27).",
      typicalLocations: ["Recessed can lights", "Outdoor floodlights", "Track lighting", "Downlights"],
      typicalUseCases: ["Recessed ceiling lighting", "Outdoor floodlighting", "General area lighting"],
      replacement: "LED BR/R reflector bulbs. Direct replacement. BR30 LED typically 10-15W replaces 65W incandescent. Wide flood or narrow spot options.",
      wattageRange: "10-15W LED (replaces 50-75W incandescent)",
      lifeSpan: "15,000-25,000 hours (LED)",
      efficiency: "80-100+ lumens/watt (LED)",
      notes: "BR provides wider wash of light than PAR. BR30 is most common size. LED versions provide excellent efficiency and long life. Good for recessed lighting."
    },
    {
      name: "PAR Bulbs",
      type: "PAR16, PAR20, PAR30, PAR36, PAR38 (Parabolic)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "PAR SERIES (sixth row): PAR14, PAR16, PAR20, PAR30, PAR36, PAR38, PAR46, PAR56, PAR64",
      identification: "Parabolic Aluminized Reflector. Higher wattage than BR. PAR30 and PAR38 most common. More focused beam than BR. Screw-in base (E26/E27) or G53 screw pin base.",
      typicalLocations: ["Outdoor lighting", "Security lighting", "Stage lighting", "High-bay industrial"],
      typicalUseCases: ["Outdoor floodlighting", "Security lighting", "Focused beam lighting", "Commercial applications"],
      replacement: "LED PAR bulbs. PAR30/PAR38 LED typically 15-20W replaces 75-100W incandescent. Focused beam options available.",
      wattageRange: "15-25W LED (replaces 75-150W incandescent)",
      lifeSpan: "15,000-25,000 hours (LED)",
      efficiency: "80-100+ lumens/watt (LED)",
      notes: "More focused beam than BR lights. PAR38 commonly used for outdoor security lighting. LED versions provide excellent efficiency and beam control."
    },
    {
      name: "Type G Globe Bulbs",
      type: "G11, G14, G16/G50, G25, G30, G60, G80 (Globe)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "G SERIES (fourth row): G9, G11, G12, G16, G16½, G19, G25, G30, G40",
      identification: "Globe or spherical shape. G30 is common for bathroom vanities (30/8\" = 3.75\" diameter). Decorative style. Screw-in base (E26/E27 or E12 candelabra).",
      typicalLocations: ["Bathroom vanities", "Decorative fixtures", "Vintage-style fixtures", "Dining rooms", "Living rooms"],
      typicalUseCases: ["Bathroom vanity lighting", "Decorative accent lighting", "Vintage-style designs"],
      replacement: "LED globe bulbs available. Direct replacement. G30 LED typically 8-12W replaces 40-60W incandescent. Clear or frosted options.",
      wattageRange: "6-12W LED (replaces 40-75W incandescent)",
      lifeSpan: "15,000-25,000 hours (LED)",
      efficiency: "80-100+ lumens/watt (LED)",
      notes: "Primarily decorative. G30 commonly used in bathroom vanities. LED versions provide better efficiency and eliminate heat issues in enclosed fixtures."
    },
    {
      name: "T5 Fluorescent (High Output)",
      type: "T5HO (5/8\" diameter, High Output)",
      imageUrl: "/images/bulb-types/bulb-types-1.png",
      catalogPosition: "T SERIES (fourth row) or LINEAR FLUORESCENTS section, T5",
      identification: "T5 tube with high output design. 5/8\" diameter (smaller than T8). Higher lumen output than standard T5. Requires electronic ballast. Used for high-bay applications.",
      typicalLocations: ["High-bay warehouses", "Manufacturing facilities", "Large retail spaces", "Gymnasiums"],
      typicalUseCases: ["High-ceiling industrial lighting", "Warehouse lighting", "Large open spaces"],
      replacement: "LED T5 replacement or LED high-bay fixture. T5HO is already efficient, but LED provides better efficiency and longer life.",
      wattageRange: "54W, 80W, 95W (4' lengths)",
      lifeSpan: "20,000-30,000 hours",
      efficiency: "90-110 lumens/watt",
      notes: "T5HO provides high lumen output for tall ceilings. LED high-bay fixtures may be better replacement option for new installations."
    }
  ],

  bestPractices: {
    title: "Lighting Best Practices & Strategies",
    sections: [
      {
        heading: "Audit & Assessment",
        content: "Before any retrofit, conduct a comprehensive lighting audit. Document every fixture type, bulb type, ballast type, operating hours, and control method. Identify high-usage areas (24/7 spaces, high foot-traffic) as priority targets.",
        items: [
          "Inventory all fixtures by type (troffer, high-bay, downlight, etc.)",
          "Document bulb types, wattages, and ballast types",
          "Measure operating hours (occupancy patterns, schedules)",
          "Identify controls (switches, occupancy sensors, timers, none)",
          "Calculate baseline energy consumption",
          "Prioritize high-usage, high-wattage fixtures first"
        ]
      },
      {
        heading: "LED Selection Criteria",
        content: "Not all LEDs are created equal. Specify DLC Premium products for maximum utility rebates and long-term reliability. Key specifications:",
        items: [
          "DLC Premium rating (unlocks highest rebates)",
          "150+ lumens/watt efficacy (minimum)",
          "80+ CRI for occupied spaces (90+ for retail/display)",
          "3500-4000K color temperature for offices (warmer for hospitality)",
          "L70 lifetime 100,000+ hours (15+ years at typical use)",
          "5-year warranty minimum",
          "Dimming capability (0-10V or DALI) for controls integration"
        ]
      },
      {
        heading: "Controls Integration Strategy",
        content: "LED savings are 60-80%. Controls add another 20-40% savings. Always plan for controls integration, even if implementing in phases.",
        items: [
          "Occupancy sensors in intermittently occupied spaces (20-40% savings)",
          "Daylight harvesting in perimeter zones (30-80% savings)",
          "Scheduling for unoccupied periods",
          "Luminaire Level Controls (LLC) - sensors in each fixture for maximum savings",
          "Wireless controls (easier retrofit, lower installation cost)",
          "BMS integration for central monitoring and control"
        ]
      },
      {
        heading: "Retrofit vs Replacement Decision",
        content: "Evaluate tube retrofit vs full fixture replacement. Tube retrofit is cheaper upfront but limits controls options. Full replacement enables integrated controls and better long-term value.",
        items: [
          "Tube retrofit (Type B ballast bypass): Lower cost, faster install, but limited controls",
          "Full fixture replacement: Higher cost, enables LLC, better aesthetics, maximum savings",
          "Consider fixture age: Old fixtures (>15 years) often better to replace entirely",
          "Check utility rebates: Full replacement often qualifies for higher rebates",
          "Long-term TCO: Full replacement usually better value over 10+ years"
        ]
      }
    ]
  },

  roiAndLowHangingFruit: {
    typicalROI: [
      {
        project: "LED Troffer Retrofit (Office)",
        payback: "2-3 years",
        annualSavings: "$15-25 per fixture",
        notes: "100 fixtures: $1,500-2,500/year savings. Install cost: $200-300/fixture. Utility rebates: $50-100/fixture."
      },
      {
        project: "LED High-Bay Retrofit (Warehouse)",
        payback: "1.5-2.5 years",
        annualSavings: "$200-400 per fixture",
        notes: "400W metal halide → 150W LED. 250W savings × 4,000 hours × $0.12/kWh = $120/year. 50 fixtures: $6,000/year."
      },
      {
        project: "LED Parking Lot Retrofit",
        payback: "2-4 years",
        annualSavings: "$80-150 per fixture",
        notes: "400W HPS → 150W LED. 250W savings × 4,000 hours × $0.12/kWh = $120/year. 30 fixtures: $3,600/year."
      },
      {
        project: "Occupancy Sensors (LED + Controls)",
        payback: "3-5 years",
        annualSavings: "$5-15 per fixture (additional)",
        notes: "Adds 20-40% savings on top of LED retrofit. Best ROI in restrooms, conference rooms, storage areas."
      },
      {
        project: "Daylight Harvesting (Perimeter Zones)",
        payback: "4-6 years",
        annualSavings: "$10-30 per fixture (additional)",
        notes: "Adds 30-80% savings in perimeter zones. Best ROI in buildings with windows/skylights."
      }
    ],
    lowHangingFruit: [
      {
        opportunity: "Replace T12 Fluorescents",
        effort: "Low",
        savings: "40-50% energy reduction",
        payback: "2-3 years",
        description: "T12s are old, inefficient, and often have failing ballasts. Direct T8 LED retrofit is straightforward. Priority target."
      },
      {
        opportunity: "Replace 400W Metal Halide High-Bays",
        effort: "Medium",
        savings: "70-75% energy reduction ($200-400/fixture/year)",
        payback: "1.5-2.5 years",
        description: "Biggest single energy waste in warehouses. LED high-bay replacement is high-impact, fast payback."
      },
      {
        opportunity: "Install Occupancy Sensors in Restrooms",
        effort: "Low",
        savings: "40-60% energy reduction",
        payback: "2-4 years",
        notes: "Restrooms are often lit 24/7 but occupied <5% of time. Simple occupancy sensor retrofit provides huge savings."
      },
      {
        opportunity: "Replace Parking Lot HPS with LED",
        effort: "Medium",
        savings: "60-70% energy reduction ($80-150/fixture/year)",
        payback: "2-4 years",
        description: "Parking lots run 12 hours/day. HPS replacement provides massive savings plus better light quality and security."
      },
      {
        opportunity: "Remove Unnecessary Fixtures",
        effort: "Low",
        savings: "100% of removed fixture energy",
        payback: "Immediate",
        description: "Many buildings are over-lit. Removing unnecessary fixtures saves energy and improves lighting quality (reduces glare)."
      },
      {
        opportunity: "Clean Fixtures & Replace Lenses",
        effort: "Low",
        savings: "10-20% light output improvement",
        payback: "Immediate",
        description: "Dirty fixtures reduce light output, leading to over-lighting. Cleaning is free and improves efficiency immediately."
      }
    ]
  },

  optimizationVsReplacement: {
    optimizationOpportunities: [
      "Clean fixtures and replace yellowed/dirty lenses (10-20% light output improvement, free)",
      "Remove unnecessary fixtures (over-lighting is common, free energy savings)",
      "Install occupancy sensors on existing fixtures (20-40% savings, moderate cost)",
      "Implement scheduling/timers (10-20% savings, low cost)",
      "Replace failed ballasts with electronic ballasts (5-10% efficiency improvement)",
      "Group fixtures into control zones (enables better control strategies)"
    ],
    whenToReplace: [
      "Fixtures are >15 years old (replacement cost vs ongoing maintenance)",
      "Multiple ballast failures (indicates end of life)",
      "Controls integration required (full replacement enables LLC)",
      "Aesthetic upgrade needed (full replacement provides better appearance)",
      "T12 or very old T8 fixtures (replacement more cost-effective than retrofit)",
      "Utility rebates favor full replacement (check current programs)"
    ],
    optimizationBenefits: "Lower upfront cost, faster implementation, maintains existing infrastructure. Good for budget-constrained projects or when fixtures are relatively new.",
    replacementBenefits: "Maximum energy savings, best controls integration, longer warranty, better aesthetics, eliminates ongoing maintenance. Better long-term value for older fixtures."
  }
};


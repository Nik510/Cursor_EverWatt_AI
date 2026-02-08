/**
 * MASTER LIGHTING BULB TYPE DATABASE
 * Complete reference for lighting auditors, sales, and engineers
 * 
 * This is a comprehensive catalog of ALL commercial lighting bulb types
 * with identification guides, replacement logic, and best practices.
 */

export interface BulbType {
  id: string;
  name: string;
  category: 'incandescent' | 'halogen' | 'fluorescent' | 'led' | 'hid' | 'other';
  subcategory: string;
  commonNames: string[];
  
  // Identification
  identification: {
    physicalCharacteristics: string[];
    baseTypes: string[];
    sizeDimensions: string;
    wattageMarkings: string;
    colorTemperature?: string;
    howToIdentify: string[];
    typicalManufacturers: string[];
  };
  
  // Technical Specifications
  specifications: {
    wattageRange: string;
    lumensPerWatt: string;
    colorTemperatureRange?: string;
    colorRenderingIndex?: string;
    lifespanHours: string;
    warmUpTime?: string;
    dimmability: 'Yes' | 'No' | 'Limited' | 'Special Ballast';
    operatingTemperature: string;
  };
  
  // Applications
  applications: {
    typicalLocations: string[];
    typicalUseCases: string[];
    commonFixtures: string[];
    mountingTypes: string[];
    buildingTypes: string[];
  };
  
  // Replacement Logic
  replacement: {
    recommendedReplacement: string;
    replacementReason: string;
    whenToReplace: {
      age?: string;
      condition?: string;
      efficiency?: string;
      cost?: string;
    };
    replacementPriority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Keep';
    typicalPaybackYears: string;
    energySavingsPercent: string;
    notes: string[];
  };
  
  // Images
  images: {
    bulbImage: string;
    fixtureImage?: string;
    installationImage?: string;
    identificationImage?: string;
  };
  
  // Best Practices
  bestPractices: {
    maintenance: string[];
    optimization: string[];
    commonIssues: string[];
    troubleshooting: string[];
  };
  
  // Company Customization Fields
  companySpecific?: {
    preferredVendor?: string;
    partNumber?: string;
    pricing?: string;
    notes?: string;
  };
}

export const ALL_BULB_TYPES: BulbType[] = [
  // INCANDESCENT
  {
    id: 'incandescent-a19',
    name: 'Type A Incandescent',
    category: 'incandescent',
    subcategory: 'Standard',
    commonNames: ['A19', 'Standard bulb', 'Edison bulb', 'Light bulb'],
    identification: {
      physicalCharacteristics: ['Pear-shaped glass bulb', 'Visible tungsten filament', 'Clear or frosted glass', 'Typical 2.375" diameter'],
      baseTypes: ['E26 (medium)', 'E27 (European)', 'E12 (candelabra)'],
      sizeDimensions: '2.375" diameter, varies by wattage',
      wattageMarkings: 'Marked on top of bulb (40W, 60W, 100W, etc.)',
      howToIdentify: [
        'Look for visible filament wire inside glass bulb',
        'Check wattage marking - typically 40W, 60W, 75W, 100W',
        'Warm white color temperature (~2700K)',
        'Instant on, no warm-up time',
        'Glass gets very hot when operating'
      ],
      typicalManufacturers: ['GE', 'Philips', 'Sylvania', 'Westinghouse']
    },
    specifications: {
      wattageRange: '15W - 150W',
      lumensPerWatt: '10-17 lm/W',
      colorTemperatureRange: '2700K (warm white)',
      colorRenderingIndex: '100 CRI',
      lifespanHours: '750-2,000 hours',
      dimmability: 'Yes',
      operatingTemperature: 'Very hot (>200°F surface temp)'
    },
    applications: {
      typicalLocations: ['Residential buildings', 'Hotels', 'Restaurants', 'Retail stores'],
      typicalUseCases: ['General ambient lighting', 'Accent lighting', 'Decorative fixtures'],
      commonFixtures: ['Table lamps', 'Floor lamps', 'Pendant lights', 'Wall sconces', 'Ceiling fixtures'],
      mountingTypes: ['Portable', 'Fixed'],
      buildingTypes: ['Commercial', 'Hospitality', 'Retail']
    },
    replacement: {
      recommendedReplacement: 'Type A LED (A19 LED)',
      replacementReason: 'Extremely inefficient - 90% energy wasted as heat. LED provides 85-90% energy savings with 25x longer lifespan.',
      whenToReplace: {
        age: 'Immediately - no reason to keep',
        efficiency: 'Only 10-17 lm/W vs LED 80-100+ lm/W',
        cost: 'High energy costs make replacement urgent'
      },
      replacementPriority: 'Critical',
      typicalPaybackYears: '1-2 years',
      energySavingsPercent: '85-90%',
      notes: [
        'Fastest payback of any lighting retrofit',
        'LED replacement available in same form factor',
        'Can reuse existing fixtures in most cases',
        'Consider dimmable LED for dimmer compatibility'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/incandescent-a19.png',
      fixtureImage: '/images/bulb-types/a19-fixture.png',
      identificationImage: '/images/bulb-types/incandescent-identify.png'
    },
    bestPractices: {
      maintenance: [
        'Check for blackening of glass (indicates nearing end of life)',
        'Replace in groups to reduce maintenance costs',
        'Avoid touching glass with bare hands (oil shortens life)'
      ],
      optimization: ['Replace immediately with LED', 'No optimization options - replace'],
      commonIssues: ['Short lifespan', 'High heat generation', 'Energy waste', 'Frequent replacements'],
      troubleshooting: ['If flickering, check socket connection', 'If burning out quickly, check voltage']
    }
  },
  
  {
    id: 'incandescent-par',
    name: 'PAR (Parabolic Aluminized Reflector)',
    category: 'incandescent',
    subcategory: 'Directional',
    commonNames: ['PAR20', 'PAR30', 'PAR38', 'PAR64', 'Spotlight', 'Floodlight'],
    identification: {
      physicalCharacteristics: ['Hard glass lens', 'Aluminized reflector inside', 'Precise beam angles', 'Sizes: PAR16, PAR20, PAR30, PAR38, PAR46, PAR56, PAR64'],
      baseTypes: ['E26 (medium)', 'E27', 'GU10', 'G53'],
      sizeDimensions: 'Diameter varies: PAR20 (2.5"), PAR30 (3.75"), PAR38 (4.75"), PAR64 (8")',
      wattageMarkings: 'Marked on lens (PAR30 75W, PAR38 150W, etc.)',
      howToIdentify: [
        'Hard glass outer lens (not soft like BR)',
        'Number indicates diameter in eighths of an inch (PAR30 = 30/8" = 3.75")',
        'Often has beam angle marking (Flood, Spot, Narrow Spot)',
        'Used for directional lighting'
      ],
      typicalManufacturers: ['GE', 'Philips', 'Osram Sylvania']
    },
    specifications: {
      wattageRange: '25W - 500W',
      lumensPerWatt: '12-18 lm/W',
      colorTemperatureRange: '2700K-3000K',
      colorRenderingIndex: '100 CRI',
      lifespanHours: '2,000-3,000 hours',
      dimmability: 'Yes',
      operatingTemperature: 'Very hot'
    },
    applications: {
      typicalLocations: ['Retail stores', 'Museums', 'Galleries', 'Restaurants', 'Theaters', 'Outdoor'],
      typicalUseCases: ['Accent lighting', 'Display lighting', 'Track lighting', 'Floodlighting', 'Stage lighting'],
      commonFixtures: ['Track lights', 'Recessed downlights', 'Floodlights', 'Wall washers'],
      mountingTypes: ['Recessed', 'Track-mounted', 'Surface-mounted'],
      buildingTypes: ['Retail', 'Hospitality', 'Entertainment', 'Outdoor']
    },
    replacement: {
      recommendedReplacement: 'LED PAR (PAR20 LED, PAR30 LED, PAR38 LED)',
      replacementReason: 'LED PAR provides same beam control with 85-90% energy savings, cooler operation, and longer life.',
      whenToReplace: {
        age: 'Immediately',
        efficiency: 'Only 12-18 lm/W vs LED 80-120 lm/W',
        condition: 'If used in high-hours locations (>8 hrs/day)'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '1-3 years',
      energySavingsPercent: '85-90%',
      notes: [
        'LED PAR available in same beam angles (flood, spot, narrow spot)',
        'Can maintain same lighting design',
        'Consider color temperature matching (3000K typical)',
        'Dimming may require compatible dimmer upgrade'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/par-bulb.png',
      fixtureImage: '/images/bulb-types/par-fixture.png'
    },
    bestPractices: {
      maintenance: ['Clean lens regularly for optimal output', 'Check beam alignment'],
      optimization: ['Replace with LED immediately', 'Consider tunable white LED for color flexibility'],
      commonIssues: ['High energy use', 'Heat buildup', 'Short lifespan in track lighting'],
      troubleshooting: ['If beam pattern changed, lens may be damaged']
    }
  },
  
  {
    id: 'incandescent-br',
    name: 'BR (Bulged Reflector) / R (Reflector)',
    category: 'incandescent',
    subcategory: 'Directional',
    commonNames: ['BR30', 'BR40', 'R20', 'R30', 'R40', 'Floodlight bulb'],
    identification: {
      physicalCharacteristics: ['Soft glass bulb', 'Internal reflector coating', 'Wider beam than PAR', 'BR has bulged shape, R is straight'],
      baseTypes: ['E26 (medium)', 'E27'],
      sizeDimensions: 'BR30 (3.75"), BR40 (5"), R20 (2.5"), R30 (3.75"), R40 (5")',
      wattageMarkings: 'Marked on bulb',
      howToIdentify: [
        'Soft glass (can be indented with fingernail) vs hard glass PAR',
        'Number = diameter in eighths of inch',
        'BR has wider, softer beam than PAR',
        'Often used in recessed cans'
      ],
      typicalManufacturers: ['GE', 'Philips', 'Sylvania']
    },
    specifications: {
      wattageRange: '40W - 150W',
      lumensPerWatt: '12-18 lm/W',
      colorTemperatureRange: '2700K-3000K',
      lifespanHours: '2,000-3,000 hours',
      dimmability: 'Yes',
      operatingTemperature: 'Very hot'
    },
    applications: {
      typicalLocations: ['Residential', 'Hotels', 'Restaurants', 'Retail'],
      typicalUseCases: ['Recessed downlights', 'Can lights', 'General flood lighting'],
      commonFixtures: ['Recessed cans', 'Track lights'],
      mountingTypes: ['Recessed'],
      buildingTypes: ['Commercial', 'Hospitality']
    },
    replacement: {
      recommendedReplacement: 'LED BR/R (BR30 LED, BR40 LED)',
      replacementReason: 'Same energy waste as standard incandescent. LED provides 85-90% savings.',
      whenToReplace: {
        priority: 'High - common in commercial spaces',
        hours: 'If operating >6 hours/day, replace immediately'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '1-2 years',
      energySavingsPercent: '85-90%',
      notes: [
        'LED BR available in same sizes',
        'Direct retrofit in most recessed cans',
        'Consider dimmable LED for compatibility',
        'Some older cans may need trim update'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/br-bulb.png'
    },
    bestPractices: {
      maintenance: ['Clean reflector surface', 'Check for proper fit in can'],
      optimization: ['Replace with LED'],
      commonIssues: ['Energy waste', 'Heat in recessed cans'],
      troubleshooting: []
    }
  },
  
  // HALOGEN
  {
    id: 'halogen-mr16',
    name: 'MR16 Halogen',
    category: 'halogen',
    subcategory: 'Low Voltage',
    commonNames: ['MR16', 'MR-16', 'Quartz halogen', 'GU5.3'],
    identification: {
      physicalCharacteristics: ['2" diameter', 'Bi-pin base (GU5.3 or GU4)', 'Quartz glass capsule', 'Visible halogen filament', 'Often in track lighting'],
      baseTypes: ['GU5.3 (most common)', 'GU4', 'GX5.3'],
      sizeDimensions: '2" diameter (16/8" = 2")',
      wattageMarkings: 'Typically 20W, 35W, 50W, 75W',
      colorTemperatureRange: '3000K (warm white)',
      howToIdentify: [
        'Small 2" diameter bulb',
        'Bi-pin base (two pins, not screw base)',
        'Requires 12V transformer',
        'Very hot operation',
        'Used in track lighting, display cases'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Osram', 'Sylvania']
    },
    specifications: {
      wattageRange: '10W - 75W (typically 20W, 35W, 50W)',
      lumensPerWatt: '15-20 lm/W',
      colorTemperatureRange: '2800K-3200K',
      colorRenderingIndex: '100 CRI',
      lifespanHours: '2,000-4,000 hours',
      dimmability: 'Yes (with compatible transformer)',
      operatingTemperature: 'Extremely hot (>400°F)'
    },
    applications: {
      typicalLocations: ['Retail stores', 'Museums', 'Galleries', 'Residential', 'Restaurants'],
      typicalUseCases: ['Track lighting', 'Display case lighting', 'Accent lighting', 'Task lighting'],
      commonFixtures: ['Track lights', 'Recessed low-voltage fixtures', 'Display case fixtures'],
      mountingTypes: ['Track-mounted', 'Recessed', 'Surface'],
      buildingTypes: ['Retail', 'Hospitality', 'Museums']
    },
    replacement: {
      recommendedReplacement: 'MR16 LED (12V or line-voltage)',
      replacementReason: 'LED MR16 provides 80-85% energy savings, cooler operation, longer life. Many LED versions work without transformer upgrade.',
      whenToReplace: {
        age: 'High priority if >4 years old',
        hours: 'If >2,000 hours of operation',
        cost: 'High energy cost locations'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '1-3 years',
      energySavingsPercent: '80-85%',
      notes: [
        'LED MR16 available in 12V (uses existing transformer) or line-voltage',
        'Line-voltage versions eliminate transformer',
        'Same beam angles available',
        'May need new transformer if keeping 12V (LED-compatible)',
        'Excellent color quality (CRI 90+) available'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/mr16-halogen.png',
      fixtureImage: '/images/bulb-types/mr16-track.png'
    },
    bestPractices: {
      maintenance: [
        'DO NOT touch glass with bare hands (oil causes premature failure)',
        'Use clean cloth or gloves when handling',
        'Check transformer voltage (must be 12V)',
        'Clean regularly for optimal light output'
      ],
      optimization: ['Replace with LED', 'Consider removing transformer if using line-voltage LED'],
      commonIssues: ['Very hot operation', 'Short lifespan if touched', 'Transformer compatibility', 'High energy use'],
      troubleshooting: [
        'If flickering, check transformer compatibility',
        'If burning out quickly, ensure no finger oils on glass',
        'If dim, check transformer output voltage'
      ]
    }
  },
  
  {
    id: 'halogen-par',
    name: 'Halogen PAR',
    category: 'halogen',
    subcategory: 'Directional',
    commonNames: ['Halogen PAR20', 'Halogen PAR30', 'Halogen PAR38', 'Quartz PAR'],
    identification: {
      physicalCharacteristics: ['Hard glass lens like incandescent PAR', 'Brighter, whiter light than incandescent', 'Quartz halogen capsule inside', 'Higher wattage than incandescent PAR'],
      baseTypes: ['E26', 'E27', 'GU10'],
      sizeDimensions: 'Same as incandescent PAR (PAR20, PAR30, PAR38)',
      wattageMarkings: 'Typically higher wattages than incandescent',
      colorTemperatureRange: '3000K-3200K',
      howToIdentify: [
        'Hard glass lens',
        'Whiter, brighter light than incandescent',
        'Higher wattage (50W-90W typical)',
        'Still very hot operation',
        'Slightly more efficient than incandescent PAR'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Osram']
    },
    specifications: {
      wattageRange: '20W - 90W',
      lumensPerWatt: '18-22 lm/W',
      colorTemperatureRange: '3000K-3200K',
      colorRenderingIndex: '100 CRI',
      lifespanHours: '2,000-3,500 hours',
      dimmability: 'Yes',
      operatingTemperature: 'Very hot'
    },
    applications: {
      typicalLocations: ['Retail', 'Museums', 'Restaurants', 'Residential'],
      typicalUseCases: ['Track lighting', 'Accent lighting', 'Display lighting'],
      commonFixtures: ['Track lights', 'Recessed fixtures'],
      mountingTypes: ['Track-mounted', 'Recessed'],
      buildingTypes: ['Retail', 'Hospitality']
    },
    replacement: {
      recommendedReplacement: 'LED PAR',
      replacementReason: 'LED provides 80-85% energy savings with much longer life.',
      whenToReplace: {
        priority: 'High',
        efficiency: 'Only 18-22 lm/W vs LED 80-120 lm/W'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '1-3 years',
      energySavingsPercent: '80-85%',
      notes: ['Direct retrofit available', 'Same beam angles', 'Better color consistency']
    },
    images: {
      bulbImage: '/images/bulb-types/halogen-par.png'
    },
    bestPractices: {
      maintenance: ['Do not touch glass', 'Clean regularly'],
      optimization: ['Replace with LED'],
      commonIssues: ['High heat', 'Energy waste'],
      troubleshooting: []
    }
  },
  
  // FLUORESCENT - LINEAR TUBES
  {
    id: 'fluorescent-t12',
    name: 'T12 Fluorescent Tube',
    category: 'fluorescent',
    subcategory: 'Linear',
    commonNames: ['T12', 'T-12', '1.5" fluorescent'],
    identification: {
      physicalCharacteristics: ['1.5" diameter tube (12/8" = 1.5")', 'Long cylindrical shape', 'White phosphor coating inside', 'Bi-pin base (2-pin)'],
      baseTypes: ['F96T12 (8ft)', 'F72T12 (6ft)', 'F48T12 (4ft)', 'F36T12 (3ft)', 'F30T12 (2.5ft)', 'Recessed Double Contact (RDC)'],
      sizeDimensions: '1.5" diameter, lengths: 2ft, 3ft, 4ft, 6ft, 8ft',
      wattageMarkings: 'Marked on tube end (F48T12 = 4ft T12)',
      colorTemperatureRange: '2700K-6500K (typically 3500K or 4100K)',
      howToIdentify: [
        'Measure diameter - T12 = 1.5" (largest common fluorescent)',
        'Look for "T12" marking on tube end',
        'Requires magnetic ballast (older) or electronic ballast',
        'Larger diameter than T8 or T5',
        'Often in older fixtures (pre-1990s)',
        'Flickers noticeably when starting'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Sylvania', 'Osram']
    },
    specifications: {
      wattageRange: '20W (2ft) - 110W (8ft)',
      lumensPerWatt: '50-70 lm/W (with magnetic ballast), 70-90 lm/W (with electronic ballast)',
      colorTemperatureRange: '2700K-6500K',
      colorRenderingIndex: '62-75 CRI (standard), 80+ CRI (deluxe)',
      lifespanHours: '12,000-24,000 hours',
      dimmability: 'Limited (requires dimming ballast)',
      warmUpTime: '30-60 seconds to full brightness',
      operatingTemperature: 'Warm but not hot'
    },
    applications: {
      typicalLocations: ['Office buildings', 'Warehouses', 'Schools', 'Hospitals', 'Retail (older)', 'Parking garages'],
      typicalUseCases: ['General ambient lighting', 'High-bay lighting', 'Troffer lighting'],
      commonFixtures: ['4-lamp troffers', '2-lamp strips', 'High-bay fixtures', 'Wrap fixtures'],
      mountingTypes: ['Recessed', 'Surface-mounted', 'Suspended'],
      buildingTypes: ['Commercial', 'Industrial', 'Institutional']
    },
    replacement: {
      recommendedReplacement: 'T8 LED Tube or T8 Fluorescent (with ballast bypass)',
      replacementReason: 'T12 is the oldest, least efficient fluorescent. T8 LED tubes provide 50-60% energy savings. Can retrofit into existing fixtures.',
      whenToReplace: {
        age: 'Immediately if >15 years old',
        ballast: 'If magnetic ballast (very inefficient)',
        condition: 'If flickering or blackened ends',
        efficiency: 'Only 50-70 lm/W vs LED 100-140 lm/W'
      },
      replacementPriority: 'Critical',
      typicalPaybackYears: '2-4 years',
      energySavingsPercent: '50-60%',
      notes: [
        'LED T8 tubes available for retrofit',
        'Ballast bypass option eliminates ballast energy use',
        'May need to rewire fixture (ballast bypass)',
        'T8 fluorescent is interim option (still replace ballast)',
        'Consider fixture replacement for best results'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/t12-tube.png',
      fixtureImage: '/images/bulb-types/t12-troffer.png',
      identificationImage: '/images/bulb-types/t12-identify.png'
    },
    bestPractices: {
      maintenance: [
        'Replace tubes when ends turn black (indicates end of life)',
        'Group relamping reduces maintenance costs',
        'Clean tubes and reflectors regularly',
        'Check ballast operation'
      ],
      optimization: [
        'Replace magnetic ballasts with electronic',
        'Upgrade to T8 or LED',
        'Consider fixture replacement',
        'Add reflectors to improve light output'
      ],
      commonIssues: [
        'Magnetic ballasts waste 15-20W per lamp',
        'Flickering (ballast issue)',
        'Humming noise (magnetic ballast)',
        'Blackened ends (end of life)',
        'Color shift over time'
      ],
      troubleshooting: [
        'If flickering: check ballast, may need replacement',
        'If humming: magnetic ballast - replace with electronic',
        'If won\'t start: check starter (if present) or ballast',
        'If blackened ends: tube needs replacement'
      ]
    }
  },
  
  {
    id: 'fluorescent-t8',
    name: 'T8 Fluorescent Tube',
    category: 'fluorescent',
    subcategory: 'Linear',
    commonNames: ['T8', 'T-8', '1" fluorescent'],
    identification: {
      physicalCharacteristics: ['1" diameter tube (8/8" = 1")', 'Long cylindrical shape', 'White phosphor coating', 'Bi-pin base'],
      baseTypes: ['F96T8 (8ft)', 'F72T8 (6ft)', 'F48T8 (4ft)', 'F36T8 (3ft)', 'F30T8 (2.5ft)', 'F17T8 (2ft)'],
      sizeDimensions: '1" diameter, lengths: 2ft, 3ft, 4ft, 6ft, 8ft',
      wattageMarkings: 'Marked on tube end (F48T8 = 4ft T8, typically 32W)',
      colorTemperatureRange: '2700K-6500K (typically 3500K or 4100K)',
      howToIdentify: [
        'Measure diameter - T8 = 1"',
        'Look for "T8" marking on tube end',
        'Smaller diameter than T12',
        'Requires electronic ballast (modern)',
        'Most common fluorescent type',
        'Instant start or rapid start'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Sylvania', 'Osram']
    },
    specifications: {
      wattageRange: '17W (2ft) - 59W (8ft), typically 32W (4ft)',
      lumensPerWatt: '80-100 lm/W (with electronic ballast)',
      colorTemperatureRange: '2700K-6500K',
      colorRenderingIndex: '75-85 CRI (standard), 90+ CRI (deluxe)',
      lifespanHours: '20,000-36,000 hours',
      dimmability: 'Yes (with dimming ballast)',
      warmUpTime: 'Instant to 1 second',
      operatingTemperature: 'Warm but not hot'
    },
    applications: {
      typicalLocations: ['Office buildings', 'Schools', 'Hospitals', 'Retail', 'Warehouses'],
      typicalUseCases: ['General ambient lighting', 'Task lighting', 'Troffer lighting'],
      commonFixtures: ['2x4 troffers', '2x2 troffers', 'Strip fixtures', 'Wraparound fixtures'],
      mountingTypes: ['Recessed', 'Surface-mounted'],
      buildingTypes: ['Commercial', 'Institutional', 'Retail']
    },
    replacement: {
      recommendedReplacement: 'T8 LED Tube (ballast bypass) or High-Performance T8 LED',
      replacementReason: 'LED provides 40-50% energy savings while maintaining same light output. Ballast bypass eliminates ballast energy use.',
      whenToReplace: {
        age: 'If >10 years old',
        ballast: 'When ballast fails (convert to LED)',
        efficiency: 'If operating >10 hours/day',
        condition: 'When tubes need replacement (convert to LED)'
      },
      replacementPriority: 'Medium-High',
      typicalPaybackYears: '2-5 years',
      energySavingsPercent: '40-50%',
      notes: [
        'LED T8 available for direct retrofit',
        'Ballast bypass option saves additional 8-15W per tube',
        'May need fixture rewiring for ballast bypass',
        'Plug-and-play versions work with existing ballast (less savings)',
        'Consider networked controls for additional savings'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/t8-tube.png',
      fixtureImage: '/images/bulb-types/t8-troffer.png',
      identificationImage: '/images/bulb-types/t8-identify.png'
    },
    bestPractices: {
      maintenance: [
        'Group relamping (replace all tubes at once)',
        'Clean tubes and reflectors',
        'Check ballast operation',
        'Replace when ends blacken'
      ],
      optimization: [
        'Add occupancy sensors',
        'Add daylight harvesting',
        'Upgrade to LED when ballast fails',
        'Consider fixture replacement for optimal efficiency'
      ],
      commonIssues: [
        'Ballast failure (15-20 year lifespan)',
        'Blackened ends',
        'Flickering',
        'Color shift over time'
      ],
      troubleshooting: [
        'If flickering: ballast may be failing',
        'If won\'t start: check ballast and wiring',
        'If blackened: tube needs replacement'
      ]
    }
  },
  
  {
    id: 'fluorescent-t5',
    name: 'T5 Fluorescent Tube',
    category: 'fluorescent',
    subcategory: 'Linear',
    commonNames: ['T5', 'T-5', '5/8" fluorescent'],
    identification: {
      physicalCharacteristics: ['5/8" diameter tube (smallest common fluorescent)', 'Long cylindrical shape', 'Single-pin base (unlike T8/T12 bi-pin)', 'High output versions available'],
      baseTypes: ['F54T5HO (4ft high-output)', 'F39T5 (3ft)', 'F28T5 (2ft)', 'Single-pin base'],
      sizeDimensions: '5/8" diameter, lengths: 2ft, 3ft, 4ft',
      wattageMarkings: 'T5 or T5HO marking',
      colorTemperatureRange: '3000K-6500K',
      howToIdentify: [
        'Smallest diameter fluorescent (5/8")',
        'Single-pin base (not bi-pin like T8/T12)',
        'T5HO = High Output version',
        'Most efficient fluorescent type',
        'Often in modern fixtures'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Sylvania']
    },
    specifications: {
      wattageRange: '14W (2ft) - 54W (4ft HO)',
      lumensPerWatt: '90-105 lm/W (standard), 70-85 lm/W (HO)',
      colorTemperatureRange: '3000K-6500K',
      colorRenderingIndex: '80-90 CRI',
      lifespanHours: '20,000-36,000 hours',
      dimmability: 'Yes (with dimming ballast)',
      warmUpTime: 'Instant',
      operatingTemperature: 'Warm'
    },
    applications: {
      typicalLocations: ['Modern offices', 'Retail', 'Schools', 'Showrooms'],
      typicalUseCases: ['Ambient lighting', 'Display lighting', 'Task lighting'],
      commonFixtures: ['Modern troffers', 'Display fixtures', 'Suspended fixtures'],
      mountingTypes: ['Recessed', 'Surface', 'Suspended'],
      buildingTypes: ['Commercial', 'Retail']
    },
    replacement: {
      recommendedReplacement: 'T5 LED Tube or consider fixture upgrade',
      replacementReason: 'T5 is most efficient fluorescent but LED still provides 30-40% savings. If fixture is in good condition, LED retrofit is cost-effective.',
      whenToReplace: {
        age: 'If >8 years old',
        ballast: 'When ballast fails',
        efficiency: 'If operating >12 hours/day'
      },
      replacementPriority: 'Medium',
      typicalPaybackYears: '3-6 years',
      energySavingsPercent: '30-40%',
      notes: [
        'T5 LED tubes available',
        'Single-pin base requires compatible LED',
        'May need fixture modification',
        'Consider fixture replacement if older'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/t5-tube.png'
    },
    bestPractices: {
      maintenance: ['Group relamping', 'Clean regularly'],
      optimization: ['Upgrade to LED when ballast fails', 'Add controls'],
      commonIssues: ['Ballast failure', 'Fixture-specific base'],
      troubleshooting: []
    }
  },
  
  {
    id: 'fluorescent-t5ho',
    name: 'T5 High Output (T5HO)',
    category: 'fluorescent',
    subcategory: 'Linear High-Output',
    commonNames: ['T5HO', 'T5 HO', 'High output T5'],
    identification: {
      physicalCharacteristics: ['5/8" diameter like T5', 'Single-pin base', 'Higher wattage than standard T5', 'Used in high-bay applications'],
      baseTypes: ['Single-pin (like T5)'],
      sizeDimensions: '5/8" diameter, typically 4ft or 8ft',
      wattageMarkings: 'F54T5HO (4ft, 54W)',
      howToIdentify: [
        'T5HO marking on tube',
        'Higher wattage than standard T5 (54W vs 28W for 4ft)',
        'Used in high-ceiling spaces',
        'Single-pin base'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Sylvania']
    },
    specifications: {
      wattageRange: '24W (2ft) - 80W (8ft), typically 54W (4ft)',
      lumensPerWatt: '70-85 lm/W (lower efficiency due to higher output)',
      colorTemperatureRange: '3000K-6500K',
      colorRenderingIndex: '80-90 CRI',
      lifespanHours: '20,000-30,000 hours',
      dimmability: 'Limited',
      warmUpTime: '30-60 seconds'
    },
    applications: {
      typicalLocations: ['Warehouses', 'Manufacturing', 'High-bay spaces', 'Gymnasiums'],
      typicalUseCases: ['High-bay lighting', 'High-ceiling ambient lighting'],
      commonFixtures: ['High-bay fixtures', 'Industrial fixtures'],
      mountingTypes: ['High-mounted', 'Suspended'],
      buildingTypes: ['Industrial', 'Warehouse', 'Gymnasium']
    },
    replacement: {
      recommendedReplacement: 'LED High-Bay Fixture or LED T5HO replacement',
      replacementReason: 'LED high-bay fixtures provide 50-60% energy savings with better light distribution and longer life.',
      whenToReplace: {
        priority: 'High if >10 years old',
        hours: 'If operating >12 hours/day'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '2-4 years',
      energySavingsPercent: '50-60%',
      notes: [
        'Consider fixture replacement for high-bay',
        'LED high-bay fixtures more cost-effective than tube retrofit',
        'Better light distribution with LED',
        'Can reduce number of fixtures needed'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/t5ho-tube.png'
    },
    bestPractices: {
      maintenance: ['Group relamping', 'Clean fixtures'],
      optimization: ['Replace with LED high-bay fixtures'],
      commonIssues: ['High energy use', 'Long warm-up time'],
      troubleshooting: []
    }
  },
  
  // FLUORESCENT - COMPACT
  {
    id: 'fluorescent-cfl-screw',
    name: 'CFL Screw-In (Compact Fluorescent)',
    category: 'fluorescent',
    subcategory: 'Compact',
    commonNames: ['CFL', 'Spiral CFL', 'Twisty bulb', 'Energy-saving bulb'],
    identification: {
      physicalCharacteristics: ['Spiral or folded tube', 'Electronic ballast in base', 'Screw-in base (E26)', 'White or colored plastic base', 'Various shapes'],
      baseTypes: ['E26 (medium)', 'E27', 'E12 (candelabra)', 'GU24 (twist-lock)'],
      sizeDimensions: 'Varies by wattage, typically 2-4" diameter',
      wattageMarkings: 'Marked on base (13W, 15W, 23W, 26W equivalent to 60W, 100W incandescent)',
      colorTemperatureRange: '2700K-6500K',
      howToIdentify: [
        'Spiral or folded fluorescent tube',
        'Screw-in base like incandescent',
        'Electronic ballast in base (heavier than incandescent)',
        'Takes 30-60 seconds to warm up',
        'Often labeled "equivalent to XW incandescent"'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Sylvania']
    },
    specifications: {
      wattageRange: '5W - 42W (replacing 15W-150W incandescent)',
      lumensPerWatt: '50-70 lm/W',
      colorTemperatureRange: '2700K-6500K',
      colorRenderingIndex: '80-85 CRI',
      lifespanHours: '8,000-15,000 hours',
      dimmability: 'Limited (requires dimmable CFL and dimmer)',
      warmUpTime: '30-60 seconds to full brightness',
      operatingTemperature: 'Warm'
    },
    applications: {
      typicalLocations: ['Residential', 'Hotels', 'Small offices', 'Retail'],
      typicalUseCases: ['Incandescent replacement', 'General lighting', 'Ambient lighting'],
      commonFixtures: ['Table lamps', 'Ceiling fixtures', 'Wall sconces'],
      mountingTypes: ['Portable', 'Fixed'],
      buildingTypes: ['Commercial', 'Hospitality']
    },
    replacement: {
      recommendedReplacement: 'LED A19 or LED equivalent',
      replacementReason: 'CFL was interim solution. LED provides 50% additional savings over CFL, instant-on, better color quality, and no mercury.',
      whenToReplace: {
        age: 'If >5 years old',
        efficiency: 'LED is 50% more efficient than CFL',
        condition: 'When warm-up time is annoying',
        safety: 'Mercury content - replace with LED'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '1-3 years',
      energySavingsPercent: '50% vs CFL, 80% vs incandescent',
      notes: [
        'LED direct replacement available',
        'Instant-on vs CFL warm-up',
        'Better dimming than CFL',
        'No mercury (CFL contains mercury)',
        'Better color quality'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/cfl-spiral.png',
      identificationImage: '/images/bulb-types/cfl-identify.png'
    },
    bestPractices: {
      maintenance: [
        'Proper disposal required (contains mercury)',
        'Replace when warm-up time increases',
        'Group replacement'
      ],
      optimization: ['Replace with LED immediately'],
      commonIssues: [
        'Mercury content (environmental hazard)',
        'Warm-up time',
        'Limited dimmability',
        'Color quality issues',
        'Shorter lifespan than LED'
      ],
      troubleshooting: [
        'If won\'t start: check base connection',
        'If flickering: may be failing',
        'If dim: may be end of life'
      ]
    }
  },
  
  {
    id: 'fluorescent-cfl-2pin',
    name: 'CFL 2-Pin',
    category: 'fluorescent',
    subcategory: 'Compact',
    commonNames: ['2-pin CFL', 'PL lamp', 'Dulux', 'Twin-tube CFL'],
    identification: {
      physicalCharacteristics: ['2-4 folded or parallel tubes', '2-pin base (not screw-in)', 'Separate ballast required', 'Used in dedicated fixtures'],
      baseTypes: ['G23 (2-pin)', 'G24d (4-pin)', '2G7', '2G11'],
      sizeDimensions: 'Varies, typically 2-4"',
      wattageMarkings: 'Marked on base (PL-13, PL-18, etc.)',
      howToIdentify: [
        '2-pin or 4-pin base (not screw-in)',
        'Folded tube design',
        'Requires dedicated fixture with ballast',
        'Common in commercial downlights',
        'Often in recessed fixtures'
      ],
      typicalManufacturers: ['Philips', 'Osram', 'GE']
    },
    specifications: {
      wattageRange: '5W - 55W',
      lumensPerWatt: '50-70 lm/W',
      colorTemperatureRange: '2700K-6500K',
      colorRenderingIndex: '80-85 CRI',
      lifespanHours: '10,000-20,000 hours',
      dimmability: 'Limited',
      warmUpTime: '30-60 seconds'
    },
    applications: {
      typicalLocations: ['Commercial downlights', 'Recessed fixtures', 'Track lighting'],
      typicalUseCases: ['Recessed ambient lighting', 'Downlighting'],
      commonFixtures: ['Recessed downlights', 'Track fixtures'],
      mountingTypes: ['Recessed'],
      buildingTypes: ['Commercial']
    },
    replacement: {
      recommendedReplacement: 'LED Downlight Retrofit or LED 2-Pin replacement',
      replacementReason: 'LED provides 50% energy savings, instant-on, longer life. Fixture replacement often better than bulb replacement.',
      whenToReplace: {
        priority: 'High',
        ballast: 'When ballast fails, convert to LED'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '2-4 years',
      energySavingsPercent: '50%',
      notes: [
        'LED 2-pin replacements available',
        'Consider fixture replacement',
        'Ballast bypass LED options available'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/cfl-2pin.png'
    },
    bestPractices: {
      maintenance: ['Group replacement', 'Proper disposal'],
      optimization: ['Replace with LED'],
      commonIssues: ['Mercury content', 'Ballast compatibility'],
      troubleshooting: []
    }
  },
  
  {
    id: 'fluorescent-cfl-4pin',
    name: 'CFL 4-Pin',
    category: 'fluorescent',
    subcategory: 'Compact',
    commonNames: ['4-pin CFL', 'PL-L', 'Quad-tube CFL'],
    identification: {
      physicalCharacteristics: ['2-4 tubes', '4-pin base', 'Separate ballast required', 'Often square or rectangular'],
      baseTypes: ['G24q (quad-pin)', 'GX24q', '2G11'],
      sizeDimensions: 'Varies',
      wattageMarkings: 'Marked on base',
      howToIdentify: [
        '4-pin base (not 2-pin)',
        'Multiple tubes',
        'Dedicated fixture required',
        'Commercial applications'
      ],
      typicalManufacturers: ['Philips', 'Osram']
    },
    specifications: {
      wattageRange: '10W - 55W',
      lumensPerWatt: '50-70 lm/W',
      lifespanHours: '10,000-20,000 hours',
      dimmability: 'Limited',
      warmUpTime: '30-60 seconds'
    },
    applications: {
      typicalLocations: ['Commercial downlights', 'Recessed fixtures'],
      typicalUseCases: ['Downlighting'],
      commonFixtures: ['Recessed downlights'],
      mountingTypes: ['Recessed'],
      buildingTypes: ['Commercial']
    },
    replacement: {
      recommendedReplacement: 'LED Downlight Retrofit',
      replacementReason: 'LED provides better efficiency and instant-on',
      whenToReplace: {
        priority: 'High'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '2-4 years',
      energySavingsPercent: '50%',
      notes: ['Consider fixture replacement']
    },
    images: {
      bulbImage: '/images/bulb-types/cfl-4pin.png'
    },
    bestPractices: {
      maintenance: ['Proper disposal'],
      optimization: ['Replace with LED'],
      commonIssues: ['Mercury', 'Ballast required'],
      troubleshooting: []
    }
  },
  
  // HID LIGHTING
  {
    id: 'hid-metal-halide',
    name: 'Metal Halide (HID)',
    category: 'hid',
    subcategory: 'High-Intensity Discharge',
    commonNames: ['MH', 'Metal halide', 'HID', 'Stadium lighting'],
    identification: {
      physicalCharacteristics: ['Large bulb (varies by wattage)', 'Clear or coated outer envelope', 'Inner arc tube', 'Requires ballast', 'Base varies by wattage'],
      baseTypes: ['Mogul (E39) - high wattage', 'Medium (E26) - low wattage', 'G12 (double-ended)', 'RX7s'],
      sizeDimensions: 'Varies: 70W (small) to 1500W (very large)',
      wattageMarkings: 'Marked on bulb (MH70, MH100, MH150, MH175, MH250, MH400, MH1000)',
      colorTemperatureRange: '3000K-5000K (typically 4000K)',
      howToIdentify: [
        'Large bulb with inner arc tube visible',
        'Requires 2-5 minute warm-up time',
        'Cannot restart immediately (must cool down)',
        'White/blue-white light',
        'Often in high-bay or outdoor applications',
        'Requires special ballast'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Venture', 'Sylvania']
    },
    specifications: {
      wattageRange: '70W - 1500W',
      lumensPerWatt: '65-110 lm/W',
      colorTemperatureRange: '3000K-5000K',
      colorRenderingIndex: '65-90 CRI',
      lifespanHours: '7,500-20,000 hours',
      dimmability: 'Limited (requires dimming ballast)',
      warmUpTime: '2-5 minutes to full brightness',
      operatingTemperature: 'Hot'
    },
    applications: {
      typicalLocations: ['Warehouses', 'Manufacturing', 'Parking lots', 'Stadiums', 'Retail high-bay', 'Gymnasiums'],
      typicalUseCases: ['High-bay lighting', 'Outdoor area lighting', 'Security lighting', 'Sports lighting'],
      commonFixtures: ['High-bay fixtures', 'Wall packs', 'Area lights', 'Stadium fixtures'],
      mountingTypes: ['High-mounted', 'Pole-mounted', 'Wall-mounted'],
      buildingTypes: ['Industrial', 'Warehouse', 'Outdoor', 'Sports']
    },
    replacement: {
      recommendedReplacement: 'LED High-Bay Fixture or LED Wall Pack',
      replacementReason: 'LED provides 50-70% energy savings, instant-on, no restrike delay, better color quality, and longer life. Critical for high-hours applications.',
      whenToReplace: {
        age: 'If >8 years old',
        hours: 'If operating >12 hours/day (high priority)',
        condition: 'When restrike delays become problematic',
        efficiency: 'Only 65-110 lm/W vs LED 100-150+ lm/W'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '2-5 years',
      energySavingsPercent: '50-70%',
      notes: [
        'LED high-bay fixtures most common replacement',
        'Can often reduce number of fixtures needed (better distribution)',
        'Instant-on (no warm-up)',
        'No restrike delay (can restart immediately)',
        'Better color quality and consistency',
        'Consider networked controls for additional savings'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/metal-halide.png',
      fixtureImage: '/images/bulb-types/mh-highbay.png',
      installationImage: '/images/bulb-types/mh-warehouse.png'
    },
    bestPractices: {
      maintenance: [
        'Group relamping (replace all at once)',
        'Check ballast operation',
        'Clean fixtures regularly',
        'Monitor for color shift (indicates end of life)'
      ],
      optimization: [
        'Replace with LED when bulb fails',
        'Consider fixture replacement',
        'Add occupancy sensors or scheduling',
        'Reduce operating hours where possible'
      ],
      commonIssues: [
        'Long warm-up time (2-5 minutes)',
        'Restrike delay (5-15 minutes if turned off)',
        'Color shift over time',
        'High energy use',
        'Ballast failure',
        'Fixtures may not be properly aimed'
      ],
      troubleshooting: [
        'If won\'t start: check ballast and wiring',
        'If color shifted: bulb nearing end of life',
        'If flickering: ballast may be failing',
        'If restrike delay: normal operation, LED eliminates this'
      ]
    }
  },
  
  {
    id: 'hid-high-pressure-sodium',
    name: 'High Pressure Sodium (HPS)',
    category: 'hid',
    subcategory: 'High-Intensity Discharge',
    commonNames: ['HPS', 'Sodium', 'Orange light', 'Street light'],
    identification: {
      physicalCharacteristics: ['Orange/yellow light', 'Large bulb', 'Inner arc tube', 'Requires ballast'],
      baseTypes: ['Mogul (E39)', 'Medium (E26) for low wattage'],
      sizeDimensions: 'Varies by wattage',
      wattageMarkings: 'Marked on bulb (HPS35, HPS50, HPS70, HPS100, HPS150, HPS250, HPS400)',
      colorTemperatureRange: '2000K-2200K (orange/yellow)',
      howToIdentify: [
        'Distinctive orange/yellow light',
        'Requires warm-up time (3-5 minutes)',
        'Cannot restart immediately',
        'Often in outdoor applications',
        'Very efficient for HID (but poor color)'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Sylvania']
    },
    specifications: {
      wattageRange: '35W - 1000W',
      lumensPerWatt: '80-140 lm/W (most efficient HID)',
      colorTemperatureRange: '2000K-2200K',
      colorRenderingIndex: '20-25 CRI (very poor)',
      lifespanHours: '16,000-24,000 hours',
      dimmability: 'Limited',
      warmUpTime: '3-5 minutes',
      operatingTemperature: 'Hot'
    },
    applications: {
      typicalLocations: ['Parking lots', 'Streets', 'Warehouses', 'Outdoor area lighting'],
      typicalUseCases: ['Outdoor lighting', 'Security lighting', 'Area lighting'],
      commonFixtures: ['Wall packs', 'Area lights', 'Street lights', 'High-bay fixtures'],
      mountingTypes: ['Pole-mounted', 'Wall-mounted', 'High-mounted'],
      buildingTypes: ['Outdoor', 'Industrial', 'Parking']
    },
    replacement: {
      recommendedReplacement: 'LED Wall Pack or LED Area Light',
      replacementReason: 'LED provides 50-70% energy savings, instant-on, much better color rendering (important for security), and no restrike delay.',
      whenToReplace: {
        priority: 'High for outdoor/security applications',
        color: 'Poor color rendering (CRI 20-25) affects security',
        hours: 'If operating all night'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '2-4 years',
      energySavingsPercent: '50-70%',
      notes: [
        'LED provides much better color rendering (important for security cameras)',
        'Instant-on vs 3-5 minute warm-up',
        'No restrike delay',
        'Better light distribution',
        'Can reduce number of fixtures'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/hps-bulb.png',
      fixtureImage: '/images/bulb-types/hps-wallpack.png'
    },
    bestPractices: {
      maintenance: ['Group relamping', 'Clean fixtures'],
      optimization: ['Replace with LED', 'Add controls for reduced hours'],
      commonIssues: ['Poor color rendering', 'Warm-up time', 'Restrike delay'],
      troubleshooting: []
    }
  },
  
  {
    id: 'hid-mercury-vapor',
    name: 'Mercury Vapor (HID)',
    category: 'hid',
    subcategory: 'High-Intensity Discharge',
    commonNames: ['Mercury vapor', 'MV', 'Blue-white light'],
    identification: {
      physicalCharacteristics: ['Blue-white light', 'Large bulb', 'Requires ballast'],
      baseTypes: ['Mogul (E39)'],
      howToIdentify: [
        'Blue-white light (distinctive)',
        'Older technology',
        'Often very old fixtures',
        'Being phased out'
      ],
      typicalManufacturers: ['GE', 'Sylvania']
    },
    specifications: {
      wattageRange: '100W - 1000W',
      lumensPerWatt: '30-60 lm/W (least efficient HID)',
      colorTemperatureRange: '4000K-7000K (blue-white)',
      colorRenderingIndex: '15-50 CRI',
      lifespanHours: '16,000-24,000 hours',
      warmUpTime: '5-7 minutes',
      operatingTemperature: 'Hot'
    },
    applications: {
      typicalLocations: ['Very old installations', 'Legacy outdoor lighting'],
      typicalUseCases: ['Old area lighting'],
      commonFixtures: ['Old wall packs', 'Old area lights'],
      mountingTypes: ['Outdoor'],
      buildingTypes: ['Legacy installations']
    },
    replacement: {
      recommendedReplacement: 'LED Fixture',
      replacementReason: 'Mercury vapor is banned/being phased out. Very inefficient. Replace immediately.',
      whenToReplace: {
        priority: 'Critical - replace immediately',
        legal: 'Being phased out due to mercury content'
      },
      replacementPriority: 'Critical',
      typicalPaybackYears: '1-3 years',
      energySavingsPercent: '70-80%',
      notes: [
        'Being phased out',
        'Mercury content',
        'Very inefficient',
        'Must replace with LED'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/mercury-vapor.png'
    },
    bestPractices: {
      maintenance: ['Replace immediately'],
      optimization: ['Replace with LED'],
      commonIssues: ['Inefficient', 'Banned/being phased out'],
      troubleshooting: []
    }
  },
  
  // LED LIGHTING
  {
    id: 'led-a19',
    name: 'Type A LED (A19)',
    category: 'led',
    subcategory: 'General Purpose',
    commonNames: ['LED bulb', 'LED A19', 'LED replacement'],
    identification: {
      physicalCharacteristics: ['Similar shape to incandescent A19', 'Plastic or glass construction', 'LED chips visible or diffused', 'Heat sink fins often visible', 'Lightweight'],
      baseTypes: ['E26 (medium)', 'E27', 'E12 (candelabra)'],
      sizeDimensions: 'Similar to incandescent A19',
      wattageMarkings: 'Much lower wattage (8W-15W typical, replacing 40W-100W incandescent)',
      colorTemperatureRange: '2200K-6500K (selectable)',
      howToIdentify: [
        'Much lower wattage than equivalent incandescent',
        'Instant-on (no warm-up)',
        'Cool to touch (or warm, not hot)',
        'May have heat sink fins',
        'Often labeled "LED"',
        'White light (not warm-up required)'
      ],
      typicalManufacturers: ['Philips', 'GE', 'Cree', 'Feit', 'Sylvania']
    },
    specifications: {
      wattageRange: '4W - 20W (replacing 15W-150W incandescent)',
      lumensPerWatt: '80-140 lm/W',
      colorTemperatureRange: '2200K-6500K',
      colorRenderingIndex: '80-95+ CRI',
      lifespanHours: '25,000-50,000 hours',
      dimmability: 'Yes (check compatibility)',
      warmUpTime: 'Instant',
      operatingTemperature: 'Cool to warm'
    },
    applications: {
      typicalLocations: ['All commercial applications', 'Residential', 'Hotels', 'Retail'],
      typicalUseCases: ['General lighting', 'Incandescent replacement', 'Ambient lighting'],
      commonFixtures: ['All fixture types'],
      mountingTypes: ['Universal'],
      buildingTypes: ['All']
    },
    replacement: {
      recommendedReplacement: 'Keep (if high-quality LED) or upgrade to higher-efficiency LED',
      replacementReason: 'LED A19 is the replacement, not something to replace. If existing LED is low-quality, upgrade to high-efficiency model.',
      whenToReplace: {
        condition: 'Only if low-quality or failing',
        efficiency: 'Upgrade if <80 lm/W',
        age: 'If >10 years old, may want to upgrade for better efficiency'
      },
      replacementPriority: 'Keep',
      typicalPaybackYears: 'N/A (already LED)',
      energySavingsPercent: 'Already efficient',
      notes: [
        'This IS the replacement technology',
        'If upgrading, look for >100 lm/W',
        'Check dimming compatibility',
        'Consider tunable white versions'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/led-a19.png'
    },
    bestPractices: {
      maintenance: [
        'LEDs last 25,000-50,000 hours - minimal maintenance',
        'Clean occasionally',
        'Check for proper operation'
      ],
      optimization: [
        'Add dimming',
        'Add controls (occupancy, daylight)',
        'Consider tunable white for color flexibility'
      ],
      commonIssues: [
        'Compatibility with old dimmers',
        'Some low-quality LEDs have color shift',
        'Heat sink design important for lifespan'
      ],
      troubleshooting: [
        'If flickering with dimmer: may need compatible dimmer',
        'If color shifted: may be low-quality LED'
      ]
    }
  },
  
  {
    id: 'led-par',
    name: 'LED PAR',
    category: 'led',
    subcategory: 'Directional',
    commonNames: ['LED PAR20', 'LED PAR30', 'LED PAR38', 'LED spotlight'],
    identification: {
      physicalCharacteristics: ['Hard lens (like incandescent PAR)', 'LED chips inside', 'Heat sink visible', 'Same sizes as incandescent PAR'],
      baseTypes: ['E26', 'GU10', 'GU5.3'],
      sizeDimensions: 'Same as incandescent PAR (PAR20, PAR30, PAR38)',
      howToIdentify: [
        'Much lower wattage (5W-15W vs 50W-90W)',
        'Cool operation',
        'Instant-on',
        'Same beam angles available',
        'Often "LED" marking'
      ],
      typicalManufacturers: ['Philips', 'Cree', 'Satco', 'Feit']
    },
    specifications: {
      wattageRange: '4W - 20W (replacing 25W-90W halogen/incandescent PAR)',
      lumensPerWatt: '80-120 lm/W',
      colorTemperatureRange: '2700K-5000K',
      colorRenderingIndex: '80-95+ CRI',
      lifespanHours: '25,000-50,000 hours',
      dimmability: 'Yes (check compatibility)',
      warmUpTime: 'Instant'
    },
    applications: {
      typicalLocations: ['Retail', 'Museums', 'Restaurants', 'Residential'],
      typicalUseCases: ['Track lighting', 'Accent lighting', 'Display lighting'],
      commonFixtures: ['Track lights', 'Recessed fixtures'],
      mountingTypes: ['Track-mounted', 'Recessed'],
      buildingTypes: ['Retail', 'Hospitality']
    },
    replacement: {
      recommendedReplacement: 'Keep if high-quality, upgrade if low-efficiency',
      replacementReason: 'This IS the replacement technology',
      whenToReplace: {
        condition: 'Only if upgrading to better efficiency or features'
      },
      replacementPriority: 'Keep',
      typicalPaybackYears: 'N/A',
      energySavingsPercent: 'Already efficient',
      notes: ['Consider tunable white for color flexibility']
    },
    images: {
      bulbImage: '/images/bulb-types/led-par.png'
    },
    bestPractices: {
      maintenance: ['Minimal maintenance', 'Clean lens'],
      optimization: ['Add controls', 'Consider tunable white'],
      commonIssues: ['Dimmer compatibility'],
      troubleshooting: []
    }
  },
  
  {
    id: 'led-tube',
    name: 'LED Tube (T8/T12 Replacement)',
    category: 'led',
    subcategory: 'Linear',
    commonNames: ['LED tube', 'LED T8', 'LED fluorescent replacement'],
    identification: {
      physicalCharacteristics: ['Looks like fluorescent tube', 'LED strip inside', 'Plastic or glass', 'May have heat sink'],
      baseTypes: ['Same as fluorescent (bi-pin) or single-end powered'],
      sizeDimensions: 'Same as fluorescent (T8 or T12 size)',
      howToIdentify: [
        'Much lower wattage (8W-20W vs 32W-40W fluorescent)',
        'Instant-on',
        'No ballast required (if ballast bypass)',
        'Cool operation',
        '"LED" marking'
      ],
      typicalManufacturers: ['Philips', 'Sylvania', 'GE', 'Satco']
    },
    specifications: {
      wattageRange: '8W - 22W (replacing 17W-110W fluorescent)',
      lumensPerWatt: '100-140 lm/W',
      colorTemperatureRange: '2700K-6500K',
      colorRenderingIndex: '80-95+ CRI',
      lifespanHours: '50,000+ hours',
      dimmability: 'Yes (with compatible driver)',
      warmUpTime: 'Instant'
    },
    applications: {
      typicalLocations: ['Offices', 'Schools', 'Hospitals', 'Retail'],
      typicalUseCases: ['Fluorescent replacement', 'Troffer lighting'],
      commonFixtures: ['Troffers', 'Strip fixtures'],
      mountingTypes: ['Recessed', 'Surface'],
      buildingTypes: ['Commercial', 'Institutional']
    },
    replacement: {
      recommendedReplacement: 'Keep if high-quality',
      replacementReason: 'This IS the replacement technology',
      whenToReplace: {
        condition: 'Consider upgrading to higher-efficiency or networked version'
      },
      replacementPriority: 'Keep',
      typicalPaybackYears: 'N/A',
      energySavingsPercent: 'Already efficient',
      notes: [
        'Ballast bypass versions save additional energy',
        'Consider networked LED tubes for controls',
        'Single-end powered versions easier installation'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/led-tube.png'
    },
    bestPractices: {
      maintenance: ['Minimal - 50,000+ hour lifespan'],
      optimization: [
        'Consider networked LED tubes',
        'Add daylight harvesting',
        'Add occupancy sensors'
      ],
      commonIssues: ['Installation method (ballast bypass vs plug-and-play)'],
      troubleshooting: []
    }
  },
  
  {
    id: 'led-highbay',
    name: 'LED High-Bay Fixture',
    category: 'led',
    subcategory: 'High-Bay',
    commonNames: ['LED high-bay', 'LED warehouse light', 'LED industrial fixture'],
    identification: {
      physicalCharacteristics: ['LED fixture (not bulb)', 'Multiple LED arrays', 'Heat sink visible', 'Various shapes'],
      baseTypes: ['Direct wire (no bulb)'],
      howToIdentify: [
        'Fixture replacement, not bulb',
        'LED arrays visible',
        'Much lower wattage than HID',
        'Cool operation',
        'Instant-on'
      ],
      typicalManufacturers: ['Cree', 'Acuity', 'Eaton', 'Lithonia']
    },
    specifications: {
      wattageRange: '50W - 500W (replacing 100W-1000W HID)',
      lumensPerWatt: '100-150+ lm/W',
      colorTemperatureRange: '3000K-5000K',
      colorRenderingIndex: '70-90+ CRI',
      lifespanHours: '50,000-100,000 hours',
      dimmability: 'Yes (with driver)',
      warmUpTime: 'Instant'
    },
    applications: {
      typicalLocations: ['Warehouses', 'Manufacturing', 'Gymnasiums', 'Distribution centers'],
      typicalUseCases: ['High-bay lighting', 'Industrial lighting'],
      commonFixtures: ['High-bay fixtures'],
      mountingTypes: ['High-mounted', 'Suspended'],
      buildingTypes: ['Industrial', 'Warehouse']
    },
    replacement: {
      recommendedReplacement: 'Keep if high-quality',
      replacementReason: 'This IS the replacement technology',
      whenToReplace: {
        condition: 'Consider upgrading to networked version or higher efficiency'
      },
      replacementPriority: 'Keep',
      typicalPaybackYears: 'N/A',
      energySavingsPercent: 'Already efficient',
      notes: [
        'Consider networked versions for controls',
        'Can often reduce number of fixtures needed',
        'Consider tunable white for applications'
      ]
    },
    images: {
      bulbImage: '/images/bulb-types/led-highbay.png'
    },
    bestPractices: {
      maintenance: ['Minimal maintenance', 'Clean occasionally'],
      optimization: ['Add networked controls', 'Consider dimming schedules'],
      commonIssues: [],
      troubleshooting: []
    }
  },
  
  // SPECIALTY TYPES
  {
    id: 'other-linear-led',
    name: 'Linear LED (T5/T8 Size)',
    category: 'led',
    subcategory: 'Linear',
    commonNames: ['LED strip', 'LED linear', 'T5 LED', 'LED panel'],
    identification: {
      physicalCharacteristics: ['LED strip or panel', 'Various lengths', 'May be flexible or rigid'],
      baseTypes: ['Various'],
      howToIdentify: ['LED technology', 'Various form factors'],
      typicalManufacturers: ['Various']
    },
    specifications: {
      wattageRange: 'Varies',
      lumensPerWatt: '100-140 lm/W',
      lifespanHours: '50,000+ hours',
      warmUpTime: 'Instant'
    },
    applications: {
      typicalLocations: ['Modern offices', 'Retail', 'Residential'],
      typicalUseCases: ['Task lighting', 'Accent lighting', 'Under-cabinet'],
      commonFixtures: ['Modern fixtures'],
      mountingTypes: ['Various'],
      buildingTypes: ['Commercial']
    },
    replacement: {
      recommendedReplacement: 'Keep',
      replacementPriority: 'Keep',
      typicalPaybackYears: 'N/A',
      energySavingsPercent: 'Already efficient',
      notes: []
    },
    images: {
      bulbImage: '/images/bulb-types/linear-led.png'
    },
    bestPractices: {
      maintenance: [],
      optimization: [],
      commonIssues: [],
      troubleshooting: []
    }
  },
  
  {
    id: 'other-candle',
    name: 'Candle/Chandelier Bulbs (Type B/C)',
    category: 'incandescent',
    subcategory: 'Decorative',
    commonNames: ['Candle bulb', 'Chandelier bulb', 'Type B', 'Type C'],
    identification: {
      physicalCharacteristics: ['Candle flame shape', 'Small size', 'Decorative'],
      baseTypes: ['E12 (candelabra)', 'E14'],
      howToIdentify: ['Flame shape', 'Small base', 'Decorative applications'],
      typicalManufacturers: ['GE', 'Philips']
    },
    specifications: {
      wattageRange: '5W - 60W',
      lumensPerWatt: '10-15 lm/W (incandescent)',
      lifespanHours: '1,000-2,000 hours (incandescent)',
      dimmability: 'Yes'
    },
    applications: {
      typicalLocations: ['Hotels', 'Restaurants', 'Residential'],
      typicalUseCases: ['Chandeliers', 'Decorative fixtures'],
      commonFixtures: ['Chandeliers', 'Decorative fixtures'],
      mountingTypes: ['Decorative'],
      buildingTypes: ['Hospitality']
    },
    replacement: {
      recommendedReplacement: 'LED Candle Bulb',
      replacementReason: 'LED candle bulbs provide 80-85% energy savings with same appearance',
      whenToReplace: {
        priority: 'Medium-High'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '1-3 years',
      energySavingsPercent: '80-85%',
      notes: ['LED candle bulbs available in same shape', 'Check dimming compatibility']
    },
    images: {
      bulbImage: '/images/bulb-types/candle-bulb.png'
    },
    bestPractices: {
      maintenance: [],
      optimization: ['Replace with LED'],
      commonIssues: [],
      troubleshooting: []
    }
  },
  
  {
    id: 'other-globe',
    name: 'Globe Bulbs (Type G)',
    category: 'incandescent',
    subcategory: 'Decorative',
    commonNames: ['Globe bulb', 'Type G', 'Round bulb'],
    identification: {
      physicalCharacteristics: ['Round/globe shape', 'Various sizes'],
      baseTypes: ['E26', 'E12'],
      howToIdentify: ['Round shape', 'Decorative'],
      typicalManufacturers: ['GE', 'Philips']
    },
    specifications: {
      wattageRange: '15W - 100W',
      lumensPerWatt: '10-15 lm/W (incandescent)',
      lifespanHours: '1,000-2,000 hours (incandescent)',
      dimmability: 'Yes'
    },
    applications: {
      typicalLocations: ['Hotels', 'Restaurants', 'Bathrooms'],
      typicalUseCases: ['Vanity lighting', 'Decorative fixtures'],
      commonFixtures: ['Vanity fixtures', 'Decorative fixtures'],
      mountingTypes: ['Decorative'],
      buildingTypes: ['Hospitality']
    },
    replacement: {
      recommendedReplacement: 'LED Globe Bulb',
      replacementReason: 'LED provides 80-85% energy savings',
      whenToReplace: {
        priority: 'Medium-High'
      },
      replacementPriority: 'High',
      typicalPaybackYears: '1-3 years',
      energySavingsPercent: '80-85%',
      notes: ['LED globe bulbs available']
    },
    images: {
      bulbImage: '/images/bulb-types/globe-bulb.png'
    },
    bestPractices: {
      maintenance: [],
      optimization: ['Replace with LED'],
      commonIssues: [],
      troubleshooting: []
    }
  }
];

/**
 * Replacement Logic Engine
 * Determines what to replace, when, and why
 */
export interface ReplacementRecommendation {
  currentBulbType: BulbType;
  recommendedReplacement: BulbType;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Keep';
  reasoning: string;
  paybackYears: string;
  energySavingsPercent: string;
  whenToReplace: string[];
  notes: string[];
}

/**
 * Get replacement recommendation for a bulb type
 */
export function getReplacementRecommendation(bulbTypeId: string): ReplacementRecommendation | null {
  const bulb = ALL_BULB_TYPES.find(b => b.id === bulbTypeId);
  if (!bulb) return null;
  
  const replacement = ALL_BULB_TYPES.find(b => b.id === bulb.replacement.recommendedReplacement.toLowerCase().replace(/\s+/g, '-'));
  
  return {
    currentBulbType: bulb,
    recommendedReplacement: replacement || bulb,
    priority: bulb.replacement.replacementPriority,
    reasoning: bulb.replacement.replacementReason,
    paybackYears: bulb.replacement.typicalPaybackYears,
    energySavingsPercent: bulb.replacement.energySavingsPercent,
    whenToReplace: Object.values(bulb.replacement.whenToReplace).filter(v => v) as string[],
    notes: bulb.replacement.notes
  };
}

/**
 * Find bulb type by various identifiers
 */
export function findBulbType(identifier: string): BulbType | null {
  const search = identifier.toLowerCase();
  
  return ALL_BULB_TYPES.find(bulb => 
    bulb.id.toLowerCase().includes(search) ||
    bulb.name.toLowerCase().includes(search) ||
    bulb.commonNames.some(name => name.toLowerCase().includes(search)) ||
    bulb.identification.baseTypes.some(base => base.toLowerCase().includes(search))
  ) || null;
}

/**
 * Get all bulb types by category
 */
export function getBulbTypesByCategory(category: BulbType['category']): BulbType[] {
  return ALL_BULB_TYPES.filter(b => b.category === category);
}


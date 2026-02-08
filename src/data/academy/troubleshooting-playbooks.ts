export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type EquipmentType =
  | 'ahu'
  | 'vav'
  | 'chiller'
  | 'boiler'
  | 'cooling-tower'
  | 'pump'
  | 'vfd'
  | 'sensor'
  | 'economizer'
  | 'plant'
  | 'zone';

export interface TrendPoint {
  /** Example: "AHU-1.SAT" or "VAV-203.ReheatValveFB" */
  point: string;
  /** What it represents in plain English */
  meaning: string;
  /** Suggested interval (e.g., "1 min", "5 min") */
  interval?: string;
}

export interface QuickCheck {
  label: string;
  whatToLookFor: string;
  stopCondition?: string;
}

export interface MitigationStep {
  step: string;
  rollback: string;
  risk: 'lowest' | 'low' | 'medium' | 'high';
}

export interface VerificationItem {
  verify: string;
  when: string;
}

export interface TroubleshootingPlaybook {
  id: string;
  title: string;
  /** Human owner for review + updates (e.g., "Controls Lead") */
  owner?: string;
  /** ISO date string for last review */
  lastReviewedAt?: string;
  /** Increment when materially changing the playbook (schema/content) */
  version?: number;
  /** Optional markdown source path for human editing */
  sourceMarkdownPath?: string;
  severity: Severity;
  systems: EquipmentType[];
  symptoms: string[];
  likelyCauses: string[];
  fastTriage: QuickCheck[];
  recommendedTrends: TrendPoint[];
  mitigations: MitigationStep[];
  verification: VerificationItem[];
  /** Explicit “do not proceed” conditions that require escalation */
  stopConditions?: string[];
  tags: string[];
}

export const TROUBLESHOOTING_PLAYBOOKS: TroubleshootingPlaybook[] = [
  {
    id: 'simultaneous-heat-cool',
    title: 'Simultaneous heating & cooling (reheat fighting)',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/SIMULTANEOUS_HEAT_COOL.md',
    severity: 'high',
    systems: ['ahu', 'vav', 'zone', 'plant'],
    symptoms: [
      'High reheat while cooling is active',
      'Comfort complaints + high HW usage',
      'Low CHW ΔT / elevated plant load',
    ],
    likelyCauses: [
      'SAT too cold for zone load profile',
      'VAV minimum airflow too high (or stuck high)',
      'Deadband too tight or misconfigured',
      'Sensor bias causing false cooling demand',
      'Overrides (setpoints/min airflow) left in place',
    ],
    fastTriage: [
      {
        label: 'Confirm “cooling vs reheat” is real',
        whatToLookFor:
          'Command vs feedback: cooling valve/damper/fan and reheat valve/command are actually moving (not just commanded).',
      },
      {
        label: 'Check SAT reset behavior',
        whatToLookFor: 'SAT setpoint vs SAT actual: stable? stuck? always at low limit?',
      },
      {
        label: 'Check a representative VAV',
        whatToLookFor: 'Min airflow setting vs actual; reheat valve position vs zone temp error.',
      },
    ],
    recommendedTrends: [
      { point: 'AHU.SAT_SP', meaning: 'Supply air temperature setpoint', interval: '5 min' },
      { point: 'AHU.SAT', meaning: 'Supply air temperature (actual)', interval: '5 min' },
      { point: 'AHU.FanSpeed', meaning: 'Supply fan speed / VFD %', interval: '5 min' },
      { point: 'VAV.ZoneTemp', meaning: 'Zone temperature', interval: '5 min' },
      { point: 'VAV.ReheatCmd', meaning: 'Reheat valve command', interval: '5 min' },
      { point: 'VAV.ReheatFb', meaning: 'Reheat valve feedback (if available)', interval: '5 min' },
      { point: 'VAV.Airflow', meaning: 'Measured airflow', interval: '5 min' },
      { point: 'VAV.MinAirflow', meaning: 'Minimum airflow setting', interval: 'static' },
    ],
    mitigations: [
      {
        step: 'Remove non-essential overrides (setpoints/min airflow) with a written rollback plan.',
        rollback: 'Restore previous values and document who/when/why.',
        risk: 'low',
      },
      {
        step: 'If SAT is pinned low, adjust reset limits cautiously (only within approved bounds).',
        rollback: 'Return SAT reset limits to prior values.',
        risk: 'medium',
      },
    ],
    verification: [
      { verify: 'Reheat command/feedback reduces while zone temp remains stable', when: '15–60 minutes' },
      { verify: 'Plant kW and HW usage trend improves without new complaints', when: '24 hours' },
    ],
    stopConditions: [
      'Any indication a change may impact critical clinical spaces — escalate before adjusting setpoints/sequences.',
      'If command/feedback points are inconsistent or mis-mapped — fix mapping before taking action.',
    ],
    tags: ['reheat', 'fighting', 'sat', 'deadband', 'energy-waste'],
  },
  {
    id: 'static-pressure-hunting',
    title: 'Static pressure hunting / unstable fan control',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/STATIC_PRESSURE_HUNTING.md',
    severity: 'medium',
    systems: ['ahu', 'vfd', 'sensor'],
    symptoms: [
      'Fan speed oscillates up/down repeatedly',
      'Duct static pressure oscillates; noisy airflow',
      'Frequent VFD alarms or comfort instability',
    ],
    likelyCauses: [
      'Bad/static pressure sensor location or bias',
      'Control loop tuned too aggressively (P/I gains, rate limits)',
      'Setpoint resets too fast or conflicting',
      'Terminal devices hunting (VAV instability) driving rapid demand swings',
    ],
    fastTriage: [
      {
        label: 'Validate sensor plausibility',
        whatToLookFor: 'Static pressure readings plausible and responsive; no flatlines/spikes.',
      },
      {
        label: 'Look for reset thrash',
        whatToLookFor: 'Static pressure setpoint changing too frequently or bouncing between limits.',
      },
    ],
    recommendedTrends: [
      { point: 'AHU.SP_SP', meaning: 'Static pressure setpoint', interval: '1 min' },
      { point: 'AHU.SP', meaning: 'Static pressure actual', interval: '1 min' },
      { point: 'AHU.FanSpeed', meaning: 'Supply fan speed / VFD %', interval: '1 min' },
    ],
    mitigations: [
      {
        step: 'Stabilize resets (slower reset rate / wider deadband) before changing loop tuning.',
        rollback: 'Restore prior reset parameters.',
        risk: 'low',
      },
      {
        step: 'If allowed, adjust loop tuning conservatively (small changes, one at a time).',
        rollback: 'Restore prior tuning values.',
        risk: 'high',
      },
    ],
    verification: [
      { verify: 'Fan speed and SP settle with fewer oscillations', when: '15–30 minutes' },
      { verify: 'Comfort complaints do not increase', when: '24 hours' },
    ],
    stopConditions: ['If VFD faults increase or safety interlocks trip — stop and escalate.'],
    tags: ['static-pressure', 'hunting', 'fan', 'vfd'],
  },
  {
    id: 'economizer-not-economizing',
    title: 'Economizer not economizing (bad mixed-air reality)',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/ECONOMIZER_NOT_ECONOMIZING.md',
    severity: 'medium',
    systems: ['ahu', 'economizer', 'sensor'],
    symptoms: [
      'OA dampers stay closed when conditions seem favorable',
      'Mechanical cooling runs during “free cooling” weather',
      'Mixed air temperature doesn’t make sense',
    ],
    likelyCauses: [
      'Bad OAT/RAT/MAT sensors or mislabeling/mapping',
      'OA damper actuator failure (command ≠ position)',
      'Interlocks (smoke, freeze, humidity, IAQ) keeping economizer disabled',
      'Incorrect changeover logic or limits',
    ],
    fastTriage: [
      {
        label: 'Check sensor mapping and plausibility',
        whatToLookFor: 'OAT/RAT/MAT values align with reality; MAT between OAT and RAT.',
      },
      {
        label: 'Check damper command vs feedback',
        whatToLookFor: 'OA damper position feedback tracks command; no stuck actuator.',
      },
      {
        label: 'Check disable conditions',
        whatToLookFor: 'Smoke/freeze/humidity/IAQ signals present? Any lockouts active?',
      },
    ],
    recommendedTrends: [
      { point: 'AHU.OAT', meaning: 'Outdoor air temperature', interval: '5 min' },
      { point: 'AHU.RAT', meaning: 'Return air temperature', interval: '5 min' },
      { point: 'AHU.MAT', meaning: 'Mixed air temperature', interval: '5 min' },
      { point: 'AHU.OADamperCmd', meaning: 'OA damper command', interval: '5 min' },
      { point: 'AHU.OADamperFb', meaning: 'OA damper feedback', interval: '5 min' },
      { point: 'AHU.CoolingValveCmd', meaning: 'Cooling valve command', interval: '5 min' },
    ],
    mitigations: [
      {
        step: 'Fix point mapping / sensor bias before touching sequences.',
        rollback: 'Revert mapping changes and document.',
        risk: 'medium',
      },
      {
        step: 'If actuator is stuck, resolve mechanical issue; avoid “compensating” with setpoints.',
        rollback: 'N/A (mechanical fix).',
        risk: 'low',
      },
    ],
    verification: [
      { verify: 'MAT behaves physically (between OAT and RAT)', when: 'same day' },
      { verify: 'Cooling valve reduces when economizer conditions are met', when: 'same day' },
    ],
    stopConditions: ['If freeze protection, smoke, or IAQ lockouts are active — do not override; escalate.'],
    tags: ['economizer', 'mixed-air', 'oa', 'sensors'],
  },
  {
    id: 'excessive-reheat-high-hw',
    title: 'Excessive reheat / high heating hot water consumption',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/EXCESSIVE_REHEAT_HIGH_HW.md',
    severity: 'high',
    systems: ['vav', 'ahu', 'plant', 'zone'],
    symptoms: ['Unexpectedly high HW usage', 'Many zones reheating', 'Comfort complaints + high energy'],
    likelyCauses: [
      'Simultaneous heat/cool due to SAT too low',
      'VAV min airflows too high',
      'Tight deadbands causing constant reheat',
      'Sensor bias or mis-calibration',
      'Overrides left in place (setpoints/min airflow/schedules)',
    ],
    fastTriage: [
      { label: 'Check if reheat is widespread', whatToLookFor: 'Sample 5–10 zones; reheat not just isolated to one unit.' },
      { label: 'Confirm plant vs airside drivers', whatToLookFor: 'Is HW demand driven by zones or by AHU coils?' },
    ],
    recommendedTrends: [
      { point: 'Plant.HW_SupplyTemp', meaning: 'Heating hot water supply temperature', interval: '5 min' },
      { point: 'Plant.HW_ReturnTemp', meaning: 'Heating hot water return temperature', interval: '5 min' },
      { point: 'AHU.SAT_SP', meaning: 'SAT setpoint', interval: '5 min' },
      { point: 'AHU.SAT', meaning: 'SAT actual', interval: '5 min' },
      { point: 'VAV.ReheatCmd', meaning: 'Reheat valve command', interval: '5 min' },
      { point: 'VAV.ZoneTemp', meaning: 'Zone temperature', interval: '5 min' },
    ],
    mitigations: [
      { step: 'Remove non-essential overrides and retest.', rollback: 'Restore prior values and document.', risk: 'low' },
      { step: 'Correct sensor mapping/bias before changing reset strategy.', rollback: 'Revert mapping changes and document.', risk: 'medium' },
    ],
    verification: [
      { verify: 'Reheat command reduces across representative zones', when: '15–60 minutes' },
      { verify: 'HW consumption trend improves without new comfort issues', when: '24 hours' },
    ],
    stopConditions: ['If temperature constraints in critical spaces are at risk — stop and escalate.'],
    tags: ['reheat', 'hw', 'energy-waste'],
  },
  {
    id: 'sat-reset-causing-complaints',
    title: 'SAT reset causing comfort complaints',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/SAT_RESET_COMFORT.md',
    severity: 'medium',
    systems: ['ahu', 'zone', 'sensor'],
    symptoms: ['Hot/cold calls after SAT reset changes', 'Zones swing when SAT changes'],
    likelyCauses: [
      'Reset bounds too aggressive (too warm/too cold)',
      'Reset changes too quickly',
      'Bad SAT sensor/mapping',
      'Zone control not aligned (mins/deadbands)',
    ],
    fastTriage: [
      { label: 'Trend SAT_SP vs SAT', whatToLookFor: 'SAT tracks setpoint; no sensor anomalies.' },
      { label: 'Correlate complaints to reset movement', whatToLookFor: 'Do calls happen when setpoint shifts or hits limits?' },
    ],
    recommendedTrends: [
      { point: 'AHU.SAT_SP', meaning: 'SAT setpoint', interval: '5 min' },
      { point: 'AHU.SAT', meaning: 'SAT actual', interval: '5 min' },
      { point: 'VAV.ZoneTemp', meaning: 'Zone temp (representative)', interval: '5 min' },
      { point: 'VAV.ReheatCmd', meaning: 'Reheat cmd (representative)', interval: '5 min' },
    ],
    mitigations: [
      { step: 'Stabilize reset rate (slower changes) before changing bounds.', rollback: 'Restore prior reset parameters.', risk: 'low' },
      { step: 'Adjust reset bounds conservatively within site policy.', rollback: 'Return bounds to prior values.', risk: 'medium' },
    ],
    verification: [
      { verify: 'Complaint frequency drops while energy impact stays acceptable', when: '24–72 hours' },
    ],
    stopConditions: ['If SAT change risks humidity/pressurization requirements — escalate.'],
    tags: ['sat', 'reset', 'comfort'],
  },
  {
    id: 'chw-reset-coil-performance',
    title: 'CHW reset causing coil performance problems',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/CHW_RESET_COIL.md',
    severity: 'medium',
    systems: ['chiller', 'ahu', 'plant', 'sensor'],
    symptoms: ['Humidity/temperature issues after CHW reset', 'Coils cannot meet load'],
    likelyCauses: [
      'LCHW setpoint reset too warm for latent load',
      'Valve authority issues (valve at 100% with no response)',
      'Sensor bias (SAT/RH)',
      'Plant constraints or staging limits',
    ],
    fastTriage: [
      { label: 'Check coil valve position vs SAT', whatToLookFor: 'Valve saturates while SAT remains high.' },
      { label: 'Check LCHW_SP movement', whatToLookFor: 'Setpoint not reset too warm during high latent load.' },
    ],
    recommendedTrends: [
      { point: 'Plant.LCHW_SP', meaning: 'Leaving CHW setpoint', interval: '5 min' },
      { point: 'Plant.LCHW', meaning: 'Leaving CHW actual', interval: '5 min' },
      { point: 'AHU.CoolingValveCmd', meaning: 'Cooling valve command', interval: '5 min' },
      { point: 'AHU.SAT', meaning: 'Supply air temp', interval: '5 min' },
    ],
    mitigations: [
      { step: 'Temporarily constrain reset (within policy) during diagnosis.', rollback: 'Restore prior reset schedule/limits.', risk: 'medium' },
      { step: 'Validate sensor mapping and coil capacity assumptions before changing plant strategy.', rollback: 'Revert mapping changes.', risk: 'medium' },
    ],
    verification: [
      { verify: 'Coil can meet SAT/latent targets without valve saturation', when: 'same day' },
      { verify: 'Energy impact understood and acceptable', when: '24 hours' },
    ],
    stopConditions: ['If humidity control in critical areas is impacted — stop and escalate.'],
    tags: ['chw', 'reset', 'coil', 'humidity'],
  },
  {
    id: 'overnight-runtime-creep',
    title: 'Overnight runtime creep / scheduling drift',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/SCHEDULING_DRIFT.md',
    severity: 'low',
    systems: ['ahu', 'plant'],
    symptoms: ['Equipment runs outside intended hours', 'Runtimes creep later/earlier over weeks'],
    likelyCauses: ['Manual overrides left on', 'Holiday schedules missing', 'Start/stop optimum misconfigured', 'Operator workarounds'],
    fastTriage: [
      { label: 'Check schedule + overrides', whatToLookFor: 'Current occupancy schedule vs override status.' },
      { label: 'Check “optimum start/stop” behavior', whatToLookFor: 'Start times drifting due to aggressive optimization logic.' },
    ],
    recommendedTrends: [
      { point: 'AHU.OccSchedule', meaning: 'Occupancy schedule state', interval: '5 min' },
      { point: 'AHU.FanStatus', meaning: 'Fan status', interval: '5 min' },
      { point: 'Plant.Enable', meaning: 'Plant enable state', interval: '5 min' },
    ],
    mitigations: [
      { step: 'Clear overrides and document who/why/when.', rollback: 'Reapply override only if required and timebox it.', risk: 'lowest' },
      { step: 'Add holiday schedule coverage and test.', rollback: 'Revert schedule changes.', risk: 'low' },
    ],
    verification: [{ verify: 'Runtime aligns with intended schedule', when: 'next week' }],
    tags: ['schedule', 'runtime', 'overrides'],
  },
  {
    id: 'sensor-drift-bias',
    title: 'Sensor drift / bias (RAT/SAT/MAT/zone)',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/SENSOR_DRIFT_BIAS.md',
    severity: 'medium',
    systems: ['sensor', 'ahu', 'zone'],
    symptoms: ['Trends don’t match reality', 'Control seems “wrong” but equipment responds normally'],
    likelyCauses: ['Sensor drift/bias', 'Bad placement', 'Mis-mapped points', 'Unit conversion/scaling errors'],
    fastTriage: [
      { label: 'Plausibility check', whatToLookFor: 'Values within expected physical bounds; MAT between OAT and RAT.' },
      { label: 'Cross-check with handheld/reference', whatToLookFor: 'Spot-check sensor with calibrated device if policy allows.' },
    ],
    recommendedTrends: [
      { point: 'AHU.OAT', meaning: 'Outdoor air temperature', interval: '5 min' },
      { point: 'AHU.RAT', meaning: 'Return air temperature', interval: '5 min' },
      { point: 'AHU.MAT', meaning: 'Mixed air temperature', interval: '5 min' },
      { point: 'AHU.SAT', meaning: 'Supply air temperature', interval: '5 min' },
      { point: 'VAV.ZoneTemp', meaning: 'Zone temperature', interval: '5 min' },
    ],
    mitigations: [
      { step: 'Fix mapping/scaling first; then calibrate/replace sensor if needed.', rollback: 'Revert mapping changes and document.', risk: 'medium' },
    ],
    verification: [{ verify: 'Sensor readings align with physical reality and control stabilizes', when: 'same day' }],
    stopConditions: ['If sensor is used for safety interlocks — escalate before changes.'],
    tags: ['sensor', 'bias', 'mapping'],
  },
  {
    id: 'overrides-set-and-forget',
    title: 'Overrides and “set it and forget it” failures',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/OVERRIDES_SET_FORGET.md',
    severity: 'medium',
    systems: ['ahu', 'vav', 'plant'],
    symptoms: ['System never returns to normal control', 'Energy use elevated after a service call'],
    likelyCauses: ['Manual overrides left enabled', 'Temporary setpoints never reverted', 'Schedule bypass'],
    fastTriage: [
      { label: 'Audit overrides', whatToLookFor: 'Search BMS for active overrides, forced values, manual mode.' },
      { label: 'Find trigger event', whatToLookFor: 'Maintenance logs / alarms / vendor visits correlate with issue start.' },
    ],
    recommendedTrends: [
      { point: 'AHU.OverrideStatus', meaning: 'Override indicators (if available)', interval: 'static' },
      { point: 'AHU.FanStatus', meaning: 'Fan status', interval: '5 min' },
      { point: 'AHU.SAT_SP', meaning: 'SAT setpoint', interval: '5 min' },
    ],
    mitigations: [
      { step: 'Remove overrides one subsystem at a time; verify after each change.', rollback: 'Re-enable prior override temporarily if needed; timebox it.', risk: 'low' },
    ],
    verification: [{ verify: 'System returns to expected sequence behavior and energy normalizes', when: '24 hours' }],
    tags: ['overrides', 'process', 'governance'],
  },
  {
    id: 'vfd-trips-basic',
    title: 'VFD common issues (trips/alarms basics + safe checks)',
    owner: 'Engineering Academy',
    lastReviewedAt: '2026-01-18',
    version: 1,
    sourceMarkdownPath: 'docs/academy/engineering/playbooks/VFD_TRIPS.md',
    severity: 'high',
    systems: ['vfd', 'ahu', 'pump', 'fan'],
    symptoms: ['VFD trips', 'Intermittent fan/pump stoppage', 'Overcurrent/overtemp alarms'],
    likelyCauses: ['Mechanical load issues', 'Bad bearings/belts', 'Cooling/ventilation issues', 'Electrical issues', 'Control instability'],
    fastTriage: [
      { label: 'Capture alarm code + timestamp', whatToLookFor: 'Exact fault + time window.' },
      { label: 'Check for hunting/instability', whatToLookFor: 'Speed command oscillations that can trigger faults.' },
    ],
    recommendedTrends: [
      { point: 'VFD.SpeedCmd', meaning: 'Speed command %', interval: '1 min' },
      { point: 'VFD.SpeedFb', meaning: 'Speed feedback %', interval: '1 min' },
      { point: 'VFD.Current', meaning: 'Motor current', interval: '1 min' },
      { point: 'VFD.Fault', meaning: 'Fault status/code', interval: '1 min' },
    ],
    mitigations: [
      { step: 'Stabilize control demand (reduce hunting) before assuming hardware failure.', rollback: 'Restore prior control params.', risk: 'medium' },
      { step: 'Coordinate mechanical inspection if faults persist.', rollback: 'N/A', risk: 'low' },
    ],
    verification: [{ verify: 'Fault frequency decreases and equipment runs stable', when: '24–72 hours' }],
    stopConditions: ['If repeated trips risk equipment damage — stop and escalate immediately.'],
    tags: ['vfd', 'faults', 'alarms'],
  },
];


export type SectionType = 'engine' | 'battery' | 'dual_check' | 'triple_check' | 'ok_only' | 'fire_ext'

export interface SectionDef {
  id: string
  label: string
  type: SectionType
  items: string[]
  col1?: string  // override col header for type=dual_check/triple_check
  col2?: string
  col3?: string
}

export const INSPECTION_SECTIONS: SectionDef[] = [
  {
    id: 'port_engine',
    label: 'Port Engine',
    type: 'engine',
    items: ['Oil Level','Antifreeze level','Pod oil level','Oil hoses & lines','Air Cleaner','Belts','Fuel Filter','Fuel/Water Sep','Oil Filter','Pod Oil Filter','Saltwater Pump','Saltwater Impeller','Saltwater Seacock','Saltwater Strainer','Paint','Clean','Exhaust','Engine Mounts'],
  },
  {
    id: 'stbd_engine',
    label: 'Stbd Engine',
    type: 'engine',
    items: ['Oil Level','Antifreeze level','Pod oil level','Oil hoses & lines','Air Cleaner','Belts','Fuel Filter','Fuel/Water Sep','Oil Filter','Pod Oil Filter','Saltwater Pump','Saltwater Impeller','Saltwater Seacock','Saltwater Strainer','Paint','Clean','Exhaust','Engine Mounts'],
  },
  {
    id: 'port_gen',
    label: 'Port Gen (AUX)',
    type: 'engine',
    items: ['Oil level','Antifreeze level','Oil hoses & lines','Air Cleaner','Belts','Fuel Filter','Fuel/Water Sep','Oil Filter','Saltwater Pump','Saltwater Impeller','Saltwater Seacock','Saltwater Strainer','Zincs','Volts'],
  },
  {
    id: 'stbd_gen',
    label: 'Stbd Gen (Main)',
    type: 'engine',
    items: ['Oil level','Antifreeze level','Oil hoses & lines','Air Cleaner','Belts','Fuel Filter','Fuel/Water Sep','Oil Filter','Saltwater Pump','Saltwater Impeller','Saltwater Seacock','Saltwater Strainer','Zincs','Volts'],
  },
  {
    id: 'batteries',
    label: 'Batteries',
    type: 'battery',
    items: ['PORT Start Bank','STBD Start Bank','House Bank','Bow thruster','Stbd Gen - Main','Port Gen - AUX'],
  },
  {
    id: 'helm_instruments',
    label: 'Helm Instruments',
    type: 'dual_check',
    col1: 'PORT', col2: 'STBD',
    items: ["Rpm's","Engine Oil Pressure","Engine Oil Temp","Trans Oil Pressure","Trans Oil Temp","Water Temperature","Engine Fuel Pressure","Voltmeter","Water","Fuel"],
  },
  {
    id: 'fly_instruments',
    label: 'Fly Instruments',
    type: 'dual_check',
    col1: 'PORT', col2: 'STBD',
    items: ["Rpm's","Engine Oil Pressure","Pod Oil Pressure","Trans Pressure","Engine Fuel Pressure","Oil Temp","Water Temperature","Exhaust Temp","Voltmeter","Water","Fuel"],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    type: 'triple_check',
    col1: 'HELM', col2: 'FLY', col3: 'STERN',
    items: ['Navigation','Radar','AIS','Autopilot','VHF Radio','Depth Sounder','Fish Sonar','Horn','Bow Thruster','Joystick Controls',"Camera's"],
  },
  {
    id: 'lights',
    label: 'Lights',
    type: 'ok_only',
    items: ['Port Running Light','Stbd Running Light','Nav Light','Anchor Light','Spotlight','Stern Light','Salon Lights','Cockpit Lights','Engine Room Lights'],
  },
  {
    id: 'bilges',
    label: 'Bilges / Pumps',
    type: 'ok_only',
    items: ['Bow Bilge','Mid Bilge','Eng Rm Bilge','Aft Bilge','Stern Bilge','Black water pump','Water Pump'],
  },
  {
    id: 'fire_ext',
    label: 'Fire Extinguishers',
    type: 'fire_ext',
    items: ['Engine Room','Cockpit Ext','Stateroom Ext','Salon Ext'],
  },
  {
    id: 'misc',
    label: 'Misc',
    type: 'ok_only',
    items: ['Anchor windless','Anchor Chain','Port Aft Line wind','Stbd Aft Line wind','Shore Power #1','Shore power #2','Cable Master 1','Cable Master 2','Swim step','Electric Helm Seats','Trim Tabs','Watermaker','Sea Keeper','AC Chiller','Sunroof','Tender','Tender engine','Flares'],
  },
]

// The original Patron template doubles as the "Power" preset and the fallback
// for any vessel/inspection that doesn't have its own stored template.
export const PRESET_POWER: SectionDef[] = INSPECTION_SECTIONS

// A sensible single-engine sailboat starting point.
export const PRESET_SAILBOAT: SectionDef[] = [
  {
    id: 'engine',
    label: 'Engine',
    type: 'engine',
    items: ['Oil Level','Antifreeze level','Oil hoses & lines','Air Cleaner','Belts','Fuel Filter','Fuel/Water Sep','Oil Filter','Saltwater Pump','Saltwater Impeller','Saltwater Seacock','Saltwater Strainer','Paint','Clean','Exhaust','Engine Mounts'],
  },
  {
    id: 'batteries',
    label: 'Batteries',
    type: 'battery',
    items: ['Start Bank','House Bank'],
  },
  {
    id: 'instruments',
    label: 'Instruments',
    type: 'ok_only',
    items: ["Rpm's",'Engine Oil Pressure','Water Temperature','Voltmeter','Depth','Wind','Speed/Log','GPS/Chartplotter'],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    type: 'ok_only',
    items: ['Navigation','Radar','AIS','Autopilot','VHF Radio','Depth Sounder','Horn'],
  },
  {
    id: 'rigging',
    label: 'Rigging & Sails',
    type: 'ok_only',
    items: ['Standing rigging','Running rigging','Mainsail','Headsail','Winches','Furler','Boom & vang','Lifelines'],
  },
  {
    id: 'lights',
    label: 'Lights',
    type: 'ok_only',
    items: ['Port Running Light','Stbd Running Light','Steaming Light','Anchor Light','Stern Light','Cabin Lights'],
  },
  {
    id: 'bilges',
    label: 'Bilges / Pumps',
    type: 'ok_only',
    items: ['Bilge pump','Manual bilge pump','Fresh water pump','Black water pump'],
  },
  {
    id: 'fire_ext',
    label: 'Fire Extinguishers',
    type: 'fire_ext',
    items: ['Galley','Cabin','Cockpit'],
  },
  {
    id: 'misc',
    label: 'Misc',
    type: 'ok_only',
    items: ['Anchor windlass','Anchor & chain','Shore Power','Dock lines','Through-hulls','Stove/galley','Head','Tender'],
  },
]

export const PRESET_BLANK: SectionDef[] = []

export const TEMPLATE_PRESETS: { key: string; label: string; sections: SectionDef[] }[] = [
  { key: 'power', label: 'Power — twin engine + genset', sections: PRESET_POWER },
  { key: 'sailboat', label: 'Sailboat — single engine', sections: PRESET_SAILBOAT },
  { key: 'blank', label: 'Blank — build from scratch', sections: PRESET_BLANK },
]

export type ItemData =
  | { level?: string; ok?: boolean; hrs_changed?: string; date_changed?: string; comments?: string }  // engine
  | { volts?: string; ok?: boolean; comments?: string }  // battery
  | { col1?: boolean; col2?: boolean; ok?: boolean; comments?: string }  // dual_check
  | { col1?: boolean; col2?: boolean; col3?: boolean; comments?: string }  // triple_check
  | { ok?: boolean; comments?: string }  // ok_only / fire_ext (+ level for fire)

export interface SectionData {
  hours?: string
  model?: string
  notes?: string
  items: Record<string, ItemData>
}

export type InspectionSections = Record<string, SectionData>

export function emptyInspection(template: SectionDef[] = INSPECTION_SECTIONS): InspectionSections {
  const out: InspectionSections = {}
  for (const sec of template) {
    const items: Record<string, ItemData> = {}
    for (const name of sec.items) {
      if (sec.type === 'engine')        items[name] = { ok: true, level: '', hrs_changed: '', date_changed: '', comments: '' }
      else if (sec.type === 'battery')  items[name] = { ok: true, volts: '', comments: '' }
      else if (sec.type === 'dual_check')   items[name] = { col1: true, col2: true, ok: true, comments: '' }
      else if (sec.type === 'triple_check') items[name] = { col1: true, col2: true, col3: true, comments: '' }
      else if (sec.type === 'fire_ext') items[name] = { ok: true, level: 'Full', comments: '' }
      else                              items[name] = { ok: true, comments: '' }
    }
    out[sec.id] = { hours: '', model: '', notes: '', items }
  }
  return out
}

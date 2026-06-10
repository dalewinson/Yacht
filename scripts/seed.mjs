// Run with: node scripts/seed.mjs
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zwtwrgfgzdzppvszgtui.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dHdyZ2ZnemR6cHB2c3pndHVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA5NjQ1NiwiZXhwIjoyMDk2NjcyNDU2fQ.sjNuH6Xt-q7xQUuarW2BAv01-acBtRqnNO4g7JfAuZk'
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Get Patron vessel ID ────────────────────────────────────────────────────
const { data: vessels } = await supabase.from('vessels').select('id').eq('name','Patron').single()
if (!vessels) { console.error('Patron vessel not found'); process.exit(1) }
const VID = vessels.id
console.log('Vessel ID:', VID)

// ─── Equipment ───────────────────────────────────────────────────────────────
const equipment = [
  { name:'Port engine',          category:'Propulsion',  model:'Volvo Penta IPS 1350', serial:'2013751241', last_service:'2025-12-01', next_due:'2026-06-01', interval:'biannual', assigned_tech:'Dale',  notes:'Oil change + impeller check each service.' },
  { name:'Stbd engine',          category:'Propulsion',  model:'Volvo Penta IPS 1350', serial:'2013751253', last_service:'2026-01-15', next_due:'2026-07-15', interval:'biannual', assigned_tech:'Dale',  notes:'' },
  { name:'Port generator (AUX)', category:'Electrical',  model:'Onan 21.5 MDKDP',      serial:'E170188121', last_service:'2026-03-01', next_due:'2026-09-01', interval:'biannual', assigned_tech:'Dale',  notes:'' },
  { name:'Stbd generator (Main)',category:'Electrical',  model:'Onan 29MDKDS',          serial:'E170192223', last_service:'2025-12-05', next_due:'2026-06-05', interval:'biannual', assigned_tech:'Dale',  notes:'' },
  { name:'Bilge pump — aft',     category:'Safety',      model:'Rule 3700',             serial:null,         last_service:'2025-12-08', next_due:'2026-06-08', interval:'biannual', assigned_tech:null,    notes:'Test float switch monthly.' },
  { name:'AC chiller',           category:'HVAC',        model:'Cruisair SMX',          serial:'SMX-4491',   last_service:'2025-12-15', next_due:'2026-06-15', interval:'biannual', assigned_tech:'Dale',  notes:'Error code cleared May 2026.' },
  { name:'Watermaker',           category:'Systems',     model:'Spectra Newport 400C',  serial:'SPN-8812',   last_service:'2025-07-17', next_due:'2026-07-17', interval:'annual',   assigned_tech:null,    notes:'Pickle if unused 30+ days.' },
  { name:'Autopilot',            category:'Navigation',  model:'Simrad AP80',           serial:'SIM-7741',   last_service:'2026-02-01', next_due:'2026-08-01', interval:'biannual', assigned_tech:null,    notes:'' },
  { name:'Anchor windlass',      category:'Deck',        model:'Maxwell RC12',          serial:'MAX-5510',   last_service:'2026-01-10', next_due:'2026-07-10', interval:'biannual', assigned_tech:null,    notes:'' },
  { name:'Sea Keeper gyro',      category:'Systems',     model:'Sea Keeper 9',          serial:'SK9-441',    last_service:'2025-06-17', next_due:'2026-06-17', interval:'annual',   assigned_tech:null,    notes:'' },
  { name:'Radar',                category:'Navigation',  model:'Furuno FAR-2228',       serial:'FUR-9901',   last_service:'2026-04-01', next_due:'2026-10-01', interval:'biannual', assigned_tech:null,    notes:'' },
  { name:'Chart plotter',        category:'Navigation',  model:'Garmin GPSMAP 8624',    serial:'GAR-3341',   last_service:'2026-03-15', next_due:'2027-03-15', interval:'annual',   assigned_tech:null,    notes:'Software updated V32→V41 May 2026.' },
]
const { error: eqErr } = await supabase.from('equipment').insert(equipment.map(e => ({ ...e, vessel_id: VID })))
if (eqErr) console.error('Equipment error:', eqErr.message)
else console.log(`Inserted ${equipment.length} equipment records`)

// ─── Tickets ─────────────────────────────────────────────────────────────────
const tickets = [
  { title:'Port engine vibration at high RPM',  description:'Noticeable vibration above 2000 RPM. Possible shaft alignment issue.', category:'Propulsion',  priority:'urgent',  status:'in_progress', assigned_to:'Dale' },
  { title:'Cameras not working',                 description:'All cameras offline. Noted on May MMI.',                                category:'Electrical', priority:'high',    status:'open',        assigned_to:null },
  { title:'Tender running lights & bilge pump',  description:'Running lights and bilge pump not working on tender. Noted on May MMI.',category:'Deck',       priority:'medium',  status:'open',        assigned_to:null },
  { title:'Flares expiring July 2026',           description:'Flares expire July 2026. Need to order replacements.',                  category:'Safety',     priority:'high',    status:'open',        assigned_to:null },
  { title:'Cable master 2 gets stuck',           description:'Gets stuck in last foot or so.',                                        category:'Deck',       priority:'low',     status:'open',        assigned_to:null },
]
const { error: tkErr } = await supabase.from('tickets').insert(tickets.map(t => ({ ...t, vessel_id: VID, source: 'manual' })))
if (tkErr) console.error('Tickets error:', tkErr.message)
else console.log(`Inserted ${tickets.length} tickets`)

// ─── Parts ───────────────────────────────────────────────────────────────────
const parts = [
  { name:'Engine oil filter',       category:'Propulsion', equipment_name:'Port/Stbd engine',     part_number:'VP-3825133',  qty_on_hand:4, reorder_at:2, supplier:'Volvo Penta', unit_cost:28 },
  { name:'Fuel/water separator',    category:'Propulsion', equipment_name:'Port/Stbd engine',     part_number:'VP-3817517',  qty_on_hand:2, reorder_at:1, supplier:'Volvo Penta', unit_cost:45 },
  { name:'Saltwater impeller',      category:'Propulsion', equipment_name:'Port/Stbd engine',     part_number:'VP-875811',   qty_on_hand:2, reorder_at:1, supplier:'Volvo Penta', unit_cost:62 },
  { name:'Generator oil filter',    category:'Electrical', equipment_name:'Port/Stbd generator',  part_number:'ONA-185-3054',qty_on_hand:2, reorder_at:1, supplier:'Onan',         unit_cost:18 },
  { name:'AC filter pads',          category:'HVAC',       equipment_name:'AC chiller',            part_number:'CRU-4200',    qty_on_hand:0, reorder_at:2, supplier:'Cruisair',     unit_cost:12 },
  { name:'Bilge pump float switch', category:'Safety',     equipment_name:'All bilge pumps',       part_number:'RULE-35A',    qty_on_hand:1, reorder_at:1, supplier:'Rule',         unit_cost:22 },
  { name:'Engine zincs',            category:'Propulsion', equipment_name:'Port/Stbd engine',     part_number:'ZN-M16',      qty_on_hand:8, reorder_at:4, supplier:'Zincs Online', unit_cost:8  },
  { name:'Watermaker pre-filter',   category:'Systems',    equipment_name:'Watermaker',            part_number:'SPN-WF10',    qty_on_hand:1, reorder_at:2, supplier:'Spectra',      unit_cost:35 },
]
const { error: ptErr } = await supabase.from('parts').insert(parts.map(p => ({ ...p, vessel_id: VID })))
if (ptErr) console.error('Parts error:', ptErr.message)
else console.log(`Inserted ${parts.length} parts`)

// ─── Crew ─────────────────────────────────────────────────────────────────────
const crew = [
  { name:'Dale Winson',         role:'Captain',     phone:'(949) 555-0101', email:'dale@fairwinds.com',    specialty:'Fairwinds Yacht Charters', notes:'Primary contact', avatar_color:'#185FA5', avatar_bg:'#E6F1FB' },
  { name:'J. Davis',            role:'Engineer',    phone:'(949) 555-0182', email:'jdavis@marine.com',     specialty:'Volvo Penta certified',     notes:'',                avatar_color:'#3B6D11', avatar_bg:'#EAF3DE' },
  { name:'M. Torres',           role:'Technician',  phone:'(949) 555-0144', email:'mtorres@marine.com',    specialty:'Electrical & HVAC',         notes:'',                avatar_color:'#854F0B', avatar_bg:'#FAEEDA' },
  { name:'Newport Harbor Marina',role:'Marina',     phone:'(949) 555-0200', email:'dock@newportharbor.com',specialty:'Newport Beach, CA',         notes:'Slip B-42',       avatar_color:'#534AB7', avatar_bg:'#EEEDFE' },
  { name:'USCG Newport',        role:'Emergency',   phone:'(949) 555-0911', email:null,                    specialty:'Channel 16 VHF',            notes:'',                avatar_color:'#A32D2D', avatar_bg:'#FCEBEB' },
]
const { error: crErr } = await supabase.from('crew').insert(crew.map(c => ({ ...c, vessel_id: VID })))
if (crErr) console.error('Crew error:', crErr.message)
else console.log(`Inserted ${crew.length} crew/contacts`)

console.log('\n✓ Seed complete')

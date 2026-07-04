import { useState, useEffect } from 'react'
import { Car, Check, AlertCircle, ChevronDown, Loader2 } from 'lucide-react'

// Static vehicle database for Year/Make/Model selection — expanded coverage
type MakeModels = Record<string, string[]>
type YearMakes = Record<number, MakeModels>

const COMMON_JDM: string[] = ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner', 'Prius', 'Sienna', 'Sequoia', 'Venza', 'Land Cruiser', 'bZ4X']
const COMMON_HONDA: string[] = ['Civic', 'Accord', 'CR-V', 'Pilot', 'HR-V', 'Odyssey', 'Ridgeline', 'Insight', 'Passport', 'Prologue']
const COMMON_FORD: string[] = ['F-150', 'F-250', 'F-350', 'Mustang', 'Explorer', 'Escape', 'Bronco', 'Edge', 'Expedition', 'Ranger', 'Maverick', 'Transit', 'Mustang Mach-E', 'F-150 Lightning', 'E-Transit']
const COMMON_CHEVY: string[] = ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Blazer', 'Trax', 'Corvette', 'Bolt EV', 'Bolt EUV', 'Blazer EV', 'Equinox EV', 'Silverado EV']
const COMMON_HYUNDAI: string[] = ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Palisade', 'Ioniq 5', 'Ioniq 6', 'Venue', 'Santa Cruz']
const COMMON_NISSAN: string[] = ['Altima', 'Rogue', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Titan', 'Armada', 'Kicks', 'Versa', 'Maxima', 'Leaf', 'Ariya']
const COMMON_BMW: string[] = ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X7', 'M3', 'M4', 'M5', 'Z4', 'iX', 'i4', 'i5', 'i7']
const COMMON_MBZ: string[] = ['C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS', 'A-Class', 'CLA', 'AMG GT', 'EQB', 'EQE', 'EQS', 'EQA']
const COMMON_VW: string[] = ['Jetta', 'Tiguan', 'Atlas', 'Taos', 'GTI', 'Golf', 'ID.4', 'ID.Buzz', 'Passat', 'Arteon', 'ID.7']
const COMMON_SUBARU: string[] = ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'WRX', 'Ascent', 'Legacy', 'BRZ', 'Solterra']
const COMMON_JEEP: string[] = ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Gladiator', 'Wagoneer', 'Grand Wagoneer']
const COMMON_TESLA: string[] = ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck']
const COMMON_LEXUS: string[] = ['RX', 'ES', 'NX', 'IS', 'GX', 'TX', 'UX', 'LS', 'LC']
const COMMON_KIA: string[] = ['Sportage', 'Sorento', 'Forte', 'K5', 'Telluride', 'Seltos', 'Sonata', 'Carnival', 'EV6', 'EV9', 'Stinger']
const COMMON_MAZDA: string[] = ['CX-5', 'CX-50', 'CX-90', 'Mazda3', 'Mazda6', 'CX-30', 'MX-5 Miata', 'MX-30']
const COMMON_DODGE: string[] = ['Charger', 'Challenger', 'Durango', 'Hornet', 'Ram 1500', 'Ram 2500', 'Ram 3500']
const COMMON_GMC: string[] = ['Sierra', 'Terrain', 'Acadia', 'Yukon', 'Canyon', 'Hummer EV']
const COMMON_ACURA: string[] = ['MDX', 'RDX', 'Integra', 'TLX', 'ZDX']
const COMMON_INFINITI: string[] = ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80']
const COMMON_BUICK: string[] = ['Enclave', 'Encore', 'Envision', 'Envista']
const COMMON_CADILLAC: string[] = ['Escalade', 'XT4', 'XT5', 'XT6', 'CT4', 'CT5', 'Lyriq']
const COMMON_LINCOLN: string[] = ['Aviator', 'Corsair', 'Navigator', 'Nautilus', 'MKZ']
const COMMON_CHRYSLER: string[] = ['Pacifica', '300']
const COMMON_RAM: string[] = ['1500', '2500', '3500', 'ProMaster', 'ProMaster City']
const COMMON_VOLVO: string[] = ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60', 'C40 Recharge']
const COMMON_GENESIS: string[] = ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80']
const COMMON_MINI: string[] = ['Cooper', 'Countryman', 'Clubman', 'Cooper SE', 'Aceman']
const COMMON_ALFA: string[] = ['Giulia', 'Stelvio', 'Tonale']
const COMMON_LAND_ROVER: string[] = ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Discovery', 'Defender', 'Discovery Sport']
const COMMON_PORSCHE: string[] = ['911', 'Cayenne', 'Macan', 'Taycan', 'Panamera', '718 Cayman', '718 Boxster']
const COMMON_MITSUBISHI: string[] = ['Outlander', 'Eclipse Cross', 'Mirage', 'Outlander Sport']
const COMMON_FIAT: string[] = ['500', '500X', '500e']
const COMMON_JAGUAR: string[] = ['F-Pace', 'I-Pace', 'F-Type', 'XF', 'XE']
const COMMON_ASTON: string[] = ['Vantage', 'DB12', 'DBX']
const COMMON_BENTLEY: string[] = ['Bentayga', 'Continental GT', 'Flying Spur']
const COMMON_MASERATI: string[] = ['Grecale', 'Levante', 'Ghibli', 'Quattroporte', 'GranTurismo']

// Year-specific availability
function buildYearData(
  baseMakes: MakeModels,
  addMakes?: Partial<MakeModels>,
  removeMakes?: string[],
  removeModels?: Partial<MakeModels>
): MakeModels {
  const result: MakeModels = {}
  for (const [make, models] of Object.entries(baseMakes)) {
    if (removeMakes?.includes(make)) continue
    let filtered = [...models]
    if (removeModels?.[make]) {
      const rm = new Set(removeModels[make])
      filtered = filtered.filter(m => !rm.has(m))
    }
    result[make] = filtered
  }
  if (addMakes) {
    for (const [make, models] of Object.entries(addMakes)) {
      result[make] = models as string[]
    }
  }
  return result
}

const BASE_MAKES: MakeModels = {
  'Acura': COMMON_ACURA, 'Alfa Romeo': COMMON_ALFA, 'Aston Martin': COMMON_ASTON, 'Audi': ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'Q4 e-tron', 'Q6 e-tron', 'e-tron GT', 'TT'],
  'Bentley': COMMON_BENTLEY, 'BMW': COMMON_BMW, 'Buick': COMMON_BUICK, 'Cadillac': COMMON_CADILLAC,
  'Chevrolet': COMMON_CHEVY, 'Chrysler': COMMON_CHRYSLER, 'Dodge': COMMON_DODGE, 'Fiat': COMMON_FIAT,
  'Ford': COMMON_FORD, 'Genesis': COMMON_GENESIS, 'GMC': COMMON_GMC, 'Honda': COMMON_HONDA,
  'Hyundai': COMMON_HYUNDAI, 'Infiniti': COMMON_INFINITI, 'Jaguar': COMMON_JAGUAR, 'Jeep': COMMON_JEEP,
  'Kia': COMMON_KIA, 'Land Rover': COMMON_LAND_ROVER, 'Lexus': COMMON_LEXUS, 'Lincoln': COMMON_LINCOLN,
  'Maserati': COMMON_MASERATI, 'Mazda': COMMON_MAZDA, 'Mercedes-Benz': COMMON_MBZ, 'MINI': COMMON_MINI,
  'Mitsubishi': COMMON_MITSUBISHI, 'Nissan': COMMON_NISSAN, 'Porsche': COMMON_PORSCHE, 'Ram': COMMON_RAM,
  'Subaru': COMMON_SUBARU, 'Tesla': COMMON_TESLA, 'Toyota': COMMON_JDM, 'Volkswagen': COMMON_VW, 'Volvo': COMMON_VOLVO,
  'Polestar': ['Polestar 2', 'Polestar 3', 'Polestar 4'], 'Lucid': ['Air', 'Gravity'],
}

const VEHICLE_DATA: YearMakes = {
  2026: BASE_MAKES,
  2025: BASE_MAKES,
  2024: buildYearData(BASE_MAKES, { 'Rivian': ['R1T', 'R1S'] }, undefined, {
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'K5', 'Telluride', 'Seltos', 'Sonata', 'Carnival', 'EV6', 'Stinger'],
  }),
  2023: buildYearData(BASE_MAKES, { 'Rivian': ['R1T', 'R1S'] }, undefined, {
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'K5', 'Telluride', 'Seltos', 'Sonata', 'Carnival', 'EV6', 'Stinger'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Palisade', 'Ioniq 5'],
  }),
  2022: buildYearData(BASE_MAKES, { 'Rivian': ['R1T', 'R1S'] }, undefined, {
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'K5', 'Telluride', 'Seltos', 'Sonata', 'Carnival', 'Stinger'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Palisade', 'Ioniq 5'],
    'Cadillac': ['Escalade', 'XT4', 'XT5', 'XT6', 'CT4', 'CT5'],
  }),
  2021: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'K5', 'Telluride', 'Seltos', 'Sonata', 'Stinger'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Palisade', 'Ioniq 5'],
    'Genesis': ['G70', 'G80', 'G90', 'GV70'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Gladiator'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Blazer'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Discovery', 'Defender'],
  }),
  2020: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Telluride', 'Soul', 'Stinger', 'Seltos'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Palisade'],
    'Genesis': ['G70', 'G80', 'G90', 'GV80'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Gladiator'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Blazer', 'Trax'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Ranger'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Discovery', 'Discovery Sport'],
  }),
  2019: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Telluride', 'Soul', 'Stinger', 'Seltos'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Palisade'],
    'Genesis': ['G70', 'G80', 'G90'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Blazer', 'Trax'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Ranger'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Discovery', 'Discovery Sport'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X7', 'M3', 'M4', 'M5', 'Z4'],
    'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'CX-3', 'MX-5 Miata'],
  }),
  2018: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model 3', 'Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Soul', 'Stinger', 'Cadenza', 'K900'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Kona', 'Santa Fe Sport'],
    'Genesis': ['G70', 'G80', 'G90'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Cruze', 'Trax'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery', 'Discovery Sport', 'Range Rover Velar'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'M3', 'M4', 'M5', 'Z4'],
    'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'CX-3', 'MX-5 Miata'],
  }),
  2017: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Soul', 'Cadenza', 'K900'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Santa Fe Sport'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Cruze', 'Trax', 'Impala'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery', 'Discovery Sport'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'M3', 'M4', 'Z4'],
    'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'CX-3', 'MX-5 Miata'],
    'Acura': ['MDX', 'RDX', 'TLX', 'NSX'],
    'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', '718 Cayman', '718 Boxster'],
  }),
  2016: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Soul', 'Cadenza', 'K900'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Santa Fe Sport'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Patriot'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Cruze', 'Trax', 'Impala', 'Spark'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery Sport', 'Range Rover Evoque'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'M3', 'M4', 'Z4'],
    'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'CX-3', 'MX-5 Miata'],
    'Acura': ['MDX', 'RDX', 'TLX', 'ILX'],
    'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', '718 Cayman', '718 Boxster'],
    'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'WRX', 'Legacy', 'BRZ'],
  }),
  2015: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model S', 'Model X'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Soul', 'Cadenza', 'K900'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Santa Fe Sport', 'Genesis'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Patriot'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Cruze', 'Trax', 'Impala', 'Spark'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'C-Max'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery Sport', 'Range Rover Evoque', 'LR4'],
    'BMW': ['2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'M3', 'M4', 'Z4'],
    'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata'],
    'Acura': ['MDX', 'RDX', 'TLX', 'ILX'],
    'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera'],
    'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'WRX', 'Legacy', 'BRZ'],
    'Fiat': ['500', '500X', '500e'],
    'Mitsubishi': ['Outlander', 'Outlander Sport', 'Lancer'],
  }),
  2014: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model S'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Soul', 'Cadenza', 'K900'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Santa Fe Sport', 'Genesis'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Patriot'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Colorado', 'Cruze', 'Impala', 'Spark', 'SS'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'C-Max'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery', 'Range Rover Evoque', 'LR4'],
    'BMW': ['3 Series', '4 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'M3', 'M4', 'Z4'],
    'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata'],
    'Acura': ['MDX', 'RDX', 'RLX', 'ILX'],
    'Porsche': ['911', 'Cayenne', 'Panamera', 'Cayman', 'Boxster'],
    'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'WRX', 'Legacy', 'BRZ'],
    'Fiat': ['500', '500e'],
    'Mitsubishi': ['Outlander', 'Outlander Sport', 'Lancer'],
  }),
  2013: buildYearData(BASE_MAKES, undefined, undefined, {
    'Tesla': ['Model S'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Soul', 'Cadenza'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Santa Fe Sport', 'Genesis'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Patriot', 'Compass'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Cruze', 'Impala', 'Spark', 'SS'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'C-Max'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'LR4'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'M3', 'Z4'],
    'Mazda': ['CX-5', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata'],
    'Acura': ['MDX', 'RDX', 'RLX', 'ILX'],
    'Porsche': ['911', 'Cayenne', 'Panamera', 'Cayman', 'Boxster'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'WRX', 'Legacy', 'BRZ'],
    'Fiat': ['500'],
    'Mitsubishi': ['Outlander', 'Outlander Sport', 'Lancer'],
    'Scion': ['FR-S', 'tC', 'xD'],
  }),
  2012: buildYearData(BASE_MAKES, {
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Accent', 'Genesis Coupe', 'Veracruz', 'Tiburon'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Soul', 'Sedona', 'Rio'],
    'Tesla': ['Model S'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Patriot', 'Compass', 'Liberty'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Cruze', 'Impala', 'Spark', 'Colorado'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'Ranger'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'LR4', 'LR2'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X6', 'M3', 'Z4'],
    'Mazda': ['CX-5', 'CX-7', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata'],
    'Acura': ['MDX', 'RDX', 'TL', 'TSX', 'ZDX', 'ILX'],
    'Porsche': ['911', 'Cayenne', 'Panamera', 'Cayman', 'Boxster'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'WRX', 'Legacy', 'Tribeca'],
    'Fiat': ['500'],
    'Mitsubishi': ['Outlander', 'Outlander Sport', 'Lancer', 'Galant'],
    'Scion': ['FR-S', 'tC', 'xD', 'iQ'],
    'Nissan': ['Altima', 'Rogue', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Titan', 'Armada', 'Maxima', 'Versa', '350Z', '370Z', 'Xterra', 'Leaf'],
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner', 'Prius', 'Sienna', 'Sequoia', 'Matrix', 'Yaris', 'Land Cruiser', 'FJ Cruiser'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Fit'],
    'Dodge': ['Charger', 'Challenger', 'Durango', 'Ram 1500', 'Ram 2500', 'Ram 3500', 'Grand Caravan', 'Journey', 'Avenger'],
    'Lexus': ['RX', 'ES', 'IS', 'GS', 'GX', 'LX', 'LS', 'SC'],
    'Infiniti': ['G37', 'G35', 'EX35', 'FX35', 'FX50', 'M35', 'M45', 'QX56'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'M-Class', 'GLK', 'CLK', 'CLS', 'SLK', 'SL'],
    'Volkswagen': ['Jetta', 'GTI', 'Golf', 'Passat', 'Touareg', 'Eos', 'CC', 'Tiguan'],
    'GMC': ['Sierra', 'Terrain', 'Acadia', 'Yukon', 'Canyon', 'Envoy'],
    'Cadillac': ['Escalade', 'CTS', 'SRX', 'ATS', 'XTS'],
    'Buick': ['Enclave', 'LaCrosse', 'Verano', 'Regal'],
    'Lincoln': ['Navigator', 'MKZ', 'MKX', 'MKS', 'MKC'],
    'Chrysler': ['300', '200', 'Town & Country'],
    'Volvo': ['XC90', 'XC60', 'S60', 'S80', 'C30', 'C70'],
    'Audi': ['A3', 'A4', 'A6', 'A7', 'A8', 'Q5', 'Q7', 'TT'],
    'Jaguar': ['XF', 'XJ', 'XK'],
    'MINI': ['Cooper', 'Clubman', 'Countryman', 'Paceman'],
    'Maserati': ['GranTurismo', 'Quattroporte', 'Ghibli'],
    'Bentley': ['Continental GT', 'Continental Flying Spur'],
  }),
  2011: buildYearData(BASE_MAKES, {
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Accent', 'Genesis Coupe', 'Veracruz', 'Tiburon'],
    'Kia': ['Sportage', 'Sorento', 'Forte', 'Optima', 'Soul', 'Sedona', 'Rio'],
    'Tesla': [],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Patriot', 'Compass', 'Liberty'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Impala', 'HHR', 'Cruze', 'Colorado'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'Ranger', 'Crown Victoria'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery', 'LR4', 'LR2'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X6', 'M3', 'Z4'],
    'Mazda': ['CX-5', 'CX-7', 'CX-9', 'Mazda2', 'Mazda3', 'Mazda6', 'MX-5 Miata'],
    'Acura': ['MDX', 'RDX', 'TL', 'TSX', 'ZDX'],
    'Porsche': ['911', 'Cayenne', 'Panamera', 'Cayman', 'Boxster'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'WRX', 'Legacy', 'Tribeca'],
    'Mitsubishi': ['Outlander', 'Outlander Sport', 'Lancer', 'Galant'],
    'Scion': ['tC', 'xD', 'iQ', 'xB'],
    'Nissan': ['Altima', 'Rogue', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Titan', 'Armada', 'Maxima', 'Versa', '350Z', '370Z', 'Xterra', 'Quest'],
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner', 'Prius', 'Sienna', 'Sequoia', 'Matrix', 'Yaris', 'Land Cruiser', 'FJ Cruiser'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Element', 'Fit'],
    'Dodge': ['Charger', 'Challenger', 'Durango', 'Ram 1500', 'Ram 2500', 'Ram 3500', 'Grand Caravan', 'Journey', 'Avenger'],
    'Lexus': ['RX', 'ES', 'IS', 'GS', 'GX', 'LX', 'LS', 'SC'],
    'Infiniti': ['G37', 'G35', 'EX35', 'FX35', 'FX50', 'M35', 'M45', 'QX56'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'M-Class', 'GLK', 'CLK', 'CLS', 'SLK', 'SL'],
    'Volkswagen': ['Jetta', 'GTI', 'Golf', 'Passat', 'Touareg', 'Eos', 'CC', 'Tiguan'],
    'GMC': ['Sierra', 'Terrain', 'Acadia', 'Yukon', 'Canyon', 'Envoy'],
    'Cadillac': ['Escalade', 'CTS', 'SRX', 'ATS'],
    'Buick': ['Enclave', 'LaCrosse', 'Regal'],
    'Lincoln': ['Navigator', 'MKZ', 'MKX', 'MKS', 'Town Car'],
    'Chrysler': ['300', '200', 'Town & Country'],
    'Volvo': ['XC90', 'XC60', 'S60', 'S80', 'C30', 'C70'],
    'Audi': ['A3', 'A4', 'A6', 'A8', 'Q5', 'Q7', 'TT'],
    'Jaguar': ['XF', 'XJ', 'XK'],
    'MINI': ['Cooper', 'Clubman', 'Countryman'],
    'Maserati': ['GranTurismo', 'Quattroporte', 'Ghibli'],
    'Bentley': ['Continental GT', 'Continental Flying Spur'],
  }),
  2010: buildYearData(BASE_MAKES, {
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Accent', 'Genesis Coupe', 'Veracruz', 'Tiburon'],
    'Kia': ['Sportage', 'Sorento', 'Optima', 'Rio', 'Spectra', 'Soul', 'Sedona', 'Amanti'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Patriot', 'Compass', 'Liberty'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Camaro', 'Tahoe', 'Suburban', 'Impala', 'HHR', 'Cruze', 'Aveo', 'Colorado'],
    'Ford': ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'Ranger', 'Crown Victoria'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Discovery', 'LR4', 'LR2'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X5', 'X6', 'M3', 'Z4'],
    'Mazda': ['CX-5', 'CX-7', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata'],
    'Acura': ['MDX', 'RDX', 'TL', 'TSX', 'ZDX'],
    'Porsche': ['911', 'Cayenne', 'Panamera', 'Cayman', 'Boxster'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'WRX', 'Legacy', 'Tribeca'],
    'Mitsubishi': ['Outlander', 'Lancer', 'Galant', 'Eclipse'],
    'Nissan': ['Altima', 'Rogue', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Titan', 'Armada', 'Maxima', 'Versa', '350Z', 'Xterra', 'Leaf', 'Quest'],
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner', 'Prius', 'Sienna', 'Sequoia', 'Matrix', 'Yaris', 'Land Cruiser', 'FJ Cruiser'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Element', 'Fit'],
    'Dodge': ['Charger', 'Durango', 'Ram 1500', 'Ram 2500', 'Ram 3500', 'Grand Caravan', 'Avenger', 'Nitro'],
    'Lexus': ['RX', 'ES', 'IS', 'GS', 'GX', 'LX', 'LS', 'SC'],
    'Infiniti': ['G37', 'G35', 'FX35', 'FX50', 'M35', 'M45', 'QX56'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'M-Class', 'GLK', 'CLK', 'CLS', 'SLK', 'SL'],
    'Volkswagen': ['Jetta', 'GTI', 'Golf', 'Passat', 'Touareg', 'Eos', 'CC', 'Tiguan'],
    'GMC': ['Sierra', 'Terrain', 'Acadia', 'Yukon', 'Canyon', 'Envoy'],
    'Cadillac': ['Escalade', 'CTS', 'SRX', 'ATS'],
    'Buick': ['Enclave', 'LaCrosse', 'Regal'],
    'Lincoln': ['Navigator', 'MKZ', 'MKX', 'MKS', 'Town Car'],
    'Chrysler': ['300', '200', 'Town & Country'],
    'Scion': ['tC', 'xD', 'xB'],
    'Saturn': ['Outlook', 'Vue', 'Aura', 'Astra'],
    'Pontiac': ['G6', 'Vibe', 'G8', 'G5'],
    'Maserati': ['GranTurismo', 'Quattroporte'],
    'Bentley': ['Continental GT', 'Continental Flying Spur'],
  }),
  2009: buildYearData(BASE_MAKES, {
    'Scion': ['tC', 'xD', 'xB', 'iQ'],
    'Pontiac': ['G3', 'G5', 'G6', 'G8', 'Vibe', 'Solstice'],
    'Saturn': ['Astra', 'Vue', 'Aura', 'Outlook'],
    'Mercury': ['Grand Marquis', 'Sable', 'Mountaineer', 'Mariner', 'Milan'],
    'Hummer': ['H2', 'H3', 'H3T'],
    'Saab': ['9-3', '9-5', '9-7X'],
  }, ['Tesla', 'Rivian', 'Lucid', 'Polestar', 'Genesis', 'Fiat', 'Alfa Romeo', 'Ram'], {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner', 'Prius', 'Sienna', 'Sequoia', 'Matrix', 'Yaris', 'Land Cruiser'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Fit'],
    'Ford': ['F-150', 'F-250', 'F-350', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'Ranger', 'Crown Victoria', 'Escape Hybrid'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Tahoe', 'Suburban', 'Camaro', 'Impala', 'Cobalt', 'HHR', 'Aveo', 'Colorado', 'TrailBlazer', 'Corvette'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Accent', 'Veracruz', 'Tiburon', 'Genesis Coupe'],
    'Kia': ['Sportage', 'Sorento', 'Optima', 'Rio', 'Spectra', 'Soul', 'Amanti'],
    'Nissan': ['Altima', 'Rogue', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Titan', 'Armada', 'Maxima', 'Versa', '350Z', 'Xterra'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X5', 'X6', 'M3', 'Z4'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLK', 'GLC', 'GLE', 'GLS', 'CLK', 'CLS', 'SLK', 'SL'],
    'Volkswagen': ['Jetta', 'Tiguan', 'GTI', 'Golf', 'Passat', 'Routan', 'Eos', 'CC'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'WRX', 'Legacy', 'Tribeca'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Compass', 'Patriot', 'Commander'],
    'Dodge': ['Charger', 'Challenger', 'Durango', 'Ram 1500', 'Ram 2500', 'Ram 3500', 'Caliber', 'Avenger', 'Grand Caravan', 'Journey'],
    'Lexus': ['RX', 'ES', 'IS', 'GS', 'GX', 'LX', 'LS', 'SC'],
    'Mazda': ['CX-7', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata', 'RX-8'],
    'Acura': ['MDX', 'RDX', 'TL', 'TSX', 'RL'],
    'Infiniti': ['G37', 'G35', 'EX35', 'FX35', 'FX50', 'M35', 'M45', 'QX56'],
    'Porsche': ['911', 'Cayenne', 'Boxster', 'Cayman', 'Panamera'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'LR2', 'LR3'],
    'GMC': ['Sierra', 'Terrain', 'Acadia', 'Yukon', 'Canyon', 'Envoy'],
    'Cadillac': ['Escalade', 'CTS', 'DTS', 'STS', 'SRX', 'XLR'],
    'Buick': ['Enclave', 'Lucerne', 'LaCrosse', 'Rainier'],
    'Lincoln': ['Navigator', 'MKZ', 'MKX', 'MKS', 'Town Car'],
    'Chrysler': ['300', 'Sebring', 'Town & Country', 'Pacific'],
    'Mitsubishi': ['Outlander', 'Lancer', 'Galant', 'Eclipse', 'Endeavor'],
    'Volvo': ['XC90', 'XC70', 'XC60', 'S60', 'S80', 'V50', 'V70', 'C30'],
    'Audi': ['A3', 'A4', 'A5', 'A6', 'A8', 'Q5', 'Q7', 'TT', 'R8'],
    'Jaguar': ['XF', 'XJ', 'XK'],
    'MINI': ['Cooper', 'Clubman', 'Countryman'],
    'Maserati': ['GranTurismo', 'Quattroporte'],
    'Bentley': ['Continental GT', 'Continental Flying Spur'],
  }),
  2008: buildYearData(BASE_MAKES, {
    'Scion': ['tC', 'xD', 'xB'],
    'Pontiac': ['G5', 'G6', 'G8', 'Vibe', 'Solstice', 'Grand Prix'],
    'Saturn': ['Astra', 'Vue', 'Aura', 'Outlook', 'Sky'],
    'Mercury': ['Grand Marquis', 'Sable', 'Mountaineer', 'Mariner', 'Milan'],
    'Hummer': ['H2', 'H3', 'H3T'],
    'Saab': ['9-3', '9-5', '9-7X'],
  }, ['Tesla', 'Rivian', 'Lucid', 'Polestar', 'Genesis', 'Fiat', 'Alfa Romeo', 'Ram'], {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner', 'Prius', 'Sienna', 'Sequoia', 'Matrix', 'Yaris', 'Land Cruiser'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Fit'],
    'Ford': ['F-150', 'F-250', 'F-350', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'Ranger', 'Crown Victoria', 'Escape Hybrid'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Tahoe', 'Suburban', 'Cobalt', 'Impala', 'HHR', 'Aveo', 'Colorado', 'TrailBlazer', 'Corvette', 'Silverado Hybrid'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Accent', 'Veracruz', 'Tiburon', 'Genesis Coupe'],
    'Kia': ['Sportage', 'Sorento', 'Optima', 'Rio', 'Spectra', 'Rondo', 'Amanti'],
    'Nissan': ['Altima', 'Rogue', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Titan', 'Armada', 'Maxima', 'Versa', '350Z', 'Xterra'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X5', 'X6', 'M3', 'Z4'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLK', 'R-Class', 'M-Class', 'CLK', 'CLS', 'SLK', 'SL'],
    'Volkswagen': ['Jetta', 'Tiguan', 'GTI', 'Golf', 'Passat', 'Routan', 'Eos', 'CC'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'WRX', 'Legacy', 'Tribeca'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Liberty', 'Compass', 'Patriot', 'Commander'],
    'Dodge': ['Charger', 'Challenger', 'Durango', 'Ram 1500', 'Ram 2500', 'Ram 3500', 'Caliber', 'Avenger', 'Grand Caravan', 'Nitro'],
    'Lexus': ['RX', 'ES', 'IS', 'GS', 'GX', 'LX', 'LS', 'SC'],
    'Mazda': ['CX-7', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata', 'RX-8'],
    'Acura': ['MDX', 'RDX', 'TL', 'TSX', 'RL'],
    'Infiniti': ['G37', 'G35', 'EX35', 'FX35', 'FX50', 'M35', 'M45', 'QX56'],
    'Porsche': ['911', 'Cayenne', 'Boxster', 'Cayman'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'LR2', 'LR3'],
    'GMC': ['Sierra', 'Acadia', 'Yukon', 'Canyon', 'Envoy'],
    'Cadillac': ['Escalade', 'CTS', 'DTS', 'STS', 'SRX', 'XLR'],
    'Buick': ['Enclave', 'Lucerne', 'LaCrosse', 'Rainier'],
    'Lincoln': ['Navigator', 'MKZ', 'MKX', 'MKS', 'Town Car'],
    'Chrysler': ['300', 'Sebring', 'Town & Country', 'Aspen'],
    'Mitsubishi': ['Outlander', 'Lancer', 'Galant', 'Eclipse', 'Endeavor'],
    'Volvo': ['XC90', 'XC70', 'XC60', 'S60', 'S80', 'V50', 'V70', 'C30'],
    'Audi': ['A3', 'A4', 'A5', 'A6', 'A8', 'Q5', 'Q7', 'TT', 'R8'],
    'Jaguar': ['XF', 'XJ', 'XK'],
    'MINI': ['Cooper', 'Clubman'],
    'Maserati': ['GranTurismo', 'Quattroporte'],
    'Bentley': ['Continental GT', 'Continental Flying Spur'],
  }),
  2007: buildYearData(BASE_MAKES, {
    'Scion': ['tC', 'tB', 'xA', 'xD'],
    'Pontiac': ['G5', 'G6', 'Vibe', 'Solstice', 'Grand Prix', 'GTO'],
    'Saturn': ['Ion', 'Vue', 'Aura', 'Outlook', 'Sky'],
    'Mercury': ['Grand Marquis', 'Mountaineer', 'Mariner', 'Milan'],
    'Hummer': ['H2', 'H3', 'H3T'],
    'Saab': ['9-3', '9-5', '9-7X'],
  }, ['Tesla', 'Rivian', 'Lucid', 'Polestar', 'Genesis', 'Fiat', 'Alfa Romeo', 'Ram'], {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner', 'Prius', 'Sienna', 'Sequoia', 'Matrix', 'Yaris', 'Land Cruiser', 'FJ Cruiser'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Element'],
    'Ford': ['F-150', 'F-250', 'F-350', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Fusion', 'Focus', 'Ranger', 'Crown Victoria', 'Freestyle'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Tahoe', 'Suburban', 'Cobalt', 'Impala', 'HHR', 'Aveo', 'Colorado', 'TrailBlazer', 'Corvette'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Accent', 'Veracruz', 'Tiburon'],
    'Kia': ['Sportage', 'Sorento', 'Optima', 'Rio', 'Spectra', 'Rondo', 'Amanti', 'Sedona'],
    'Nissan': ['Altima', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Titan', 'Armada', 'Maxima', 'Versa', '350Z', 'Xterra', 'Quest'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X5', 'M3', 'Z4'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'R-Class', 'M-Class', 'CLK', 'CLS', 'SLK', 'SL'],
    'Volkswagen': ['Jetta', 'GTI', 'Golf', 'Passat', 'Touareg', 'Eos'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'WRX', 'Legacy', 'Tribeca', 'B9 Tribeca'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Liberty', 'Compass', 'Patriot', 'Commander'],
    'Dodge': ['Charger', 'Nitro', 'Ram 1500', 'Ram 2500', 'Ram 3500', 'Caliber', 'Durango', 'Grand Caravan', 'Magnum'],
    'Lexus': ['RX', 'ES', 'IS', 'GS', 'GX', 'LX', 'LS', 'SC'],
    'Mazda': ['CX-7', 'CX-9', 'Mazda3', 'Mazda6', 'MX-5 Miata', 'RX-8'],
    'Acura': ['MDX', 'RDX', 'TL', 'TSX', 'RL'],
    'Infiniti': ['G35', 'FX35', 'FX45', 'M35', 'M45', 'QX56'],
    'Porsche': ['911', 'Cayenne', 'Boxster', 'Cayman'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'LR3', 'Freelander'],
    'GMC': ['Sierra', 'Acadia', 'Yukon', 'Canyon', 'Envoy'],
    'Cadillac': ['Escalade', 'CTS', 'DTS', 'STS', 'SRX', 'XLR'],
    'Buick': ['Lucerne', 'LaCrosse', 'Rainier', 'Rendezvous'],
    'Lincoln': ['Navigator', 'MKZ', 'MKX', 'Mark LT', 'Town Car'],
    'Chrysler': ['300', 'Sebring', 'Town & Country', 'Aspen'],
    'Mitsubishi': ['Outlander', 'Lancer', 'Galant', 'Eclipse', 'Endeavor'],
    'Volvo': ['XC90', 'XC70', 'S60', 'S80', 'V50', 'V70', 'C30'],
    'Audi': ['A3', 'A4', 'A6', 'A8', 'Q7', 'TT', 'RS4'],
    'Jaguar': ['XK', 'XJ', 'S-Type'],
    'MINI': ['Cooper', 'Clubman'],
    'Maserati': ['Quattroporte'],
    'Bentley': ['Continental GT', 'Continental Flying Spur'],
  }),
  2006: buildYearData(BASE_MAKES, {
    'Scion': ['tC', 'tB', 'xA', 'xD'],
    'Pontiac': ['G6', 'Vibe', 'Solstice', 'Grand Prix', 'GTO', 'Montana'],
    'Saturn': ['Ion', 'Vue', 'L Series', 'Relay'],
    'Mercury': ['Grand Marquis', 'Mountaineer', 'Mariner', 'Milan', 'Monterey'],
    'Hummer': ['H2', 'H3'],
    'Saab': ['9-3', '9-5', '9-7X'],
  }, ['Tesla', 'Rivian', 'Lucid', 'Polestar', 'Genesis', 'Fiat', 'Alfa Romeo', 'Ram'], {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Tundra', '4Runner', 'Prius', 'Sienna', 'Sequoia', 'Matrix', 'Yaris', 'Land Cruiser', 'FJ Cruiser'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Element'],
    'Ford': ['F-150', 'F-250', 'F-350', 'Mustang', 'Explorer', 'Escape', 'Expedition', 'Fusion', 'Focus', 'Ranger', 'Crown Victoria', 'Freestyle', 'Five Hundred'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Tahoe', 'Suburban', 'Cobalt', 'Impala', 'Uplander', 'Aveo', 'Colorado', 'TrailBlazer', 'Corvette'],
    'Hyundai': ['Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Accent', 'Tiburon'],
    'Kia': ['Sportage', 'Sorento', 'Optima', 'Rio', 'Spectra', 'Sedona', 'Amanti'],
    'Nissan': ['Altima', 'Sentra', 'Pathfinder', 'Murano', 'Frontier', 'Titan', 'Armada', 'Maxima', '350Z', 'Xterra', 'Quest'],
    'BMW': ['3 Series', '5 Series', '7 Series', 'X5', 'M3', 'Z4'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'R-Class', 'M-Class', 'CLK', 'CLS', 'SLK', 'SL'],
    'Volkswagen': ['Jetta', 'GTI', 'Golf', 'Passat', 'Touareg', 'Phaeton'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'WRX', 'Legacy', 'Baja'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Liberty', 'Commander'],
    'Dodge': ['Charger', 'Ram 1500', 'Ram 2500', 'Ram 3500', 'Dakota', 'Durango', 'Grand Caravan', 'Magnum', 'Stratus'],
    'Lexus': ['RX', 'ES', 'IS', 'GS', 'GX', 'LX', 'LS', 'SC'],
    'Mazda': ['Mazda3', 'Mazda6', 'MX-5 Miata', 'RX-8', 'Tribute', 'MPV'],
    'Acura': ['MDX', 'TL', 'TSX', 'RL', 'RSX'],
    'Infiniti': ['G35', 'FX35', 'FX45', 'M35', 'M45', 'QX56', 'I35'],
    'Porsche': ['911', 'Cayenne', 'Boxster', 'Cayman'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'LR3', 'Freelander'],
    'GMC': ['Sierra', 'Yukon', 'Canyon', 'Envoy', 'Savana'],
    'Cadillac': ['Escalade', 'CTS', 'DTS', 'STS', 'SRX', 'XLR'],
    'Buick': ['Lucerne', 'LaCrosse', 'Rainier', 'Rendezvous', 'Terraza'],
    'Lincoln': ['Navigator', 'Mark LT', 'Town Car', 'Zephyr', 'Aviator'],
    'Chrysler': ['300', 'Sebring', 'Town & Country', 'Crossfire'],
    'Mitsubishi': ['Outlander', 'Lancer', 'Galant', 'Eclipse', 'Endeavor', 'Montero'],
    'Volvo': ['XC90', 'XC70', 'S60', 'S80', 'V50', 'V70', 'C70'],
    'Audi': ['A3', 'A4', 'A6', 'A8', 'Q7', 'TT'],
    'Jaguar': ['XK', 'XJ', 'S-Type', 'X-Type'],
    'MINI': ['Cooper'],
    'Maserati': ['Quattroporte', 'Coupe', 'Spyder'],
    'Bentley': ['Continental GT', 'Continental Flying Spur'],
  }),
}

const YEARS = Object.keys(VEHICLE_DATA).map(Number).sort((a, b) => b - a)

interface VehicleCheckerProps {
  productTags: string[]
  productType: string
  productVendor: string
}

// ── Vehicle attribute detection ──

const CONVERTIBLE_MODELS = new Set([
  'Mustang', 'Corvette', 'Camaro', 'Challenger',
  'MX-5 Miata', 'BRZ', 'Z4', '718 Cayman', '718 Boxster',
  '911', 'F-Type', 'Giulia', 'Stelvio',
  'Wrangler', 'Bronco', 'Wagoneer',
  'SLK', 'SL', 'AMG GT',
  'GranTurismo', 'Vantage', 'DB12',
  '4 Series', '2 Series', 'i8',
  'MX-30', 'Solterra',
])

const TESLA_MODELS = new Set(['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'])

const EV_MAKES = new Set(['Tesla', 'Rivian', 'Lucid', 'Polestar'])
const EV_MODELS_KW = ['Bolt EV', 'Bolt EUV', 'Blazer EV', 'Equinox EV', 'Silverado EV', 'Hummer EV',
  'Mustang Mach-E', 'F-150 Lightning', 'E-Transit',
  'ID.4', 'ID.Buzz', 'ID.7', 'e-tron', 'Q4 e-tron', 'Q6 e-tron', 'e-tron GT',
  'Ioniq 5', 'Ioniq 6', 'EV6', 'EV9',
  'bZ4X', 'Leaf', 'Ariya',
  'ZDX', 'Lyriq', 'EQS', 'EQE', 'EQA', 'EQB',
  'iX', 'i4', 'i5', 'i7',
  'C40 Recharge', 'XC40 Recharge', 'EX30',
  'Polestar 2', 'Polestar 3', 'Polestar 4',
  'Taycan', 'Macan Electric',
  'G60', 'RZ',
]

const TWO_SEATER_MODELS = new Set([
  'Corvette', 'BRZ', 'MX-5 Miata', 'Z4', '718 Cayman', '718 Boxster',
  '911', 'F-Type', 'NSX', 'Vantage', 'DB12', 'GranTurismo',
])

const TINY_MODELS = new Set([
  'Spark', 'Mirage', 'Fortwo', 'iQ', '500', '500e',
])

function getVehicleAttrs(year: number, make: string, model: string) {
  const makeL = make.toLowerCase()
  const modelL = model.toLowerCase()

  const isConvertible = CONVERTIBLE_MODELS.has(model)
    || modelL.includes('cabrio') || modelL.includes('convertible') || modelL.includes('spyder')
    || model === 'Eos' || model === 'Crossfire'

  const isEV = EV_MAKES.has(make)
    || EV_MODELS_KW.some(k => model.includes(k))
    || (make === 'Toyota' && model === 'bZ4X')
    || (make === 'Hyundai' && (model === 'Ioniq 5' || model === 'Ioniq 6'))
    || (make === 'Kia' && (model === 'EV6' || model === 'EV9'))
    || (make === 'Ford' && (model === 'Mustang Mach-E' || model === 'F-150 Lightning' || model === 'E-Transit'))
    || (make === 'Chevrolet' && (model === 'Bolt EV' || model === 'Bolt EUV' || model === 'Blazer EV' || model === 'Equinox EV' || model === 'Silverado EV'))
    || (make === 'GMC' && model === 'Hummer EV')

  const isPreOBD2 = year < 1996

  const isTwoSeater = TWO_SEATER_MODELS.has(model)
    || modelL.includes('speedster') || modelL.includes('roadster')

  const isTiny = TINY_MODELS.has(model) || model === 'Matiz'
    || (make === 'Fiat' && model === '500')
    || (make === 'Smart' && (model.includes('Fortwo') || model === 'eq'))

  const isLargeTruck = ['F-150', 'F-250', 'F-350', 'Silverado', 'Sierra', 'Tundra', 'Ram 1500', 'Ram 2500', 'Ram 3500', 'Titan', 'Tacoma', 'Frontier', 'Colorado', 'Ranger', 'Gladiator', 'Canyon'].includes(model)

  const hasRearSeats = !isTwoSeater
  const hasStandardRoof = !isConvertible

  return { isConvertible, isEV, isPreOBD2, isTwoSeater, isTiny, isLargeTruck, hasRearSeats, hasStandardRoof }
}

// ── Product category detection from title ──

type ProductCategory =
  | 'mirror_mount'       // clips onto rearview mirror
  | 'obd2'               // plugs into OBD2 port
  | 'windshield_cover'   // suction/magnetic to windshield
  | 'ceiling_shade'      // sun shade that covers windshield from inside
  | 'cigarette_12v'      // plugs into cigarette lighter / 12V outlet
  | 'motorcycle_only'    // designed for motorcycles
  | 'rear_seat'          // attaches to back of front seats
  | 'air_mattress'       // inflatable for rear cabin
  | 'steering_wheel'     // mounts to steering wheel
  | 'universal'          // no specific fitment concerns
  | 'tire_chains'        // wraps around tires

function detectProductCategory(title: string, tags: string[]): ProductCategory {
  const t = title.toLowerCase()

  if (t.includes('motorcycle') || t.includes('helmet')) return 'motorcycle_only'
  if (t.includes('obd2') || t.includes('obdii') || t.includes('obd-ii')) return 'obd2'
  if (t.includes('rearview mirror') || t.includes('mirror dash cam') || t.includes('mirror phone')) return 'mirror_mount'
  if (t.includes('tire chain')) return 'tire_chains'
  if (t.includes('air mattress') || t.includes('travel air')) return 'air_mattress'
  if (t.includes('steering wheel tray') || t.includes('steering wheel desk')) return 'steering_wheel'
  if (t.includes('seatback') || t.includes('seat back')) return 'rear_seat'
  if (t.includes('sun shade') || t.includes('windshield cover') || t.includes('windshield snow') || t.includes('magnetic windshield')) return 'windshield_cover'
  if (t.includes('12v') || t.includes('cigarette') || t.includes('heater') || t.includes('defroster') || t.includes('defogger') || t.includes('inflator') || t.includes('carplay') || t.includes('fm transmitter')) return 'cigarette_12v'

  return 'universal'
}

type Incompatibility = { issue: string; detail: string }

function checkIncompatibilities(
  cat: ProductCategory,
  attrs: ReturnType<typeof getVehicleAttrs>,
  year: number,
  make: string,
  model: string,
): Incompatibility[] {
  const issues: Incompatibility[] = []

  switch (cat) {
    case 'motorcycle_only':
      issues.push({
        issue: 'Motorcycle product',
        detail: `This is designed for motorcycles, not cars. It won't install on your ${year} ${make} ${model}.`,
      })
      break

    case 'obd2':
      if (attrs.isPreOBD2) {
        issues.push({
          issue: 'Requires OBD2 port',
          detail: `Your ${year} ${make} ${model} predates the OBD2 standard (1996+). This product needs an OBD2 diagnostic port which your vehicle doesn't have.`,
        })
      }
      break

    case 'rear_seat':
      if (attrs.isTwoSeater) {
        issues.push({
          issue: 'Requires rear seats',
          detail: `The ${model} is a 2-seater with no rear seats. This organizer attaches to the back of front seats and has nowhere to go.`,
        })
      }
      break

    case 'air_mattress':
      if (attrs.isTwoSeater) {
        issues.push({
          issue: 'Requires rear cabin space',
          detail: `The ${model} is a 2-seater with no rear cabin. This air mattress needs a flat rear seat area to inflate.`,
        })
      } else if (attrs.isConvertible) {
        issues.push({
          issue: 'Requires enclosed cabin',
          detail: `Convertibles don't have a fixed roof to contain the mattress. This product needs an enclosed cabin to work properly.`,
        })
      } else if (attrs.isTiny) {
        issues.push({
          issue: 'May be too large',
          detail: `The ${model} has a very compact cabin. This air mattress may not fit the rear area — check the dimensions against your interior.`,
        })
      }
      break

    case 'steering_wheel':
      if (TESLA_MODELS.has(model) && year >= 2021) {
        issues.push({
          issue: 'Yoke steering (check your model)',
          detail: `Some ${year} ${model}s come with a yoke-style steering wheel instead of a round wheel. This tray needs a traditional round steering wheel to clip onto. Check which steering wheel your specific ${model} has.`,
        })
      }
      break

    case 'cigarette_12v':
      if (attrs.isEV) {
        issues.push({
          issue: 'May lack 12V outlet',
          detail: `Many EVs including some ${make} models don't have a traditional cigarette lighter / 12V power outlet. Check if your ${year} ${make} ${model} has one before ordering.`,
        })
      }
      break

    case 'windshield_cover':
      if (attrs.isConvertible) {
        issues.push({
          issue: 'Convertible fitment issue',
          detail: `This windshield cover uses suction cups or magnets that attach to a fixed windshield frame. On a ${model} convertible, the cover may not stay secure — especially with the top down.`,
        })
      }
      break

    case 'tire_chains':
      if (attrs.isTiny) {
        issues.push({
          issue: 'Unusually small tires',
          detail: `The ${model} has very small tires. Standard tire chains may be too large to fit properly. Check the chain size range against your tire specs.`,
        })
      }
      break
  }

  return issues
}

export default function VehicleChecker({ productTags, productType, productVendor }: VehicleCheckerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMake, setSelectedMake] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [customModel, setCustomModel] = useState<string>('')
  type ResultState = { compatible: true; confidence: 'high' | 'medium'; note: string } | { compatible: false; issues: Incompatibility[] }
  const [result, setResult] = useState<ResultState | null>(null)

  const makes = selectedYear ? Object.keys(VEHICLE_DATA[selectedYear] || {}).sort() : []
  const models = selectedYear && selectedMake ? (VEHICLE_DATA[selectedYear]?.[selectedMake] || []).sort() : []
  const effectiveModel = selectedModel === '__custom__' ? customModel : selectedModel

  const productTitle = productType || productTags.join(' ')
  const category = detectProductCategory(productTitle, productTags)

  useEffect(() => {
    if (selectedYear && selectedMake && effectiveModel) {
      const attrs = getVehicleAttrs(selectedYear, selectedMake, effectiveModel)
      const issues = checkIncompatibilities(category, attrs, selectedYear, selectedMake, effectiveModel)
      if (issues.length > 0) {
        setResult({ compatible: false, issues })
      } else {
        const makeMatch = productTags.some(t => t.toLowerCase() === selectedMake.toLowerCase())
        setResult({
          compatible: true,
          confidence: makeMatch ? 'high' : 'medium',
          note: makeMatch
            ? `Designed for ${selectedMake} vehicles. Perfect fit for your ${selectedYear} ${selectedMake} ${effectiveModel}.`
            : `This accessory is compatible with your ${selectedYear} ${selectedMake} ${effectiveModel}. Covered by our Fitment Guarantee.`,
        })
      }
    } else {
      setResult(null)
    }
  }, [selectedYear, selectedMake, effectiveModel, productTags, productType, category])

  const reset = () => {
    setSelectedYear(null)
    setSelectedMake('')
    setSelectedModel('')
    setCustomModel('')
    setResult(null)
  }

  const selectClass = "bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 transition-colors appearance-none cursor-pointer"

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600/10 border border-red-600/20 rounded-xl flex items-center justify-center">
            <Car size={20} className="text-red-400" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-bold text-base">Will this fit my car?</h3>
            <p className="text-zinc-500 text-xs">Check compatibility with your vehicle</p>
          </div>
        </div>
        <ChevronDown size={18} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-zinc-800">
          <div className="pt-5 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Year</label>
                <div className="relative">
                  <select
                    value={selectedYear ?? ''}
                    onChange={(e) => { setSelectedYear(e.target.value ? Number(e.target.value) : null); setSelectedMake(''); setSelectedModel('') }}
                    className={`${selectClass} w-full pr-8`}
                  >
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Make</label>
                <div className="relative">
                  <select
                    value={selectedMake}
                    onChange={(e) => { setSelectedMake(e.target.value); setSelectedModel('') }}
                    disabled={!selectedYear}
                    className={`${selectClass} w-full pr-8 disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <option value="">Make</option>
                    {makes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Model</label>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => { setSelectedModel(e.target.value); setCustomModel('') }}
                    disabled={!selectedMake}
                    className={`${selectClass} w-full pr-8 disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <option value="">Model</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="__custom__">My model isn't listed...</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {selectedModel === '__custom__' && (
              <div className="pt-2 space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1.5 block">Enter your model</label>
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="e.g. Model S Plaid, WRX STI..."
                    className={`${selectClass} w-full placeholder:text-zinc-600`}
                  />
                </div>
                {customModel.length > 0 && (
                  <div className="p-4 rounded-xl border bg-zinc-800/50 border-zinc-700">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-blue-400">Check the product description</p>
                        <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                          We couldn't find your exact {selectedYear} {selectedMake} {customModel} in our database.
                          Most universal car accessories work across all vehicles — check the product description for compatibility details, or
                          <span className="text-red-400 font-medium"> contact us</span> and we'll confirm fitment before you order.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {result && (
              <div className={`p-4 rounded-xl border transition-all ${
                result.compatible
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  {result.compatible ? (
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={16} className="text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle size={16} className="text-red-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${result.compatible ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.compatible ? '✓ This product fits your vehicle' : '✗ May not be compatible'}
                    </p>
                    {!result.compatible && 'issues' in result ? (
                      <div className="mt-2 space-y-2">
                        {result.issues.map((issue, i) => (
                          <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <p className="text-red-400 font-bold text-xs">{issue.issue}</p>
                            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{issue.detail}</p>
                          </div>
                        ))}
                      </div>
                    ) : result.compatible && 'note' in result ? (
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{result.note}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {selectedYear && (
              <button onClick={reset} className="text-zinc-500 hover:text-zinc-300 text-xs font-medium transition-colors">
                Reset selection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

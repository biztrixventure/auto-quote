// Common US makes. Models are loaded live from the NHTSA vPIC API.
export const POPULAR_MAKES = [
  "ACURA","AUDI","BMW","BUICK","CADILLAC","CHEVROLET","CHRYSLER","DODGE","FIAT","FORD",
  "GENESIS","GMC","HONDA","HYUNDAI","INFINITI","JAGUAR","JEEP","KIA","LAND ROVER","LEXUS",
  "LINCOLN","MAZDA","MERCEDES-BENZ","MINI","MITSUBISHI","NISSAN","POLESTAR","PORSCHE","RAM",
  "RIVIAN","SUBARU","TESLA","TOYOTA","VOLKSWAGEN","VOLVO",
];

export function vehicleYears() {
  const max = new Date().getFullYear() + 1;
  return Array.from({ length: max - 1981 + 1 }, (_, i) => String(max - i));
}

/**
 * Paleta cartográfica. Deriva de la identidad (#D1C3B0 arena, #536C2A olivo, #8CBA37 lima):
 * suelo cálido tipo maqueta, verdes suaves que no compiten con las plazas y plazas en verde de marca.
 */
export const mapTheme = {
  groundOutside: '#e2d9c9',
  groundZibata: '#eee6d9',
  outsideVeil: '#e2d9c9',
  boundaryEdge: '#cdbfa7',

  landuse: {
    residential: '#ebe3d5',
    commercial: '#ece2d1',
    education: '#eae2d4',
    park: '#d8e3c1',
    grass: '#dfe7cc',
    wood: '#ccd8b0',
    farmland: '#ece6d6',
    golf: '#cadaa8',
    pitch: '#d3e1b8',
    pitchOutline: '#f8f5ee',
  },

  water: '#b2cdc8',
  waterOutline: '#9dbfb9',

  road: {
    highway: '#fffdf8',
    highwayCasing: '#d3c6b1',
    major: '#fffefb',
    majorCasing: '#dccfbb',
    street: '#fffdf9',
    streetCasing: '#e4d9c8',
    service: '#fbf8f2',
    path: '#d8cab3',
  },

  building: {
    residential: '#fbf8f2',
    commercial: '#f5efe4',
    education: '#f4efe6',
    other: '#f7f2e9',
    outside: '#e9e1d4',
  },

  plaza: {
    site: '#dbe9c1',
    siteHover: '#cde3a6',
    siteSelected: '#bcd98a',
    siteOutline: '#9fc45a',
    siteOutlineSelected: '#536c2a',
    building: '#a7c86a',
    buildingHover: '#8cba37',
    buildingSelected: '#5f7d2d',
    buildingDimmed: '#dfe3d3',
    inactiveBuilding: '#e6dccb',
  },

  label: {
    road: '#7d7361',
    roadHalo: '#f8f4ed',
    green: '#5b6f3b',
    water: '#4b7571',
    district: '#9c917d',
    landmark: '#6d6555',
    halo: '#f7f2ea',
    zibata: '#6b6150',
  },

  sky: {
    sky: '#ede5d8',
    horizon: '#f6f1e8',
    fog: '#f1ebe1',
  },

  light: '#fff5e6',
} as const

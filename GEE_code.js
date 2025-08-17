// Madre Fire (California, 2025) dNBR burn severity
// Data: COPERNICUS/S2_HARMONIZED, GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED
// Dates
  // Pre-fire: 2025-06-02 → 2025-07-02
  // Post-fire: 2025-07-26 → 2025-08-26
  // Imagery actually used: up to 2025-08-17 (limited by current data availability as of run date). 
    // Results may shift slightly if rerun later as new imagery becomes available.
// Note: Replace the perimeter asset ID with your own if needed (see given GEE asset in repo)
// MIT License


// Imports and filtering 
var boundary = ee.FeatureCollection("projects/gee-projects-466712/assets/CAL_fire_perimeter")
.filter(ee.Filter.eq('attr_Inc_2', 'Madre')) // Imported fire perimeter shp

var geometry = boundary.geometry()

var fire_start = ee.Date('2025-07-02')
var fire_end = ee.Date('2025-07-26')

Map.centerObject(geometry, 11)
var s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
var s2_filtered = s2.filter(ee.Filter.bounds(geometry)).select('B.*')


// Cloud Masking using CS+ mask
  // Imports
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED')
var csPlus_bands = csPlus.first().bandNames()
  // Linking the 2 ImageCollections
var filteredwithCS = s2_filtered.linkCollection(csPlus, csPlus_bands)
  // Writing the cloud masking function
function CS_mask(image){
  var qaBand = 'cs'
  var clearThreshold = 0.6
  var mask = image.select(qaBand).gte(clearThreshold)
  return image.updateMask(mask)}
var filtered_masked = filteredwithCS.map(CS_mask)


// Making before and after composites for comparison
var before_fire = filtered_masked.filter(ee.Filter.date(fire_start.advance(-1, 'month'), fire_start))
var after_fire = filtered_masked.filter(ee.Filter.date(fire_end, fire_end.advance(1, 'month')))

var before_fire_composite = before_fire.median().clip(geometry)
var after_fire_composite = after_fire.median().clip(geometry)
var swirVis = {min:0, max:3000, bands: ['B12', 'B8', 'B4']}

Map.addLayer(before_fire_composite, swirVis, 'Before the fire')
Map.addLayer(after_fire_composite, swirVis, 'After the fire')


// Calculating NBR before and after the fire
  // For sentinel-2 data, NIR = Band 8, SWIR = Band 12
function calc_NBR(image){
  var NBR = image.normalizedDifference(['B8', 'B12']).rename(['nbr'])
  return image.addBands(NBR)}

var NBR_before = before_fire.map(calc_NBR).median().clip(geometry).select('nbr')
var NBR_after = after_fire.map(calc_NBR).median().clip(geometry).select('nbr')


// Calculating dNBR and classifying the burned areas into 5 classes based on severity
var dNBR = NBR_before.subtract(NBR_after)
var severity = dNBR
  .where(dNBR.lt(0.10), 0)
  .where(dNBR.gte(0.10).and(dNBR.lt(0.27)), 1)
  .where(dNBR.gte(0.27).and(dNBR.lt(0.44)), 2)
  .where(dNBR.gte(0.44).and(dNBR.lt(0.66)), 3)
  .where(dNBR.gte(0.66), 4) // This is a re-classified image
  
var severity_palette = ['green', 'yellow', 'orange', 'red', 'magenta']
Map.addLayer(severity.clip(geometry), {min: 0, max: 4, palette: severity_palette}, 'Burn Severity')


// Calculating statistics using reducers
  // Generating an image with pixel values corresponding to real world area (m^2)
  // This is not based on the imported dataset, but is a new image generated within GEE
	// This is then scaled to km^2 and effectively clipped to the AOI with .updateMask(AOI.mask())
var area = ee.Image.pixelArea().divide(1e6).updateMask(severity.mask()).rename('area')

  // Adding the severity layer (with class data) to this image
  // Now this image has both area (Band index 0) and class (Band index 1) data for each pixel
var area_and_class = area.addBands(severity.rename('class'))

  // Using .reduceRegion() to find total area in each class
var area_per_class = area_and_class.reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}), // Group pixels based on class
  geometry: geometry,
  scale: 20,
  maxPixels: 1e10})

print(ee.List(area_per_class.get('groups')))
  

// Exports
Export.image.toDrive({
  image: severity.clip(geometry).visualize({min: 0, max: 4, palette: severity_palette}),
  description: 'Madre_dNBR_severity',
  folder: 'Project_Madre_NBR',
  fileNamePrefix: 'Madre_dNBR_severity',
  region: geometry,
  scale: 20,
  maxPixels: 1e10})
  
Export.image.toDrive({
  image: before_fire_composite.visualize(swirVis),
  description: 'Before_fire_composite',
  folder: 'Project_Madre_NBR',
  fileNamePrefix: 'Before_fire_composite',
  region: geometry,
  scale: 20,
  maxPixels: 1e10})

Export.image.toDrive({
  image: after_fire_composite.visualize(swirVis),
  description: 'After_fire_composite',
  folder: 'Project_Madre_NBR',
  fileNamePrefix: 'After_fire_composite',
  region: geometry,
  scale: 20,
  maxPixels: 1e10})

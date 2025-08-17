# Madre-fire-burn-severity-2025
This project uses Sentinel-2 satellite imagery to map the areas in California affected by the Madre Fire (July 2025). The analysis calculates the Normalized Burn Ratio (NBR) for pre- and post-fire composites, computes the difference in NBR (dNBR), classifies burned areas into 5 categories based on severity, and calculates area (km²) per severity class.

## Data Sources:
- Madre Fire Information: CAL FIRE. https://www.fire.ca.gov/incidents/2025/7/2/madre-fire
- dNBR thresholds for severity categories: Key, C. H., & Benson, N. C. (2006) https://www.researchgate.net/publication/241687027_Landscape_Assessment_Ground_measure_of_severity_the_Composite_Burn_Index_and_Remote_sensing_of_severity_the_Normalized_Burn_Ratio
- Madre fire perimeter shapefile: 
  - CAL FIRE WFIGS 2025 Wildfire Perimeters (Source): https://hub-calfire-forestry.hub.arcgis.com/datasets/wfigs-2025-wildfire-perimeters/explore?location=36.130988%2C-119.597803%2C6.71
  - As GEE fire perimeter asset (To be imported before running GEE_code.js): https://code.earthengine.google.com/?asset=projects/gee-projects-466712/assets/CAL_fire_perimeter
- Harmonized Sentinel-2 data: European Space Agency (ESA) & Copernicus Program. Imported from EE data catalog (ID: 'COPERNICUS/S2_HARMONIZED')
- Google’s Cloud Score+ Mask: Google Earth Engine Team. Imported from EE data catalog (ID: 'GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED')

## Tools used:
- Google Earth Engine (JavaScript API)

## Steps:
### Data Acquisition
- Used CAL FIRE website to gather general information of the Madre fire, including fire start date, fire end date, and area affected (km²).
- Downloaded the Madre fire perimeter shapefile from CAL FIRE WFIGS 2025 Wildfire Perimeters. Imported it as a FeatureCollection and used it to create a geometry of the Area of Interest (AOI).
- Imported COPERNICUS/S2_HARMONIZED ImageCollection and filter it using the acquired AOI geometry to only include Sentinel-2 images within the fire perimeter.

### Data Pre-Processing
- Imported GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED ImageCollection and linked it to the Sentinel-2 ImageCollection. Applied a cloud-masking function that retained only pixels with a CS+ cloud score ≥ 0.6.
- Used the fire dates to filter the cloud-masked Sentinel-2 ImageCollection into 2 sub-ImageCollections:
  - before-fire: Images from 1 month before the fire up to the fire start date.
  - after-fire: Images from the fire end date up to 1 month after the fire.
- Made median composites from the 2 sub-ImageCollections clipped to the AOI geometry. This is to visualize and compare the landscape before and after the fire.

### NBR calculations
- Calculated NBR for each of the sub-ImageCollections by first writing a function to calculate NBR for a single image, then mapping it over the ImageCollections. 
- Made median composites from the NBR ImageCollections clipped to the AOI:
  - NBR_before: A median composite of NBR before the fire
  - NBR_after: A median composite of NBR after the fire
- Calculated dNBR by subtracting NBR_after from NBR_before.
- Classified dNBR into 5 severity classes using .where(), based on Key, C. H., & Benson, N. C. (2006).

### Statistics
- Used ee.Image.pixelArea() to generate an image with pixel values corresponding to real-world areas in m². Scaled this image to km² and clipped it to the AOI.
- Added the severity composite to this image’s band list to get the class data for each pixel. Now this image has area and class data for each pixel.
- Calculated total area for each class using .reduceRegion().

### Exports
- Exported before_fire composite, after_fire composite, and severity composite as GeoTIFFs using Export.image.toDrive().

## Outputs
- 3 TIFFs: before_fire composite, after_fire composite, severity_composite
- 3 PNGs of the composites
- 1 list containing area (km²) in each class
- JavaScript code from GEE code editor

## Results:
| Severity Class   | dNBR Range       | Colour   | Area (km²) |
|------------------|------------------|----------|------------|
| Unburned (0)        | < 0.100       | Green    | 56.10     |
| Low Severity (1)   | 0.100 – 0.269       | Yellow   | 181.96       |
| Moderate-Low (2)    | 0.270 – 0.439      | Orange   | 79.29      |
| Moderate-High (3)    | 0.440 – 0.659      | Red      | 9.53     |
| High Severity (4)    | ≥ 0.660           | Magenta  | 0.01       |

## Notes:
- TIFF and PNG outputs are included in the 'Outputs' folder
- JavaScript code from GEE code editor is given in GEE_code.js file
- This project is licensed under the MIT License





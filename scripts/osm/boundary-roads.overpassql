[out:json][timeout:90];
// The three roads that bound the Acton campus. Their OSM centrelines are the
// source geometry for CAMPUS_BOUNDARY in scripts/gen-parking.mjs, which clips
// the parking set to lots on the campus side of them.
(
  way["name"="Clunies Ross Street"](-35.2950,149.1000,-35.2650,149.1300);
  way["name"="Barry Drive"](-35.2950,149.1000,-35.2700,149.1350);
  way["name"="Edinburgh Avenue"](-35.2900,149.1150,-35.2750,149.1350);
);
out geom;

[out:json][timeout:90];
(
  nwr["building"]["name"](-35.2880,149.1085,-35.2690,149.1250);
  nwr["amenity"~"^(college|university|library|place_of_worship|cafe)$"]["name"](-35.2880,149.1085,-35.2690,149.1250);
  nwr["landuse"="residential"]["name"](-35.2880,149.1085,-35.2690,149.1250);
  nwr["leisure"="pitch"]["name"](-35.2880,149.1085,-35.2690,149.1250);
  nwr["amenity"="parking"]["name"](-35.2880,149.1085,-35.2690,149.1250);
);
out center tags;

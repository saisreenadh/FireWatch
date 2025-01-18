import React, { useRef, useEffect, useState } from 'react';
import Map from '@arcgis/core/Map.js';
import MapView from '@arcgis/core/views/MapView.js';
import * as locator from '@arcgis/core/rest/locator.js';
import ChatInterface from './ChatInterface';

function ArcGISMap() {
  const mapDiv = useRef(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    if (mapDiv.current) {
      const map = new Map({
        basemap: 'topo-vector'
      });

      const mapView = new MapView({
        container: mapDiv.current,
        map: map,
        center: [-118.244, 34.052], // Los Angeles
        zoom: 12
      });

      setView(mapView);

      return () => {
        if (mapView) {
          mapView.destroy();
        }
      };
    }
  }, []);

  const handleSearch = async (searchText) => {
    if (!view) return;

    try {
      const params = {
        address: {
          SingleLine: searchText
        },
        outFields: ["*"]
      };

      const results = await locator.addressToLocations("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer", params);

      if (results.length > 0) {
        const location = results[0];
        view.goTo({
          center: [location.location.longitude, location.location.latitude],
          zoom: 12
        }, {
          duration: 2000,
          easing: "ease-in-out"
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  return (
    <div
      className="map-view"
      ref={mapDiv}
      style={{
        padding: 0,
        margin: 0,
        height: '100%',
        width: '100%',
        position: 'relative'
      }}
    >
      <ChatInterface onSearch={handleSearch} />
    </div>
  );
}

export default ArcGISMap;
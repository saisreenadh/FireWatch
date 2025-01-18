import React, { useRef, useEffect } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';

function ArcGISMap() {
  const mapDiv = useRef(null);

  useEffect(() => {
    if (mapDiv.current) {
      const map = new Map({
        basemap: 'topo-vector'
      });

      const view = new MapView({
        container: mapDiv.current,
        map: map,
        center: [-118.244, 34.052], // Los Angeles
        zoom: 12
      });

      return () => {
        if (view) {
          view.destroy();
        }
      };
    }
  }, []);

  return (
    <div
      className="map-view"
      ref={mapDiv}
      style={{
        padding: 0,
        margin: 0,
        height: '100%',
        width: '100%'
      }}
    />
  );
}

export default ArcGISMap;
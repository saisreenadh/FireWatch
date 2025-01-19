import React, { useRef, useEffect, useState } from 'react';
import Map from '@arcgis/core/Map.js';
import MapView from '@arcgis/core/views/MapView.js';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import Legend from '@arcgis/core/widgets/Legend.js';
import * as locator from '@arcgis/core/rest/locator.js';
import esriConfig from '@arcgis/core/config.js';
import ChatBot from './components/ChatBot';
import './components/ChatBot.css';

function ArcGISMap() {
  const mapDiv = useRef(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    // Configure ArcGIS to use anonymous access
    esriConfig.request.useIdentity = false;
    esriConfig.request.interceptors = [];

    if (mapDiv.current) {
      // Create the map
      const map = new Map({
        basemap: 'topo-vector'
      });

      // Add Active Fire Reports Layer
      const activeFiresLayer = new FeatureLayer({
        url: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer/0",
        title: "Active Fires",
        popupTemplate: {
          title: "Fire Information",
          content: [
            {
              type: "fields",
              fieldInfos: [
                { fieldName: "IncidentName", label: "Incident Name" },
                { fieldName: "DailyAcres", label: "Acres Burned" },
                { fieldName: "PercentContained", label: "Percent Contained" },
                { fieldName: "FireCause", label: "Fire Cause" },
                { fieldName: "FireDiscoveryDateTime", label: "Discovery Date" }
              ]
            }
          ]
        }
      });

      // Add Fire Perimeter Layer
      const firePerimetersLayer = new FeatureLayer({
        url: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0",
        title: "Fire Perimeters",
        opacity: 0.7,
        renderer: {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [255, 70, 0, 0.3],
            outline: {
              color: [255, 70, 0, 0.7],
              width: 1
            }
          }
        },
        popupTemplate: {
          title: "Fire Perimeter Information",
          content: [
            {
              type: "fields",
              fieldInfos: [
                { fieldName: "IncidentName", label: "Incident Name" },
                { fieldName: "GISAcres", label: "Area (Acres)" },
                { fieldName: "CreateDate", label: "Date Created" },
                { fieldName: "LoadDate", label: "Last Updated" }
              ]
            }
          ]
        }
      });

      map.add(firePerimetersLayer);
      map.add(activeFiresLayer);

      // Create the view
      const mapView = new MapView({
        container: mapDiv.current,
        map: map,
        center: [-118.244, 34.052], // Los Angeles
        zoom: 6 // Zoomed out to show more fires
      });

      // Add legend
      const legend = new Legend({
        view: mapView
      });
      mapView.ui.add(legend, "bottom-right");

      setView(mapView);
    }
  }, []);

  const handleCitySearch = async (cityName) => {
    if (!view) return null;

    try {
      // Use the World Geocoding Service with no authentication
      const geocodingServiceUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

      const params = {
        address: {
          SingleLine: cityName
        },
        outFields: ["*"],
        maxLocations: 1,
        forStorage: false
      };

      const results = await locator.addressToLocations(geocodingServiceUrl, params);

      if (results.length) {
        const result = results[0];
        const location = {
          latitude: result.location.latitude,
          longitude: result.location.longitude
        };

        // Animate to the location
        view.goTo({
          center: [location.longitude, location.latitude],
          zoom: 10
        }, {
          duration: 1000,
          easing: 'ease-in-out'
        });

        return location;
      }
      return null;
    } catch (error) {
      console.error("Error searching for city:", error);
      return null;
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <ChatBot onCitySearch={handleCitySearch} />
      <div
        className="map-view"
        ref={mapDiv}
        style={{
          padding: 0,
          margin: 0,
          marginLeft: '350px',
          height: '100%',
          width: 'calc(100% - 350px)'
        }}
      />
    </div>
  );
}

export default ArcGISMap;
import React, { useRef, useEffect, useState } from 'react';
import Map from '@arcgis/core/Map.js';
import SceneView from '@arcgis/core/views/SceneView.js';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import Legend from '@arcgis/core/widgets/Legend.js';
import * as locator from '@arcgis/core/rest/locator.js';
import ElevationLayer from "@arcgis/core/layers/ElevationLayer.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Point from "@arcgis/core/geometry/Point.js";
import Graphic from "@arcgis/core/Graphic.js";
import ChatBot from './components/ChatBot';
import './components/ChatBot.css';
import config from "@arcgis/core/config.js";

function ArcGISMap() {
  const mapDiv = useRef(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    // Disable authentication for public layers
    config.apiKey = "";
    config.request.useIdentity = false;
    
    if (mapDiv.current) {
      // Create elevation layer for terrain
      const elevationLayer = new ElevationLayer({
        url: "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"
      });

      // Create the map as a 3D scene
      const map = new Map({
        basemap: 'satellite',
        ground: {
          layers: [elevationLayer],
          opacity: 1
        }
      });

      // Create graphics layer for fire visualization
      const fireGraphicsLayer = new GraphicsLayer();

      // Add Active Fire Reports Layer with 3D visualization
      const activeFiresLayer = new FeatureLayer({
        url: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer/0",
        title: "Active Fires",
        outFields: ["*"],
        elevationInfo: {
          mode: "relative-to-ground",
          offset: 1000, // Offset from ground in meters
          featureExpressionInfo: {
            expression: "$feature.DailyAcres * 10" // Scale height based on acres
          },
          unit: "meters"
        },
        renderer: {
          type: "simple",
          symbol: {
            type: "point-3d",
            symbolLayers: [{
              type: "object",
              resource: { primitive: "cylinder" },
              material: { color: [255, 70, 0, 0.8] },
              height: 1000,
              width: 5000
            }]
          }
        },
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

      // Add Fire Perimeter Layer with 3D visualization
      const firePerimetersLayer = new FeatureLayer({
        url: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0",
        title: "Fire Perimeters",
        outFields: ["*"],
        opacity: 1,
        elevationInfo: {
          mode: "on-the-ground",
          offset: 10 // Slight offset to prevent z-fighting
        },
        renderer: {
          type: "simple",
          symbol: {
            type: "polygon-3d",
            symbolLayers: [{
              type: "fill",
              material: { color: [255, 165, 0, 0.7] },
              outline: {
                color: [255, 69, 0, 1],
                width: 4
              }
            }]
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

      // Add layers to the map
      map.add(firePerimetersLayer);
      map.add(activeFiresLayer);
      map.add(fireGraphicsLayer);

      // Create the SceneView
      const newView = new SceneView({
        container: mapDiv.current,
        map: map,
        camera: {
          position: {
            longitude: -98.5795,
            latitude: 39.8283,
            z: 12000000 // Increased height to see more of the globe
          },
          tilt: 0 // Flat view initially
        },
        environment: {
          atmosphere: { quality: "high" },
          lighting: {
            date: new Date(2024, 5, 21, 12, 0),
            directShadowsEnabled: true,
            ambientOcclusionEnabled: true,
            brightness: 1.2,
            waterReflectionEnabled: true,
            cameraTrackingEnabled: false
          },
          background: {
            type: "color",
            color: [0, 0, 0, 1]  // Black background to make earth features pop
          }
        },
        qualityProfile: "high",
        ui: {
          components: ["zoom", "compass", "attribution"]
        }
      });

      // Add a legend
      const legend = new Legend({
        view: newView
      });
      newView.ui.add(legend, "bottom-right");

      setView(newView);

      return () => {
        if (newView) {
          newView.destroy();
        }
      };
    }
  }, []);

  const handleCitySearch = async (cityName) => {
    if (!view) return null;

    try {
      console.log("Searching for city:", cityName);
      
      // First, try to use the Esri World Geocoding Service directly
      // This is more reliable for finding cities by name
      const geocodeUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
      const searchParams = new URLSearchParams({
        f: "json",
        singleLine: cityName,
        outFields: "*",
        maxLocations: "1",
        outSR: "4326",
        searchExtent: "",
        location: "",
        distance: "",
        category: "City"
      });
      
      console.log("Sending geocode request to:", geocodeUrl);
      const response = await fetch(`${geocodeUrl}?${searchParams.toString()}`);
      const data = await response.json();
      console.log("Direct geocode response:", data);
      
      if (data.candidates && data.candidates.length > 0) {
        const bestMatch = data.candidates[0];
        console.log("Best match found:", bestMatch);
        
        // Clear any existing graphics
        view.graphics.removeAll();
        
        // Create a graphics layer for search results if it doesn't exist
        let searchResultsLayer = view.map.findLayerById("searchResultsLayer");
        if (!searchResultsLayer) {
          searchResultsLayer = new GraphicsLayer({
            id: "searchResultsLayer",
            title: "Search Results",
            elevationInfo: {
              mode: "relative-to-ground",
              offset: 1
            }
          });
          view.map.add(searchResultsLayer);
        } else {
          searchResultsLayer.removeAll();
        }
        
        // Create a point for the city location
        const cityPoint = new Point({
          x: bestMatch.location.x,  // longitude
          y: bestMatch.location.y,  // latitude
          spatialReference: { wkid: 4326 }
        });
        
        // Add a marker for the city
        const cityMarker = new Graphic({
          geometry: cityPoint,
          symbol: {
            type: "simple-marker",
            color: [0, 119, 255],
            size: "12px",
            outline: {
              color: [255, 255, 255],
              width: 2
            }
          },
          attributes: {
            name: bestMatch.address,
            score: bestMatch.score
          },
          popupTemplate: {
            title: "{name}",
            content: "Match score: {score}%"
          }
        });
        
        searchResultsLayer.add(cityMarker);
        
        // Create a buffer graphic around the city
        const bufferGraphic = new Graphic({
          geometry: cityPoint,
          symbol: {
            type: "simple-fill",
            color: [0, 119, 255, 0.1],
            outline: {
              color: [0, 119, 255, 0.5],
              width: 1
            }
          }
        });
        searchResultsLayer.add(bufferGraphic);
        
        // Create a more dramatic camera movement for 3D
        console.log("Moving camera to:", cityPoint);
        view.goTo({
          target: cityPoint,
          zoom: 10,  // Zoom out slightly to see more context
          tilt: 45,  // Less extreme tilt to see more of the surrounding area
          heading: 0
        }, {
          duration: 2000,
          easing: "out-expo"
        }).catch(err => {
          console.error("Error during camera movement:", err);
        });
        
        // Find and highlight fire perimeters layer
        const firePerimetersLayer = view.map.allLayers.find(layer => 
          layer.title && (layer.title.includes("Fire Perimeter") || layer.title.includes("WFIGS_Interagency_Perimeters"))
        );
        
        if (firePerimetersLayer) {
          console.log("Found fire perimeters layer:", firePerimetersLayer.title);
          // Reset any previous filters
          if (firePerimetersLayer.definitionExpression) {
            firePerimetersLayer.definitionExpression = "1=1";
          }
          
          // Use a buffer to find nearby fires
          const cityBuffer = {
            spatialRelationship: "intersects",
            geometry: cityPoint,
            distance: 100,  // 100 km buffer
            units: "kilometers"
          };
          
          // Highlight the layer with fires near the city
          firePerimetersLayer.effect = {
            filter: cityBuffer,
            includedEffect: "bloom(2, 1px, 0)",
            excludedEffect: "opacity(0.3)"
          };
        } else {
          console.log("Fire perimeters layer not found");
          // List all available layers for debugging
          view.map.allLayers.forEach(layer => {
            console.log("Available layer:", layer.title || layer.id);
          });
        }
        
        // Also highlight active fires layer
        const activeFiresLayer = view.map.allLayers.find(layer => 
          layer.title && (layer.title.includes("Active Fire") || layer.title.includes("Active_Fires"))
        );
        
        if (activeFiresLayer) {
          console.log("Found active fires layer:", activeFiresLayer.title);
          // Highlight active fires near the city
          activeFiresLayer.effect = {
            filter: {
              spatialRelationship: "intersects",
              geometry: cityPoint,
              distance: 100,  // 100 km buffer
              units: "kilometers"
            },
            includedEffect: "bloom(2, 1px, 0)",
            excludedEffect: "opacity(0.3)"
          };
        } else {
          console.log("Active fires layer not found");
        }

        return {
          latitude: bestMatch.location.y,
          longitude: bestMatch.location.x,
          address: bestMatch.address
        };
      } else {
        console.log("No results found for:", cityName);
        return null;
      }
    } catch (error) {
      console.error("Error finding location:", error);
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
          marginLeft: '450px',
          height: '100%',
          width: 'calc(100% - 450px)'
        }}
      />
    </div>
  );
}

export default ArcGISMap;
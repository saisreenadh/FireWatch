import React from 'react';
import Map from "@arcgis/core/Map";
import SceneView from "@arcgis/core/views/SceneView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import config from "@arcgis/core/config";
import "@arcgis/core/assets/esri/themes/dark/main.css";
import './LandingPage.css';

function LandingPage({ onGetStarted }) {
  const mapRef = React.useRef(null);
  const [view, setView] = React.useState(null);
  const rotationRef = React.useRef(null);

  React.useEffect(() => {
    if (!mapRef.current) return;

    // Configure ArcGIS API
    config.assetsPath = "./assets";

    try {
      const map = new Map({
        basemap: "satellite",
        ground: "world-elevation"
      });

      const view = new SceneView({
        container: mapRef.current,
        map: map,
        environment: {
          background: {
            type: "color",
            color: [0, 0, 0, 1]
          },
          starsEnabled: true,
          atmosphereEnabled: true,
          atmosphere: {
            quality: "high"
          },
          stars: {
            density: 0.8,
            atmosphereEffect: 0.5
          },
          lighting: {
            directShadowsEnabled: true,
            date: new Date(),
            cameraTrackingEnabled: false
          }
        },
        camera: {
          position: {
            x: -8000000,
            y: 4000000,
            z: 15000000
          },
          heading: 0,
          tilt: 0
        },
        center: [-100, 40],
        zoom: 1,
        constraints: {
          altitude: {
            min: 1000,
            max: 25000000
          }
        },
        viewingMode: "global",
        qualityProfile: "high",
        navigation: {
          mouseWheelZoomEnabled: false,
          browserTouchPanEnabled: false,
          dragEnabled: false
        }
      });

      // Create a graphics layer for markers
      const markerLayer = new GraphicsLayer({
        elevationInfo: {
          mode: "relative-to-ground",
          offset: 50000
        }
      });
      map.add(markerLayer);

      // Sample fire locations around the globe - positioned to match the image
      const fireLocations = [
        // South America (visible in the image)
        { longitude: -60, latitude: -10, intensity: 0.8 },
        // Africa (visible in the image)
        { longitude: 20, latitude: 5, intensity: 0.8 },
        // North America (visible in the image)
        { longitude: -100, latitude: 40, intensity: 0.8 },
        // Australia/Oceania (visible in the image)
        { longitude: 135, latitude: -25, intensity: 0.8 },
        // Additional fires to match image
        { longitude: -120, latitude: 50, intensity: 0.8 },
        { longitude: 30, latitude: 60, intensity: 0.8 },
        { longitude: 120, latitude: 45, intensity: 0.8 },
        { longitude: -50, latitude: -30, intensity: 0.8 },
        { longitude: 80, latitude: 30, intensity: 0.8 },
        { longitude: 140, latitude: 40, intensity: 0.8 },
        // Add a few more subtle ones
        { longitude: -80, latitude: 35, intensity: 0.6 },
        { longitude: 10, latitude: 45, intensity: 0.6 },
        { longitude: 60, latitude: -10, intensity: 0.6 },
        { longitude: 100, latitude: 10, intensity: 0.6 },
        { longitude: -140, latitude: 60, intensity: 0.6 },
        { longitude: -20, latitude: 10, intensity: 0.6 },
        { longitude: 170, latitude: -30, intensity: 0.6 }
      ];

      // Wait for view to be ready before adding graphics
      view.when(() => {
        // Create markers
        fireLocations.forEach((loc, index) => {
          const point = new Point({
            longitude: loc.longitude,
            latitude: loc.latitude
          });

          // Create glowing orb symbol using SVG - simplified to match the image
          const markerSymbol = {
            type: "picture-marker",
            url: "data:image/svg+xml," + encodeURIComponent(`
              <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="orbGrad${index}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style="stop-color:#FF6B00;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#FF6B00;stop-opacity:0"/>
                  </radialGradient>
                </defs>
                <!-- Simple glowing dot to match the image -->
                <circle cx="10" cy="10" r="3" fill="#FF6B00">
                  <animate attributeName="opacity"
                          values="1;0.6;1"
                          dur="1.5s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
                </circle>
                <!-- Subtle glow effect -->
                <circle cx="10" cy="10" r="5" fill="none" stroke="#FF4500" stroke-width="0.5">
                  <animate attributeName="opacity"
                          values="0.7;0.2;0.7"
                          dur="2s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
                </circle>
              </svg>
            `),
            width: 15 * loc.intensity,  // Smaller size to match image
            height: 15 * loc.intensity   // Smaller size to match image
          };

          const markerGraphic = new Graphic({
            geometry: point,
            symbol: markerSymbol
          });

          markerLayer.add(markerGraphic);
        });

        // Add slow rotation around Earth's axis
        const rotate = () => {
          const camera = view.camera.clone();
          
          // Calculate new camera position - very slow rotation to match the image
          const angle = (Date.now() * 0.0005) % 360; // Even slower rotation to match image
          const radius = Math.sqrt(camera.position.x * camera.position.x + camera.position.y * camera.position.y);
          
          camera.position.x = radius * Math.cos(angle * Math.PI / 180);
          camera.position.y = radius * Math.sin(angle * Math.PI / 180);
          
          // Slightly adjust tilt for better view
          camera.tilt = 0.5;
          
          view.goTo(camera, {
            animate: false,
            duration: 0
          }).catch(() => {});
          
          rotationRef.current = requestAnimationFrame(rotate);
        };
        
        rotate();
      }).catch(error => {
        console.error("Error creating view:", error);
      });

      setView(view);
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
      }
      if (view) {
        view.destroy();
      }
    };
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="landing-text">
          <h1>FireWatch</h1>
          <p>Real-time wildfire monitoring and tracking across the globe. Stay informed with instant alerts and detailed information about fire incidents.</p>
          <button className="cta-primary" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
      </div>
      <div ref={mapRef} className="globe-container" />
    </div>
  );
}

export default LandingPage;

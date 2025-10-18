import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import VoteComponent from "./VoteComponent.jsx";
import "../styles/mapbox.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function MapBox({ onSpotEnter, onSpotLeave, currentSpot }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spots, setSpots] = useState([]);
  const [buildingVotes, setBuildingVotes] = useState({});
  const [locationPermission, setLocationPermission] = useState('unknown');

  // Distance calculation function (Haversine)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Get building color based on vote results
  const getBuildingColor = (buildingId) => {
    const votes = buildingVotes[buildingId];
    
    if (!votes || votes.total === 0) {
      // No votes yet - warm gray
      return '#9CA3AF';
    }

    const optionA = votes.option_a || 0;
    const optionB = votes.option_b || 0;

    if (optionA === optionB) {
      // Tie - warm gray
      return '#9CA3AF';
    } else if (optionA > optionB) {
      // Option A winning - light blue
      return '#60A5FA';
    } else {
      // Option B winning - coral orange
      return '#FB923C';
    }
  };

  // Fetch all building vote results
  const fetchBuildingVotes = async () => {
    try {
      console.log("🗳️  Fetching building votes...");
      const response = await fetch("http://localhost:4001/api/votes/all");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("✅ Building votes fetched:", data.buildingVotes);
      setBuildingVotes(data.buildingVotes);
    } catch (error) {
      console.error("❌ Error fetching building votes:", error);
    }
  };

  // Fetch spots data from API
  useEffect(() => {
    const fetchSpots = async () => {
      try {
        console.log("🏢 Fetching spots from API...");
        const response = await fetch("http://localhost:4001/api/buildings");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const spotsData = await response.json();
        console.log(
          "✅ Spots fetched successfully:",
          spotsData.length,
          "buildings"
        );
        setSpots(spotsData);
      } catch (error) {
        console.error("❌ Error fetching spots:", error);
        // Fallback to empty array if API fails
        setSpots([]);
      }
    };

    fetchSpots();
    fetchBuildingVotes();

    // Refresh votes every 10 seconds
    const interval = setInterval(fetchBuildingVotes, 10000);
    return () => clearInterval(interval);
  }, []);

  // Check location permission and get initial location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser");
      setLocationPermission('error');
      return;
    }

    console.log("📍 Checking location permission...");
    
    // Check if permission is already granted
    navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
      console.log("🔍 Location permission status:", result.state);
      
      if (result.state === 'granted') {
        setLocationPermission('granted');
        // Permission already granted, get current position immediately
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log("✅ Got initial location:", latitude, longitude);
            setUserLocation({ lat: latitude, lng: longitude });
          },
          (error) => {
            console.error("❌ Error getting initial location:", error);
            setLocationPermission('error');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else if (result.state === 'denied') {
        setLocationPermission('denied');
      } else {
        // Permission not determined yet, request it
        setLocationPermission('prompt');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log("✅ Permission granted, got initial location:", latitude, longitude);
            setUserLocation({ lat: latitude, lng: longitude });
            setLocationPermission('granted');
          },
          (error) => {
            console.error("❌ Location permission denied:", error);
            setLocationPermission('denied');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }).catch(() => {
      // Fallback for browsers that don't support permissions API
      console.log("🔄 Permissions API not supported, requesting location directly...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("✅ Got initial location:", latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationPermission('granted');
        },
        (error) => {
          console.error("❌ Location permission denied:", error);
          setLocationPermission('denied');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);


  // Add map layers when both map and spots are loaded
  useEffect(() => {
    if (!isMapLoaded || spots.length === 0) return;

    const safelyAddLayers = () => {
      if (!map.current?.isStyleLoaded()) {
        console.warn("⏳ Waiting for style...");
        setTimeout(safelyAddLayers, 300);
        return;
      }

      console.log("🗺️ Style is ready. Adding layers now...");
      try {
        addSpotLayers();
        addRadiusPolygons();
        console.log("✅ Layers added successfully");
      } catch (error) {
        console.error("❌ Error adding layers:", error);
      }
    };

    safelyAddLayers();
  }, [isMapLoaded, spots, buildingVotes]);


  // 위도/경도 중심 + 반경(m) → 원형 polygon 생성
  const createCircle = (center, radiusInMeters, points = 64) => {
    const [lng, lat] = center;
    const coords = [];
    const distanceX =
      radiusInMeters / (111320 * Math.cos((lat * Math.PI) / 180));
    const distanceY = radiusInMeters / 110574;

    for (let i = 0; i < points; i++) {
      const angle = (i * 360) / points;
      const x = lng + distanceX * Math.cos((angle * Math.PI) / 180);
      const y = lat + distanceY * Math.sin((angle * Math.PI) / 180);
      coords.push([x, y]);
    }
    coords.push(coords[0]);
    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  };

  // 지도 초기화
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-111.6495, 40.249],
      zoom: 15,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    // Add geolocate control with custom styling
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: false, // We'll create our own pulse effect
    });

    map.current.addControl(geolocate);

    map.current.on("load", () => {
      console.log("🗺️ Map loaded successfully");
      setIsMapLoaded(true);
      setIsLoading(false);
    });

    map.current.on("error", (e) => {
      console.error("Map error:", e);
      setIsLoading(false);
    });

    // Start watching position only if permission is granted
    if (locationPermission === 'granted') {
      navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          console.log("📍 User location updated:", latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (err) => {
          console.error("GPS Error:", err);
          setLocationPermission('error');
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
  }, [locationPermission]);

  // Spot symbol layer 추가
  const addSpotLayers = () => {
    if (!map.current) {
      console.warn("Map not initialized yet, skipping spot layers");
      return;
    }

    console.log("Adding spot layers...", spots.length, "spots found");
    const geojson = {
      type: "FeatureCollection",
      features: spots.map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        properties: {
          id: s.id,
          name: s.name,
          owner: s.owner,
          color: getBuildingColor(s.id),
        },
      })),
    };

    console.log("📍 Spot GeoJSON:", geojson);

    // 기존 레이어와 소스가 있으면 제거
    if (map.current.getLayer("spot-circles")) {
      map.current.removeLayer("spot-circles");
    }
    if (map.current.getLayer("spot-symbols")) {
      map.current.removeLayer("spot-symbols");
    }
    if (map.current.getSource("spots")) {
      map.current.removeSource("spots");
    }

    // 새 소스 추가
    try {
      map.current.addSource("spots", { type: "geojson", data: geojson });
    } catch (error) {
      console.error("Error adding spots source:", error);
      return;
    }

    // Add colored circle markers
    map.current.addLayer({
      id: "spot-circles",
      type: "circle",
      source: "spots",
      paint: {
        "circle-radius": 12,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.9,
      },
    });

    // Add text labels
    map.current.addLayer({
      id: "spot-symbols",
      type: "symbol",
      source: "spots",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-offset": [0, 1.5],
        "text-anchor": "top",
        "text-size": 12,
      },
      paint: { 
        "text-color": "#111",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });

    // Click handlers for both layers
    map.current.on("click", "spot-circles", (e) => {
      const f = e.features[0];
      const { name, id } = f.properties;
      setSelectedBuilding({
        id: id,
        name: name,
      });
    });

    map.current.on("click", "spot-symbols", (e) => {
      const f = e.features[0];
      const { name, id } = f.properties;
      setSelectedBuilding({
        id: id,
        name: name,
      });
    });

    // Hover cursor
    map.current.on("mouseenter", "spot-circles", () => {
      map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", "spot-circles", () => {
      map.current.getCanvas().style.cursor = "";
    });
  };

  // 반경 polygon layer 추가
  const addRadiusPolygons = () => {
    if (!map.current) {
      console.warn("Map not initialized yet, skipping radius polygons");
      return;
    }

    console.log("Adding radius polygons...");
    const radiusFeatures = spots.map((s) => {
      const circle = createCircle([s.lng, s.lat], s.radius);
      circle.properties = {
        buildingId: s.id,
        color: getBuildingColor(s.id),
      };
      return circle;
    });

    // 기존 레이어와 소스가 있으면 제거
    if (map.current.getLayer("spot-radius-fill")) {
      map.current.removeLayer("spot-radius-fill");
    }
    if (map.current.getSource("spot-radius")) {
      map.current.removeSource("spot-radius");
    }

    map.current.addSource("spot-radius", {
      type: "geojson",
      data: { type: "FeatureCollection", features: radiusFeatures },
    });

    map.current.addLayer({
      id: "spot-radius-fill",
      type: "fill",
      source: "spot-radius",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.15,
      },
    });
  };

  // ✅ Update user location safely after style is loaded
  useEffect(() => {
    if (!map.current || !userLocation) return;

    const updateUserLocation = () => {
      // 🔹 스타일 준비 안됐으면 재시도
      if (!map.current.isStyleLoaded()) {
        console.warn(
          "🕓 Waiting for map style to finish loading before updating user location..."
        );
        setTimeout(updateUserLocation, 300);
        return;
      }

      console.log("🗺️ Updating user location on map:", userLocation);

      // 🔹 기존 user-location 제거
      if (map.current.getSource("user-location")) {
        if (map.current.getLayer("user-location-pulse"))
          map.current.removeLayer("user-location-pulse");
        if (map.current.getLayer("user-location-dot"))
          map.current.removeLayer("user-location-dot");
        map.current.removeSource("user-location");
      }

      // 🔹 새 GeoJSON 생성
      const userLocationGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [userLocation.lng, userLocation.lat],
            },
            properties: {
              id: "user-location",
            },
          },
        ],
      };

      // ✅ Source 추가
      map.current.addSource("user-location", {
        type: "geojson",
        data: userLocationGeoJSON,
      });

      // ✅ Pulse ring layer 추가
      map.current.addLayer({
        id: "user-location-pulse",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": {
            base: 1.75,
            stops: [
              [12, 15],
              [22, 120],
            ],
          },
          "circle-color": "#2563eb",
          "circle-opacity": 0.2,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#2563eb",
          "circle-stroke-opacity": 0.4,
        },
      });

      // ✅ Center dot layer 추가
      map.current.addLayer({
        id: "user-location-dot",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": {
            base: 1.75,
            stops: [
              [12, 6],
              [22, 10],
            ],
          },
          "circle-color": "#2563eb",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 1,
        },
      });
    };

    // 실행
    updateUserLocation();
  }, [userLocation]);

  // Spot entry detection with automatic chat joining
  useEffect(() => {
    if (!userLocation || spots.length === 0) return;

    let enteredSpot = null;

    spots.forEach((spot) => {
      const dist = getDistance(
        userLocation.lat,
        userLocation.lng,
        spot.lat,
        spot.lng
      );

      if (dist < spot.radius) {
        enteredSpot = spot;
        console.log(
          `✅ ${spot.name} entry detected (distance: ${dist.toFixed(1)}m)`
        );
      }
    });

    // Update current spot without auto-opening chat
    if (enteredSpot && (!currentSpot || currentSpot.id !== enteredSpot.id)) {
      onSpotEnter(enteredSpot);
      console.log(`📍 Entered ${enteredSpot.name} - Chat available`);
    }

    // Auto-leave spot chat if not in any spot
    if (!enteredSpot && currentSpot) {
      onSpotLeave();
    }
  }, [userLocation, spots, currentSpot, onSpotEnter, onSpotLeave]);

  return (
    <div className="map-wrapper">
      {isLoading && (
        <div className="map-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading Map...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="map-container-inner" />

      {selectedBuilding && (
        <VoteComponent
          buildingId={selectedBuilding.id}
          buildingName={selectedBuilding.name}
          userLocation={userLocation}
          onClose={() => setSelectedBuilding(null)}
        />
      )}
    </div>
  );
}

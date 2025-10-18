import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import io from "socket.io-client";
import SpotChat from "./SpotChat.jsx";
import VoteComponent from "./VoteComponent.jsx";
import "../styles/mapbox.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function MapBox() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentSpot, setCurrentSpot] = useState(null);
  const [socket, setSocket] = useState(null);
  const [nickname, setNickname] = useState("");
  const [showSpotChat, setShowSpotChat] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spots, setSpots] = useState([]);

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
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io("http://localhost:4001");
    setSocket(newSocket);

    // Get nickname from user profile
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userNickname = user.nickname || user.name || "Anonymous";
        setNickname(userNickname);
        newSocket.emit("setNickname", userNickname);
        console.log(`🎭 Using profile nickname: ${userNickname}`);
      } catch (error) {
        console.error("Error parsing user data:", error);
        setNickname("Anonymous");
        newSocket.emit("setNickname", "Anonymous");
      }
    } else {
      // Fallback if no user data
      setNickname("Anonymous");
      newSocket.emit("setNickname", "Anonymous");
    }

    return () => newSocket.close();
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
  }, [isMapLoaded, spots]);

  // Join spot chat when user manually opens chat
  const joinSpotChat = (spot) => {
    if (socket && nickname) {
      socket.emit("joinSpotChat", {
        spotId: spot.id,
        spotName: spot.name,
      });
      setShowSpotChat(true);
      console.log(`📍 Joined ${spot.name} chat room`);
    }
  };

  // Leave spot chat when exiting a spot
  const leaveSpotChat = () => {
    if (socket && currentSpot) {
      socket.emit("leaveSpotChat");
      setCurrentSpot(null);
      setShowSpotChat(false);
      console.log(`📍 Left ${currentSpot.name} chat room`);
    }
  };

  // Close spot chat manually
  const closeSpotChat = () => {
    setShowSpotChat(false);
  };

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

    navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log("📍 User location updated:", latitude, longitude);
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, []);

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
          color: s.owner === "Love Mint Chocolate" ? "#10b981" : "#ef4444",
        },
      })),
    };

    console.log("📍 Spot GeoJSON:", geojson);

    // 기존 소스가 있으면 제거
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

    map.current.addLayer({
      id: "spot-symbols",
      type: "symbol",
      source: "spots",
      layout: {
        "icon-image": "marker-15",
        "icon-size": 1.3,
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-offset": [0, 1.2],
        "text-anchor": "top",
      },
      paint: { "text-color": "#111" },
    });

    // Popup - 투표 컴포넌트로 변경
    map.current.on("click", "spot-symbols", (e) => {
      const f = e.features[0];
      const { name, id } = f.properties;
      setSelectedBuilding({
        id: id,
        name: name,
      });
    });
  };

  // 반경 polygon layer 추가
  const addRadiusPolygons = () => {
    if (!map.current) {
      console.warn("Map not initialized yet, skipping radius polygons");
      return;
    }

    console.log("Adding radius polygons...");
    const radiusFeatures = spots.map((s) =>
      createCircle([s.lng, s.lat], s.radius)
    );

    map.current.addSource("spot-radius", {
      type: "geojson",
      data: { type: "FeatureCollection", features: radiusFeatures },
    });

    map.current.addLayer({
      id: "spot-radius-fill",
      type: "fill",
      source: "spot-radius",
      paint: {
        "fill-color": "#3b82f6",
        "fill-opacity": 0.1,
        "fill-outline-color": "#3b82f6",
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
    if (!userLocation || !socket) return;

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
      setCurrentSpot(enteredSpot);
      console.log(`📍 Entered ${enteredSpot.name} - Chat available`);
    }

    // Auto-leave spot chat if not in any spot
    if (!enteredSpot && currentSpot) {
      leaveSpotChat();
    }
  }, [userLocation, socket, currentSpot]);

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

      {/* Spot Chat Overlay */}
      {showSpotChat && currentSpot && (
        <SpotChat
          socket={socket}
          currentSpot={currentSpot}
          nickname={nickname}
          onClose={closeSpotChat}
        />
      )}

      {/* Current Spot Indicator */}
      {currentSpot && (
        <div className="current-spot-indicator">
          <div className="spot-indicator-content">
            <span className="spot-indicator-icon">📍</span>
            <span className="spot-indicator-text">
              You're at {currentSpot.name}
            </span>
            <button
              className="spot-chat-toggle"
              onClick={() => {
                if (!showSpotChat) {
                  joinSpotChat(currentSpot);
                } else {
                  setShowSpotChat(false);
                }
              }}
            >
              💬
            </button>
          </div>
        </div>
      )}
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

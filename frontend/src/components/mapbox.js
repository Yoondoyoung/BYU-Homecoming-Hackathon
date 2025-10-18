import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import io from "socket.io-client";
import SpotChat from "./SpotChat";
import VoteComponent from "./VoteComponent";
import "../styles/mapbox.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function MapBox() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarkerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentSpot, setCurrentSpot] = useState(null);
  const [socket, setSocket] = useState(null);
  const [nickname, setNickname] = useState('');
  const [showSpotChat, setShowSpotChat] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Spot data (BYU campus example)
  const [spots] = useState([
    {
      id: 1,
      name: "Harold B. Lee Library",
      lat: 40.2487,
      lng: -111.64929,
      radius: 70,
      owner: "Love Mint Chocolate",
    },
    {
      id: 2,
      name: "Wilkinson Center",
      lat: 40.2486,
      lng: -111.6474,
      radius: 90,
      owner: "Hate Mint Chocolate",
    },
    {
      id: 3,
      name: "Clyde Engineering Building",
      lat: 40.2467,
      lng: -111.648,
      radius: 80,
      owner: "Love Mint Chocolate",
    },
    {
      id: 5,
      name: "Talmage Math Sciences",
      lat: 40.2496,
      lng: -111.6508,
      radius: 60,
      owner: "Love Mint Chocolate",
    },
    {
      id: 6,
      name: "Eyring Science Center",
      lat: 40.24732,
      lng: -111.65031,
      radius: 65,
      owner: "Hate Mint Chocolate",
    },
    {
      id: 7,
      name: "Life Sciences Building",
      lat: 40.2450,
      lng: -111.6493,
      radius: 65,
      owner: "Love Mint Chocolate",
    },
    {
      id: 10,
      name: "Tanner Building",
      lat: 40.2504,
      lng: -111.6525,
      radius: 63,
      owner: "Hate Mint Chocolate",
    },
    {
      id: 11,
      name: "Joseph Smith Building",
      lat: 40.24588,
      lng: -111.65165,
      radius: 55,
      owner: "Love Mint Chocolate",
    },
    {
      id: 12,
      name: "Law School (Hunter Law Library)",
      lat: 40.2495,
      lng: -111.6453,
      radius: 75,
      owner: "Hate Mint Chocolate",
    },
  ]);

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

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io("http://localhost:4001");
    setSocket(newSocket);

    // Get nickname from user profile
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userNickname = user.nickname || user.name || 'Anonymous';
        setNickname(userNickname);
        newSocket.emit('setNickname', userNickname);
        console.log(`🎭 Using profile nickname: ${userNickname}`);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setNickname('Anonymous');
        newSocket.emit('setNickname', 'Anonymous');
      }
    } else {
      // Fallback if no user data
      setNickname('Anonymous');
      newSocket.emit('setNickname', 'Anonymous');
    }

    return () => newSocket.close();
  }, []);

  // Join spot chat when entering a spot
  const joinSpotChat = (spot) => {
    if (socket && nickname) {
      socket.emit('joinSpotChat', {
        spotId: spot.id,
        spotName: spot.name
      });
      setCurrentSpot(spot);
      setShowSpotChat(true);
      console.log(`📍 Joined ${spot.name} chat room`);
    }
  };

  // Leave spot chat when exiting a spot
  const leaveSpotChat = () => {
    if (socket && currentSpot) {
      socket.emit('leaveSpotChat');
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
      addSpotLayers();
      addRadiusPolygons();
    });

    navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, []);

  // Spot symbol layer 추가
  const addSpotLayers = () => {
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

    map.current.addSource("spots", { type: "geojson", data: geojson });

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
        name: name
      });
    });
  };

  // 반경 polygon layer 추가
  const addRadiusPolygons = () => {
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

  // Update user location using MapBox's built-in user location (most stable)
  useEffect(() => {
    if (!map.current || !userLocation) return;

    // Remove existing custom user location source and layers
    if (map.current.getSource('user-location')) {
      map.current.removeLayer('user-location-pulse');
      map.current.removeLayer('user-location-dot');
      map.current.removeSource('user-location');
    }

    // Create GeoJSON data for user location
    const userLocationGeoJSON = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [userLocation.lng, userLocation.lat]
        },
        properties: {
          id: 'user-location'
        }
      }]
    };

    // Add user location source
    map.current.addSource('user-location', {
      type: 'geojson',
      data: userLocationGeoJSON
    });

    // Add pulse ring layer (scales with zoom)
    map.current.addLayer({
      id: 'user-location-pulse',
      type: 'circle',
      source: 'user-location',
      paint: {
        'circle-radius': {
          'base': 1.75,
          'stops': [[12, 15], [22, 120]]
        },
        'circle-color': '#2563eb',
        'circle-opacity': 0.2,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#2563eb',
        'circle-stroke-opacity': 0.4
      }
    });

    // Add center dot layer (scales with zoom)
    map.current.addLayer({
      id: 'user-location-dot',
      type: 'circle',
      source: 'user-location',
      paint: {
        'circle-radius': {
          'base': 1.75,
          'stops': [[12, 6], [22, 10]]
        },
        'circle-color': '#2563eb',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 1
      }
    });

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
        console.log(`✅ ${spot.name} entry detected (distance: ${dist.toFixed(1)}m)`);
      }
    });
    
    // Auto-join spot chat if entered a new spot
    if (enteredSpot && (!currentSpot || currentSpot.id !== enteredSpot.id)) {
      joinSpotChat(enteredSpot);
    }
    
    // Auto-leave spot chat if not in any spot
    if (!enteredSpot && currentSpot) {
      leaveSpotChat();
    }
  }, [userLocation, socket, currentSpot]);

  return (
    <div className="map-wrapper">
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
              onClick={() => setShowSpotChat(!showSpotChat)}
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
          onClose={() => setSelectedBuilding(null)}
        />
      )}
    </div>
  );
}

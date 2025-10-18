import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "./mapbox.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function MapBox() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarkerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);

  // Spot 데이터 (BYU 캠퍼스 예시)
  const [spots] = useState([
    {
      id: 1,
      name: "Harold B. Lee Library",
      lat: 40.2487,
      lng: -111.64929,
      radius: 70,
      owner: "민초 좋아",
    },
    {
      id: 2,
      name: "Wilkinson Center",
      lat: 40.2486,
      lng: -111.6474,
      radius: 90,
      owner: "민초 싫어",
    },
    {
      id: 3,
      name: "Clyde Engineering Building",
      lat: 40.247,
      lng: -111.648,
      radius: 50,
      owner: "민초 좋아",
    },
    {
      id: 4,
      name: "Joseph Smith Building",
      lat: 40.2503,
      lng: -111.6497,
      radius: 60,
      owner: "민초 싫어",
    },
    {
      id: 5,
      name: "Talmage Math Sciences",
      lat: 40.2496,
      lng: -111.6508,
      radius: 60,
      owner: "민초 좋아",
    },
    {
      id: 6,
      name: "Eyring Science Center",
      lat: 40.249,
      lng: -111.651,
      radius: 60,
      owner: "민초 싫어",
    },
    {
      id: 7,
      name: "Life Sciences Building",
      lat: 40.2464,
      lng: -111.6487,
      radius: 70,
      owner: "민초 좋아",
    },
    {
      id: 8,
      name: "Kimball Tower",
      lat: 40.2499,
      lng: -111.6523,
      radius: 70,
      owner: "민초 싫어",
    },
    {
      id: 9,
      name: "Brimhall Building",
      lat: 40.2497,
      lng: -111.6471,
      radius: 55,
      owner: "민초 좋아",
    },
    {
      id: 10,
      name: "Tanner Building",
      lat: 40.2479,
      lng: -111.6545,
      radius: 85,
      owner: "민초 싫어",
    },
    {
      id: 11,
      name: "Harmon Building",
      lat: 40.247,
      lng: -111.653,
      radius: 55,
      owner: "민초 좋아",
    },
    {
      id: 12,
      name: "Law School (Hunter Law Library)",
      lat: 40.2509,
      lng: -111.6457,
      radius: 80,
      owner: "민초 싫어",
    },
    {
      id: 13,
      name: "Hinckley Center",
      lat: 40.2504,
      lng: -111.6469,
      radius: 60,
      owner: "민초 좋아",
    },
  ]);

  // 거리 계산 함수 (Haversine)
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
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      })
    );

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
          color: s.owner === "민초 좋아" ? "#10b981" : "#ef4444",
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

    // Popup
    map.current.on("click", "spot-symbols", (e) => {
      const f = e.features[0];
      const { name, owner } = f.properties;
      new mapboxgl.Popup({ offset: 15 })
        .setLngLat(f.geometry.coordinates)
        .setHTML(`<b>${name}</b><br/>현재 점령: ${owner}`)
        .addTo(map.current);
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

  // 유저 마커 갱신
  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const el = document.createElement("div");
    el.className = "user-marker";
    el.style.backgroundColor = "#2563eb";
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.borderRadius = "50%";
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";

    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);
  }, [userLocation]);

  // Spot 진입 감지
  useEffect(() => {
    if (!userLocation) return;
    spots.forEach((spot) => {
      const dist = getDistance(
        userLocation.lat,
        userLocation.lng,
        spot.lat,
        spot.lng
      );
      if (dist < spot.radius) {
        console.log(`✅ ${spot.name} 진입 감지 (거리: ${dist.toFixed(1)}m)`);
      }
    });
  }, [userLocation]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container-inner" />
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "./mapbox.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function MapBox() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  // 현재 위치
  const [userLocation, setUserLocation] = useState(null);
  
  // 툴팁 상태
  const [tooltip, setTooltip] = useState(null);
  
  // 마커 참조 저장
  const markersRef = useRef([]);

  // 스팟 데이터 (BYU 캠퍼스 정확한 위치)
  const [spots] = useState([
    { id: 1, name: "Harold B. Lee Library", lat: 40.2506, lng: -111.6490, radius: 30, owner: "민초 좋아" },
    { id: 2, name: "Wilkinson Student Center", lat: 40.2485, lng: -111.6478, radius: 35, owner: "민초 싫어" },
    { id: 3, name: "Marriott Center", lat: 40.2520, lng: -111.6510, radius: 40, owner: "민초 좋아" },
    { id: 4, name: "Tanner Building", lat: 40.2490, lng: -111.6500, radius: 25, owner: "민초 싫어" },
    { id: 5, name: "JFSB", lat: 40.2500, lng: -111.6480, radius: 30, owner: "민초 좋아" },
    { id: 6, name: "Campus Store", lat: 40.2480, lng: -111.6490, radius: 25, owner: "민초 싫어" },
  ]);

  // 거리 계산 함수 (Haversine)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // 현재 위치 감지
  useEffect(() => {
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-111.6495, 40.2500], // BYU 캠퍼스 중심
        zoom: 15,
      });

      map.current.addControl(new mapboxgl.NavigationControl());
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }));
    }

    navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude, accuracy });
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, []);

  // Spot 및 반경 감지
  useEffect(() => {
    if (!map.current || !userLocation) return;

    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 기존 원 제거
    if (map.current.getSource('user-location-circle')) {
      map.current.removeLayer('user-location-circle');
      map.current.removeSource('user-location-circle');
    }

    // 사용자 마커 (더 큰 크기)
    const userMarker = new mapboxgl.Marker({ 
      color: "#2563eb",
      scale: 1.2
    })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);
    
    markersRef.current.push(userMarker);

    // 사용자 위치 반경 원 추가
    map.current.addSource('user-location-circle', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [userLocation.lng, userLocation.lat]
        },
        properties: {}
      }
    });

    // 반경 원 레이어 추가
    map.current.addLayer({
      id: 'user-location-circle',
      type: 'circle',
      source: 'user-location-circle',
      paint: {
        'circle-radius': {
          stops: [
            [0, 0],
            [20, 20]
          ],
          base: 2
        },
        'circle-color': '#2563eb',
        'circle-opacity': 0.2,
        'circle-stroke-color': '#2563eb',
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 0.8
      }
    });

    // 각 Spot 마커 표시
    spots.forEach((spot) => {
      const color = spot.owner === "민초 좋아" ? "#10b981" : "#ef4444";
      
      console.log(`Adding marker for ${spot.name} at [${spot.lng}, ${spot.lat}]`);

      const marker = new mapboxgl.Marker({ color })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map.current);

      // 마커를 참조 배열에 추가
      markersRef.current.push(marker);

      // 마커 클릭 이벤트 추가
      const markerElement = marker.getElement();
      markerElement.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = markerElement.getBoundingClientRect();
        const mapRect = mapContainer.current.getBoundingClientRect();
        
        setTooltip({
          spot: spot,
          position: {
            x: rect.left - mapRect.left + rect.width / 2,
            y: rect.top - mapRect.top - 10
          }
        });
      });

      // Spot 반경 원 추가
      const spotSourceId = `spot-${spot.id}-circle`;
      const spotLayerId = `spot-${spot.id}-circle`;
      
      if (map.current.getSource(spotSourceId)) {
        map.current.removeLayer(spotLayerId);
        map.current.removeSource(spotSourceId);
      }

      console.log(`Adding circle for ${spot.name} at [${spot.lng}, ${spot.lat}]`);
      
      map.current.addSource(spotSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [spot.lng, spot.lat]
          },
          properties: {}
        }
      });

      map.current.addLayer({
        id: spotLayerId,
        type: 'circle',
        source: spotSourceId,
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, spot.radius]
            ],
            base: 2
          },
          'circle-color': color,
          'circle-opacity': 0.1,
          'circle-stroke-color': color,
          'circle-stroke-width': 2,
          'circle-stroke-opacity': 0.6
        }
      });

      // Spot 진입 감지
      const dist = getDistance(userLocation.lat, userLocation.lng, spot.lat, spot.lng);
      if (dist < spot.radius) {
        console.log(`✅ ${spot.name} 진입 감지 (거리: ${dist.toFixed(1)}m)`);
      }
    });
  }, [userLocation, spots]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container-inner" />
      
      {/* 커스텀 툴팁 */}
      {tooltip && (
        <div 
          className="custom-tooltip"
          style={{
            left: tooltip.position.x,
            top: tooltip.position.y,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="tooltip-content">
            <h3>{tooltip.spot.name}</h3>
            <p><strong>현재 점령:</strong> {tooltip.spot.owner}</p>
            <p><strong>반경:</strong> {tooltip.spot.radius}m</p>
          </div>
          <button 
            className="tooltip-close"
            onClick={() => setTooltip(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
import { View, Text, Linking, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import color from "@/themes/AppColors";
import { Gps, LocationIcon } from "@/utils/icons";
import fonts from "@/themes/AppFonts";
import { useGetUserData } from "@/hooks/useGetUserData";
import * as Location from "expo-location";
import { calculateDistance } from "@/utils/distance";
import { Toast } from "react-native-toast-notifications";

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function RideDetailsScreen() {
  const { orderData: orderDataObj } = useLocalSearchParams() as any;
  const orderData = JSON.parse(orderDataObj);
  const { user } = useGetUserData();
  const ws = useRef<any>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(orderData?.currentLocation);
  const [userLocation, setUserLocation] = useState(orderData?.currentLocation);
  const [marker, setMarker] = useState(orderData?.marker);
  const [driver, setDriver] = useState(orderData?.driver);
  const [driverLocation, setDriverLocation] = useState<Coordinate | null>(null);
  const [driverHeading, setDriverHeading] = useState(0); // Góc hướng di chuyển của tài xế (0-360 độ)
  const [distanceToDriver, setDistanceToDriver] = useState('');
  const [rideStatus, setRideStatus] = useState("Processing");
  const [eta, setEta] = useState(driver?.estimatedArrival || "10 phút");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [requestId, setRequestId] = useState(orderData?.requestId || null);
  const [showPickupLine, setShowPickupLine] = useState(true);
  const [showDestinationLine, setShowDestinationLine] = useState(false);

  const [region, setRegion] = useState(() => {
    if (orderData?.currentLocation && orderData?.marker) {
      const currentLoc = orderData.currentLocation;
      const destMarker = orderData.marker;

      const latDelta = Math.abs(destMarker.latitude - currentLoc.latitude) * 1.5;
      const lngDelta = Math.abs(destMarker.longitude - currentLoc.longitude) * 1.5;

      return {
        latitude: (destMarker.latitude + currentLoc.latitude) / 2,
        longitude: (destMarker.longitude + currentLoc.longitude) / 2,
        latitudeDelta: Math.max(0.01, latDelta),
        longitudeDelta: Math.max(0.01, lngDelta),
      };
    } else if (orderData?.currentLocation) {
      return {
        latitude: orderData.currentLocation.latitude,
        longitude: orderData.currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    } else if (orderData?.marker) {
      return {
        latitude: orderData.marker.latitude,
        longitude: orderData.marker.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 21.0278,
      longitude: 105.8342,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        setIsLoadingLocation(false);
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        setIsLoadingLocation(false);
      } catch (error) {
        console.log("Error getting location:", error);
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  const initializeWebSocket = () => {
    ws.current = new WebSocket(process.env.EXPO_PUBLIC_WEBSOCKET_URI!);

    ws.current.onopen = () => {
      console.log("Connected to WebSocket server");
      setWsConnected(true);

      if (user && user.id) {
        try {
          ws.current.send(
            JSON.stringify({
              type: "userConnect",
              userId: user.id,
            })
          );

          if (driver && driver.id) {
            ws.current.send(
              JSON.stringify({
                type: "subscribeToDriverLocation",
                driverId: driver.id,
                rideId: orderData?.rideData?.id || null
              })
            );
          }
        } catch (error) {
          console.error("Error sending WebSocket message:", error);
        }
      }
    };

    ws.current.onmessage = (e: any) => {
      try {
        const data = JSON.parse(e.data);
        console.log("Received message:", data.type);

        if (data.type === "driverLocationUpdate") {
          const newDriverLocation = {
            latitude: data.data.latitude,
            longitude: data.data.longitude,
          };
          
          setDriverLocation(newDriverLocation);
          
          // Cập nhật hướng di chuyển nếu có
          if (data.data.heading !== undefined) {
            setDriverHeading(data.data.heading);
          }
          
          if (userLocation) {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              newDriverLocation.latitude,
              newDriverLocation.longitude
            );
            setDistanceToDriver(`${distance.toFixed(2)} km`);
          }
          
          const bounds = getBoundsForCoordinates([
            userLocation || orderData.currentLocation,
            newDriverLocation,
            marker
          ]);
          
          setRegion(bounds);
          
          // Cập nhật hiển thị đường đi dựa trên trạng thái nếu trước đó chưa có vị trí tài xế
          if (!driverLocation && rideStatus === "Processing") {
            setShowPickupLine(true);
            setShowDestinationLine(false);
          } else if (!driverLocation && rideStatus === "in_progress") {
            setShowPickupLine(false);
            setShowDestinationLine(true);
          }
        }
        else if (data.type === "rideStatusUpdate") {
          setRideStatus(data.status);

          if (data.status === "in_progress") {
            setEta(data.estimatedArrival || "Đang di chuyển");
            // Khi chuyển sang trạng thái đang đi, hiển thị line từ người dùng đến điểm đến
            setShowPickupLine(false);
            setShowDestinationLine(true);
          } else if (data.status === "completed") {
            setEta("Đã hoàn thành");
          }
        }
      } catch (error) {
        console.log("Failed to parse WebSocket message:", error);
      }
    };

    ws.current.onerror = (e: any) => {
      console.log("WebSocket error:", e.message);
    };

    ws.current.onclose = (e: any) => {
      console.log("WebSocket closed:", e.code, e.reason);
      setWsConnected(false);
      
      // Chỉ kết nối lại nếu component vẫn còn tồn tại
      setTimeout(() => {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
          initializeWebSocket();
        }
      }, 5000);
    };
  };

  useEffect(() => {
    initializeWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

 

  const getBoundsForCoordinates = (coordinates: (Coordinate | null | undefined)[]): Region => {
    const validCoordinates = coordinates.filter(
      (coord): coord is Coordinate => coord !== null && coord !== undefined && coord.latitude !== undefined && coord.longitude !== undefined
    );

    if (validCoordinates.length === 0) {
      return region;
    }

    let minLat = validCoordinates[0].latitude;
    let maxLat = validCoordinates[0].latitude;
    let minLng = validCoordinates[0].longitude;
    let maxLng = validCoordinates[0].longitude;

    validCoordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    const latDelta = (maxLat - minLat) * 1.5;
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, latDelta),
      longitudeDelta: Math.max(0.01, lngDelta),
    };
  };

  const handleRegionChangeComplete = (newRegion: any) => {
    const isSignificantChange =
      Math.abs(newRegion.latitude - region.latitude) > 0.01 ||
      Math.abs(newRegion.longitude - region.longitude) > 0.01;

    if (isSignificantChange) {
      setRegion(newRegion);
    }
  };

  const handleCancelRide = () => {
    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN && user?.id) {
        ws.current.send(
          JSON.stringify({
            type: "cancelRideRequest",
            userId: user.id,
            driverId: driver?.id,
            requestId: requestId || Date.now().toString(),
          })
        );
        
        Toast.show("Đã hủy chuyến đi", {
          type: "success",
          placement: "bottom",
          duration: 3000
        });
        
        router.back();
      } else {
        console.log("WebSocket không sẵn sàng hoặc đã đóng");
        // Vẫn cho phép người dùng quay lại màn hình trước
        router.back();
      }
    } catch (error) {
      console.error("Lỗi khi hủy chuyến đi:", error);
      router.back();
    }
  };

  const formatRideStatus = (status: string) => {
    switch (status) {
      case "Processing":
        return "Tài xế đang đến đón bạn";
      case "in_progress":
        return "Đang di chuyển";
      case "completed":
        return "Chuyến đi đã hoàn thành";
      default:
        return "Đang xử lý";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Processing":
        return "#FFA500";
      case "in_progress":
        return "#007AFF";
      case "completed":
        return "#4CD964";
      default:
        return "#FFA500";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {isLoadingLocation ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={color.primary} />
            <Text style={styles.loadingText}>Đang xác định vị trí...</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={handleRegionChangeComplete}
          >
            {userLocation && (
              <Marker 
                coordinate={userLocation}
                title="Vị trí của bạn"
                pinColor="#5856D6"
              />
            )}
            
            {marker && (
              <Marker
                coordinate={marker}
                title="Điểm đến"
                pinColor="#FF3B30"
              />
            )}
            
            {driverLocation && (
              <Marker 
                coordinate={driverLocation}
                title="Vị trí tài xế"
                rotation={driverHeading} // Quay marker theo hướng di chuyển
                anchor={{x: 0.5, y: 0.5}} // Điểm neo ở giữa hình ảnh
              >
                <Image 
                  source={require('@/assets/icons/vehicle/car-arrow.svg')}
                  style={{width: 32, height: 32}}
                  resizeMode="contain"
                />
              </Marker>
            )}
            
            {driverLocation && userLocation && showPickupLine && rideStatus === "Processing" && (
              <MapViewDirections
                origin={driverLocation}
                destination={userLocation}
                apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
                strokeWidth={4}
                strokeColor="#007AFF"
                lineDashPattern={[0]}
              />
            )}
            
            {userLocation && marker && showDestinationLine && rideStatus === "in_progress" && (
              <MapViewDirections
                origin={userLocation}
                destination={marker}
                apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
                strokeWidth={4}
                strokeColor="#FF3B30"
                lineDashPattern={[0]}
              />
            )}
          </MapView>
        )}
      </View>

      <ScrollView style={styles.detailsContainer}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Trạng thái:</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(rideStatus) },
            ]}
          >
            <Text style={styles.statusText}>{formatRideStatus(rideStatus)}</Text>
          </View>
        </View>

        {driverLocation && distanceToDriver && rideStatus === "Processing" && (
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceLabel}>Khoảng cách đến tài xế:</Text>
            <Text style={styles.distanceValue}>{distanceToDriver}</Text>
          </View>
        )}

        <View style={styles.routeInfoContainer}>
          <Text style={styles.routeInfoTitle}>Thông tin chuyến đi:</Text>
          
          <View style={styles.locationContainer}>
            <View style={styles.leftView}>
              <LocationIcon color={color.regularText} />
              <View style={styles.verticaldot} />
              <Gps colors={color.regularText} />
            </View>
            <View style={styles.rightView}>
              <Text style={styles.pickupPoint}>
                {orderData?.currentLocationName || "Điểm đón"}
              </Text>
              <View style={styles.border} />
              <Text style={styles.destinationPoint}>
                {orderData?.destinationLocationName || "Điểm đến"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tripDetailsContainer}>
          <Text style={styles.sectionTitle}>Chi tiết chuyến đi</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Khoảng cách:</Text>
            <Text style={styles.infoValue}>{orderData?.distance?.toFixed(2) || "N/A"} km</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian đến:</Text>
            <Text style={styles.infoValue}>{eta}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Giá cước:</Text>
            <Text style={styles.fareValue}>{(orderData.distance * parseInt(driver?.rate || "10000")).toFixed(2)} VND</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Chi tiết tài xế</Text>

        <View style={styles.driverInfoContainer}>
          <Text style={styles.driverInfoText}>
            Tên tài xế: {driver?.name || "Đang cập nhật"}
          </Text>

          {driver?.phone_number && (
            <View style={styles.phoneContainer}>
              <Text style={styles.driverInfoText}>Số điện thoại:</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${driver.phone_number}`)}
              >
                <Text style={styles.phoneNumber}>{driver.phone_number}</Text>
              </TouchableOpacity>
            </View>
          )}

          {driver?.vehicleType && (
            <Text style={styles.driverInfoText}>
              Phương tiện: {driver.vehicleType}
              {driver.vehicle_color && ` - Màu ${driver.vehicle_color}`}
            </Text>
          )}

          {driver?.vehiclePlateNumber && (
            <Text style={styles.driverInfoText}>
              Biển số xe: {driver.vehiclePlateNumber}
            </Text>
          )}
        </View>

        {rideStatus === "Processing" && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
            <Text style={styles.cancelButtonText}>Hủy chuyến đi</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    height: windowHeight(300),
    width: "100%",
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: fontSizes.FONT16,
    color: color.regularText,
  },
  detailsContainer: {
    flex: 1,
    padding: windowWidth(20),
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: windowHeight(15),
  },
  statusLabel: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
    color: color.regularText,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontFamily: fonts.medium,
    fontSize: fontSizes.FONT14,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: windowHeight(15),
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 10,
  },
  distanceLabel: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.regular,
    color: color.regularText,
  },
  distanceValue: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.bold,
    color: color.primary,
    marginLeft: 5,
  },
  routeInfoContainer: {
    marginBottom: windowHeight(20),
  },
  routeInfoTitle: {
    fontSize: fontSizes.FONT18,
    fontFamily: fonts.medium,
    color: color.regularText,
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    paddingBottom: windowHeight(10),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  leftView: {
    marginRight: windowWidth(10),
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verticaldot: {
    borderLeftWidth: 1,
    borderStyle: "dashed",
    height: windowHeight(30),
    marginVertical: 5,
    borderColor: color.border,
  },
  rightView: {
    flex: 1,
  },
  pickupPoint: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.regular,
    color: color.regularText,
    marginBottom: 5,
  },
  border: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: color.border,
    marginVertical: 5,
  },
  destinationPoint: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.regular,
    color: color.regularText,
    marginTop: 10,
  },
  tripDetailsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: windowHeight(20),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.regular,
    color: '#555',
  },
  infoValue: {
    fontSize: fontSizes.FONT14,
    fontFamily: fonts.medium,
    color: color.regularText,
  },
  fareValue: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.bold,
    color: color.primary,
  },
  sectionTitle: {
    fontSize: fontSizes.FONT20,
    fontFamily: fonts.medium,
    color: color.regularText,
    marginBottom: windowHeight(10),
  },
  driverInfoContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: windowHeight(20),
  },
  driverInfoText: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.regular,
    color: color.regularText,
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
    color: color.primary,
    marginLeft: 5,
    textDecorationLine: "underline",
  },
  cancelButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  cancelButtonText: {
    color: "white",
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
  }
});
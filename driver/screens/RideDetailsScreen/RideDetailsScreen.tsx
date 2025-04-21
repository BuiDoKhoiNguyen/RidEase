import { View, Text, Linking, TouchableOpacity, Image } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import color from "@/themes/AppColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Toast } from "react-native-toast-notifications";
import * as Location from "expo-location";

export default function RideDetailsScreen() {
  const { orderData: orderDataObj } = useLocalSearchParams() as any;
  const [orderStatus, setorderStatus] = useState("Processing");
  const orderData = JSON.parse(orderDataObj);
  const [region, setRegion] = useState<any>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [driverHeading, setDriverHeading] = useState(0); // Góc hướng di chuyển của tài xế (0-360 độ)
  const [pickupLocation, setPickupLocation] = useState<any>(orderData?.currentLocation);
  const [destinationLocation, setDestinationLocation] = useState<any>(orderData?.marker);
  const [showPickupLine, setShowPickupLine] = useState(true);
  const [showDestinationLine, setShowDestinationLine] = useState(false);
  const mapRef = useRef(null);
  const [requestId, setRequestId] = useState(orderData?.requestId || null);
  const ws = useRef<any>(null);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Khởi tạo vị trí hiện tại của tài xế
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show("Vui lòng cấp quyền vị trí để sử dụng tính năng này");
        return;
      }

      // Theo dõi vị trí và hướng di chuyển của tài xế theo thời gian thực
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Cập nhật mỗi 1 giây
          distanceInterval: 5, // Hoặc khi di chuyển 5m
        },
        (location) => {
          const currentDriverLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          // Cập nhật vị trí và hướng di chuyển
          setDriverLocation(currentDriverLocation);
          
          // Cập nhật hướng di chuyển (heading 0-360 độ)
          if (location.coords.heading !== null) {
            setDriverHeading(location.coords.heading);
          }
          
          // Cập nhật region nếu cần thiết
          if (pickupLocation && showPickupLine) {
            const newRegion = getRegionForCoordinates([
              currentDriverLocation,
              pickupLocation,
            ]);
            setRegion(newRegion);
          } else if (destinationLocation && showDestinationLine) {
            const newRegion = getRegionForCoordinates([
              currentDriverLocation,
              destinationLocation,
            ]);
            setRegion(newRegion);
          }
        }
      );
    })();
  }, [pickupLocation, destinationLocation, showPickupLine, showDestinationLine]);

  useEffect(() => {
    if (orderData?.currentLocation && orderData?.marker) {
      setPickupLocation(orderData.currentLocation);
      setDestinationLocation(orderData.marker);
      setorderStatus(orderData.rideData.status);
    }
  }, [orderData]);

  const initializeWebSocket = () => {
    ws.current = new WebSocket(process.env.EXPO_PUBLIC_WEBSOCKET_URI!);
    
    ws.current.onopen = () => {
      console.log("Connected to WebSocket server");
      setWsConnected(true);

      // Chỉ gửi khi kết nối đã thực sự mở
      if (orderData?.driver?.id) {
        try {
          ws.current.send(JSON.stringify({
            type: "driverConnect",
            driverId: orderData.driver.id
          }));
        } catch (error) {
          console.error("Error sending driver connection message:", error);
        }
      }
    };

    ws.current.onclose = (e) => {
      console.log(`WebSocket closed: ${e.code} - ${e.reason}`);
      setWsConnected(false);
      
      // Đợi vài giây trước khi kết nối lại
      setTimeout(() => {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
          initializeWebSocket();
        }
      }, 5000);
    };
    
    ws.current.onerror = (e) => {
      console.error("WebSocket error:", e);
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

  const getRegionForCoordinates = (points) => {
    // Lọc các điểm không hợp lệ
    const validPoints = points.filter(point => point && point.latitude && point.longitude);
    
    if (validPoints.length === 0) {
      return region;
    }
    
    let minLat = validPoints[0].latitude;
    let maxLat = validPoints[0].latitude;
    let minLng = validPoints[0].longitude;
    let maxLng = validPoints[0].longitude;

    // Tìm min và max cho latitude và longitude
    validPoints.forEach(point => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    const latDelta = (maxLat - minLat) * 1.5; // Thêm padding 50%
    const lngDelta = (maxLng - minLng) * 1.5;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.01, latDelta),
      longitudeDelta: Math.max(0.01, lngDelta),
    };
  };

  // Xử lý khi đã đến điểm đón và pickup hành khách
  const handlePickupPassenger = async () => {
    const accessToken = await AsyncStorage.getItem("accessToken");
    await axios
      .put(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/update-ride-status`,
        {
          rideStatus: "Ongoing",
          rideId: orderData?.rideData.id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      .then((res) => {
        setorderStatus("Ongoing");
        setShowPickupLine(false);
        setShowDestinationLine(true);
        Toast.show("Chuyến đi đã bắt đầu!", {
          type: "success",
        });
        
        // Gửi thông báo đã đón khách qua WebSocket
        if (wsConnected && requestId) {
          ws.current.send(JSON.stringify({
            type: "startRide",
            role: "driver",
            requestId: requestId,
            rideId: orderData?.rideData.id,
            driverId: orderData?.driver?.id,
            status: "in_progress"
          }));
        }
        
        // Cập nhật region để hiển thị đường đi từ vị trí hiện tại đến điểm đến
        const newRegion = getRegionForCoordinates([
          driverLocation,
          destinationLocation
        ]);
        setRegion(newRegion);
      })
      .catch((error) => {
        console.log(error);
        Toast.show("Có lỗi xảy ra, vui lòng thử lại", {
          type: "danger",
        });
      });
  };

  // Xử lý khi đã đến điểm đến và hoàn thành chuyến đi
  const handleCompleteRide = async () => {
    const accessToken = await AsyncStorage.getItem("accessToken");
    await axios
      .put(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/update-ride-status`,
        {
          rideStatus: "Completed",
          rideId: orderData?.rideData.id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      .then((res) => {
        setorderStatus("Completed");
        Toast.show(`Chuyến đi hoàn thành thành công!`, {
          type: "success",
        });
        
        // Gửi thông báo hoàn thành chuyến đi qua WebSocket
        if (wsConnected && requestId) {
          ws.current.send(JSON.stringify({
            type: "completeRide",
            role: "driver",
            requestId: requestId,
            rideId: orderData?.rideData.id,
            driverId: orderData?.driver?.id,
            fare: (orderData.distance * parseInt(orderData?.driver?.rate)).toFixed(2)
          }));
        }
        
        // Trở về màn hình chính sau 2 giây
        setTimeout(() => {
          router.push("/(tabs)/home");
        }, 2000);
      })
      .catch((error) => {
        console.log(error);
        Toast.show("Có lỗi xảy ra, vui lòng thử lại", {
          type: "danger",
        });
      });
  };

  return (
    <View>
      <View style={{ height: windowHeight(480) }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          region={region}
          onRegionChangeComplete={(region) => setRegion(region)}
        >
          {/* Vị trí điểm đón */}
          {pickupLocation && (
            <Marker 
              coordinate={pickupLocation} 
              pinColor="#5856D6" 
              title="Điểm đón khách"
            />
          )}
          
          {/* Vị trí điểm đến */}
          {destinationLocation && (
            <Marker 
              coordinate={destinationLocation} 
              pinColor="#FF3B30"  
              title="Điểm đến"
            />
          )}
          
          {/* Vị trí tài xế với mũi tên chỉ hướng */}
          {driverLocation && (
            <Marker 
              coordinate={driverLocation}
              title="Vị trí của bạn"
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
          
          {/* Đường line từ tài xế đến điểm đón */}
          {showPickupLine && driverLocation && pickupLocation && (
            <MapViewDirections
              origin={driverLocation}
              destination={pickupLocation}
              apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
              strokeWidth={4}
              strokeColor="#007AFF"
            />
          )}
          
          {/* Đường line từ điểm đón đến điểm đến */}
          {showDestinationLine && pickupLocation && destinationLocation && (
            <MapViewDirections
              origin={pickupLocation}
              destination={destinationLocation}
              apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
              strokeWidth={4}
              strokeColor="#FF3B30"
            />
          )}
        </MapView>
      </View>
      <View style={{ padding: windowWidth(50) }}>
        <Text
          style={{
            fontSize: fontSizes.FONT20,
            fontWeight: "500",
            paddingVertical: windowHeight(5),
          }}
        >
          Tên hành khách: {orderData?.user?.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              fontSize: fontSizes.FONT20,
              fontWeight: "500",
              paddingVertical: windowHeight(5),
            }}
          >
            Số điện thoại:
          </Text>
          <Text
            style={{
              color: color.buttonBg,
              paddingLeft: 5,
              fontSize: fontSizes.FONT20,
              fontWeight: "500",
              paddingVertical: windowHeight(5),
            }}
            onPress={() =>
              Linking.openURL(`tel:${orderData?.user?.phone_number}`)
            }
          >
            {orderData?.user?.phone_number}
          </Text>
        </View>
        <Text
          style={{
            fontSize: fontSizes.FONT20,
            fontWeight: "500",
            paddingVertical: windowHeight(5),
          }}
        >
          Số tiền thanh toán:{" "}
          {(orderData.distance * parseInt(orderData?.driver?.rate)).toFixed(2)}{" "}
          VND
        </Text>

        <View style={{ paddingTop: windowHeight(10) }}>
          {/* Nút Đã đón khách - hiển thị khi đang trong trạng thái "Processing" */}
          {orderStatus === "Processing" && (
            <TouchableOpacity
              style={{
                height: windowHeight(40),
                backgroundColor: color.bgDark,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 10,
              }}
              onPress={handlePickupPassenger}
            >
              <Text style={{ color: "white", fontSize: fontSizes.FONT16 }}>
                Đã đón khách
              </Text>
            </TouchableOpacity>
          )}

          {/* Nút Hoàn thành chuyến đi - hiển thị khi đang trong trạng thái "Ongoing" */}
          {orderStatus === "Ongoing" && (
            <TouchableOpacity
              style={{
                height: windowHeight(40),
                backgroundColor: "#4CD964",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={handleCompleteRide}
            >
              <Text style={{ color: "white", fontSize: fontSizes.FONT16 }}>
                Hoàn thành chuyến đi
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

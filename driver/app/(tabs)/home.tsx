import {
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import Header from "@/components/common/Header";
import { recentRidesData, rideData } from "@/configs/constants";
import { useTheme } from "@react-navigation/native";
import RenderRideItem from "@/components/ride/RenderRideItem";
import { external } from "@/styles/external.style";
import RideCard from "@/components/ride/RideCard";
import MapView, { Marker, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import { Gps, Location } from "@/utils/icons";
import color from "@/themes/AppColors";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as GeoLocation from "expo-location";
import { Toast } from "react-native-toast-notifications";
import { useGetDriverData } from "@/hooks/useGetDriverData";
import { router } from "expo-router";
import fonts from "@/themes/AppFonts";

export default function HomeScreen() {
  const { driver, loading: DriverDataLoading } = useGetDriverData();
  const [userData, setUserData] = useState<any>(null);
  const [isOn, setIsOn] = useState<any>();
  const [loading, setloading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [region, setRegion] = useState<any>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [currentLocationName, setcurrentLocationName] = useState("");
  const [destinationLocationName, setdestinationLocationName] = useState("");
  const [distance, setdistance] = useState<any>();
  const [wsConnected, setWsConnected] = useState(false);
  const [marker, setMarker] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [lastLocation, setLastLocation] = useState<any>(null);
  const [recentRides, setrecentRides] = useState([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const ws = useRef<any>(null);
  const { colors } = useTheme();

  // Kết nối WebSocket khi mở app
  const initializeWebSocket = () => {
    // Ngăn khởi tạo nhiều kết nối WebSocket
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      return;
    }
    
    ws.current = new WebSocket(process.env.EXPO_PUBLIC_WEBSOCKET_URI!);
    
    ws.current.onopen = () => {
      console.log("Connected to WebSocket server");
      setWsConnected(true);

      // Gửi thông tin kết nối tài xế khi mở kết nối
      if (driver && driver.id) {
        try {
          ws.current.send(JSON.stringify({
            type: "driverConnect",
            driverId: driver.id
          }));
        } catch (error) {
          console.log("Error sending driver connection:", error);
        }
      }
    };

    interface RideRequestMessage {
      type: "rideRequest";
      requestId: string;
      pickupLocation: {
      latitude: number;
      longitude: number;
      locationName?: string;
      };
      destination: {
      latitude: number;
      longitude: number;
      locationName?: string;
      };
      distance: number;
      userId: string;
      userName: string;
    }

    interface RideCancelledMessage {
      type: "rideCancelled";
      requestId: string;
    }

    type WebSocketMessage = RideRequestMessage | RideCancelledMessage;

    ws.current.onmessage = (e: MessageEvent) => {
      try {
      const message: WebSocketMessage = JSON.parse(e.data);
      console.log("Received message:", message.type);
      
      // Xử lý thông báo yêu cầu chuyến đi mới
      if (message.type === "rideRequest") {
        setIsModalVisible(true);
        setRequestId(message.requestId);
        
        const pickupLocation = message.pickupLocation;
        const destination = message.destination;
        
        setCurrentLocation({
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        });
        
        setMarker({
        latitude: destination.latitude,
        longitude: destination.longitude,
        });
        
  
        const latDelta = Math.abs(pickupLocation.latitude - destination.latitude);
        const lngDelta = Math.abs(pickupLocation.longitude - destination.longitude);
        
        // Thêm padding để hiển thị đẹp hơn
        const padding = 1.5; // Đệm 50% mỗi bên
        
        setRegion({
        latitude: (pickupLocation.latitude + destination.latitude) / 2,
        longitude: (pickupLocation.longitude + destination.longitude) / 2,
        latitudeDelta: Math.max(0.01, latDelta * padding), // Đảm bảo không zoom quá gần
        longitudeDelta: Math.max(0.01, lngDelta * padding),
        });
        
        setdistance(message.distance);
        setcurrentLocationName(pickupLocation.locationName || "Vị trí hiện tại");
        setdestinationLocationName(destination.locationName || "Điểm đến");
        setUserData({ id: message.userId, name: message.userName });
      }
      
      // Xử lý khi người dùng hủy chuyến đi
      else if (message.type === "rideCancelled") {
        if (isModalVisible && requestId === message.requestId) {
        setIsModalVisible(false);
        Toast.show("Người dùng đã hủy yêu cầu chuyến đi", {
          type: "warning",
          placement: "bottom",
        });
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
      // Không tự động khởi tạo lại ở đây, sẽ được xử lý trong useEffect có theo dõi isMounted
    };
  };

  useEffect(() => {
    // Cờ để theo dõi component có đang mounted hay không
    let isMounted = true;
    
    const connect = () => {
      initializeWebSocket();
      // Chỉ thiết lập lại kết nối khi component còn mounted
      if (isMounted && ws.current) {
        ws.current.onclose = (e: any) => {
          console.log("WebSocket closed:", e.code, e.reason);
          if (isMounted) {
            setWsConnected(false);
            
            // Chỉ cố gắng kết nối lại nếu component vẫn mounted
            setTimeout(() => {
              if (isMounted) {
                connect();
              }
            }, 5000);
          }
        };
      }
    };
    
    connect();
    
    // Cleanup function để đóng kết nối khi unmount và tránh gọi lại
    return () => {
      isMounted = false;
      if (ws.current) {
        // Ghi đè onclose để tránh kết nối lại sau khi unmount
        ws.current.onclose = () => {}; 
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (wsConnected && driver && driver.id) {
      ws.current.send(JSON.stringify({
        type: "driverConnect",
        driverId: driver.id
      }));
    }
  }, [driver, wsConnected]);

  useEffect(() => {
    const fetchStatus = async () => {
      const status: any = await AsyncStorage.getItem("status");
      setIsOn(status === "active" ? true : false);
    };
    fetchStatus();
  }, []);

  const haversineDistance = (coords1: any, coords2: any) => {
    const toRad = (x: any) => (x * Math.PI) / 180;

    const R = 6371e3; // Radius of the Earth in meters
    const lat1 = toRad(coords1.latitude);
    const lat2 = toRad(coords2.latitude);
    const deltaLat = toRad(coords2.latitude - coords1.latitude);
    const deltaLon = toRad(coords2.longitude - coords1.longitude);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    return distance;
  };

  const sendLocationUpdate = async (location: any) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      
      // Kiểm tra WS đã kết nối trước khi gửi dữ liệu
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        console.log("WebSocket not ready, cannot send location update");
        return;
      }
      
      const res = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_URI}/driver/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (res.data && res.data.driver && res.data.driver.id) {
        const message = JSON.stringify({
          type: "locationUpdate",
          data: location,
          role: "driver",
          driver: res.data.driver.id,
        });
        ws.current.send(message);
      }
    } catch (error) {
      console.log("Error sending location update:", error);
    }
  };

  useEffect(() => {
    // Biến theo dõi trạng thái hoạt động của effect
    let isActive = true;
    let locationSubscription: GeoLocation.LocationSubscription;
    
    const startLocationTracking = async () => {
      let { status } = await GeoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show("Please give us to access your location to use this app!");
        return;
      }

      locationSubscription = await GeoLocation.watchPositionAsync(
        {
          accuracy: GeoLocation.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        async (position) => {
          // Chỉ tiếp tục nếu effect vẫn hoạt động
          if (!isActive) return;
          
          const { latitude, longitude, heading } = position.coords;
          const newLocation = { latitude, longitude, heading };
          
          if (
            !lastLocation ||
            haversineDistance(lastLocation, newLocation) > 200
          ) {
            // Cập nhật state chỉ khi component còn mounted
            setCurrentLocation(newLocation);
            setLastLocation(newLocation);
            
            // Giới hạn tần suất gửi cập nhật vị trí, tránh gọi quá nhiều lần
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
              try {
                await sendLocationUpdate(newLocation);
              } catch (err) {
                console.log("Error in location update:", err);
              }
            }
          }
        }
      );
    };
    
    startLocationTracking();
    
    // Cleanup function để hủy theo dõi vị trí khi unmount
    return () => {
      isActive = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const getRecentRides = async () => {
    const accessToken = await AsyncStorage.getItem("accessToken");
    const res = await axios.get(
      `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/get-rides`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    setrecentRides(res.data.rides);
  };

  useEffect(() => {
    getRecentRides();
  }, []);

  const handleClose = () => {
    if (!requestId) return;
    
    // Thông báo từ chối chuyến đi đến người dùng
    if (wsConnected) {
      ws.current.send(JSON.stringify({
        type: "rejectRide",
        role: "driver",
        requestId: requestId,
        driverId: driver?.id
      }));
    }
    
    setIsModalVisible(false);
  };

  const handleStatusChange = async () => {
    if (!loading) {
      setloading(true);
      const accessToken = await AsyncStorage.getItem("accessToken");
      const changeStatus = await axios.put(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/update-status`,
        {
          status: !isOn ? "active" : "inactive",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (changeStatus.data) {
        setIsOn(!isOn);
        await AsyncStorage.setItem("status", changeStatus.data.driver.status);
        
        // Cập nhật trạng thái tài xế qua WebSocket
        if (wsConnected) {
          ws.current.send(JSON.stringify({
            type: "locationUpdate",
            data: {
              ...(currentLocation || {}),
              status: !isOn ? "available" : "offline"
            },
            role: "driver",
            driver: driver?.id || ""
          }));
        }
        
        setloading(false);
      } else {
        setloading(false);
      }
    }
  };

  const acceptRideHandler = async () => {
    if (!requestId || !userData?.id) {
      Toast.show("Thông tin chuyến đi không hợp lệ", {
        type: "danger",
        placement: "bottom",
      });
      return;
    }
    
    // Đóng modal trước khi xử lý tiếp
    setIsModalVisible(false);
    
    // Gửi phản hồi chấp nhận chuyến đi qua WebSocket
    if (wsConnected) {
      ws.current.send(JSON.stringify({
        type: "acceptRide",
        role: "driver",
        requestId: requestId,
        driverId: driver?.id,
        driverName: driver?.name,
        estimatedArrival: "10 phút"
      }));
    }

    // Lưu thông tin chuyến đi vào cơ sở dữ liệu
    const accessToken = await AsyncStorage.getItem("accessToken");
    await axios
      .post(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/new-ride`,
        {
          userId: userData?.id,
          charge: (distance * parseInt(driver?.rate!)).toFixed(2),
          status: "Processing",
          currentLocationName,
          destinationLocationName,
          distance,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      .then(async (res) => {
        const rideData = {
          user: userData,
          currentLocation,
          marker,
          driver,
          distance,
          rideData: res.data.newRide,
        };
        
        router.push({
          pathname: "/(routes)/RideDetails",
          params: { orderData: JSON.stringify(rideData) },
        });
      })
      .catch(error => {
        console.error("Error creating ride:", error);
        Toast.show("Không thể tạo chuyến đi. Vui lòng thử lại.", {
          type: "danger",
          placement: "bottom",
        });
      });
  };

  return (
    <View style={[external.fx_1]}>
      <View style={styles.spaceBelow}>
        <Header isOn={isOn} toggleSwitch={() => handleStatusChange()} />
        <FlatList
          data={rideData}
          numColumns={2}
          renderItem={({ item }) => (
            <RenderRideItem item={item} colors={colors} />
          )}
        />
        <View style={[styles.rideContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.rideTitle, { color: colors.text }]}>
            Recent Rides
          </Text>
          <ScrollView style={styles.recentRidesScrollView}>
            {recentRides?.map((item: any, index: number) => (
              <RideCard item={item} key={index} />
            ))}
            {recentRides?.length === 0 && (
              <Text>You didn't take any ride yet!</Text>
            )}
          </ScrollView>
        </View>
      </View>
      <Modal
        transparent={true}
        visible={isModalVisible}
        onRequestClose={handleClose}
      >
        <TouchableOpacity style={styles.modalBackground} activeOpacity={1}>
          <TouchableOpacity style={styles.modalContainer} activeOpacity={1}>
            <View>
              <Text style={styles.modalTitle}>New Ride Request Received!</Text>
              <MapView
                style={{ height: windowHeight(180) }}
                region={region}
                onRegionChangeComplete={(region) => setRegion(region)}
              >
                {marker && <Marker coordinate={marker} pinColor="red"/>}
                {currentLocation && <Marker coordinate={currentLocation} pinColor="blue" />}
                {currentLocation && marker && (
                  <MapViewDirections
                    origin={currentLocation}
                    destination={marker}
                    apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
                    strokeWidth={4}
                    strokeColor="blue"
                  />
                )}
              </MapView>
              <View style={{ flexDirection: "row" }}>
                <View style={styles.leftView}>
                  <Location color={colors.text} />
                  <View
                    style={[
                      styles.verticaldot,
                      { borderColor: color.buttonBg },
                    ]}
                  />
                  <Gps colors={colors.text} />
                </View>
                <View style={styles.rightView}>
                  <Text style={[styles.pickup, { color: colors.text }]}>
                    {currentLocationName}
                  </Text>
                  <View style={styles.border} />
                  <Text style={[styles.drop, { color: colors.text }]}>
                    {destinationLocationName}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  paddingTop: windowHeight(5),
                  fontSize: windowHeight(14),
                }}
              >
                Distance: {distance} km
              </Text>
              <Text
                style={{
                  paddingVertical: windowHeight(5),
                  paddingBottom: windowHeight(5),
                  fontSize: windowHeight(14),
                }}
              >
                Amount:
                {(distance * parseInt(driver?.rate!)).toFixed(2)} VND
              </Text>
                <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginVertical: windowHeight(5),
                }}
                >
                <TouchableOpacity
                  onPress={handleClose}
                  style={{
                  backgroundColor: "crimson",
                  width: windowWidth(120),
                  height: windowHeight(30),
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "white", fontFamily: fonts.medium }}>
                  Decline
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => acceptRideHandler()}
                  style={{
                  backgroundColor: color.primary,
                  width: windowWidth(120),
                  height: windowHeight(30),
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  }}
                >
                  <Text style={{ color: "white", fontFamily: fonts.medium }}>
                  Accept
                  </Text>
                </TouchableOpacity>
                </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  spaceBelow: {
    paddingBottom: windowHeight(10),
  },
  rideContainer: {
    paddingHorizontal: windowWidth(20),
    paddingTop: windowHeight(5),
    paddingBottom: windowHeight(10),
  },
  rideTitle: {
    marginVertical: windowHeight(5),
    fontSize: fontSizes.FONT25,
    fontFamily: fonts.medium,
  },
  recentRidesScrollView: {
    maxHeight: windowHeight(250),
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: color.modelBg,
  },
  modalContainer: {
    backgroundColor: "white",
    maxWidth: windowWidth(420),
    padding: windowWidth(15),
    paddingHorizontal: windowWidth(30),
    borderRadius: 8,
    alignItems: "center",
  },
  modalTitle: {
    color: color.primaryText,
    fontFamily: fonts.medium,
    fontSize: fontSizes.FONT25,
    paddingBottom: windowHeight(8),
  },
  buttonContainer: {
    flexDirection: "row",
    width: "80%",
    justifyContent: "space-between",
    marginTop: windowHeight(2),
  },
  button: {
    backgroundColor: color.primary,
    width: windowWidth(20),
    height: windowHeight(5),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  buttonText: {
    fontFamily: fonts.medium,
    color: color.whiteColor,
  },
  mainContainer: {
    alignItems: "center",
  },
  leftView: {
    marginRight: windowWidth(3),
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: windowHeight(5),
  },
  rightView: {
    paddingTop: windowHeight(5),
  },
  border: {
    borderStyle: "dashed",
    borderBottomWidth: 0.5,
    borderColor: color.border,
    marginVertical: windowHeight(1.5),
  },
  verticaldot: {
    borderLeftWidth: 1,
    marginHorizontal: 5,
  },
  pickup: {
    fontSize: fontSizes.FONT20,
    fontFamily: fonts.regular,
  },
  drop: {
    fontSize: fontSizes.FONT20,
    fontFamily: fonts.regular,
    paddingTop: windowHeight(10),
  },
});
import 'react-native-get-random-values';
import {
  View,
  Text,
  Platform,
  TouchableOpacity,
  Dimensions,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";

import { useCallback, useEffect, useRef, useState } from "react";
import { external } from "@/styles/external.style";
import { windowHeight, windowWidth } from "@/themes/AppConstants";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { router } from "expo-router";
import { Clock, LeftArrow, PickLocation, PickUpLocation } from "@/utils/icons";
import color from "@/themes/AppColors";
import DownArrow from "@/assets/icons/downArrow";
import PlaceHolder from "@/assets/icons/placeHolder";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import _ from "lodash";
import axios from "axios";
import * as Location from "expo-location";
import { Toast } from "react-native-toast-notifications";
import moment from "moment";
import { useGetUserData } from "@/hooks/useGetUserData";
import { commonStyles } from "@/styles/common.style";
import { ParseDuration } from "@/utils/time/ParseDuration";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RidePlanScreen() {
  const { user } = useGetUserData();
  const [wsConnected, setWsConnected] = useState(false);
  const [places, setPlaces] = useState<any>([]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<any>({
    latitude: 21.033948,
    longitude: 105.766637,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [marker, setMarker] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [distance, setDistance] = useState<any>(null);
  const [locationSelected, setLocationSelected] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("Car");
  const [currentLocationName, setCurrentLocationName] = useState("");
  const [destinationLocationName, setDestinationLocationName] = useState("");
  const [travelTimes, setTravelTimes] = useState({
    driving: null,
    walking: null,
    bicycling: null,
    transit: null,
  });
  const ws = useRef<any>(null);
  const [driverLists, setDriverLists] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverType>();
  const [driverLoader, setDriverLoader] = useState(true);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState<{ place_id: string; description: string }[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const initializeWebSocket = () => {
    ws.current = new WebSocket(process.env.EXPO_PUBLIC_WEBSOCKET_URI!);
    ws.current.onopen = () => {
      console.log("Connected to websocket server");
      setWsConnected(true);
      
      // Đăng ký người dùng khi kết nối
      if (user && user.id) {
        ws.current.send(JSON.stringify({
          type: "userConnect",
          userId: user.id
        }));
      }
    };

    ws.current.onmessage = (e: any) => {
      try {
        const data = JSON.parse(e.data);
        console.log("Received message:", data.type);
        
        if (data.type === "nearbyDrivers") {
          setRequestId(data.requestId);
          getDriversData(data.drivers);
        }
        
        else if (data.type === "requestSent") {
          Toast.show(data.message, {
            type: "success",
            placement: "bottom",
            duration: 3000,
          });
        }
        
        else if (data.type === "requestFailed") {
          Toast.show(data.message, {
            type: "danger",
            placement: "bottom",
            duration: 3000,
          });
        }
        
        else if (data.type === "rideAccepted") {
          const orderData = {
            currentLocation: currentLocation,
            marker: marker,
            distance: distance,
            requestId: data.requestId, // Thêm requestId để theo dõi
            driver: {
              id: data.driverId,
              name: data.driverName,
              location: data.driverLocation,
              estimatedArrival: data.estimatedArrival
            }
          };
          
          // Chuyển đến màn hình chi tiết chuyến đi
          router.push({
            pathname: "/(routes)/RideDetails",
            params: { orderData: JSON.stringify(orderData) }
          });
        }
        
        else if (data.type === "rideRejected") {
          Toast.show("Tài xế đã từ chối yêu cầu của bạn. Vui lòng chọn tài xế khác.", {
            type: "warning",
            placement: "bottom",
            duration: 3000,
          });
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
      // Attempt to reconnect after a delay
      setTimeout(() => {
        initializeWebSocket();
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

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show(
          "Please approve your location tracking otherwise you can't use this app!",
          {
            type: "danger",
            placement: "bottom",
          }
        );
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      
      // Lấy tên địa điểm hiện tại
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY}`
        );
        if (response.data.results && response.data.results.length > 0) {
          setCurrentLocationName(response.data.results[0].formatted_address);
        }
      } catch (error) {
        console.log("Error getting current location name:", error);
      }
    })();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const fetchPlaces = async (input: any) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input,
            key: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY,
            language: "en",
          },
        }
      );
      setPlaces(response.data.predictions);
    } catch (error) {
      console.log(error);
    }
  };

  const debouncedFetchPlaces = useCallback(_.debounce(fetchPlaces, 100), []);

  useEffect(() => {
    if (query.length > 2) {
      debouncedFetchPlaces(query);
    } else {
      setPlaces([]);
    }
  }, [query, debouncedFetchPlaces]);

  const handleInputChange = (text: any) => {
    setQuery(text);
  };

  const fetchTravelTimes = async (origin: any, destination: any) => {
    const modes = ["driving", "walking", "bicycling", "transit"];
    let travelTimes = {
      driving: null,
      walking: null,
      bicycling: null,
      transit: null,
    } as any;

    for (const mode of modes) {
      let params = {
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: `${destination.latitude},${destination.longitude}`,
        key: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!,
        mode: mode,
      } as any;

      if (mode === "driving") {
        params.departure_time = "now";
      }

      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/distancematrix/json`,
          { params }
        );

        const elements = response.data.rows[0].elements[0];
        if (elements.status === "OK") {
          travelTimes[mode] = elements.duration.text;
        }
      } catch (error) {
        console.log(error);
      }
    }

    setTravelTimes(travelTimes);
  };

  const getSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      
      if (history) {
        try {
          const parsedHistory = JSON.parse(history);
          if (!Array.isArray(parsedHistory)) {
            // Nếu dữ liệu không phải là mảng thì xóa và tạo mới
            await AsyncStorage.setItem('searchHistory', JSON.stringify([]));
            setSearchHistory([]);
            return;
          }
          
          const uniqueHistory = parsedHistory.filter(
            (item: any, index: number, self: any[]) =>
              item && item.place_id && // Đảm bảo item có tồn tại và có place_id
              index === self.findIndex((t) => t && t.place_id && t.place_id === item.place_id)
          );
          setSearchHistory(uniqueHistory.slice(0, 4));
        } catch (error) {
          // Nếu parse thất bại, đặt lại history
          console.log('Error parsing search history:', error);
          await AsyncStorage.setItem('searchHistory', JSON.stringify([]));
          setSearchHistory([]);
        }
      }
    } catch (error) {
      console.log('Error loading search history:', error);
    }
  };

  const saveToSearchHistory = async (place: any) => {
    try {
      // Đảm bảo place có đủ các thuộc tính cần thiết
      if (!place || !place.place_id) return;
      
      const placeToSave = {
        place_id: place.place_id,
        description: place.description || 'Unknown location' // Thêm giá trị mặc định nếu description là undefined
      };
      
      const history = await AsyncStorage.getItem('searchHistory');
      let searchHistory = history ? JSON.parse(history) : [];
      const existingIndex = searchHistory.findIndex((item: { place_id: string }) => item.place_id === placeToSave.place_id);
      if (existingIndex !== -1) {
        searchHistory.splice(existingIndex, 1);
      }
      searchHistory.unshift(placeToSave);
      const uniqueHistory = searchHistory.filter(
        (item: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.place_id === item.place_id)
      );
      const limitedHistory = uniqueHistory.slice(0, 4);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(limitedHistory));
      setSearchHistory(limitedHistory);
    } catch (error) {
      console.log('Error saving search history:', error);
    }
  };

  const requestNearbyDrivers = () => {
    if (currentLocation && wsConnected) {
      ws.current.send(
        JSON.stringify({
          type: "requestRide",
          role: "user",
          userId: user?.id,
          userName: user?.name,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          locationName: currentLocationName,
          destination: marker ? {
            latitude: marker.latitude,
            longitude: marker.longitude,
            locationName: destinationLocationName
          } : undefined
        })
      );
      
      setDriverLoader(true); // Hiển thị loader khi tìm kiếm tài xế
      
      // Cài đặt timeout để ẩn loader nếu không nhận được phản hồi sau 60 giây
      setTimeout(() => {
        if (driverLoader) {
          setDriverLoader(false);
        }
      }, 60000);
    }
  };

  const handlePlaceSelect = async (placeId: any, placeDescription: any = null) => {
    try {
      if (!placeId) {
        Toast.show("Không thể xác định địa điểm đã chọn", {
          type: "warning",
          placement: "bottom",
          duration: 3000,
        });
        return;
      }
      
      console.log("Selected place ID:", placeId);
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json`,
        {
          params: {
            place_id: placeId,
            key: process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY,
          },
        }
      );
      
      if (!response.data.result || !response.data.result.geometry || !response.data.result.geometry.location) {
        Toast.show("Không thể lấy thông tin địa điểm", {
          type: "danger",
          placement: "bottom",
          duration: 3000,
        });
        return;
      }
      
      const { lat, lng } = response.data.result.geometry.location;
      setDestinationLocationName(response.data.result.formatted_address || placeDescription || "Địa điểm đã chọn");

      const selectedDestination = { latitude: lat, longitude: lng };
      setRegion({
        ...region,
        latitude: lat,
        longitude: lng,
      });
      setMarker({
        latitude: lat,
        longitude: lng,
      });
      setPlaces([]);
      setLocationSelected(true);
      Keyboard.dismiss();
      
      // Chỉ tìm tài xế khi đã có thông tin đầy đủ
      if (currentLocation && lat && lng) {
        requestNearbyDrivers();
      }
      
      setKeyboardVisible(false);
      if (currentLocation && lat && lng) {
        await fetchTravelTimes(currentLocation, selectedDestination);
      }
      
      // Lưu địa điểm vào lịch sử tìm kiếm nếu có đủ thông tin
      if (placeId && (placeDescription || response.data.result.formatted_address)) {
        saveToSearchHistory({ 
          place_id: placeId, 
          description: placeDescription || response.data.result.formatted_address 
        });
      }
      
      setShowSearchHistory(false);
    } catch (error) {
      console.log("Error handling place selection:", error);
      Toast.show("Có lỗi khi chọn địa điểm. Vui lòng thử lại.", {
        type: "danger",
        placement: "bottom",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    getSearchHistory();
  }, []);

  const calculateDistance = (lat1: any, lon1: any, lat2: any, lon2: any) => {
    var p = 0.017453292519943295; 
    var c = Math.cos;
    var a =
      0.5 -
      c((lat2 - lat1) * p) / 2 +
      (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

    return 12742 * Math.asin(Math.sqrt(a)); 
  };

  const getEstimatedArrivalTime = (travelTime: any) => {
    const now = moment();
    const travelMinutes = ParseDuration(travelTime);
    const arrivalTime = now.add(travelMinutes, "minutes");
    return arrivalTime.format("hh:mm A");
  };

  useEffect(() => {
    if (marker && currentLocation) {
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        marker.latitude,
        marker.longitude
      );
      setDistance(dist);
    }
  }, [marker, currentLocation]);

  const getDriversData = async (drivers: any) => {
    if (drivers.length === 0) {
      setDriverLoader(false);
      Toast.show(
        "Không có tài xế nào gần bạn. Vui lòng thử lại sau!",
        {
          type: "warning",
          placement: "bottom",
          duration: 3000,
        }
      );
      return;
    }
    
    const driverIds = drivers.map((driver: any) => driver.id).join(",");
    try {
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/get-drivers-data`,
        {
          params: { ids: driverIds },
        }
      );

      const driverData = response.data;
      setDriverLists(driverData);
    } catch (error) {
      console.log("Error getting driver data:", error);
      Toast.show(
        "Không thể lấy thông tin tài xế. Vui lòng thử lại!",
        {
          type: "danger",
          placement: "bottom",
          duration: 3000,
        }
      );
    } finally {
      setDriverLoader(false);
    }
  };

  const handleOrder = async () => {
    if (!selectedDriver) {
      Toast.show("Vui lòng chọn tài xế trước!", {
        type: "warning",
        placement: "bottom",
        duration: 3000,
      });
      return;
    }

    if (!requestId) {
      Toast.show("Đang tải thông tin chuyến đi, vui lòng đợi...", {
        type: "warning",
        placement: "bottom",
        duration: 3000,
      });
      return;
    }

    try {
      // Gửi thông tin đặt xe cho tài xế thông qua WebSocket
      ws.current.send(JSON.stringify({
        type: "bookRide",
        role: "user",
        requestId: requestId,
        userId: user?.id,
        driverId: selectedDriver.id,
        distance: distance.toFixed(2),
        fare: (distance * parseInt(selectedDriver.rate)).toFixed(2),
        destination: {
          latitude: marker.latitude,
          longitude: marker.longitude,
          locationName: destinationLocationName
        }
      }));
      
      Toast.show("Đã gửi yêu cầu đến tài xế!", {
        type: "success",
        placement: "bottom",
        duration: 3000,
      });
    } catch (error) {
      console.error("Lỗi khi gửi yêu cầu chuyến đi:", error);
      Toast.show("Không thể gửi yêu cầu. Vui lòng thử lại.", {
        type: "danger",
        placement: "bottom",
        duration: 3000,
      });
    }
  };

  return (
    <View style={external.fx_1}>
      {/* Map fixed at the top */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: windowHeight(500), zIndex: 0 }}>
        <MapView
          style={{ flex: 1 }}
          region={region}
          provider={PROVIDER_DEFAULT}
          onRegionChangeComplete={(region) => setRegion(region)}
        >
          {marker && (
            <Marker 
              coordinate={marker}
              title="Điểm đến"
              pinColor="#FF3B30"
            />
          )}
          {currentLocation && (
            <Marker 
              coordinate={currentLocation}
              title="Vị trí của bạn"
              pinColor="#007AFF"
            />
          )}
          {currentLocation && marker && (
            <MapViewDirections
              origin={currentLocation}
              destination={marker}
              apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
              strokeWidth={4}
              strokeColor={color.primary}
              strokeColors={[color.primary, "#4FACFE"]}
              lineDashPattern={[0]}
            />
          )}
        </MapView>
      </View>
      
      {/* Content with KeyboardAvoidingView */}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}></View> {/* Spacer to push content to bottom */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={{ width: '100%' }}
        >
          <View style={[
            styles.contentContainer,
            { backgroundColor: 'transparent', zIndex: 10 }
          ]}>
            <View style={[
              styles.container,
              { backgroundColor: '#FFFFFF' }
            ]}>
              {locationSelected ? (
                <>
                  {driverLoader ? (
                    <View style={styles.loaderContainer}>
                      <ActivityIndicator size="large" color={color.primary} />
                      <Text style={styles.loadingText}>Đang tìm tài xế gần bạn...</Text>
                      <Text style={styles.loadingSubText}>Vui lòng đợi trong giây lát</Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={{
                        paddingBottom: windowHeight(20),
                        height: windowHeight(280),
                      }}
                    >
                      <View
                        style={{
                          borderBottomWidth: 1,
                          borderBottomColor: "#b5b5b5",
                          paddingBottom: windowHeight(10),
                          flexDirection: "row",
                        }}
                      >
                        <Pressable onPress={() => setLocationSelected(false)}>
                          <LeftArrow />
                        </Pressable>
                        <Text
                          style={{
                            margin: "auto",
                            fontSize: 20,
                            fontWeight: "600",
                          }}
                        >
                          Gathering options
                        </Text>
                      </View>
                      <View style={{ padding: windowWidth(10) }}>
                        {driverLists?.map((driver: DriverType) => (
                          <Pressable
                            key={driver.id}
                            style={{
                              width: windowWidth(420),
                              borderWidth:
                                selectedVehicle === driver.vehicleType ? 2 : 0,
                              borderColor: selectedVehicle === driver.vehicleType ? color.primary : 'transparent',
                              borderRadius: 10,
                              padding: 10,
                              marginVertical: 5,
                            }}
                            onPress={() => {
                              setSelectedVehicle(driver.vehicleType);
                              setSelectedDriver(driver);
                            }}
                          >
                            <View style={{ alignItems: "center" }}>
                              <Image
                                source={
                                  driver?.vehicleType === "Car"
                                    ? require("@/assets/images/vehicles/car.png")
                                    : driver?.vehicleType === "Motorcycle"
                                    ? require("@/assets/images/vehicles/bike.png")
                                    : require("@/assets/images/vehicles/bike.png")
                                }
                                style={{ width: 90, height: 80 }}
                              />
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <View>
                                <Text style={{ fontSize: 20, fontWeight: "600" }}>
                                  RideWave {driver?.vehicleType}
                                </Text>
                                <Text style={{ fontSize: 16 }}>
                                  {getEstimatedArrivalTime(travelTimes.driving)}{" "}
                                  dropOff
                                </Text>
                              </View>
                              <Text
                                style={{
                                  fontSize: windowWidth(20),
                                  fontWeight: "600",
                                }}
                              >
                                VND{" "}
                                {(
                                  distance.toFixed(2) * parseInt(driver.rate)
                                ).toFixed(2)}
                              </Text>
                            </View>
                          </Pressable>
                        ))}

                        <View
                          style={{
                          paddingHorizontal: windowWidth(10),
                          marginTop: windowHeight(15),
                          }}
                        >
                          <TouchableOpacity
                          style={{
                            backgroundColor: "#000",
                            paddingVertical: windowHeight(10),
                            borderRadius: 5,
                            alignItems: "center",
                          }}
                          onPress={() => handleOrder()}
                          >
                          <Text style={{ color: "#fff", fontSize: 16 }}>
                            Confirm Booking
                          </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScrollView>
                  )}
                </>
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TouchableOpacity onPress={() => router.back()}>
                      <LeftArrow />
                    </TouchableOpacity>
                    <Text
                      style={{
                        margin: "auto",
                        fontSize: windowWidth(25),
                        fontWeight: "600",
                      }}
                    >
                      Plan your ride
                    </Text>
                  </View>
                  {/* picking up time */}
                  <View
                    style={{
                      width: windowWidth(200),
                      height: windowHeight(28),
                      borderRadius: 20,
                      backgroundColor: color.lightGray,
                      alignItems: "center",
                      justifyContent: "center",
                      marginVertical: windowHeight(10),
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Clock />
                      <Text
                        style={{
                          fontSize: windowHeight(12),
                          fontWeight: "600",
                          paddingHorizontal: 8,
                        }}
                      >
                        Pick-up now
                      </Text>
                      <DownArrow />
                    </View>
                  </View>
                  {/* picking up location */}
                  <View
                    style={{
                      borderWidth: 2,
                      borderColor: "#000",
                      borderRadius: 15,
                      marginBottom: windowHeight(15),
                      paddingHorizontal: windowWidth(15),
                      paddingVertical: windowHeight(5),
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <View style={{ flexDirection: "row" }}>
                      <PickLocation />
                      <View
                        style={{
                          width: Dimensions.get("window").width * 1 - 110,
                          borderBottomWidth: 1,
                          borderBottomColor: "#999",
                          marginLeft: 5,
                          height: windowHeight(20),
                        }}
                      >
                        <Text
                          style={{
                            color: "#2371F0",
                            fontSize: 18,
                            paddingLeft: 5,
                          }}
                        >
                          Current Location
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                      }}
                    >
                      <PlaceHolder />
                      <View
                        style={{
                          marginLeft: 5,
                          width: Dimensions.get("window").width * 1 - 110,
                        }}
                      >
                        <GooglePlacesAutocomplete
                          placeholder="Where to?"
                          onPress={(data, details = null) => {
                            handlePlaceSelect(data.place_id, data.description);
                          }}
                          query={{
                            key: `${process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}`,
                            language: "en",
                          }}
                          styles={{
                            textInputContainer: {
                              width: "100%",
                            },
                            textInput: {
                              height: 38,
                              color: "#000",
                              fontSize: 16,
                            },
                            predefinedPlacesDescription: {
                              color: "#000",
                            },
                            listView: {
                              backgroundColor: 'white',
                              borderRadius: 5,
                              zIndex: 1000,
                            },
                          }}
                          textInputProps={{
                            onChangeText: (text) => handleInputChange(text),
                            value: query,
                            onFocus: () => {
                              setKeyboardVisible(true);
                              setShowSearchHistory(true);
                              if (searchHistory.length === 0) {
                                getSearchHistory();
                              }
                              if (query.length > 2) {
                                setShowSearchHistory(false);
                              }
                            },
                            onBlur: () => {
                              if (places.length === 0) {
                                setKeyboardVisible(false);
                                setTimeout(() => {
                                  setShowSearchHistory(false);
                                }, 200);
                              }
                            }
                          }}
                          enablePoweredByContainer={false}
                          fetchDetails={true}
                          debounce={200}
                        />
                      </View>
                    </View>
                  </View>
                  
                    {/* Show search history */}
                    {searchHistory.length >= 0 && (
                    <View style={styles.historyContainer}>
                      <View style={styles.historyHeader}>
                      <Text style={styles.historyTitle}>Search history</Text>
                      <TouchableOpacity 
                        onPress={async () => {
                        await AsyncStorage.removeItem('searchHistory');
                        setSearchHistory([]);
                        }}
                      >
                        <Text style={styles.clearHistoryText}>Clear</Text>
                      </TouchableOpacity>
                      </View>
                      <ScrollView 
                      style={{ maxHeight: windowHeight(200) }}
                      keyboardShouldPersistTaps="handled"
                      >
                      {searchHistory.map((place, index) => (
                        <Pressable
                        key={index}
                        style={styles.historyItem}
                        onPress={() => handlePlaceSelect(place.place_id, place.description)}
                        >
                        <View style={styles.historyIconContainer}>
                          <Text style={styles.historyIcon}>🕒</Text>
                        </View>
                        <Text style={styles.historyText} numberOfLines={1} ellipsizeMode="tail">
                          {place.description}
                        </Text>
                        </Pressable>
                      ))}
                      </ScrollView>
                    </View>
                    )}

                    {/* Search results */}
                  <ScrollView 
                    style={{ 
                      maxHeight: windowHeight(200),
                      display: places.length > 0 ? 'flex' : 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {places.map((place: any, index: number) => (
                      <Pressable
                        key={index}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: windowHeight(20),
                          paddingHorizontal: 10,
                          paddingVertical: 10,
                        }}
                        onPress={() => handlePlaceSelect(place.place_id, place.description)}
                      >
                        <PickUpLocation />
                        <Text style={{ paddingLeft: 15, fontSize: 16 }}>
                          {place.description}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.shadowContainer,
    backgroundColor: color.whiteColor,
    paddingHorizontal: windowHeight(16),
    paddingVertical: windowHeight(12),
    borderTopLeftRadius: windowHeight(16),
    borderTopRightRadius: windowHeight(16),
  },
  backgroundImage: {
    width: "100%",
    height: windowHeight(150),
    position: "absolute",
  },
  contentContainer: {
    justifyContent: "flex-end",
  },
  img: {
    height: windowHeight(28),
    width: windowHeight(90),
    ...external.as_center,
    ...external.mt_50,
    resizeMode: "contain",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 400,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
  },
  loadingSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  historyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  clearHistoryText: {
    fontSize: 14,
    color: color.primary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  historyIcon: {
    fontSize: 16,
  },
  historyText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});
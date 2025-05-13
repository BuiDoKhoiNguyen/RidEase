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
import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { external } from "@/styles/external.style";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
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
import fonts from "@/themes/AppFonts";
import { useWebSocket } from '@/services/WebSocketService';

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
  const [driverLists, setDriverLists] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverType>();
  const [driverLoader, setDriverLoader] = useState(true);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Sử dụng WebSocketService chung
  const { addListener, send, isConnected } = useWebSocket(user?.id || null);

  useEffect(() => {
    // Đăng ký các listeners cho WebSocket
    const nearbyDriversListener = addListener('nearbyDrivers', (data: any) => {
      setRequestId(data.requestId);
      getDriversData(data.drivers);
    });
    
    const requestSentListener = addListener('requestSent', (data: any) => {
      Toast.show(data.message, {
        type: "success",
        placement: "bottom",
        duration: 3000,
      });
    });
    
    const requestFailedListener = addListener('requestFailed', (data: any) => {
      Toast.show(data.message, {
        type: "danger",
        placement: "bottom",
        duration: 3000,
      });
    });
    
    const rideAcceptedListener = addListener('rideAccepted', (data: any) => {
      const orderData = {
        currentLocation: currentLocation,
        marker: marker,
        distance: distance,
        requestId: data.requestId,
        currentLocationName: currentLocationName,
        destinationLocationName: destinationLocationName,
        driver: {
          id: data.driverId,
          name: data.driverName,
          location: data.driverLocation,
          driverPhoneNumber: data.driverPhoneNumber,
          estimatedArrival: data.estimatedArrival
        }
      };
      
      // Chuyển đến màn hình chi tiết chuyến đi
      router.push({
        pathname: "/(routes)/RideDetails",
        params: { orderData: JSON.stringify(orderData) }
      });
    });
    
    const rideRejectedListener = addListener('rideRejected', (data: any) => {
      Toast.show("Tài xế đã từ chối yêu cầu của bạn. Vui lòng chọn tài xế khác.", {
        type: "warning",
        placement: "bottom",
        duration: 3000,
      });
    });
    
    // Theo dõi trạng thái kết nối
    const connectionListener = addListener('connection', (data: any) => {
      setWsConnected(data.connected);
    });
    
    // Cập nhật trạng thái kết nối hiện tại
    setWsConnected(isConnected());
    
    return () => {
      // Hủy đăng ký các listeners khi component unmount
      nearbyDriversListener();
      requestSentListener();
      requestFailedListener();
      rideAcceptedListener();
      rideRejectedListener();
      connectionListener();
    };
  }, [user?.id, currentLocation, marker, distance]);

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

  const requestNearbyDrivers = () => {
    if (currentLocation && wsConnected) {
      send({
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
        } : undefined,
        distance: distance?.toFixed(2) || 0
      });
      
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
    } catch (error) {
      console.log("Error handling place selection:", error);
      Toast.show("Có lỗi khi chọn địa điểm. Vui lòng thử lại.", {
        type: "danger",
        placement: "bottom",
        duration: 3000,
      });
    }
  };

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
    // Lọc ra các tài xế có ID hợp lệ
    const validDrivers = drivers.filter((driver: any) => 
      driver.id && driver.id !== "undefined" && driver.id !== "null"
    );
    
    if (validDrivers.length === 0) {
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
    
    const driverIds = validDrivers.map((driver: any) => driver.id).join(",");
    try {
      console.log("Fetching driver data for IDs:", driverIds);
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/get-drivers-data`,
        {
          params: { ids: driverIds },
          timeout: 10000 // Thêm timeout để không đợi quá lâu
        }
      );

      if (response.data && Array.isArray(response.data)) {
        setDriverLists(response.data);
        
        // Kiểm tra nếu không có dữ liệu trả về
        if (response.data.length === 0) {
          Toast.show(
            "Không có thông tin tài xế. Vui lòng thử lại sau!",
            {
              type: "warning",
              placement: "bottom",
              duration: 3000,
            }
          );
        }
      } else {
        console.log("Invalid response format:", response.data);
        Toast.show(
          "Định dạng dữ liệu không hợp lệ. Vui lòng thử lại!",
          {
            type: "danger",
            placement: "bottom",
            duration: 3000,
          }
        );
      }
    } catch (error: any) {
      console.log("Error getting driver data:", error);
      
      // Hiển thị thông báo chi tiết hơn về lỗi
      let errorMessage = "Không thể lấy thông tin tài xế. Vui lòng thử lại!";
      if (error.response) {
        // Server trả về lỗi với mã trạng thái
        console.log("Error status:", error.response.status);
        console.log("Error data:", error.response.data);
        
        if (error.response.status === 500) {
          errorMessage = "Lỗi máy chủ. Vui lòng thử lại sau!";
        }
      } else if (error.request) {
        // Yêu cầu đã được gửi nhưng không nhận được phản hồi
        errorMessage = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối!";
      }
      
      Toast.show(errorMessage, {
        type: "danger",
        placement: "bottom",
        duration: 3000,
      });
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
      send({
        type: "bookRide",
        role: "user",
        requestId: requestId,
        userId: user?.id,
        driverId: selectedDriver.id,
        distance: distance.toFixed(2),
        phoneNumber: user?.phoneNumber,
        fare: (distance * parseInt(selectedDriver.rate)).toFixed(2),
        destination: {
          latitude: marker.latitude,
          longitude: marker.longitude,
          locationName: destinationLocationName
        }
      });
      
      // Hiển thị thông báo đang chờ phản hồi từ tài xế
      Toast.show("Đang chờ phản hồi từ tài xế...", {
        type: "info",
        placement: "bottom",
        duration: 5000,
      });
      
      // Lưu lịch sử tìm kiếm (nếu cần)
      const hasHistory = await AsyncStorage.getItem('searchHistory');
      let history = [];
      
      if (hasHistory) {
        history = JSON.parse(hasHistory);
        
        // Kiểm tra nếu đã có địa điểm này trong lịch sử
        const existingIndex = history.findIndex((h: any) => 
          h.place === destinationLocationName
        );
        
        if (existingIndex !== -1) {
          // Đưa địa điểm đã tồn tại lên đầu danh sách
          history.splice(existingIndex, 1);
        }
      }
      
      // Thêm địa điểm mới vào đầu danh sách
      history.unshift({ 
        place: destinationLocationName,
        coordinates: marker,
        timestamp: new Date().toISOString()
      });
      
      // Giới hạn danh sách lịch sử chỉ lưu tối đa 5 mục
      if (history.length > 5) {
        history = history.slice(0, 5);
      }
      
      await AsyncStorage.setItem('searchHistory', JSON.stringify(history));
      
    } catch (error) {
      console.log("Error sending booking request:", error);
      Toast.show("Có lỗi xảy ra, vui lòng thử lại!", {
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
          showsUserLocation={true}
          showsMyLocationButton={true}
          onRegionChangeComplete={(region) => setRegion(region)}
        >
          {marker && (
            <Marker 
              coordinate={marker}
              title="Điểm đến"
              pinColor="#FF3B30"
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
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.headerContainer}>
                        <Pressable 
                          onPress={() => setLocationSelected(false)}
                          style={styles.backButton}
                        >
                          <LeftArrow />
                        </Pressable>
                        <Text style={styles.headerTitle}>
                          Chọn phương tiện
                        </Text>
                      </View>
                      
                      <View style={styles.driversContainer}>
                        {driverLists?.map((driver: DriverType, index) => {
                          const isSelected = selectedDriver?.id === driver.id;
                          return (
                            <View key={driver.id}>
                              <Pressable
                                style={[
                                  styles.driverCard,
                                  isSelected && styles.driverCardSelected
                                ]}
                                onPress={() => {
                                  setSelectedVehicle(driver.vehicleType);
                                  setSelectedDriver(driver);
                                }}
                              >
                                <View style={styles.cardHeader}>
                                  <View style={styles.vehicleTypeTag}>
                                    <Text style={styles.vehicleTypeText}>{driver.vehicleType}</Text>
                                  </View>
                                  {isSelected && (
                                    <View style={styles.selectedBadge}>
                                      <Text style={styles.selectedText}>Đã chọn</Text>
                                    </View>
                                  )}
                                </View>
                                
                                <View style={styles.cardContent}>
                                  <View style={styles.imageContainer}>
                                    <Image
                                      source={
                                        driver?.vehicleType === "Car"
                                          ? require("@/assets/images/vehicles/car.png")
                                          : driver?.vehicleType === "Motorcycle"
                                          ? require("@/assets/images/vehicles/bike.png")
                                          : require("@/assets/images/vehicles/bike.png")
                                      }
                                      style={styles.vehicleImage}
                                    />
                                    
                                    <View style={styles.driverInfoChip}>
                                      <Text style={styles.driverName} numberOfLines={1}>
                                        {driver.name || 'Tài xế'}
                                      </Text>
                                      <Text style={styles.driverRating}>★ {driver.rating || '4.8'}</Text>
                                    </View>
                                  </View>
                                  
                                  <View style={styles.rideInfoContainer}>
                                    <View style={styles.rideDetail}>
                                      <Text style={styles.vehicleName}>
                                        RideWave {driver?.vehicleType}
                                      </Text>
                                      <View style={styles.timeRow}>
                                        <Image 
                                          source={require('@/assets/images/clock.png')} 
                                          style={styles.smallIcon} 
                                        />
                                        <Text style={styles.timeText}>
                                          {getEstimatedArrivalTime(travelTimes.driving)} dropOff
                                        </Text>
                                      </View>
                                    </View>
                                    
                                    <View style={styles.fareContainer}>
                                      <Text style={styles.fareAmount}>
                                        {(distance * parseInt(driver.rate)).toFixed(2)}
                                      </Text>
                                      <Text style={styles.fareCurrency}>VND</Text>
                                    </View>
                                  </View>
                                  
                                  {isSelected && (
                                    <View style={styles.featureList}>
                                      <View style={styles.featureItem}>
                                        <Image 
                                          source={require('@/assets/images/clock.png')} 
                                          style={styles.featureIcon} 
                                        />
                                        <Text style={styles.featureText}>Thời gian chờ: 2-3 phút</Text>
                                      </View>
                                      <View style={styles.featureItem}>
                                        <Image 
                                          source={require('@/assets/images/location.png')} 
                                          style={styles.featureIcon} 
                                        />
                                        <Text style={styles.featureText}>Khoảng cách: {distance.toFixed(2)} km</Text>
                                      </View>
                                    </View>
                                  )}
                                </View>
                              </Pressable>
                            </View>
                          );
                        })}
                        
                        {driverLists?.length === 0 && (
                          <View style={styles.noDriversContainer}>
                            <Text style={styles.noDriversText}>
                              Không tìm thấy tài xế gần đây
                            </Text>
                            <Text style={styles.noDriversSubText}>
                              Vui lòng thử lại sau vài phút
                            </Text>
                          </View>
                        )}

                        <View style={styles.bookingButtonContainer}>
                          <TouchableOpacity
                            style={[
                              styles.bookingButton,
                              selectedDriver ? styles.activeButton : styles.disabledButton
                            ]}
                            onPress={() => handleOrder()}
                            disabled={!selectedDriver}
                          >
                            <Text style={styles.bookingButtonText}>
                              Xác nhận đặt xe
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
                            },
                            onBlur: () => {
                              if (places.length === 0) {
                                setKeyboardVisible(false);
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
                          marginBottom: windowHeight(5),
                          paddingHorizontal: 10,
                          paddingVertical: 6,
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
  
  // Các style mới
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginBottom: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    marginRight: 35,
    fontFamily: fonts.medium,
  },
  driversContainer: {
    paddingHorizontal: 5,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 15, 
    paddingVertical: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  driverCardSelected: {
    borderColor: color.primary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleTypeTag: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  vehicleTypeText: {
    color: '#3498db',
    fontWeight: '600',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  selectedBadge: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  selectedText: {
    color: '#009688',
    fontWeight: '600',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  cardContent: {
    width: '100%',
  },
  imageContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 15,
  },
  vehicleImage: {
    width: 180,
    height: 100,
    resizeMode: 'contain',
  },
  driverInfoChip: {
    position: 'absolute',
    top: 5,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverName: {
    color: '#FFFFFF',
    fontSize: 12,
    marginRight: 5,
    fontFamily: fonts.regular,
  },
  driverRating: {
    color: '#FFD700',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  rideInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: color.border ? 1 : 0,
    borderBottomColor: '#EEEEEE',
  },
  rideDetail: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 5,
    fontFamily: fonts.medium,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallIcon: {
    width: 14,
    height: 14,
    marginRight: 5,
  },
  timeText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: fonts.regular,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222222',
    fontFamily: fonts.medium,
  },
  fareCurrency: {
    fontSize: 12,
    color: '#666666',
    fontFamily: fonts.regular,
  },
  featureList: {
    marginTop: 10,
    paddingTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  featureIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: fonts.regular,
  },
  bookingButtonContainer: {
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  bookingButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  activeButton: {
    backgroundColor: color.primary,
    ...Platform.select({
      ios: {
        shadowColor: color.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  bookingButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: fonts.medium,
  },
  noDriversContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  noDriversImage: {
    width: 120,
    height: 120,
    marginBottom: 15,
  },
  noDriversText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
    fontFamily: fonts.medium,
  },
  noDriversSubText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: fonts.regular,
  }
});
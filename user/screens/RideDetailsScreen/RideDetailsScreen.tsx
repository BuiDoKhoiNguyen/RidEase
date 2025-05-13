import { View, Text, Linking, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from "react-native";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import color from "@/themes/AppColors";
import { Gps, LocationIcon } from "@/utils/icons";
import fonts from "@/themes/AppFonts";
import { useGetUserData } from "@/hooks/useGetUserData";
import * as Location from "expo-location";
import { calculateDistance } from "@/utils/distance";
import { Toast } from "react-native-toast-notifications";
import Images from "@/utils/images";
import { useWebSocket } from '@/services/WebSocketService';
import RatingModal from '@/components/ride/RatingModal';

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
  const { loading, user } = useGetUserData();

  // Khởi tạo state
  const [region, setRegion] = useState({
    latitude: orderData?.currentLocation?.latitude || 21.0278,
    longitude: orderData?.currentLocation?.longitude || 105.8342,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [wsConnected, setWsConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(orderData?.currentLocation);
  const [userLocation, setUserLocation] = useState(orderData?.currentLocation);
  const [marker, setMarker] = useState(orderData?.marker);
  const [driver, setDriver] = useState(orderData?.driver);

  // Khởi tạo driverLocation từ thông tin ban đầu nếu có
  const [driverLocation, setDriverLocation] = useState<Coordinate | null>(
    orderData?.driver?.location ? {
      latitude: parseFloat(orderData.driver.location.latitude),
      longitude: parseFloat(orderData.driver.location.longitude)
    } : null
  );

  const [driverHeading, setDriverHeading] = useState(0);
  const [distanceToDriver, setDistanceToDriver] = useState('');
  const [rideStatus, setRideStatus] = useState("Processing");
  const [eta, setEta] = useState(driver?.estimatedArrival || "10 phút");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [requestId, setRequestId] = useState(orderData?.requestId || null);
  const [showPickupLine, setShowPickupLine] = useState(true);
  const [showDestinationLine, setShowDestinationLine] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  // Thêm các refs và state để kiểm soát việc cập nhật region
  const [shouldUpdateRegion, setShouldUpdateRegion] = useState(true);
  const regionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRegionUpdateRef = useRef<number>(0);

  // WebSocket hook
  const { addListener, send, isConnected } = useWebSocket(user?.id || null);

  // Lấy vị trí hiện tại của người dùng
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

  // Đăng ký lắng nghe WebSocket
  useEffect(() => {
    // Đăng ký lắng nghe cập nhật vị trí tài xế
    const driverLocationListener = addListener('driverLocationUpdate', (data: any) => {

      // Kiểm tra xem driverId có khớp không
      if (data.driverId === driver?.id) {
        if (data.data && data.data.latitude && data.data.longitude) {
          const newDriverLocation = {
            latitude: data.data.latitude,
            longitude: data.data.longitude,
          };

          // Cập nhật vị trí tài xế
          setDriverLocation(newDriverLocation);

          // Cập nhật hướng di chuyển
          if (data.data.heading !== undefined) {
            setDriverHeading(data.data.heading);
          }

          // Cập nhật khoảng cách đến tài xế
          if (userLocation) {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              newDriverLocation.latitude,
              newDriverLocation.longitude
            );
            setDistanceToDriver(`${distance.toFixed(2)} km`);
          }

          // Kiểm soát tần suất cập nhật vùng hiển thị
          const now = Date.now();
          if (shouldUpdateRegion && (now - lastRegionUpdateRef.current > 1000)) {
            updateMapRegion();
            lastRegionUpdateRef.current = now;
          }
        }
      }
    });    // Thêm listener cho sự kiện startRide
    const startRideListener = addListener('startRide', (data: any) => {
      console.log("Nhận được sự kiện startRide:", data);
      
      // Nếu requestId hoặc rideId khớp với chuyến đi hiện tại
      if ((data.requestId === requestId) || (data.rideId && data.rideId === orderData?.rideData?.id)) {
        console.log("Bắt đầu chuyến đi!");
        setRideStatus("in_progress");
        setShowPickupLine(false);
        setShowDestinationLine(true);
        setEta(data.estimatedArrival || "Đang di chuyển");
        
        // Cập nhật vùng hiển thị
        setShouldUpdateRegion(true);
        updateMapRegion();
        
        // Thông báo cho người dùng
        Toast.show("Chuyến đi đã bắt đầu", {
          type: "info",
          placement: "bottom",
          duration: 2000
        });
        
        // Sau 5 giây, tắt cơ chế tự động cập nhật region
        if (regionUpdateTimeoutRef.current) {
          clearTimeout(regionUpdateTimeoutRef.current);
        }
        regionUpdateTimeoutRef.current = setTimeout(() => {
          setShouldUpdateRegion(false);
        }, 5000);
      }
    });

    // Hàm xử lý khi chuyến đi hoàn thành
    const handleRideCompletion = (fare?: number) => {
      setRideStatus("completed");
      setEta("Đã hoàn thành");

      // Hủy theo dõi vị trí tài xế khi chuyến đi hoàn thành
      if (driver?.id && user?.id) {
        console.log(`Ngừng theo dõi vị trí tài xế ${driver.id}`);
        // Gửi tín hiệu hủy đăng ký theo dõi vị trí (nếu WebSocket vẫn mở)
        if (isConnected()) {
          send({
            type: "unsubscribeFromDriverLocation",
            driverId: driver.id,
            userId: user.id
          });
        }
      }

      // Hiển thị thông báo, có thêm tổng tiền nếu có
      const message = fare 
        ? `Chuyến đi đã hoàn thành. Tổng tiền: ${fare} VND`
        : "Chuyến đi đã hoàn thành";

      Toast.show(message, {
        type: "success",
        placement: "bottom",
        duration: 3000
      });

      // Hiển thị modal đánh giá thay vì quay lại ngay
      setShowRatingModal(true);
    };

    // Lắng nghe cập nhật trạng thái chuyến đi
    const rideStatusListener = addListener('rideStatusUpdate', (data: any) => {
      console.log("Nhận được cập nhật trạng thái chuyến đi:", data);
      
      // Kiểm tra bằng cả requestId và rideId - với cấu trúc đã xác định
      if (data.requestId === requestId || data.rideId === orderData?.id) {
        setRideStatus(data.status);
        
        if (data.status === "in_progress") {
          console.log("Cập nhật trạng thái: Đang di chuyển");
          setShowPickupLine(false);
          setShowDestinationLine(true);
          setEta(data.estimatedArrival || "Đang di chuyển");
          
          // Khi trạng thái chuyến đi thay đổi, cập nhật vùng hiển thị
          setShouldUpdateRegion(true);
          updateMapRegion();
          
          // Sau 5 giây, tắt cơ chế tự động cập nhật region
          if (regionUpdateTimeoutRef.current) {
            clearTimeout(regionUpdateTimeoutRef.current);
          }
          regionUpdateTimeoutRef.current = setTimeout(() => {
            setShouldUpdateRegion(false);
          }, 5000);
        }
        // Đã xóa phần xử lý status "completed" vì đã được xử lý trong sự kiện rideCompleted
      }
    });

    // Thêm listener cho sự kiện rideCompleted (hoàn thành chuyến đi)
    const completeRideListener = addListener('rideCompleted', (data: any) => {
      console.log("Nhận được sự kiện rideCompleted:", data);
      
      // Kiểm tra dựa trên cấu trúc đã xác định từ dữ liệu
      if (
        data.rideId === orderData?.id ||           // So sánh với ID trực tiếp của orderData 
        data.requestId === requestId               // So sánh với requestId
      ) {
        // Sử dụng hàm xử lý chung, truyền tổng tiền nếu có
        handleRideCompletion(data.fare);
      }
    });

    // Lắng nghe sự kiện hủy chuyến đi
    const rideCancelledListener = addListener('rideCancelled', (data: any) => {
      if (data.rideId === orderData?.rideData?.id || data.requestId === requestId) {
        Toast.show("Tài xế đã hủy chuyến đi", {
          type: "warning",
          placement: "bottom",
          duration: 3000
        });

        // Quay lại màn hình chính sau 2 giây
        setTimeout(() => {
          router.back();
        }, 2000);
      }
    });

    // Theo dõi trạng thái kết nối
    const connectionListener = addListener('connection', (data: any) => {
      setWsConnected(data.connected);
    });

    // Cập nhật trạng thái kết nối hiện tại
    setWsConnected(isConnected());

    // Đăng ký theo dõi vị trí tài xế
    if (driver?.id && user?.id) {
      send({
        type: "subscribeToDriverLocation",
        driverId: driver.id,
        userId: user.id,
        requestId: requestId,
        rideId: orderData?.rideData?.id
      });
    }    // Hủy đăng ký khi component unmount
    return () => {
      driverLocationListener();
      rideStatusListener();
      startRideListener(); // Hủy đăng ký listener mới
      completeRideListener();
      rideCancelledListener();
      connectionListener();
      
      if (regionUpdateTimeoutRef.current) {
        clearTimeout(regionUpdateTimeoutRef.current);
      }
    };
  }, [driver?.id, user?.id, requestId, orderData?.id, userLocation, shouldUpdateRegion]);

  // Cập nhật region khi các điểm thay đổi
  useEffect(() => {
    // Khi các điểm thay đổi đáng kể, kích hoạt cơ chế cập nhật region
    setShouldUpdateRegion(true);
    updateMapRegion();

    // Sau 5 giây, tắt cơ chế tự động cập nhật region
    if (regionUpdateTimeoutRef.current) {
      clearTimeout(regionUpdateTimeoutRef.current);
    }
    regionUpdateTimeoutRef.current = setTimeout(() => {
      setShouldUpdateRegion(false);
    }, 5000);

    return () => {
      if (regionUpdateTimeoutRef.current) {
        clearTimeout(regionUpdateTimeoutRef.current);
      }
    };
  }, [driverLocation, userLocation, marker, showPickupLine, showDestinationLine]);

  // Cập nhật region dựa trên các điểm hiện tại
  const updateMapRegion = () => {
    const points = [];

    // Thêm các điểm cần hiển thị trên bản đồ
    if (driverLocation) points.push(driverLocation);
    if (userLocation && showPickupLine) points.push(userLocation);
    if (marker && showDestinationLine) points.push(marker);

    // Tính toán region để bao phủ tất cả các điểm
    if (points.length > 0) {
      // Tính toán region mới
      const newRegion = getRegionForCoordinates(points);

      // Chỉ cập nhật state region nếu có sự thay đổi đáng kể
      if (mapRef.current) {
        const hasSignificantChange =
          Math.abs(newRegion.latitude - region.latitude) > 0.001 ||
          Math.abs(newRegion.longitude - region.longitude) > 0.001 ||
          Math.abs(newRegion.latitudeDelta - region.latitudeDelta) > 0.01;

        if (hasSignificantChange) {
          setRegion(newRegion);
          // Sử dụng animateToRegion với region mới
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      } else {
        setRegion(newRegion);
      }
    }
  };

  // Hàm tính toán region dựa trên danh sách các điểm
  const getRegionForCoordinates = (points: (Coordinate | null | undefined)[]) => {
    // Lọc các điểm không hợp lệ
    const validPoints = points.filter(
      (point): point is Coordinate =>
        point !== null &&
        point !== undefined &&
        typeof point.latitude === 'number' &&
        typeof point.longitude === 'number'
    );

    if (validPoints.length === 0) {
      return region;
    }

    let minLat = validPoints[0].latitude;
    let maxLat = validPoints[0].latitude;
    let minLng = validPoints[0].longitude;
    let maxLng = validPoints[0].longitude;

    // Tìm min và max cho latitude và longitude
    validPoints.forEach((point) => {
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

  // Kiểm tra tọa độ có hợp lệ không
  const isValidCoordinate = (coord: any): boolean => {
    return (
      coord &&
      typeof coord.latitude === 'number' &&
      typeof coord.longitude === 'number' &&
      !isNaN(coord.latitude) &&
      !isNaN(coord.longitude) &&
      coord.latitude >= -90 &&
      coord.latitude <= 90 &&
      coord.longitude >= -180 &&
      coord.longitude <= 180
    );
  };

  // Hủy chuyến đi
  const cancelRide = () => {
    if (wsConnected) {
      send({
        type: "cancelRideRequest",
        role: "user",
        userId: user?.id,
        requestId: requestId,
        rideId: orderData?.rideData?.id,
        driverId: driver?.id
      });

      Toast.show("Đã hủy chuyến đi", {
        type: "success",
        placement: "bottom",
        duration: 3000
      });

      router.push("/(tabs)/home");
    } else {
      console.log("WebSocket không sẵn sàng");
      router.push("/(tabs)/home");
    }
  };

  // Sử dụng useMemo để lưu trữ các cấu hình cố định của directions
  const pickupDirectionProps = useMemo(() => ({
    strokeWidth: 4,
    strokeColor: "#007AFF",
    optimizeWaypoints: true,
    resetOnChange: false
  }), []);

  const destinationDirectionProps = useMemo(() => ({
    strokeWidth: 4,
    strokeColor: "#FF3B30",
    optimizeWaypoints: true,
    resetOnChange: false
  }), []);

  // Xử lý gửi đánh giá
  const handleSubmitRating = async (rating: number, comment: string) => {
    setIsSubmittingRating(true);
    
    try {
      // Lấy token từ AsyncStorage
      const accessToken = await AsyncStorage.getItem("accessToken");
      
      // Gọi API trực tiếp thay vì dùng WebSocket
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/ratings/rate-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          rideId: orderData?.id, // Sửa cấu trúc ID để phù hợp với dữ liệu thực tế
          driverId: driver?.id,
          rating: rating,
          comment: comment
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowRatingModal(false);
        Toast.show("Cảm ơn bạn đã đánh giá", {
          type: "success",
          placement: "bottom",
          duration: 2000
        });
        
        // Quay lại màn hình chính sau khi đánh giá
        setTimeout(() => {
          router.push("/(tabs)/home");
        }, 1000);
      } else {
        Toast.show(data.message || "Không thể gửi đánh giá", {
          type: "error",
          placement: "bottom",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      Toast.show("Có lỗi xảy ra khi gửi đánh giá", {
        type: "error",
        placement: "bottom",
        duration: 3000
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Xử lý khi người dùng bỏ qua đánh giá
  const handleSkipRating = () => {
    setShowRatingModal(false);
    
    Toast.show("Bạn đã bỏ qua đánh giá", {
      type: "info", 
      placement: "bottom",
      duration: 2000
    });
    
    // Quay lại màn hình chính
    setTimeout(() => {
      router.push("/(tabs)/home");
    }, 1000);
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
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            onRegionChangeComplete={setRegion}
          >
            {/* Vị trí người dùng */}
            {userLocation && (
              <Marker
                coordinate={userLocation}
                title="Vị trí của bạn"
                pinColor="#5856D6"
              />
            )}

            {/* Vị trí điểm đến */}
            {marker && (
              <Marker
                coordinate={marker}
                title="Điểm đến"
                pinColor="#FF3B30"
              />
            )}

            {/* Vị trí tài xế */}
            {driverLocation && (
              <Marker
                coordinate={driverLocation}
                title="Vị trí tài xế"
                rotation={driverHeading}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Image
                  source={Images.arrow}
                  style={{ width: 32, height: 32 }}
                />
              </Marker>
            )}

            {/* Đường đi từ tài xế đến người dùng */}
            {showPickupLine && driverLocation && userLocation &&
              isValidCoordinate(driverLocation) && isValidCoordinate(userLocation) && (
                <MapViewDirections
                  origin={driverLocation}
                  destination={userLocation}
                  apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
                  {...pickupDirectionProps}
                />
              )}

            {/* Đường đi từ người dùng đến điểm đến */}
            {showDestinationLine && userLocation && marker &&
              isValidCoordinate(userLocation) && isValidCoordinate(marker) && (
                <MapViewDirections
                  origin={userLocation}
                  destination={marker}
                  apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
                  {...destinationDirectionProps}
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

          <View style={styles.phoneContainer}>
            <Text style={styles.driverInfoText}>Số điện thoại:</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${orderData?.driver?.driverPhoneNumber.replace(/^\+84/, '0')}`)}
            >
              <Text style={styles.phoneNumber}>{orderData?.driver?.driverPhoneNumber.replace(/^\+84/, '0')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {rideStatus === "Processing" && (
          <TouchableOpacity style={styles.cancelButton} onPress={cancelRide}>
            <Text style={styles.cancelButtonText}>Hủy chuyến đi</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal đánh giá */}
      <RatingModal
        visible={showRatingModal}
        onSubmit={handleSubmitRating}
        onSkip={handleSkipRating}
        isSubmitting={isSubmittingRating}
      />
    </View>
  );

  // Định dạng trạng thái chuyến đi
  function formatRideStatus(status: string) {
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
  }

  // Lấy màu hiển thị cho trạng thái
  function getStatusColor(status: string) {
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
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    height: windowHeight(350),
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
    fontFamily: fonts.medium,
    color: color.regularText,
    marginBottom: 5,
    minHeight: 25, // Ensure there's space even if text is empty
  },
  border: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: color.border,
    marginVertical: 8,
    width: '100%',
  },
  destinationPoint: {
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
    color: color.regularText,
    marginTop: 10,
    minHeight: 25, // Ensure there's space even if text is empty
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
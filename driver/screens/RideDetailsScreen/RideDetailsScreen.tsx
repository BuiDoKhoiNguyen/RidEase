import { View, Text, Linking, TouchableOpacity, Image, StyleSheet, ScrollView } from "react-native";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import color from "@/themes/AppColors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Toast } from "react-native-toast-notifications";
import * as Location from "expo-location";
import Images from "@/utils/images";
import { useWebSocket } from '@/services/WebSocketService';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Region extends Coordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function RideDetailsScreen() {
  const { orderData: orderDataObj } = useLocalSearchParams() as any;

  const orderData = JSON.parse(orderDataObj);
  // Khởi tạo các state cần thiết
  const [region, setRegion] = useState<Region>({
    latitude: 21.033948,
    longitude: 105.766637,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [driverLocation, setDriverLocation] = useState<Coordinate | null>(null);
  const [driverHeading, setDriverHeading] = useState(0);
  const [orderStatus, setorderStatus] = useState(orderData?.rideData.status || "Processing");
  const [pickupLocation, setPickupLocation] = useState<Coordinate | null>(orderData?.currentLocation);
  const [destinationLocation, setDestinationLocation] = useState<Coordinate | null>(orderData?.marker);
  const [showPickupLine, setShowPickupLine] = useState(true);
  const [showDestinationLine, setShowDestinationLine] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const [requestId, setRequestId] = useState(orderData?.requestId || null);
  const { addListener, send, isConnected } = useWebSocket(orderData?.driver?.id || null);
  const [wsConnected, setWsConnected] = useState(false);

  // Sử dụng watchPositionAsync reference để có thể tắt khi component unmount
  const locationWatchRef = useRef<any>(null);

  // Thêm một state và ref để kiểm soát việc cập nhật region
  const [shouldUpdateRegion, setShouldUpdateRegion] = useState(true);
  const regionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRegionUpdateRef = useRef<number>(0);

  // Xử lý listener WebSocket và kết nối
  useEffect(() => {
    // Đăng ký các listeners cho WebSocket
    const rideCancelledListener = addListener('rideCancelled', (data: any) => {
      if (data.requestId === requestId || data.rideId === orderData?.rideData?.id) {
        Toast.show("Người dùng đã hủy chuyến đi", {
          type: "warning",
          placement: "bottom",
          duration: 3000
        });

        // Quay lại màn hình chính sau 2 giây
        setTimeout(() => {
          router.push("/(tabs)/home");
        }, 2000);
      }
    });

    // Thêm listener cho sự kiện cancelRide trực tiếp
    const cancelRideListener = addListener('cancelRide', (data: any) => {
      if ((data.requestId === requestId || data.rideId === orderData?.rideData?.id) &&
        data.driverId === orderData?.driver?.id &&
        data.role === "user") {

        Toast.show("Người dùng đã hủy chuyến đi", {
          type: "warning",
          placement: "bottom",
          duration: 3000
        });

        // Quay lại màn hình chính sau 2 giây
        setTimeout(() => {
          router.push("/(tabs)/home");
        }, 2000);
      }
    });

    // Lắng nghe cập nhật trạng thái chuyến đi
    const rideStatusListener = addListener('rideStatusUpdate', (data: any) => {
      console.log("Nhận được cập nhật trạng thái chuyến đi:", data);

      if (data.rideId === orderData?.rideData?.id) {
        setorderStatus(data.status === "in_progress" ? "Ongoing" : data.status);

        if (data.status === "in_progress") {
          setShowPickupLine(false);
          setShowDestinationLine(true);

          // Cập nhật vùng hiển thị khi trạng thái thay đổi
          if (driverLocation && destinationLocation) {
            updateMapRegion(driverLocation);
          }
        } else if (data.status === "cancelled") {
          // Xử lý khi chuyến đi bị hủy
          Toast.show("Chuyến đi đã bị hủy", {
            type: "warning",
            placement: "bottom",
            duration: 1000
          });

          // Quay lại màn hình chính sau 2 giây
          setTimeout(() => {
            router.push("/(tabs)/home");
          }, 1000);
        }
      }
    });

    // Theo dõi trạng thái kết nối
    const connectionListener = addListener('connection', (data: any) => {
      setWsConnected(data.connected);
    });

    // Cập nhật trạng thái kết nối hiện tại
    setWsConnected(isConnected());

    return () => {
      rideCancelledListener();
      cancelRideListener();
      rideStatusListener();
      connectionListener();
    };
  }, [requestId, orderData?.rideData?.id, driverLocation, destinationLocation]);

  // Xử lý việc theo dõi vị trí và gửi cập nhật
  useEffect(() => {
    let isActive = true;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show("Vui lòng cấp quyền vị trí để sử dụng tính năng này");
        return;
      }

      // Thiết lập và lưu watchPositionAsync để có thể hủy khi unmount
      const watchPosition = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // Giảm tần suất cập nhật xuống 2s
          distanceInterval: 10, // Tăng ngưỡng khoảng cách lên 10m
        },
        (location) => {
          if (!isActive) return;

          const currentDriverLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          setDriverLocation(currentDriverLocation);
          if (location.coords.heading !== null) {
            setDriverHeading(location.coords.heading);
          }

          // Kiểm soát tần suất cập nhật region
          const now = Date.now();
          if (shouldUpdateRegion && (now - lastRegionUpdateRef.current > 1000)) {
            updateMapRegion(currentDriverLocation);
            lastRegionUpdateRef.current = now;
          }

          // Gửi cập nhật vị trí của tài xế qua WebSocket
          if (wsConnected) {
            try {
              send({
                type: "locationUpdate",
                role: "driver",
                driverId: orderData?.driver?.id,
                requestId: requestId,
                rideId: orderData?.rideData?.id,
                data: {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  heading: location.coords.heading || 0
                }
              });
            } catch (error) {
              console.error("Lỗi khi gửi vị trí tài xế:", error);
            }
          }
        }
      );

      locationWatchRef.current = watchPosition;
    };

    startLocationTracking();

    // Cleanup khi component unmount
    return () => {
      isActive = false;
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
      if (regionUpdateTimeoutRef.current) {
        clearTimeout(regionUpdateTimeoutRef.current);
      }
    };
  }, [wsConnected, shouldUpdateRegion]);

  // Cập nhật region khi trạng thái chuyến đi thay đổi
  useEffect(() => {
    if (driverLocation && isMapReady) {
      setShouldUpdateRegion(true);
      updateMapRegion(driverLocation);

      // Sau 5 giây, tắt cơ chế tự động cập nhật region
      regionUpdateTimeoutRef.current = setTimeout(() => {
        setShouldUpdateRegion(false);
      }, 5000);
    }

    return () => {
      if (regionUpdateTimeoutRef.current) {
        clearTimeout(regionUpdateTimeoutRef.current);
      }
    };
  }, [orderStatus, showPickupLine, showDestinationLine, isMapReady]);

  // Hàm cập nhật region dựa trên các điểm cần hiển thị
  const updateMapRegion = (currentLocation: Coordinate) => {
    if (!mapRef.current || !isMapReady) return;

    const points: Coordinate[] = [currentLocation];

    if (pickupLocation && showPickupLine) {
      points.push(pickupLocation);
    }

    if (destinationLocation && showDestinationLine) {
      points.push(destinationLocation);
    }

    if (points.length > 0) {
      // Tính toán region mới
      const newRegion = getRegionForCoordinates(points);

      // Chỉ cập nhật state region nếu có sự thay đổi đáng kể
      const hasSignificantChange =
        Math.abs(newRegion.latitude - region.latitude) > 0.001 ||
        Math.abs(newRegion.longitude - region.longitude) > 0.001 ||
        Math.abs(newRegion.latitudeDelta - region.latitudeDelta) > 0.01;

      if (hasSignificantChange) {
        setRegion(newRegion);
        // Sử dụng animateToRegion với region mới tính toán
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    }
  };

  // Hàm tính toán region từ danh sách các điểm
  const getRegionForCoordinates = (points: (Coordinate | null | undefined)[]): Region => {
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

  // Sử dụng useMemo để lưu trữ các cấu hình cố định của directions
  const pickupDirectionProps = useMemo(() => ({
    strokeWidth: 4,
    strokeColor: "#007AFF",
    optimizeWaypoints: true,
    resetOnChange: false,
  }), []);

  const destinationDirectionProps = useMemo(() => ({
    strokeWidth: 4,
    strokeColor: "#FF3B30",
    optimizeWaypoints: true,
    resetOnChange: false,
  }), []);

  // Xử lý khi đã đến điểm đón và pickup hành khách
  const handlePickupPassenger = async () => {
    const accessToken = await AsyncStorage.getItem("accessToken");
    try {
      const response = await axios.put(
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
      );

      setorderStatus("Ongoing");
      setShowPickupLine(false);
      setShowDestinationLine(true);

      Toast.show("Chuyến đi đã bắt đầu!", {
        type: "success",
      });
      console.log()
      // Gửi thông báo đã đón khách qua WebSocket
      if (wsConnected && requestId) {
        send({
          type: "startRide",
          role: "driver",
          requestId: requestId,
          rideId: orderData?.rideData.id,
          driverId: orderData?.driver?.id,
          status: "in_progress"
        });
      }

      // Cập nhật vùng hiển thị trên bản đồ
      if (driverLocation && destinationLocation) {
        updateMapRegion(driverLocation);
      }
    } catch (error) {
      console.log(error);
      Toast.show("Có lỗi xảy ra, vui lòng thử lại", {
        type: "danger",
      });
    }
  };

  // Xử lý khi đã đến điểm đến và hoàn thành chuyến đi
  const handleCompleteRide = async () => {
    const accessToken = await AsyncStorage.getItem("accessToken");
    try {
      const response = await axios.put(
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
      );

      setorderStatus("Completed");

      Toast.show("Chuyến đi hoàn thành thành công!", {
        type: "success",
      });

      // Gửi thông báo hoàn thành chuyến đi qua WebSocket
      if (wsConnected && requestId) {
        send({
          type: "completeRide",
          role: "driver",
          requestId: requestId,
          rideId: orderData?.rideData.id,
          driverId: orderData?.driver?.id,
          userId: orderData?.user?.id,
          fare: orderData?.rideData.fare
        });
      }

      // Trở về màn hình chính sau 2 giây
      setTimeout(() => {
        router.push("/(tabs)/home");
      }, 2000);
    } catch (error) {
      console.log(error);
      Toast.show("Có lỗi xảy ra, vui lòng thử lại", {
        type: "danger",
      });
    }
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

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={region}
          onMapReady={() => setIsMapReady(true)}
        >
          {/* Vị trí điểm đón */}
          {pickupLocation && isValidCoordinate(pickupLocation) && (
            <Marker
              coordinate={pickupLocation}
              pinColor="#5856D6"
              title="Điểm đón khách"
            />
          )}

          {/* Vị trí điểm đến */}
          {destinationLocation && isValidCoordinate(destinationLocation) && (
            <Marker
              coordinate={destinationLocation}
              pinColor="#FF3B30"
              title="Điểm đến"
            />
          )}

          {/* Vị trí tài xế với mũi tên chỉ hướng */}
          {driverLocation && isValidCoordinate(driverLocation) && (
            <Marker
              coordinate={driverLocation}
              title="Vị trí của bạn"
              rotation={driverHeading}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Image
                source={Images.arrow}
                style={{ width: 30, height: 30 }}
              />
            </Marker>
          )}

          {/* Đường line từ tài xế đến điểm đón */}
          {showPickupLine && driverLocation && pickupLocation &&
            isValidCoordinate(driverLocation) && isValidCoordinate(pickupLocation) && (
              <MapViewDirections
                origin={driverLocation}
                destination={pickupLocation}
                apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
                {...pickupDirectionProps}
              />
            )}

          {/* Đường line từ điểm đón đến điểm đến */}
          {showDestinationLine && pickupLocation && destinationLocation &&
            isValidCoordinate(pickupLocation) && isValidCoordinate(destinationLocation) && (
              <MapViewDirections
                origin={pickupLocation}
                destination={destinationLocation}
                apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
                {...destinationDirectionProps}
              />
            )}
        </MapView>
      </View>

      <ScrollView style={styles.detailsContainer}>
        <View style={styles.card}>
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Trạng thái chuyến đi</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: orderStatus === "Processing" ? "#FFA500" :
                    orderStatus === "Ongoing" ? "#007AFF" : "#4CD964"
                }
              ]}
            >
              <Text style={styles.statusText}>
                {orderStatus === "Processing" ? "Đang đến điểm đón" :
                  orderStatus === "Ongoing" ? "Đang di chuyển" : "Đã hoàn thành"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.passengerSection}>
            <Text style={styles.sectionTitle}>Thông tin hành khách</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tên hành khách:</Text>
              <Text style={styles.infoValue}>{orderData?.user?.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số điện thoại:</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${orderData?.user?.customerPhoneNumber
                    ?.replace(/^\+84/, '0')}`)}>
                <Text style={styles.phoneValue}>
                  {orderData?.user?.customerPhoneNumber
                    ?.replace(/^\+84/, '0')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.tripSection}>
            <Text style={styles.sectionTitle}>Chi tiết chuyến đi</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Điểm đón:</Text>
              <Text style={styles.infoValue}>
                {orderData?.currentLocationName}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Điểm đến:</Text>
              <Text style={styles.infoValue}>
                {orderData?.destinationLocationName}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Khoảng cách:</Text>
              <Text style={styles.infoValue}>{orderData?.distance} km</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tổng tiền:</Text>
              <Text style={styles.fareValue}>
                {orderData?.fare} VND
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtonsContainer}>
          {/* Nút Đã đón khách - hiển thị khi đang trong trạng thái "Processing" */}
          {orderStatus === "Processing" && (
            <TouchableOpacity
              style={styles.pickupButton}
              onPress={handlePickupPassenger}
            >
              <Text style={styles.buttonText}>Đã đón khách</Text>
            </TouchableOpacity>
          )}

          {/* Nút Hoàn thành chuyến đi - hiển thị khi đang trong trạng thái "Ongoing" */}
          {orderStatus === "Ongoing" && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleCompleteRide}
            >
              <Text style={styles.buttonText}>Hoàn thành chuyến đi</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    height: windowHeight(350),
    width: '100%',
  },
  detailsContainer: {
    flex: 1,
    padding: windowWidth(15),
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: windowWidth(15),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: windowHeight(10),
  },
  sectionTitle: {
    fontSize: fontSizes.FONT18,
    fontWeight: '600',
    color: color.regularText,
    marginBottom: windowHeight(8),
  },
  statusBadge: {
    paddingHorizontal: windowWidth(10),
    paddingVertical: windowHeight(5),
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: fontSizes.FONT14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: windowHeight(12),
  },
  passengerSection: {
    marginBottom: windowHeight(10),
  },
  tripSection: {
    marginBottom: windowHeight(5),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: windowHeight(8),
  },
  infoLabel: {
    fontSize: fontSizes.FONT16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: fontSizes.FONT16,
    color: color.regularText,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  phoneValue: {
    fontSize: fontSizes.FONT16,
    color: color.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  fareValue: {
    fontSize: fontSizes.FONT16,
    color: color.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  actionButtonsContainer: {
    marginTop: windowHeight(15),
  },
  pickupButton: {
    backgroundColor: color.primary,
    paddingVertical: windowHeight(12),
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: windowHeight(10),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  completeButton: {
    backgroundColor: '#4CD964',
    paddingVertical: windowHeight(12),
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: fontSizes.FONT16,
    fontWeight: '600',
  },
});

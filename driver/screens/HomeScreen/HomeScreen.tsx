import {
    View,
    Text,
    FlatList,
    Modal,
    TouchableOpacity,
    Platform,
    ScrollView,
    StyleSheet,
    Animated,
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
import { Gps, LocationIcon } from "@/utils/icons";
import color from "@/themes/AppColors";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as GeoLocation from "expo-location";
import { Toast } from "react-native-toast-notifications";
import { useGetDriverData } from "@/hooks/useGetDriverData";
import { router } from "expo-router";
import fonts from "@/themes/AppFonts";
import { useWebSocket } from '@/services/WebSocketService';

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
    userPhone: string;
    distance: number;
    userId: string;
    userName: string;
    fare: string;
}

interface RideCancelledMessage {
    type: "rideCancelled";
    requestId: string;
}

export default function HomeScreen() {
    type WebSocketMessage = RideRequestMessage | RideCancelledMessage;
    const { loading: driverLoading, driver } = useGetDriverData();
    const [userData, setUserData] = useState<any>(null);
    const [isOn, setIsOn] = useState<any>();
    const [loading, setloading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [region, setRegion] = useState<any>({
        latitude: 21.028511,
        longitude: 105.804817,
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
    const [fare, setFare] = useState<any>(null);
    const ws = useRef<any>(null);
    const { colors } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    
    // Sử dụng WebSocketService
    const { addListener, send, isConnected } = useWebSocket(driver?.id || null);

    useEffect(() => {
        // Đăng ký các listeners để xử lý các tin nhắn WebSocket
        const rideRequestListener = addListener('rideRequest', (message: RideRequestMessage) => {
            console.log(message);
            setIsModalVisible(true);
            // Thêm animation fade-in cho modal
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

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
            setUserData({ id: message.userId, name: message.userName , customerPhoneNumber: message.userPhone});
            setFare(message.fare);
        });

        const rideCancelledListener = addListener('rideCancelled', (message: RideCancelledMessage) => {
            if (isModalVisible && requestId === message.requestId) {
                // Animation fade-out trước khi đóng modal
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => {
                    setIsModalVisible(false);
                });
                
                Toast.show("Người dùng đã hủy yêu cầu chuyến đi", {
                    type: "warning",
                    placement: "bottom",
                });
            }
        });
        
        // Theo dõi trạng thái kết nối
        const connectionListener = addListener('connection', (data: any) => {
            setWsConnected(data.connected);
            
            // Gửi trạng thái tài xế khi WebSocket kết nối thành công
            if (data.connected && driver?.id && currentLocation && isOn !== undefined) {
                send({
                    type: "locationUpdate",
                    data: {
                        ...(currentLocation || {}),
                        status: isOn ? "available" : "offline"
                    },
                    role: "driver",
                    driverId: driver.id
                });
            }
        });

        // Cập nhật trạng thái kết nối hiện tại
        setWsConnected(isConnected());
        
        // Gửi trạng thái tài xế khi component được mount và WebSocket đã kết nối
        if (isConnected() && driver?.id && currentLocation && isOn !== undefined) {
            send({
                type: "locationUpdate",
                data: {
                    ...(currentLocation || {}),
                    status: isOn ? "available" : "offline"
                },
                role: "driver",
                driverId: driver.id
            });
        }

        return () => {
            rideRequestListener();
            rideCancelledListener();
            connectionListener();
        };
    }, [fadeAnim, isModalVisible, requestId, driver?.id, currentLocation, isOn]);

    useEffect(() => {
        const fetchStatus = async () => {
            const status: any = await AsyncStorage.getItem("status");
            const newIsOn = status === "active" ? true : false;
            setIsOn(newIsOn);
            
            // Gửi trạng thái lên server sau khi lấy từ AsyncStorage nếu đã có kết nối và vị trí
            if (isConnected() && driver?.id && currentLocation) {
                send({
                    type: "locationUpdate",
                    data: {
                        ...(currentLocation || {}),
                        status: newIsOn ? "available" : "offline"
                    },
                    role: "driver",
                    driverId: driver.id
                });
            }
        };
        fetchStatus();
    }, [driver?.id, currentLocation, isConnected]);

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
            if (!isConnected()) {
                console.log("WebSocket not ready, cannot send location update");
                return;
            }

            const res = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_URI}/driver/me`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (res.data && res.data.driver && res.data.driver.id) {
                send({
                    type: "locationUpdate",
                    data: location,
                    role: "driver",
                    driverId: res.data.driver.id
                });
            }
        } catch (error) {
            console.log("Error sending location update:", error);
        }
    };

    useEffect(() => {
        (async () => {
            let { status } = await GeoLocation.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Toast.show("Please give us to access your location to use this app!");
                return;
            }

            await GeoLocation.watchPositionAsync(
                {
                    accuracy: GeoLocation.Accuracy.High,
                    timeInterval: 1000,
                    distanceInterval: 1,
                },
                async (position) => {
                    const { latitude, longitude, heading } = position.coords;
                    const newLocation = { latitude, longitude, heading };
                    if (
                        !lastLocation ||
                        haversineDistance(lastLocation, newLocation) > 200
                    ) {
                        setCurrentLocation(newLocation);
                        setLastLocation(newLocation);
                        if (isConnected()) {
                            await sendLocationUpdate(newLocation);
                        }
                    }
                }
            );
        })();
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

        // Animation fade-out trước khi đóng modal
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            // Thông báo từ chối chuyến đi đến người dùng
            if (wsConnected) {
                send({
                    type: "rejectRide",
                    role: "driver",
                    requestId: requestId,
                    driverId: driver?.id
                });
            }
            setIsModalVisible(false);
        });
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
                    send({
                        type: "locationUpdate",
                        data: {
                            ...(currentLocation || {}),
                            status: !isOn ? "available" : "offline"
                        },
                        role: "driver",
                        driverId: driver?.id || ""
                    });
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

        // Animation fade-out trước khi đóng modal
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            // Đóng modal trước khi xử lý tiếp
            setIsModalVisible(false);
        });

        // Gửi phản hồi chấp nhận chuyến đi qua WebSocket
        if (wsConnected) {
            send({
                type: "acceptRide",
                role: "driver",
                requestId: requestId,
                driverId: driver?.id,
                phoneNumber: driver?.phoneNumber,
                driverName: driver?.name,
                estimatedArrival: "10 phút"
            });
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
                    fare,
                    rideData: res.data.newRide,
                    requestId: requestId,
                    currentLocationName,
                    destinationLocationName
                };
                console.log(rideData)
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
                        {recentRides?.slice().reverse().map((item: any, index: number) => (
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
                animationType="none"
            >
                <TouchableOpacity style={styles.modalBackground} activeOpacity={1}>
                    <Animated.View 
                        style={[
                            styles.modalContainer, 
                            { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1]
                            }) }] 
                        }]}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Ride Request</Text>
                                <View style={styles.requestBadge}>
                                    <Text style={styles.requestBadgeText}>Incoming</Text>
                                </View>
                            </View>
                            
                            <View style={styles.mapContainer}>
                                <MapView
                                    style={styles.map}
                                    region={region}
                                    onRegionChangeComplete={(region) => setRegion(region)}
                                >
                                    {marker && <Marker coordinate={marker} pinColor="red" />}
                                    {currentLocation && <Marker coordinate={currentLocation} pinColor="blue" />}
                                    {currentLocation && marker && (
                                        <MapViewDirections
                                            origin={currentLocation}
                                            destination={marker}
                                            apikey={process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY!}
                                            strokeWidth={4}
                                            strokeColor="#3498db"
                                            lineDashPattern={[0]}
                                        />
                                    )}
                                </MapView>
                            </View>

                            <View style={styles.locationContainer}>
                                <View style={styles.leftView}>
                                    <View style={styles.pickupIconContainer}>
                                        <LocationIcon color={color.primary} />
                                    </View>
                                    <View style={styles.verticaldot} />
                                    <View style={styles.destinationIconContainer}>
                                        <Gps colors={color.primary} />
                                    </View>
                                </View>

                                <View style={styles.rightView}>
                                    <Text style={styles.pickup}>
                                        {currentLocationName}
                                    </Text>
                                    <View style={styles.border} />
                                    <Text style={styles.drop}>
                                        {destinationLocationName}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.rideInfoContainer}>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Distance</Text>
                                    <Text style={styles.infoValue}>{distance} km</Text>
                                </View>
                                <View style={styles.infoSeparator} />
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Amount</Text>
                                    <Text style={styles.infoValue}>
                                        {(distance * parseInt(driver?.rate!)).toFixed(2)} VND
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.userInfoContainer}>
                                <Text style={styles.userInfoLabel}>Customer</Text>
                                <Text style={styles.userName}>{userData?.name || "Unknown"}</Text>
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    onPress={handleClose}
                                    style={styles.declineButton}
                                >
                                    <Text style={styles.declineButtonText}>Decline</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => acceptRideHandler()}
                                    style={styles.acceptButton}
                                >
                                    <Text style={styles.acceptButtonText}>Accept</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
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
        fontWeight: 'bold'
    },
    recentRidesScrollView: {
        maxHeight: windowHeight(250),
    },
    modalBackground: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
    },
    modalContainer: {
        backgroundColor: "white",
        width: '90%',
        maxWidth: 400,
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    modalContent: {
        padding: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        color: "#222",
        fontFamily: fonts.medium,
        fontSize: fontSizes.FONT20,
    },
    requestBadge: {
        backgroundColor: color.primary,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 50,
    },
    requestBadgeText: {
        color: 'white',
        fontSize: fontSizes.FONT14,
        fontFamily: fonts.medium,
    },
    mapContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        margin: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    map: {
        height: windowHeight(180),
        borderRadius: 12,
    },
    locationContainer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginTop: 4,
    },
    leftView: {
        marginRight: windowWidth(12),
        alignItems: "center",
        height: 80,
    },
    pickupIconContainer: {
        backgroundColor: '#f0f8ff',
        padding: 6,
        borderRadius: 50,
    },
    destinationIconContainer: {
        backgroundColor: '#fff0f5',
        padding: 6,
        borderRadius: 50,
    },
    rightView: {
        flex: 1,
        justifyContent: 'space-between',
    },
    verticaldot: {
        height: 25,
        borderLeftWidth: 2,
        borderColor: "#3498db",
        borderStyle: "dashed",
        marginVertical: 4,
    },
    border: {
        borderStyle: "dashed",
        borderBottomWidth: 1,
        borderColor: "#e0e0e0",
        marginVertical: windowHeight(5),
    },
    pickup: {
        fontSize: fontSizes.FONT16,
        fontFamily: fonts.medium,
        color: "#333",
    },
    drop: {
        fontSize: fontSizes.FONT16,
        fontFamily: fonts.medium,
        color: "#333",
    },
    rideInfoContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 12,
    },
    infoItem: {
        flex: 1,
        alignItems: 'center',
    },
    infoSeparator: {
        width: 1,
        backgroundColor: '#e0e0e0',
    },
    infoLabel: {
        color: '#666',
        fontSize: fontSizes.FONT14,
        fontFamily: fonts.regular,
        marginBottom: 4,
    },
    infoValue: {
        color: '#222',
        fontSize: fontSizes.FONT18,
        fontFamily: fonts.medium,
    },
    userInfoContainer: {
        marginHorizontal: 20,
        marginTop: 16,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
    },
    userInfoLabel: {
        color: '#666',
        fontSize: fontSizes.FONT14,
        fontFamily: fonts.regular,
        marginBottom: 4,
    },
    userName: {
        color: '#222',
        fontSize: fontSizes.FONT16,
        fontFamily: fonts.medium,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 20,
    },
    declineButton: {
        backgroundColor: "#f8f9fa",
        borderWidth: 1,
        borderColor: "#e0e0e0",
        width: '48%',
        height: 45,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
    },
    acceptButton: {
        backgroundColor: color.primary,
        width: '48%',
        height: 45,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: color.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    declineButtonText: {
        fontFamily: fonts.medium,
        color: "#666",
        fontSize: fontSizes.FONT16,
    },
    acceptButtonText: {
        fontFamily: fonts.medium,
        color: "white",
        fontSize: fontSizes.FONT16,
    },
});
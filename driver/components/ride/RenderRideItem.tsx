import { View, Text, StyleSheet, Animated } from "react-native";
import React, { useEffect, useRef } from "react";
import { useGetDriverData } from "@/hooks/useGetDriverData";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import color from "@/themes/AppColors";
import { rideIcons } from "@/configs/constants";
import fonts from "@/themes/AppFonts";

export default function RenderRideItem({ item, colors }: any) {
  const { driver } = useGetDriverData();
  const iconIndex = parseInt(item.id) - 1;
  const icon = rideIcons[iconIndex];
  
  // Thêm animation để tăng trải nghiệm người dùng
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);
  
  // Định dạng cho số lượng hiển thị
  const formatNumber = (num: number) => {
    return num > 999 ? (num / 1000).toFixed(1) + 'k' : num;
  };
  
  // Định dạng tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // Lấy giá trị và định dạng tương ứng dựa vào loại item
  const getValue = () => {
    if (item.title === "Total Earning") {
      return formatCurrency(driver?.totalEarning || 0);
    } else if (item.title === "Complete Ride") {
      return formatNumber(driver?.totalRides || 0);
    } else if (item.title === "Pending Ride") {
      return formatNumber(driver?.pendingRides || 0);
    } else if (item.title === "Cancel Ride") {
      return formatNumber(driver?.cancelRides || 0);
    }
    return 0;
  };

  // Chọn màu nền tùy thuộc vào loại thẻ
  const getCardStyle = () => {
    const baseStyle = {
      borderColor: colors.border,
      backgroundColor: colors.card,
    };
    
    if (item.title === "Total Earning") {
      return {...baseStyle, borderLeftColor: '#4CAF50', borderLeftWidth: 4};
    } else if (item.title === "Complete Ride") {
      return {...baseStyle, borderLeftColor: '#2196F3', borderLeftWidth: 4};
    } else if (item.title === "Pending Ride") {
      return {...baseStyle, borderLeftColor: '#FF9800', borderLeftWidth: 4};
    } else if (item.title === "Cancel Ride") {
      return {...baseStyle, borderLeftColor: '#F44336', borderLeftWidth: 4};
    }
    
    return baseStyle;
  };

  return (
    <Animated.View 
      style={[
        styles.main, 
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View
        style={[
          styles.card,
          getCardStyle(),
        ]}
      >
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.data}>{getValue()}</Text>
          </View>
          <View
            style={[
              styles.iconContain,
              {
                backgroundColor: color.whiteColor,
              },
            ]}
          >
            {icon}
          </View>
        </View>
        <View style={styles.cardBottom}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {item.title}
            </Text>
          </View>
        </View>
        
        {/* Thêm indicator cho xu hướng */}
        {item.title !== "Total Earning" && (
          <View style={styles.trendContainer}>
            <Text style={[styles.trendText, 
              item.title === "Cancel Ride" ? styles.trendDown : styles.trendUp
            ]}>
              {item.title === "Cancel Ride" ? "-2% " : "+5% "} 
              <Text style={styles.trendPeriod}>this week</Text>
            </Text>
          </View>
        )}
      </View>
      <View style={[
        styles.bottomBorder,
        item.title === "Total Earning" ? styles.earningBorder : 
        item.title === "Complete Ride" ? styles.completeBorder :
        item.title === "Pending Ride" ? styles.pendingBorder :
        styles.cancelBorder
      ]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    marginVertical: windowHeight(10),
    marginHorizontal: windowWidth(15),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  card: {
    minHeight: windowHeight(100),
    height: "auto",
    width: windowWidth(205),
    paddingVertical: windowWidth(12),
    paddingHorizontal: windowWidth(10),
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: windowWidth(5),
    marginBottom: windowHeight(8),
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: windowWidth(5),
  },
  data: {
    color: color.primary,
    fontFamily: fonts.bold,
    fontSize: fontSizes.FONT22,
    fontWeight: 'bold'
  },
  iconContain: {
    height: windowHeight(40),
    width: windowWidth(40),
    borderRadius: windowHeight(20),
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  title: {
    width: windowWidth(180),
    fontSize: fontSizes.FONT16,
    fontFamily: fonts.medium,
    marginTop: 5,
  },
  bottomBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 5,
    height: windowHeight(4),
  },
  earningBorder: {
    backgroundColor: "#4CAF50",
  },
  completeBorder: {
    backgroundColor: "#2196F3",
  },
  pendingBorder: {
    backgroundColor: "#FF9800",
  },
  cancelBorder: {
    backgroundColor: "#F44336",
  },
  trendContainer: {
    marginTop: windowHeight(6),
    paddingHorizontal: windowWidth(5),
  },
  trendText: {
    fontSize: fontSizes.FONT12,
    fontFamily: fonts.medium,
  },
  trendUp: {
    color: "#4CAF50",
  },
  trendDown: {
    color: "#F44336",
  },
  trendPeriod: {
    fontFamily: fonts.regular,
    color: "#757575",
    fontSize: fontSizes.FONT10,
  },
});

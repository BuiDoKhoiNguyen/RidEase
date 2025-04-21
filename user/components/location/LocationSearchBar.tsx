import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { external } from "@/styles/external.style";
import color from "@/themes/AppColors";
import { Clock, Search } from "@/utils/icons";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import DownArrow from "@/assets/icons/downArrow";
import { router } from "expo-router";
import { commonStyles } from "@/styles/common.style";

export default function LocationSearchBar() {
  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: color.lightGray },
        { flexDirection: "row" },
        { justifyContent: "space-around" },
        { paddingHorizontal: windowWidth(18) },
        { paddingRight: windowWidth(40) },
      ]}
      onPress={() => router.push("/(routes)/RidePlan")}
    >
      <View style={{ flexDirection: "row", paddingLeft: windowWidth(30) }}>
        <Search />
        <Text
          style={[
            styles.textInputStyle,
            { fontSize: 20, fontWeight: "500", color: "#000" },
          ]}
        >
          Where to?
        </Text>
      </View>
      <View>
        <View
          style={{
            width: windowWidth(130),
            height: windowHeight(28),
            borderRadius: 20,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
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
              Now
            </Text>
            <DownArrow />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.whiteColor,
    height: windowHeight(38),
    borderRadius: windowHeight(20),
    marginTop: windowHeight(10),
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: windowHeight(8),
    overflow:"hidden"
  },
  textInputStyle: {
    ...commonStyles.regularText,
    ...external.ph_8,
    flexGrow: 0.95,
    fontSize: fontSizes.FONT19,
  },
  calenderStyle: {
    height: "65%",
    width: windowWidth(2),
    backgroundColor: color.primaryGray,
    marginHorizontal: windowHeight(8),
  },
});
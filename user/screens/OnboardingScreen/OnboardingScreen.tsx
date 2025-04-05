import { View, Text, Image, ImageBackground, TouchableOpacity } from 'react-native'
import React from 'react'
import { commonStyles } from "@/styles/common.style";
import { external } from "@/styles/external.style";
import color from "@/themes/app.colors";
import { fontSizes, windowHeight, windowWidth } from "@/themes/app.constant";
import fonts from "@/themes/AppFonts";
import { StyleSheet } from "react-native";
import Swiper from "react-native-swiper";
import { slides } from '@/configs/constants';
import Images from '@/utils/images';
import { BackArrow } from '@/utils/icons';
import { router } from 'expo-router';

export default function OnboardingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: color.whiteColor }}>
      <Swiper
        activeDotStyle={styles.activeStyle}
        removeClippedSubviews={true}
        paginationStyle={styles.paginationStyle}
      >
        {slides.map((silde: any, index: number) => (
          <View style={[styles.slideContainer]} key={index}>
            <Image style={styles.imageBackground} source={silde.image} />
            <View style={[styles.imageBgView]}>
              <ImageBackground
                resizeMode="stretch"
                style={styles.img}
                source={Images.bgOnboarding}
              >
                <Text style={styles.title}>{silde.text}</Text>
                <Text style={styles.description}>{silde.description}</Text>
                <TouchableOpacity
                  style={styles.backArrow}
                  onPress={() => router.push("/(routes)/Login")}
                >
                  <BackArrow colors={color.whiteColor} width={21} height={21} />
                </TouchableOpacity>
              </ImageBackground>
            </View>
          </View>
        ))}
      </Swiper>
    </View>
  )
}

const styles = StyleSheet.create({
  slideContainer: {
    ...commonStyles.flexContainer,
  },
  imageBackground: {
    width: "100%",
    height: windowHeight(300),
    marginBottom: windowHeight(40),
    resizeMode: "stretch",
  },
  title: {
    ...commonStyles.mediumText23,
    marginTop: windowHeight(25),
    ...external.ti_center,
  },
  description: {
    ...commonStyles.regularText,
    paddingTop: windowHeight(12),
    width: "75%",
    ...external.as_center,
    fontSize: fontSizes.FONT19,
    lineHeight: windowHeight(17),
    ...external.ti_center,
  },
  backArrow: {
    width: windowHeight(34),
    height: windowHeight(34),
    borderRadius: windowHeight(34),
    backgroundColor: color.buttonBg,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    bottom: 0,
    position: "absolute",
  },
  img: {
    width: "100%",
    height: windowHeight(180),
    marginBottom: windowHeight(45),
  },
  activeStyle: {
    width: "7%",
    backgroundColor: color.buttonBg,
  },
  paginationStyle: {
    height: "25%",
  },
  imageBgView: {
    ...commonStyles.flexContainer,
    ...external.js_end,
  },
  flagImage: {
    height: windowHeight(20),
    width: windowWidth(30),
    borderRadius: 15,
  },
  downArrow: {
    paddingVertical: windowHeight(4),
    paddingHorizontal: windowWidth(5),
  },
  dropdownManu: {
    borderRadius: 5,
    borderWidth: 0,
  },
  dropdownContainer: {
    width: windowWidth(180),
    borderWidth: 0,
    color: color.alertRed,
  },
  labelStyle: {
    fontFamily: fonts.medium,
  },
  dropdown: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  skipText: {
    color: color.regularText,
    paddingVertical: windowHeight(4),
    fontFamily: fonts.regular,
  },
});
export { styles };

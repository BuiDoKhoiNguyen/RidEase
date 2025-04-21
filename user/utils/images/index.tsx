import { ImageSourcePropType } from "react-native";

export type images = {
  onboarding1: ImageSourcePropType;
  onboarding2: ImageSourcePropType;
  onboarding3: ImageSourcePropType;
  authBg: ImageSourcePropType;
  line: ImageSourcePropType;
  homeBanner: ImageSourcePropType;
  homeBannerTwo: ImageSourcePropType;
  user: ImageSourcePropType;
  profileUser: ImageSourcePropType;
  rideDetail: ImageSourcePropType;
  outStation: ImageSourcePropType;
  rideBg: ImageSourcePropType;
  destination: ImageSourcePropType;
  bookRide: ImageSourcePropType;
  trip: ImageSourcePropType;
  destinationDark: ImageSourcePropType;
  bgDarkOnboard: ImageSourcePropType;
  authBgDark: ImageSourcePropType;
  bgOnboarding: ImageSourcePropType;
  arrow: ImageSourcePropType;
};

const Images: images = {
  onboarding1: require("../../assets/images/onBoarding/Page 1.png"),
  onboarding2: require("../../assets/images/onBoarding/Page 2.png"),
  onboarding3: require("../../assets/images/onBoarding/Page 3.png"),
  authBg: require("../../assets/images/authImage/authBg.png"),
  line: require("../../assets/images/gif/line.gif"),
  homeBanner: require("../../assets/images/homeScreenImage/homeBanner.png"),
  homeBannerTwo: require("../../assets/images/homeScreenImage/homeBannerTwo.png"),
  user: require("../../assets/images/homeScreenImage/user.png"),
  profileUser: require("../../assets/images/profileImage/profileUser.png"),
  rideDetail: require("../../assets/images/rideScreen/rideDetail.png"),
  outStation: require("../../assets/images/categoryScreen/outstation.png"),
  rideBg: require("../../assets/images/categoryScreen/rideBg.png"),
  destination: require("../../assets/images/onBoarding/destination.png"),
  bookRide: require("../../assets/images/onBoarding/bookRide.png"),
  trip: require("../../assets/images/onBoarding/trip.png"),
  destinationDark: require("../../assets/images/onBoarding/destinationDark.png"),
  bgDarkOnboard: require("../../assets/images/onBoarding/bgDarkOnboard.png"),
  authBgDark: require("../../assets/images/authImage/authBgDark.png"),
  bgOnboarding: require('../../assets/images/onBoarding/bgOnboarding.png'),
  arrow: require("../../assets/images/arrow.png"),
};
export default Images;

import { View, Text, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import AuthContainer from '@/utils/container/authContainer'
import { commonStyles } from "@/styles/common.style";
import { external } from "@/styles/external.style";
import color from "@/themes/app.colors";
import { fontSizes, SCREEN_HEIGHT, windowHeight, windowWidth } from "@/themes/app.constant";
import fonts from "@/themes/AppFonts";
import { StyleSheet } from "react-native";
import { useToast } from 'react-native-toast-notifications';
import SignInText from '@/components/login/SigninText';
import Images from '@/utils/images';
import axios from 'axios';
import { router } from 'expo-router';
import PhoneInput from 'react-native-phone-number-input';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [countryCode, setCountryCode] = useState('+84')
  const toast = useToast()

  const handleSubmit = async () => {
    if (phoneNumber === "" || countryCode === "") {
      toast.show("Please fill the fields!", {
        placement: "bottom",
      });
    } else {
      setLoading(true);
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      
      await axios
        .post(`${process.env.EXPO_PUBLIC_SERVER_URI}/registration`, {
          phoneNumber: fullPhoneNumber,
        })
        .then((res) => {
          setLoading(false);
          router.push({
            pathname: "/(routes)/OtpVerification",
            params: { phoneNumber: fullPhoneNumber },
          });
        })
        .catch((error) => {
          console.log(error);
          setLoading(false);
          toast.show(
            "Something went wrong! please re check your phone number!",
            {
              type: "danger",
              placement: "bottom",
            }
          );
        });
    }
  };

  return (
    <AuthContainer
      topSpace={windowHeight(240)}
      imageShow={true}
      container={
        <View style={{ height: SCREEN_HEIGHT-windowHeight(240+175), paddingHorizontal: windowWidth(16) }}>
          <Image style={styles.transformLine} source={Images.line} />
          <SignInText />

          <View style={{ marginTop: 25, paddingBottom: 10 }}>
            <Text style={{
              marginTop: windowHeight(10),
              marginBottom: windowHeight(8),
              fontFamily: fonts.medium,
              fontSize: fontSizes.FONT20,
              color: color.primaryText,
              fontWeight: '500',
            }}>Phone Number</Text>
            <View style={{ alignItems: 'center' }}>
              <PhoneInput
                defaultCode='VN'
                layout="first"
                containerStyle={styles.phoneNumberInput}
                textContainerStyle={styles.phoneTextContainer}
                onChangeText={(text) => setPhoneNumber(text)}
                onChangeCountry={(country) => setCountryCode(`+${country.callingCode[0]}`)}
              />
            </View>

            <TouchableOpacity style={styles.getOtpButton} onPress={() => handleSubmit()} disabled={loading} >
              <Text style={styles.getOtpText}>Get OTP</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    />
  );
}



const styles = StyleSheet.create({
  transformLine: {
    transform: [{ rotate: "-90deg" }],
    height: windowHeight(50),
    width: windowWidth(120),
    position: "absolute",
    left: windowWidth(-50),
    top: windowHeight(-20),
  },
  countryCodeContainer: {
    width: windowWidth(69),
  },
  phoneNumberInput: {
    width: 'auto',
    backgroundColor: color.lightGray,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: color.border,
  },
  rememberMeText: {
    fontWeight: "400",
    fontFamily: fonts.medium,
    fontSize: fontSizes.FONT16,
    color: color.primaryText,
  },
  phoneTextContainer: {
    backgroundColor: color.lightGray,
  },
  forgotPasswordText: {
    fontWeight: "400",
    fontFamily: fonts.medium,
    color: color.buttonBg,
    fontSize: fontSizes.FONT16,
  },
  newUserContainer: {
    ...external.fd_row,
    ...external.ai_center,
    ...external.mt_12,
    ...external.as_center,
  },
  newUserText: {
    ...commonStyles.regularText,
  },
  signUpText: {
    ...commonStyles.mediumTextBlack12,
    fontFamily: fonts.bold,
    paddingHorizontal: windowHeight(4),
  },
  rememberTextView: {
    ...external.fd_row,
    ...external.ai_center,
    ...external.mt_5,
    ...external.js_space,
  },
  getOtpButton: {
    backgroundColor: color.buttonBg,
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    marginBottom: 10
  },
  getOtpText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  }
});


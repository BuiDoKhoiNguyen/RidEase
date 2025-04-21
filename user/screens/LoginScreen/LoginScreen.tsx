import { View, Text, Image, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import AuthContainer from '@/utils/container/AuthContainer'
import { commonStyles } from "@/styles/common.style";
import { external } from "@/styles/external.style";
import color from "@/themes/AppColors";
import { fontSizes, SCREEN_HEIGHT, windowHeight, windowWidth } from "@/themes/AppConstants";
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
  const [generatedOtp, setGeneratedOtp] = useState("")
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
          // Nếu server trả về OTP (trong môi trường development), hiển thị nó
          if (res.data.otp) {
            setGeneratedOtp(res.data.otp);
            toast.show(`Development OTP: ${res.data.otp}`, {
              placement: "bottom",
              duration: 5000,
            });
          }
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
      topSpace={windowHeight(200)}
      imageShow={true}
      container={
        <View>
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

            <TouchableOpacity style={[commonStyles.button, {marginTop: 30, marginBottom: 10}]} onPress={() => handleSubmit()} disabled={loading} >
              <Text style={commonStyles.buttonText}>Get OTP</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    />
  );
}



const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: windowHeight(20),
    alignSelf: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: windowHeight(5),
    justifyContent: 'space-between',
  }
});


import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { commonStyles } from "@/styles/common.style";
import { external } from "@/styles/external.style";
import { Toast } from "react-native-toast-notifications";
import OTPTextInput from "react-native-otp-textinput";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthContainer from "@/utils/container/AuthContainer";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import SignInText from "@/components/login/SignInText";
import fonts from "@/themes/AppFonts";
import color from "@/themes/AppColors";

export default function EmailVerificationScreen() {
  const [otp, setOtp] = useState("");
  const [loader, setLoader] = useState(false);
  const driver = useLocalSearchParams() as any;

  const handleSubmit = async () => {
    setLoader(true);
    const otpNumbers = `${otp}`;
    await axios
      .post(`${process.env.EXPO_PUBLIC_SERVER_URI}/driver/registration-driver`, {
        token: driver.token,
        otp: otpNumbers,
      })
      .then(async (res: any) => {
        setLoader(false);
        await AsyncStorage.setItem("accessToken", res.data.accessToken);
        router.push("/(tabs)/home");
      })
      .catch((error) => {
        setLoader(false);
        Toast.show(error.message, {
          placement: "bottom",
          type: "danger",
        });
      });
  };

  return (
    <AuthContainer
      topSpace={windowHeight(210)}
      imageShow={true}
      container={
        <View>
          <SignInText
            title={"Email Verification"}
            subtitle={"Check your email address for the otp!"}
          />
          <OTPTextInput
            handleTextChange={(code) => setOtp(code)}
            inputCount={4}
            textInputStyle={styles.otpTextInput}
            tintColor={color.subtitle}
            autoFocus={false}
          />
          <View style={{ marginTop: windowHeight(20) }}>
            <TouchableOpacity
              style={commonStyles.button}
              onPress={() => handleSubmit()}
              disabled={loader}
            >
              <Text style={commonStyles.buttonText}>Verify</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: windowHeight(20) }}>
            <View
              style={
                { paddingBottom: 10, paddingTop: 10, flexDirection: "row", gap: 5, justifyContent: "center" }
              }
            >
              <Text style={[commonStyles.regularText]}>Not Received yet?</Text>
              <TouchableOpacity>
                <Text style={[styles.signUpText, { color: color.black }]}>
                  Resend it
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
    otpTextInput: {
        backgroundColor: color.lightGray,
        borderColor: color.lightGray,
        borderWidth: 0.5,
        borderRadius: 6,
        width: windowWidth(60),
        height: windowHeight(40),
        borderBottomWidth: 0.5,
        color: color.subtitle,
        textAlign: "center",
        fontSize: fontSizes.FONT22,
        marginTop: windowHeight(10),
    },
    signUpText: {
        ...commonStyles.mediumTextBlack12,
        fontFamily: fonts.bold,
        paddingHorizontal: 5,
    },
    verifyButton: {
        backgroundColor: color.buttonBg,
        padding: 15,
        borderRadius: 10,
        marginTop: 30,
        marginBottom: 10
    },
    verifyText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
    }
});
import { View, Text, TextInput, TouchableOpacity, Button, StyleSheet } from 'react-native'
import React, { useState } from 'react'
import AuthContainer from '@/utils/container/authContainer'
import { fontSizes, SCREEN_HEIGHT, windowHeight, windowWidth } from '@/themes/app.constant'
import { useToast } from 'react-native-toast-notifications'
import { router, useLocalSearchParams } from 'expo-router'
import OTPTextInput from "react-native-otp-textinput";
import color from "@/themes/app.colors";
import { commonStyles } from '@/styles/common.style'
import fonts from '@/themes/AppFonts'
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from 'axios'

export default function OtpVerificationScreen() {
  const [otp, setOtp] = useState("");
  const [loader, setLoader] = useState(false);
  const toast = useToast();
  const { phoneNumber } = useLocalSearchParams();

  const handleSubmit = async () => {
    if (otp === "") {
      toast.show("Please fill the fields!", {
        placement: "bottom",
      });
    } else {
      setLoader(true);
      const otpNumbers = `${otp}`; 2
      await axios
        .post(`${process.env.EXPO_PUBLIC_SERVER_URI}/verify-otp`, {
          phoneNumber: phoneNumber,
          otp: otpNumbers,
        })
        .then(async (res) => {
          setLoader(false);
          if (res.data.user.email === null) {
            router.push({
              pathname: "/(routes)/Registration",
              params: { user: JSON.stringify(res.data.user) },
            });
            toast.show("Account verified!");
          } else {
            await AsyncStorage.setItem("accessToken", res.data.accessToken);
            router.push("/(tabs)/home");
          }
        })
        .catch((error) => {
          setLoader(false);
          toast.show("Something went wrong! please re-check your otp!", {
            type: "danger",
            placement: "bottom",
          });
        });
    }
  };

  return (
    <AuthContainer
      topSpace={windowHeight(240)}
      imageShow={true}
      container={
        <View style={{ height: SCREEN_HEIGHT - windowHeight(240 + 175), paddingHorizontal: windowWidth(16) }}>
          <Text style={styles.title}>Verification Code 🔐</Text>
          <Text style={styles.subtitle}>
            We have sent the verification code to{'\n'}
            <Text style={styles.phoneText}>{phoneNumber}</Text>
          </Text>

          <OTPTextInput
            handleTextChange={(code) => setOtp(code)}
            inputCount={4}
            textInputStyle={styles.otpTextInput}
            tintColor={color.subtitle}
            autoFocus={false}
          />

          <View style={{ marginTop: 30 }}>
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => handleSubmit()}
              disabled={loader}
            >
              <Text style={styles.verifyText}>Verify</Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: 15 }}>
            <View
              style={[
                { paddingBottom: 10, paddingTop: 10, flexDirection: "row", gap: 5, justifyContent: "center" },
              ]}
            >
              <Text style={[commonStyles.regularText]}>Not Received yet?</Text>
              <TouchableOpacity>
                <Text style={[styles.signUpText, { color: "#000" }]}>
                  Resend it
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      }
    />
  )
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  phoneText: {
    fontWeight: 'bold',
    color: '#000',
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
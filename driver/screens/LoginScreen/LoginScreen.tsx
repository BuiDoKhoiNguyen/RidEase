import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import React, { useState } from 'react'
import AuthContainer from '@/utils/container/AuthContainer'
import { fontSizes, windowHeight, windowWidth } from '@/themes/AppConstants'
import color from '@/themes/AppColors'
import fonts from '@/themes/AppFonts'
import { external } from '@/styles/external.style'
import { commonStyles } from '@/styles/common.style'
import { router } from 'expo-router'
import { Toast } from 'react-native-toast-notifications'
import axios from "axios";
import PhoneInput from 'react-native-phone-number-input';
import SignInText from '@/components/login/SignInText'


export default function LoginScreen() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [countryCode, setCountryCode] = useState("+84");
    const [generatedOtp, setGeneratedOtp] = useState("");

    const handleSubmit = async () => {
        if (phoneNumber === "" || countryCode === "") {
            Toast.show("Please fill the fields!", {
                placement: "bottom",
            });
        } else {
            setLoading(true);
            const fullPhoneNumber = `${countryCode}${phoneNumber}`;
            console.log("Full Phone Number:", fullPhoneNumber);
            console.log("Server URI:", process.env.EXPO_PUBLIC_SERVER_URI);
            await axios
                .post(`${process.env.EXPO_PUBLIC_SERVER_URI}/driver/send-otp`, {
                    phoneNumber: fullPhoneNumber,
                })
                .then((res) => {
                    setLoading(false);
                    // Nếu server trả về OTP (trong môi trường development), hiển thị nó
                    if (res.data.otp) {
                        setGeneratedOtp(res.data.otp);
                        Toast.show(`Development OTP: ${res.data.otp}`, {
                            placement: "bottom",
                            duration: 5000,
                        });
                    }
                    const driver = {
                        phoneNumber: fullPhoneNumber,
                    };
                    router.push({
                        pathname: "/(routes)/PhoneVerification",
                        params: driver,
                    });
                })
                .catch((error) => {
                    console.log(error);
                    setLoading(false);
                    Toast.show(
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
            topSpace={windowHeight(180)}
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

                        <TouchableOpacity style={[commonStyles.button, {marginBottom: 10, marginTop: 30}]} onPress={() => handleSubmit()} disabled={loading} >
                            <Text style={commonStyles.buttonText}>Get OTP</Text>
                        </TouchableOpacity>

                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: windowWidth(8),
                                paddingBottom: windowHeight(15),
                            }}
                        >
                            <Text style={{ fontSize: windowHeight(12) }}>
                                Don't have any rider account?
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push("/(routes)/Signup")}
                            >
                                <Text style={{ color: color.blackColor, fontWeight: 'bold', fontSize: windowHeight(12) }}>
                                    Sign Up
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
    },
    getOtpButton: {
        backgroundColor: color.buttonBg ,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 10,
        marginTop: 30,
        marginBottom: 10
    },
});
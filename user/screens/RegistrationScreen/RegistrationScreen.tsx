import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import React, { useState } from "react";
import { useTheme } from "@react-navigation/native";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import color from "@/themes/AppColors";
import { router, useLocalSearchParams } from "expo-router";
import axios from "axios";
import fonts from "@/themes/AppFonts";
import { commonStyles } from "@/styles/common.style";

export default function RegistrationScreen() {
    const { colors } = useTheme();
    const { user } = useLocalSearchParams() as any;
    const parsedUser = JSON.parse(user);
    const [emailFormatWarning, setEmailFormatWarning] = useState("");
    const [showWarning, setShowWarning] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phoneNumber: "",
        email: "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (key: string, value: string) => {
        setFormData((prevData) => ({
            ...prevData,
            [key]: value,
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        await axios
            .post(`${process.env.EXPO_PUBLIC_SERVER_URI}/email-otp-request`, {
                email: formData.email,
                name: formData.name,
                userId: parsedUser.id,
            })
            .then((res) => {
                setLoading(false);
                const userData: any = {
                    id: parsedUser.id,
                    name: formData.name,
                    email: formData.email,
                    phone_number: parsedUser.phone_number,
                    token: res.data.token,
                };
                router.push({
                    pathname: "/(routes)/EmailVerification",
                    params: { user: JSON.stringify(userData) },
                });
            })
            .catch((error) => {
                setLoading(false);
                console.log(error);
            });
    };

    return (
        <ScrollView>
            <View>
                {/* logo */}
                <Text
                    style={{
                        fontFamily: "TT-Octosquares-Medium",
                        fontSize: windowHeight(25),
                        paddingTop: windowHeight(50),
                        textAlign: "center",
                    }}
                >
                    Ridee
                </Text>
                <View style={{ padding: windowWidth(20) }}>
                    <View
                        style={[styles.subView, { backgroundColor: colors.background }]}
                    >
                        <View style={styles.space}>
                            <View>
                                <Text style={{
                                    fontSize: fontSizes.FONT30,
                                    fontFamily: fonts.medium,
                                    marginTop: windowHeight(2),
                                    color: color.primaryText
                                }}>Create your account</Text>
                                <Text style={{
                                    color: color.secondary || '#666',
                                    marginTop: windowHeight(0.6),
                                    fontSize: fontSizes.FONT20,
                                    fontFamily: fonts.medium,
                                    marginBottom: windowHeight(2),
                                }}>Explore your life by joining Ridee</Text>
                            </View>

                            {/* Name Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your name"
                                    value={formData?.name}
                                    onChangeText={(text) => handleChange("name", text)}
                                />
                                {(showWarning && formData.name === "") && (
                                    <Text style={styles.warningText}>Please enter your name!</Text>
                                )}
                            </View>

                            {/* Phone Number Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    placeholder="Enter your phone number"
                                    value={parsedUser?.phoneNumber}
                                    editable={false}
                                />
                            </View>

                            {/* Email Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your email address"
                                    keyboardType="email-address"
                                    value={formData.email}
                                    onChangeText={(text) => handleChange("email", text)}
                                />
                                {((showWarning && formData.name === "") || emailFormatWarning !== "") && (
                                    <Text style={styles.warningText}>
                                        {emailFormatWarning !== ""
                                            ? "Please enter your email!"
                                            : "Please enter a valid email!"}
                                    </Text>
                                )}
                            </View>

                            <View style={styles.margin}>
                                <TouchableOpacity
                                    style={[commonStyles.button, loading && styles.buttonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={color.whiteColor} />
                                    ) : (
                                        <Text style={commonStyles.buttonText}>Next</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    main: {
        flex: 1,
    },
    subView: {
        height: "100%",
    },
    space: {
        marginHorizontal: windowWidth(4),
    },
    margin: {
        marginVertical: windowHeight(12),
    },
    inputContainer: {
        marginBottom: windowHeight(16),
    },
    inputLabel: {
        fontFamily: fonts.medium,
        fontSize: fontSizes.FONT16,
        marginBottom: windowHeight(8),
        color: color.primaryText,
    },
    textInput: {
        height: windowHeight(50),
        borderWidth: 1,
        borderColor: color.border,
        borderRadius: 8,
        paddingHorizontal: windowWidth(12),
        backgroundColor: color.lightGray,
        fontSize: fontSizes.FONT16,
    },
    disabledInput: {
        backgroundColor: '#f0f0f0',
        color: '#888',
    },
    warningText: {
        color: 'red',
        fontSize: fontSizes.FONT14,
        marginTop: 5,
    },
    button: {
        backgroundColor: color.buttonBg,
        height: windowHeight(50),
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: color.whiteColor,
        fontFamily: fonts.medium,
        fontSize: fontSizes.FONT16,
        fontWeight: '600',
    }
});
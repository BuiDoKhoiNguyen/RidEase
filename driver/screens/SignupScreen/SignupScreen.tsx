import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import React, { useState } from "react";
import { fontSizes, windowHeight, windowWidth } from "@/themes/AppConstants";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import fonts from "@/themes/AppFonts";
import color from "@/themes/AppColors";
import ProgressBar from "@/components/common/ProgressBar";
import CountryPicker, { Country, CountryCode } from "react-native-country-picker-modal";
import { commonStyles } from "@/styles/common.style";

export default function SignupScreen() {
    const { colors } = useTheme();
    const [emailFormatWarning, setEmailFormatWarning] = useState("");
    const [showWarning, setShowWarning] = useState(false);
    const [countryPickerVisible, setCountryPickerVisible] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country>({
        callingCode: ['84'],
        cca2: 'VN' as CountryCode,
        currency: ['VND'],
        flag: '🇻🇳',
        name: 'Việt Nam',
        region: 'Asia',
        subregion: 'South-Eastern Asia'
    });

    const [formData, setFormData] = useState({
        name: "",
        phoneNumber: "",
        email: "",
        country: "Việt Nam",
    });

    const handleChange = (key: string, value: string) => {
        setFormData((prevData) => ({
            ...prevData,
            [key]: value,
        }));
    };

    const onSelectCountry = (country: Country) => {
        setSelectedCountry(country);
        setFormData(prev => ({
            ...prev,
            country: country.name as string
        }));
        setCountryPickerVisible(false);
    };

    const gotoDocument = () => {
        const isEmailEmpty = formData.email.trim() === "";
        const isEmailInvalid = !isEmailEmpty && emailFormatWarning !== "";

        if (isEmailEmpty) {
            setShowWarning(true);
        } else if (isEmailInvalid) {
            setShowWarning(true);
        } else {
            setShowWarning(false);

            if (formData.phoneNumber.startsWith('0')) {
                formData.phoneNumber = formData.phoneNumber.substring(1);
            }
            
            const phoneNumber = `+${selectedCountry.callingCode[0]}${formData.phoneNumber}`;

            const driverData = {
                name: formData.name,
                country: formData.country,
                phoneNumber: phoneNumber,
                email: formData.email,
            };
            router.push({
                pathname: "/(routes)/DocumentVerification",
                params: driverData,
            });
        }
    };

    return (
        <ScrollView>
            <View>
                {/* logo */}
                <Text
                    style={{
                        fontFamily: "TT-Octosquares-Medium",
                        fontSize: windowHeight(22),
                        paddingTop: windowHeight(50),
                        textAlign: "center",
                    }}
                >
                    Ride Wave
                </Text>
                <View style={{ padding: windowWidth(20) }}>
                    <ProgressBar fill={1} />
                    <View
                        style={[styles.subView, { backgroundColor: colors.background }]}
                    >
                        <View style={styles.space}>
                            <View style={{ marginBottom: windowHeight(20) }}>
                                <Text style={[styles.main, { color: colors.text }]}>Create your account</Text>
                                <Text style={[styles.sub]}>Explore your life by joining RidEase</Text>
                            </View>

                            {/* Name Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your name"
                                    value={formData.name}
                                    onChangeText={(text) => handleChange("name", text)}
                                />
                                {(showWarning && formData.name === "") && (
                                    <Text style={styles.warningText}>Please enter your name!</Text>
                                )}
                            </View>

                            {/* Country Selection - Keep as is */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Country</Text>
                                <TouchableOpacity
                                    style={styles.countryPickerButton}
                                    onPress={() => setCountryPickerVisible(true)}
                                >
                                    <CountryPicker
                                        visible={countryPickerVisible}
                                        onClose={() => setCountryPickerVisible(false)}
                                        onSelect={onSelectCountry}
                                        withFlag
                                        withCallingCode
                                        withFilter
                                        withAlphaFilter
                                        countryCode={selectedCountry.cca2}
                                    />
                                    <Text style={styles.countryText}>
                                        {String(selectedCountry.name)} (+{String(selectedCountry.callingCode[0])})
                                    </Text>
                                </TouchableOpacity>

                                {(showWarning && !selectedCountry) && (
                                    <Text style={styles.warningText}>Please select your country!</Text>
                                )}
                            </View>

                            {/* Phone Number Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your phone number"
                                    keyboardType="phone-pad"
                                    value={formData.phoneNumber}
                                    onChangeText={(text) => handleChange("phoneNumber", text)}
                                />
                                {(showWarning && formData.phoneNumber === "") && (
                                    <Text style={styles.warningText}>Please enter your phone number!</Text>
                                )}
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
                                {(showWarning && (formData.email === "" || emailFormatWarning !== "")) && (
                                    <Text style={styles.warningText}>
                                        {emailFormatWarning !== "" ? "Please enter your email!" : "Please enter a valid email!"}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.margin}>
                            <TouchableOpacity
                                onPress={gotoDocument}
                                style={commonStyles.button}
                            >
                                <Text style={commonStyles.buttonText}>Next</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
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
        fontSize: windowHeight(12),
        color: color.primaryText,
    },
    textInput: {
        height: windowHeight(50),
        borderWidth: 1,
        borderColor: color.border,
        borderRadius: 8,
        paddingHorizontal: windowWidth(12),
        backgroundColor: color.lightGray,
        fontSize: windowHeight(12),
    },
    warningText: {
        color: 'red',
        fontSize: windowHeight(12),
        marginTop: 5,
    },
    main: {
        fontSize: fontSizes.FONT30,
        fontFamily: fonts.medium,
        marginTop: windowHeight(2),
    },
    sub: {
        color: color.secondaryFont,
        marginTop: windowHeight(0.6),
        fontSize: fontSizes.FONT20,
        fontFamily: fonts.medium,
        marginBottom: windowHeight(2),
    },
    countryPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        height: windowHeight(50),
        borderWidth: 1,
        borderColor: color.border,
        borderRadius: 8,
        paddingHorizontal: windowWidth(12),
        backgroundColor: color.lightGray,
        justifyContent: 'flex-start',
    },
    countryText: {
        fontSize: windowHeight(12),
    },
});
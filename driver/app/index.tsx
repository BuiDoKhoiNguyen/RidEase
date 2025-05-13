import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // flag to check if the component is mounted

    const getData = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("accessToken");
        if (!accessToken) {
          if (isMounted) setIsLoggedIn(false);
          return;
        }

        await axios.get(
          `${process.env.EXPO_PUBLIC_SERVER_URI}/driver/me`, 
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
          
        if (isMounted) setIsLoggedIn(true);
      } catch (error) {
        console.log(
          "Failed to retrieve access token from async storage",
          error
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return null;
  }

  return <Redirect href={!isLoggedIn ? "/(routes)/Login" : "/(tabs)/home"} />;
}

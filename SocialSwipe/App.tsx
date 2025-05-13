// App.tsx
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- Gesture Handler Root View Import ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// --- Safe Area Provider Import ---
import { SafeAreaProvider } from 'react-native-safe-area-context'; // <<<< ADDED: Import SafeAreaProvider

// --- Import Context ---
import { AppProvider, useApp } from './src/contexts/AppContext';

// --- Import Screens ---
import AuthPage from './src/pages/AuthPage';
import CreateAccount from './src/pages/CreateAccount';
import CreateProfileScreen from './src/pages/CreateProfile';
import ProfileBrowseScreen from './src/pages/ProfileBrowseScreen';
import WelcomeScreen from './src/pages/WelcomeScreen';
import EditProfileScreen from './src/pages/EditProfileScreen';
import NotificationsScreen from './src/pages/NotificationsScreen'; // <<<< ADDED: Import NotificationsScreen

// --- Navigation Stacks ---
export type RootStackParamList = {
    WelcomeScreen: undefined;
    AuthPage: undefined;
    CreateAccount: undefined;
    CreateProfileScreen: undefined;
    ProfileBrowseScreen: undefined;
    EditProfileScreen: undefined;
    NotificationsScreen: undefined; // <<<< ADDED: NotificationsScreen to param list
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
    const {
        session,
        isProfileComplete,
        isLoadingSupabase,
    } = useApp();

    if (isLoadingSupabase) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6347" />
            </View>
        );
    }

    let initialRouteName: keyof RootStackParamList;

    if (!session) {
        initialRouteName = 'WelcomeScreen';
    } else if (!isProfileComplete) {
        initialRouteName = 'CreateProfileScreen';
    } else {
        initialRouteName = 'ProfileBrowseScreen';
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={initialRouteName}
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
                <Stack.Screen name="AuthPage" component={AuthPage} />
                <Stack.Screen name="CreateAccount" component={CreateAccount} />
                <Stack.Screen
                    name="CreateProfileScreen"
                    component={CreateProfileScreen}
                    options={{
                        contentStyle: { backgroundColor: 'transparent' }, // <<<< ADDED: Make card background transparent
                    }}
                />
                <Stack.Screen name="ProfileBrowseScreen" component={ProfileBrowseScreen} />
                <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
                <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />{/* <<<< ADDED: Stack screen for NotificationsScreen */}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

// --- Main App Component ---
export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider> {/* <<<< ADDED: Wrap with SafeAreaProvider */}
                <AppProvider>
                    <RootNavigator />
                </AppProvider>
            </SafeAreaProvider> {/* <<<< ADDED: Closing tag for SafeAreaProvider */}
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
});
// App.tsx
import React from 'react'; // Removed useState, useEffect, createContext, useContext, ReactNode as they are now in AppContext.tsx
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Session and User types are used by AppProvider, which is now external.
// supabase client is used by AppProvider.
// These imports are effectively used by the AppProvider, so keeping them here
// if other parts of App.tsx might need them is fine, or they could be removed
// if *only* the AppProvider (now external) used them.
// For minimal changes, if they were present before and not causing issues, they can stay.
// However, for cleaner App.tsx, specific types/client for provider can be solely in the context file.
// Let's assume they are not strictly needed in App.tsx directly anymore after moving provider.
// import { Session, User } from '@supabase/supabase-js'; // Now primarily used in AppContext.tsx
// import { supabase } from './src/lib/supabaseClient'; // Now primarily used in AppContext.tsx


// --- Gesture Handler Root View Import ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// --- Import Context ---
import { AppProvider, useApp } from './src/contexts/AppContext'; // <<<< ADDED: Import for the externalized context

// --- Import Screens ---
import AuthPage from './src/pages/AuthPage';
import CreateAccount from './src/pages/CreateAccount';
import CreateProfileScreen from './src/pages/CreateProfile';
import ProfileBrowseScreen from './src/pages/ProfileBrowseScreen';
import WelcomeScreen from './src/pages/WelcomeScreen';
import EditProfileScreen from './src/pages/EditProfileScreen';

// --- Pre-Launch Build Flag ---
// const IS_PRE_LAUNCH_BUILD = true;

// --- Navigation Stacks ---
export type RootStackParamList = {
    WelcomeScreen: undefined;
    AuthPage: undefined;
    CreateAccount: undefined;
    CreateProfileScreen: undefined;
    ProfileBrowseScreen: undefined;
    EditProfileScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// --- Profile Type, Auth Context (interface AppState, AppContext, AppProvider, useApp) MOVED to src/contexts/AppContext.tsx ---

function RootNavigator() {
    const {
        session,
        isProfileComplete,
        isLoadingSupabase,
    } = useApp(); // This now uses the imported useApp hook

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
                screenOptions={{ headerShown: false }}
            >
                <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
                <Stack.Screen name="AuthPage" component={AuthPage} />
                <Stack.Screen name="CreateAccount" component={CreateAccount} />
                <Stack.Screen name="CreateProfileScreen" component={CreateProfileScreen} />
                <Stack.Screen name="ProfileBrowseScreen" component={ProfileBrowseScreen} />
                <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

// --- Main App Component ---
export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppProvider> {/* AppProvider is now imported */}
                <RootNavigator />
            </AppProvider>
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
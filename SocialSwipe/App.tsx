import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabaseClient'; // Adjust path
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Gesture Handler Root View Import ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// --- Import Screens ---
import AuthPage from './src/pages/AuthPage';
import CreateAccount from './src/pages/CreateAccount';
import CreateProfileScreen from './src/pages/CreateProfile';
import ProfileBrowseScreen from './src/pages/ProfileBrowseScreen';
import WelcomeScreen from './src/pages/WelcomeScreen'; // Assuming WelcomeScreen.tsx is in src/pages

// --- Pre-Launch Build Flag ---
const IS_PRE_LAUNCH_BUILD = true; // Set to true for TestFlight

// --- Navigation Stacks ---
// Define ParamList for type safety with navigation
export type RootStackParamList = {
  WelcomeScreen: undefined;
  AuthPage: undefined;
  CreateAccount: undefined;
  CreateProfileScreen: undefined;
  ProfileBrowseScreen: undefined;
  // Add other routes here
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// --- Profile Type ---
interface UserProfile {
    user_id: string;
    first_name: string;
    last_name?: string | null;
    date_of_birth: string;
    gender: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    looking_for?: string | null;
    profile_pictures?: string[] | null;
    is_profile_complete: boolean;
}


// --- Auth Context ---
interface AppState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isProfileComplete: boolean;
  isLoadingSupabase: boolean;
  isLoadingWelcomeCheck: boolean;
  hasSeenWelcomeScreen: boolean;
  fetchProfile: (userId: string) => Promise<void>;
  completeWelcomeScreen: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

const ASYNC_STORAGE_WELCOME_KEY = '@app/hasSeenWelcomeScreen';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);
  const [isLoadingWelcomeCheck, setIsLoadingWelcomeCheck] = useState(true);
  const [hasSeenWelcomeScreen, setHasSeenWelcomeScreen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    // Check if welcome screen has been seen
    const checkWelcomeStatus = async () => {
      setIsLoadingWelcomeCheck(true);
      try {
        const value = await AsyncStorage.getItem(ASYNC_STORAGE_WELCOME_KEY);
        if (value === 'true') {
          setHasSeenWelcomeScreen(true);
        } else {
          // Explicitly set to false if not 'true' or null
          setHasSeenWelcomeScreen(false);
        }
      } catch (e) {
        console.error('Failed to load welcome screen status from AsyncStorage.', e);
        setHasSeenWelcomeScreen(false); // Default to showing welcome screen if error
      } finally {
        setIsLoadingWelcomeCheck(false);
      }
    };
    checkWelcomeStatus();
  }, []);

  const fetchProfile = async (userId: string) => {
      if (!userId) return;
      console.log('Fetching profile for user:', userId);
      try {
          const { data, error, status } = await supabase
              .from('individual_profiles')
              .select('user_id, first_name, last_name, date_of_birth, gender, bio, interests, location, looking_for, profile_pictures, is_profile_complete')
              .eq('user_id', userId)
              .single();

          if (error && status !== 406) {
              console.error('Error fetching profile:', error.message);
              setProfile(null);
              setIsProfileComplete(false);
          } else if (data) {
              console.log('Profile data found:', data);
              setProfile(data as UserProfile);
              setIsProfileComplete(data.is_profile_complete || false);
          } else {
              console.log('No profile found for user, needs creation.');
              setProfile(null);
              setIsProfileComplete(false);
          }
      } catch (error: any) {
          console.error("Error in fetchProfile catch block:", error.message);
          setProfile(null);
          setIsProfileComplete(false);
      }
  };


  useEffect(() => {
    setIsLoadingSupabase(true);
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const currentUserId = initialSession?.user?.id;
      setUser(initialSession?.user ?? null);
      if (currentUserId) {
        await fetchProfile(currentUserId);
      }
      setIsLoadingSupabase(false);
    }).catch(error => {
        console.error("Error getting initial session:", error);
        setIsLoadingSupabase(false);
    });

    const authListenerResponse = supabase.auth.onAuthStateChange(
      async (_event, currentAuthSession) => {
        console.log('Auth State Change:', _event, !!currentAuthSession);
        const currentAuthUser = currentAuthSession?.user ?? null;
        const currentAuthUserId = currentAuthUser?.id;
        setSession(currentAuthSession);
        setUser(currentAuthUser);

        if (currentAuthUserId) {
          setIsLoadingSupabase(true);
          await fetchProfile(currentAuthUserId);
          setIsLoadingSupabase(false);
        } else {
          setProfile(null);
          setIsProfileComplete(false);
        }
      }
    );

    return () => {
      authListenerResponse.data?.subscription?.unsubscribe();
    };
  }, []);

  const completeWelcomeScreen = async () => {
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_WELCOME_KEY, 'true');
      setHasSeenWelcomeScreen(true);
    } catch (e) {
      console.error('Failed to save welcome screen status to AsyncStorage.', e);
    }
  };

  const value = {
    session,
    user,
    profile,
    isProfileComplete,
    isLoadingSupabase,
    isLoadingWelcomeCheck,
    hasSeenWelcomeScreen,
    fetchProfile,
    completeWelcomeScreen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};


function RootNavigator() {
  const {
    session,
    isProfileComplete,
    isLoadingSupabase,
    isLoadingWelcomeCheck,
    hasSeenWelcomeScreen,
    completeWelcomeScreen
  } = useApp();

  // --- DEVELOPMENT ONLY: Force Welcome Screen ---
  // Set this to true to always show WelcomeScreen, false for normal behavior.
  const FORCE_SHOW_WELCOME_SCREEN_FOR_DEV = false; // <--- MODIFIED LINE
  // --- END DEVELOPMENT ONLY ---

  if (isLoadingSupabase || isLoadingWelcomeCheck) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6347" />
      </View>
    );
  }

  // Type for navigation prop passed to WelcomeScreen
  type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WelcomeScreen'>;

  // Determine if the welcome screen should be shown
  const showWelcomeScreenActual = FORCE_SHOW_WELCOME_SCREEN_FOR_DEV || !hasSeenWelcomeScreen;

  let initialRouteName: keyof RootStackParamList;

  if (showWelcomeScreenActual) {
    initialRouteName = 'WelcomeScreen';
  } else if (!session) {
    initialRouteName = 'AuthPage'; // AuthPage can navigate to CreateAccount
  } else if (!isProfileComplete) {
    initialRouteName = 'CreateProfileScreen';
  } else {
    // The IS_PRE_LAUNCH_BUILD flag in the original code always resolved to ProfileBrowseScreen
    // when session exists and profile is complete.
    initialRouteName = 'ProfileBrowseScreen';
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName} // Set the initial route dynamically
        screenOptions={{ headerShown: false }}
      >
        {/* Define all screens unconditionally so they are known to the navigator */}
        <Stack.Screen name="WelcomeScreen">
          {(props) => (
            <WelcomeScreen
              {...props}
              navigation={props.navigation as WelcomeScreenNavigationProp} // Retained your specific type
              onWelcomeComplete={completeWelcomeScreen}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="AuthPage" component={AuthPage} />
        <Stack.Screen name="CreateAccount" component={CreateAccount} />
        <Stack.Screen name="CreateProfileScreen" component={CreateProfileScreen} />
        <Stack.Screen name="ProfileBrowseScreen" component={ProfileBrowseScreen} />
        {/*
          If IS_PRE_LAUNCH_BUILD was intended to render a *different component*
          (e.g., a TestFlight specific screen) when the profile is complete,
          you would add that screen here too and adjust the initialRouteName logic accordingly.
          Based on the original code, it always resulted in ProfileBrowseScreen in this slot.
        */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- Main App Component ---
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
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
    backgroundColor: '#f8f9fa', // A light background for loading
  },
});
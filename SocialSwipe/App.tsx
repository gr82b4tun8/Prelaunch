import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // NativeStackNavigationProp removed as it's not directly used here after changes
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabaseClient'; // Adjust path
// AsyncStorage is no longer needed here for welcome screen status

// --- Gesture Handler Root View Import ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// --- Import Screens ---
import AuthPage from './src/pages/AuthPage';
import CreateAccount from './src/pages/CreateAccount';
import CreateProfileScreen from './src/pages/CreateProfile';
import ProfileBrowseScreen from './src/pages/ProfileBrowseScreen';
import WelcomeScreen from './src/pages/WelcomeScreen';

// --- Pre-Launch Build Flag ---
// const IS_PRE_LAUNCH_BUILD = true; // This flag is not used in the revised navigation logic directly, but kept if other parts rely on it.

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
  // Properties related to 'hasSeenWelcomeScreen' are removed
  fetchProfile: (userId: string) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

// ASYNC_STORAGE_WELCOME_KEY is removed as it's no longer needed.

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);
  // isLoadingWelcomeCheck and hasSeenWelcomeScreen states are removed
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // useEffect for checkWelcomeStatus is removed.

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

  // completeWelcomeScreen function is removed.

  const value = {
    session,
    user,
    profile,
    isProfileComplete,
    isLoadingSupabase,
    // isLoadingWelcomeCheck, hasSeenWelcomeScreen, completeWelcomeScreen are removed
    fetchProfile,
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
    // Properties related to 'hasSeenWelcomeScreen' are removed
  } = useApp();

  // FORCE_SHOW_WELCOME_SCREEN_FOR_DEV is removed as it's no longer relevant.

  // --- Initial Route Determination Logic Explanation ---
  // The initial route is determined based on the following priorities:
  // 1. Loading State: If Supabase session data is still loading, an indicator is shown.
  // 2. Welcome Screen: If there is NO active session (`!session`), the `WelcomeScreen` is shown.
  //    This serves as the default screen for logged-out users.
  // 3. Create Profile Screen: If a session EXISTS, but the user's profile is NOT complete,
  //    the `CreateProfileScreen` is shown.
  // 4. Main Application Screen (ProfileBrowseScreen): If a session EXISTS, AND the user's profile IS complete,
  //    the `ProfileBrowseScreen` is shown.
  // ---

  if (isLoadingSupabase) { // Now only depends on Supabase loading
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6347" />
      </View>
    );
  }

  let initialRouteName: keyof RootStackParamList;

  if (!session) {
    initialRouteName = 'WelcomeScreen'; // Always show WelcomeScreen if not logged in
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
        {/* WelcomeScreen no longer needs onWelcomeComplete and can use the component prop directly */}
        <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
        <Stack.Screen name="AuthPage" component={AuthPage} />
        <Stack.Screen name="CreateAccount" component={CreateAccount} />
        <Stack.Screen name="CreateProfileScreen" component={CreateProfileScreen} />
        <Stack.Screen name="ProfileBrowseScreen" component={ProfileBrowseScreen} />
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
    backgroundColor: '#f8f9fa',
  },
});
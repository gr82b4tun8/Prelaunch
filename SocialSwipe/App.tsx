// App.tsx
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native'; // Alert removed as it wasn't used directly here
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabaseClient';// Adjust path

// --- Gesture Handler Root View Import ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// --- Import Screens ---
import AuthPage from './src/pages/AuthPage';
import CreateAccount from './src/pages/CreateAccount';
import CreateProfileScreen from './src/pages/CreateProfile';
import ProfileBrowseScreen from './src/pages/ProfileBrowseScreen';
// import MainAppNavigator from './navigators/MainAppNavigator';

// --- Pre-Launch Build Flag ---
const IS_PRE_LAUNCH_BUILD = true; // Set to true for TestFlight

// --- Navigation Stacks ---
const Stack = createNativeStackNavigator();

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
  isLoading: boolean;
  fetchProfile: (userId: string) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const fetchProfile = async (userId: string) => {
      if (!userId) return;
      console.log('Fetching profile for user:', userId);
      try {
          const { data, error, status } = await supabase
              .from('individual_profiles')
              // Ensure all fields for UserProfile are selected
              .select('user_id, first_name, last_name, date_of_birth, gender, bio, interests, location, looking_for, profile_pictures, is_profile_complete')
              .eq('user_id', userId)
              .single();

          if (error && status !== 406) {
              console.error('Error fetching profile:', error.message);
              // Potentially set profile to null and isProfileComplete to false here
              setProfile(null);
              setIsProfileComplete(false);
              throw error; // Re-throw if you want to handle it further up or log it more visibly
          }

          if (data) {
              console.log('Profile data found:', data);
              setProfile(data as UserProfile); // Cast after ensuring all fields are selected
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
          // Alert.alert('Error', 'Could not fetch your profile data.'); // Optional
      }
  };


  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const currentUserId = initialSession?.user?.id;
      setUser(initialSession?.user ?? null);
      if (currentUserId) {
        await fetchProfile(currentUserId);
      }
      setIsLoading(false);
    }).catch(error => {
        console.error("Error getting initial session:", error);
        setIsLoading(false);
    });

    // 'authListenerResponse' holds { data: { subscription }, error }
    const authListenerResponse = supabase.auth.onAuthStateChange(
      async (_event, currentAuthSession) => {
        console.log('Auth State Change:', _event, !!currentAuthSession);
        const currentAuthUser = currentAuthSession?.user ?? null;
        const currentAuthUserId = currentAuthUser?.id;
        setSession(currentAuthSession);
        setUser(currentAuthUser);

        if (currentAuthUserId) {
          setIsLoading(true);
          await fetchProfile(currentAuthUserId);
          setIsLoading(false);
        } else {
          setProfile(null);
          setIsProfileComplete(false);
          setIsLoading(false);
        }
      }
    );

    // The actual subscription object is authListenerResponse.data.subscription
    // Corrected unsubscribe call:
    return () => {
      authListenerResponse.data?.subscription?.unsubscribe();
    };
  }, []);


  const value = {
    session,
    user,
    profile,
    isProfileComplete,
    isLoading,
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
  const { session, isProfileComplete, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6347" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="AuthPage" component={AuthPage} />
            <Stack.Screen name="CreateAccount" component={CreateAccount} />
          </>
        ) : !isProfileComplete ? (
          <Stack.Screen name="CreateProfileScreen" component={CreateProfileScreen} />
        ) : IS_PRE_LAUNCH_BUILD ? (
          <Stack.Screen name="ProfileBrowseScreen" component={ProfileBrowseScreen} />
        ) : (
          // Using ProfileBrowseScreen for non-pre-launch as well, as per your existing logic
          <Stack.Screen name="ProfileBrowseScreen" component={ProfileBrowseScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- Main App Component ---
export default function App() {
  return (
    // --- Wrap your entire app with GestureHandlerRootView ---
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
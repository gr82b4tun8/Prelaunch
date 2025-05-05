// App.tsx (or your root navigator file like RootNavigator.tsx)
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { ActivityIndicator, View, StyleSheet, Alert } from 'react-native'; // Added Alert
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabaseClient';// Adjust path

// --- Import Screens ---
import AuthPage from './src/pages/AuthPage';
import CreateAccount from './src/pages/CreateAccount';
import CreateProfileScreen from './src/pages/CreateProfile'; // <= Use your detailed CreateProfile screen
import ProfileBrowseScreen from './src/pages/ProfileBrowseScreen';
// import MainAppNavigator from './navigators/MainAppNavigator';

// --- Pre-Launch Build Flag ---
const IS_PRE_LAUNCH_BUILD = true; // Set to true for TestFlight

// --- Navigation Stacks ---
const Stack = createNativeStackNavigator();

// --- Profile Type (Example based on your CreateProfile screen) ---
interface UserProfile {
    user_id: string;
    first_name: string;
    last_name?: string | null;
    date_of_birth: string; // Store as string or date? Assuming string 'YYYY-MM-DD' from DB
    gender: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    looking_for?: string | null;
    profile_pictures?: string[] | null; // Array of storage paths
    is_profile_complete: boolean; // The crucial flag
    // Add other fields if needed
}


// --- Auth Context (Example) ---
interface AppState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null; // Use the specific profile type
  isProfileComplete: boolean;
  isLoading: boolean;
  fetchProfile: (userId: string) => Promise<void>; // Add fetchProfile to context if needed elsewhere
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // Fetch profile data based on user ID
  const fetchProfile = async (userId: string) => {
      if (!userId) return; // Guard clause
      console.log('Fetching profile for user:', userId);
      // Don't set isLoading here, let the auth listener manage overall loading
      try {
          // *** SUPABASE INTERACTION (MODIFIED) ***
          // Fetching from 'individual_profiles' table.
          // Selecting relevant columns including 'is_profile_complete'.
          const { data, error, status } = await supabase
              .from('individual_profiles') // <= CHANGED TABLE NAME
              .select('user_id, first_name, profile_pictures, is_profile_complete') // Select necessary fields
              .eq('user_id', userId) // <= Match user_id column
              .single();

          if (error && status !== 406) {
              console.error('Error fetching profile:', error.message);
              throw error;
          }

          if (data) {
              console.log('Profile data found:', data);
              setProfile(data as UserProfile); // Cast fetched data
              // *** CRUCIAL CHECK *** Check the 'is_profile_complete' column
              setIsProfileComplete(data.is_profile_complete || false);
          } else {
              console.log('No profile found for user, needs creation.');
              setProfile(null);
              setIsProfileComplete(false);
          }
      } catch (error: any) {
          console.error("Error in fetchProfile:", error.message);
          // Optional: Show alert only if critical?
          // Alert.alert('Error', 'Could not fetch your profile data.');
          setProfile(null);
          setIsProfileComplete(false);
      }
      // Finally block removed - loading is handled by auth listener now
  };


  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUserId = session?.user?.id;
      setUser(session?.user ?? null);
      if (currentUserId) {
        fetchProfile(currentUserId).finally(() => setIsLoading(false)); // Fetch profile then stop loading
      } else {
        setIsLoading(false); // No user, stop loading
      }
    }).catch(error => {
        console.error("Error getting initial session:", error);
        setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth State Change:', _event, !!session);
        const currentUser = session?.user ?? null;
        const currentUserId = currentUser?.id;
        setSession(session);
        setUser(currentUser);

        if (currentUserId) {
          // User logged in or session refreshed
          setIsLoading(true); // Start loading when auth state changes to logged in
          await fetchProfile(currentUserId);
          setIsLoading(false); // Stop loading after profile fetch attempt
        } else {
          // User logged out
          setProfile(null);
          setIsProfileComplete(false);
          setIsLoading(false); // Ensure loading stops on logout
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []); // Run only once on mount


  const value = {
    session,
    user,
    profile,
    isProfileComplete,
    isLoading,
    fetchProfile, // Expose fetchProfile if needed by CreateProfile to trigger refresh
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook to use the App context
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};


// --- Root Navigation Logic ---
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
          // **Auth Stack:** No user session active
          <>
            <Stack.Screen name="AuthPage" component={AuthPage} />
            <Stack.Screen name="CreateAccount" component={CreateAccount} />
          </>
        ) : !isProfileComplete ? (
           // **Profile Creation Stack:** User logged in, profile NOT complete
           // Shows your detailed CreateProfile screen.
          <Stack.Screen name="CreateProfileScreen" component={CreateProfileScreen} />
        ) : IS_PRE_LAUNCH_BUILD ? (
           // **Pre-Launch Viewer Stack:** Logged in, profile complete, AND pre-launch build
          <Stack.Screen name="ProfileBrowseScreen" component={ProfileBrowseScreen} />
        ) : (
          // **Main App Stack:** Logged in, profile complete, NOT pre-launch build
          // <Stack.Screen name="MainApp" component={MainAppNavigator} />
           <Stack.Screen name="ProfileBrowseScreen" component={ProfileBrowseScreen} /> // TEMP: Show browser even in normal build until MainApp is ready
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --- Main App Component ---
export default function App() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
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
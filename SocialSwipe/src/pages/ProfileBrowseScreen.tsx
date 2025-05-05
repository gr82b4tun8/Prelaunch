// screens/ProfileBrowseScreen.tsx
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient'; // CHECK PATH: Relative to this file
import { useApp } from '../../App'; // CHECK PATH: Relative to this file - Is App.tsx in src/ or root? Should it be '../../App'? Does it export useApp?

interface ProfileItem {
    user_id: string;
    first_name: string;
    profile_pictures: string[] | null; // Array of storage paths
    // Add other fields if needed for display
}

// Define the combined type for state and rendering
type ProfileWithDisplayUrl = ProfileItem & { display_picture_url: string | null };

// Export the component function directly
export default function ProfileBrowseScreen() {
    const { user } = useApp(); // Get current user object (e.g., { id: string } | null)
    const [profiles, setProfiles] = useState<ProfileWithDisplayUrl[]>([]); // Use combined type
    const [loading, setLoading] = useState(false); // Start false until user is confirmed
    const [error, setError] = useState<string | null>(null);

    // Function to get the public URL (memoized with useCallback as it's stable)
    const getPublicImageUrl = useCallback((path: string | null | undefined): string | null => {
        if (!path) return null;
        try {
            // *** SUPABASE INTERACTION ***
            const { data } = supabase.storage
                .from('profile_pictures') // Ensure this bucket name is correct
                .getPublicUrl(path);
            return data?.publicUrl ?? null;
        } catch (err) {
            console.error("Error getting public URL for path", path, ":", err);
            return null;
        }
    }, []); // Empty dependency array - this function doesn't depend on component state/props

    // Function to fetch profiles (memoized with useCallback)
    const fetchProfiles = useCallback(async () => {
        // This function now relies on 'user' being available due to the useEffect dependency
        if (!user) return; // Should ideally not be hit if useEffect logic is correct

        console.log(`Workspaceing profiles, excluding user ID: ${user.id}`); // Log current user id
        setLoading(true);
        setError(null);
        setProfiles([]); // Clear previous profiles before fetching

        try {
            // *** SUPABASE INTERACTION (MODIFIED) ***
            const { data, error: fetchError } = await supabase
                .from('individual_profiles') // Ensure this table name is correct
                .select('user_id, first_name, profile_pictures') // Select relevant columns
                .eq('is_profile_complete', true) // Ensure this column exists and is boolean
                .neq('user_id', user.id) // Filter out the current user
                .limit(50); // Limit results

            if (fetchError) {
                console.error("Error fetching profiles:", fetchError);
                throw fetchError;
            }

            if (data) {
                console.log(`Workspaceed ${data.length} profiles.`);
                // Add the public URL for the first picture to each profile object
                const profilesWithUrls = data.map(profile => {
                    const firstPicPath = profile.profile_pictures?.[0]; // Get the first picture path
                    const publicUrl = getPublicImageUrl(firstPicPath); // Get its public URL
                    // Log if URL generation fails for a specific path
                    if (firstPicPath && !publicUrl) {
                       console.warn(`Could not get public URL for path: ${firstPicPath}`);
                    }
                    return { ...profile, display_picture_url: publicUrl }; // Add the URL field
                });
                setProfiles(profilesWithUrls);
            } else {
                 console.log("No profiles data received.");
                 setProfiles([]); // Ensure profiles is empty array if data is null/undefined
            }

        } catch (err: any) {
            console.error("Catch block error fetching profiles:", err);
            setError(err.message || "Failed to fetch profiles.");
        } finally {
            setLoading(false);
        }
    // }, [user, getPublicImageUrl]); // Depend on user and getPublicImageUrl
     }, [user?.id, getPublicImageUrl]); // Depend only on user.id if that's sufficient


    // useEffect to trigger fetchProfiles when user is available/changes
    useEffect(() => {
        if (user) {
            console.log("User found, fetching profiles...");
            fetchProfiles();
        } else {
             console.log("User not available yet.");
            // Optionally clear profiles or set loading state if needed when user logs out
             setProfiles([]);
             setLoading(false); // Not loading if no user
        }
    }, [user, fetchProfiles]); // Depend on user object and the fetch function itself

    // Render item function for FlatList
    const renderProfile = ({ item }: { item: ProfileWithDisplayUrl }) => ( // Use combined type
        <View style={styles.profileCard}>
            <Image
                source={item.display_picture_url ? { uri: item.display_picture_url } : require('../assets/default-avatar.png')} // CHECK PATH: Verify default avatar exists
                style={styles.avatar}
                onError={(e) => console.log(`Image load error for ${item.display_picture_url || 'default'}:`, e.nativeEvent.error)} // Log image load errors
            />
            <Text style={styles.profileName}>{item.first_name}</Text>
        </View>
    );

    // Handle case where user is not logged in yet
    if (!user && !loading) { // Check if user is explicitly null/undefined and we're not in an initial loading state
         return (
             <SafeAreaView style={styles.safeArea}>
                 <View style={styles.container}>
                     <Text style={styles.noProfilesText}>Please log in to browse profiles.</Text>
                     {/* Optionally add a login button */}
                 </View>
             </SafeAreaView>
         );
     }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <Text style={styles.title}>Meet the Early Members!</Text>
                <Text style={styles.subtitle}>Discover profiles available in your area.</Text>

                {/* Loading Indicator */}
                {loading && <ActivityIndicator size="large" color="#FF6347" style={styles.loader} />}

                {/* Error Message */}
                {!loading && error && <Text style={styles.errorText}>{error}</Text>}

                {/* No Profiles Found Message */}
                {!loading && !error && profiles.length === 0 && (
                    <Text style={styles.noProfilesText}>No other profiles found yet. Be the first to connect when we launch!</Text>
                )}

                {/* Profiles List */}
                {!loading && !error && profiles.length > 0 && (
                    <FlatList
                        data={profiles}
                        renderItem={renderProfile}
                        keyExtractor={(item) => item.user_id} // Use user_id as key
                        contentContainerStyle={styles.listContainer}
                        numColumns={2} // Display as a grid
                    />
                )}
            </View>
        </SafeAreaView>
    );
} // End of ProfileBrowseScreen component

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Light background
    },
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        color: '#6c757d', // Gray text
        marginBottom: 20,
    },
    loader: {
        marginTop: 50,
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    noProfilesText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#6c757d', // Gray text
        paddingHorizontal: 20, // Add padding for longer text
    },
    listContainer: {
        // No specific styles needed for grid if using numColumns + flex on items
        paddingBottom: 20, // Add padding at the bottom
    },
    profileCard: {
        backgroundColor: '#ffffff', // White cards
        borderRadius: 10,
        padding: 15,
        margin: 8, // Spacing between cards
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        flex: 1, // Make cards expand equally in grid row
        maxWidth: '46%', // Approx width for 2 columns considering margins (100% / 2 cols - margin)
        aspectRatio: 0.8, // Make cards slightly taller than wide
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40, // Circular avatar
        marginBottom: 10,
        backgroundColor: '#e0e0e0', // Placeholder background
    },
    profileName: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        color: '#333',
    }
});

// DO NOT add another export default line here
// screens/ProfileBrowseScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    Pressable,
    Dimensions,
} from 'react-native';
import { supabase } from '../lib/supabaseClient'; // CHECK PATH: Relative to this file
import { useApp } from '../../App'; // CHECK PATH: Relative to this file

// Import ProfileCard and its Profile interface
import ProfileCard, { Profile } from '../components/ProfileCard'; // Assuming ProfileCard.tsx is in src/components/

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Define the raw data structure fetched from Supabase
interface FetchedUserProfileData {
    user_id: string;
    first_name: string;
    last_name?: string | null;
    date_of_birth: string; // Assuming this is a string like 'YYYY-MM-DD'
    gender: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    looking_for?: string | null;
    profile_pictures: string[] | null; // Array of storage paths OR potentially full URLs
    created_at: string; // ISO string
    updated_at: string; // ISO string
    is_profile_complete: boolean; // from original query
}

export default function ProfileBrowseScreen() {
    const { user } = useApp();
    const [profiles, setProfiles] = useState<Profile[]>([]); // Store transformed profiles for ProfileCard
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Function to get the public URL
    const getPublicImageUrl = useCallback((pathOrUrl: string | null | undefined): string | null => {
        if (!pathOrUrl) {
            // console.log("getPublicImageUrl: called with null or undefined pathOrUrl");
            return null;
        }

        // Check if pathOrUrl is already a fully qualified HTTP/HTTPS URL
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
            // If it's already a URL, return it directly.
            // This prevents Supabase from prepending its base path again.
            // console.log(`getPublicImageUrl: pathOrUrl "${pathOrUrl}" is already a URL, returning as is.`);
            return pathOrUrl;
        }

        // If not a full URL, assume it's a relative path and get the public URL from Supabase storage.
        try {
            // console.log(`getPublicImageUrl: pathOrUrl "${pathOrUrl}" is a relative path, calling Supabase storage.`);
            const { data } = supabase.storage
                .from('profile_pictures') // Ensure this bucket name is correct
                .getPublicUrl(pathOrUrl); // pathOrUrl here should be relative like "folder/image.jpg"
            
            if (data?.publicUrl) {
                // console.log(`getPublicImageUrl: successfully got public URL "${data.publicUrl}" for path "${pathOrUrl}".`);
                return data.publicUrl;
            } else {
                // console.warn(`getPublicImageUrl: Supabase returned no publicUrl for path "${pathOrUrl}". Full response data:`, data);
                return null;
            }
        } catch (err) {
            console.error(`getPublicImageUrl: Error getting public URL for path "${pathOrUrl}":`, err);
            return null;
        }
    }, []); // No dependencies needed as supabase client is stable and function is pure based on input

    // Function to fetch and transform profiles
    const fetchProfiles = useCallback(async () => {
        if (!user) return;

        console.log(`Workspaceing profiles, excluding user ID: ${user.id}`);
        setLoading(true);
        setError(null);
        // Consider not clearing profiles immediately to avoid UI flicker if fetch is fast
        // setProfiles([]); 
        // setCurrentIndex(0);

        try {
            const { data, error: fetchError } = await supabase
                .from('individual_profiles') // Ensure this table name is correct
                .select('user_id, first_name, last_name, date_of_birth, gender, bio, interests, location, looking_for, profile_pictures, created_at, updated_at, is_profile_complete')
                .eq('is_profile_complete', true)
                .neq('user_id', user.id)
                .limit(50); // Adjust limit as needed

            if (fetchError) {
                console.error("Error fetching profiles:", fetchError);
                throw fetchError;
            }

            if (data && data.length > 0) {
                console.log(`Workspaceed ${data.length} raw profiles.`);
                const transformedProfiles: Profile[] = await Promise.all(
                    data.map(async (rawProfile: FetchedUserProfileData) => {
                        const profilePicturesValues = Array.isArray(rawProfile.profile_pictures) ? rawProfile.profile_pictures : [];
                        
                        const publicUrlsPromises = profilePicturesValues.map(pathOrUrl => getPublicImageUrl(pathOrUrl));
                        const resolvedUrls = await Promise.all(publicUrlsPromises);
                        const validPublicUrls = resolvedUrls.filter(url => url !== null) as string[];

                        if (profilePicturesValues.length > 0 && validPublicUrls.length === 0) {
                            console.warn(`Could not get public URLs for any paths/URLs in profile ${rawProfile.user_id}: ${profilePicturesValues.join(', ')}`);
                        } else if (profilePicturesValues.length > 0 && validPublicUrls.length < profilePicturesValues.length) {
                            console.warn(`Could not get public URLs for some paths/URLs in profile ${rawProfile.user_id}.`);
                        }
                        
                        return {
                            id: rawProfile.user_id,
                            first_name: rawProfile.first_name,
                            last_name: rawProfile.last_name,
                            date_of_birth: rawProfile.date_of_birth,
                            gender: rawProfile.gender,
                            bio: rawProfile.bio,
                            interests: rawProfile.interests,
                            location: rawProfile.location,
                            looking_for: rawProfile.looking_for,
                            profile_pictures: validPublicUrls, // Use the processed URLs
                            created_at: rawProfile.created_at || new Date().toISOString(), // Fallback if not in DB
                            updated_at: rawProfile.updated_at || new Date().toISOString(), // Fallback if not in DB
                            // is_profile_complete: rawProfile.is_profile_complete, // Not used in Profile interface directly
                        };
                    })
                );
                setProfiles(transformedProfiles);
                setCurrentIndex(0); // Reset index for the new set of profiles
                console.log(`Transformed ${transformedProfiles.length} profiles.`);
            } else {
                console.log("No profiles data received or data array is empty.");
                setProfiles([]);
                setCurrentIndex(0);
            }

        } catch (err: any) {
            console.error("Catch block error fetching profiles:", err);
            setError(err.message || "Failed to fetch profiles.");
            setProfiles([]); // Clear profiles on error
            setCurrentIndex(0);
        } finally {
            setLoading(false);
        }
    }, [user, getPublicImageUrl]); // getPublicImageUrl is memoized

    useEffect(() => {
        if (user) {
            console.log("User found, fetching profiles...");
            fetchProfiles();
        } else {
            console.log("User not available yet.");
            setProfiles([]);
            setCurrentIndex(0);
            setLoading(false); // Ensure loading is false if no user
            setError(null); // Clear any previous errors
        }
    }, [user, fetchProfiles]);

    const goToNextProfile = useCallback(() => {
        setCurrentIndex(prevIndex => {
            if (prevIndex < profiles.length - 1) {
                return prevIndex + 1;
            }
            // Optional: Loop back, show end message, or stay on last
            // Alert.alert("End of Profiles", "You've seen all available profiles!");
            return prevIndex; // Stay on last
        });
    }, [profiles.length]);

    const goToPrevProfile = useCallback(() => {
        setCurrentIndex(prevIndex => {
            if (prevIndex > 0) {
                return prevIndex - 1;
            }
            return prevIndex; // Stay on first
        });
    }, []);

    const handleLikeProfile = useCallback(async (likedProfileId: string) => {
        if (!user) {
            Alert.alert("Login Required", "Please log in to like profiles.");
            return;
        }
        console.log(`User ${user.id} liked profile ${likedProfileId}`);
        try {
            const { error: likeError } = await supabase.from('profile_likes').insert({
                liker_user_id: user.id,
                liked_profile_id: likedProfileId, 
            });

            if (likeError) throw likeError;

            Alert.alert("Liked!", `${profiles.find(p => p.id === likedProfileId)?.first_name || 'Profile'} has been liked.`);
            // goToNextProfile(); // Optionally advance to the next profile after a like
        } catch (err: any) {
            console.error("Error liking profile:", err);
            Alert.alert("Error", err.message || "Could not record your like. Please try again.");
        }
    }, [user, profiles/*, goToNextProfile*/]);


    if (!user && !loading) { // Also check loading state
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.infoText}>Please log in to browse profiles.</Text>
                </View>
            </SafeAreaView>
        );
    }
    
    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centeredMessageContainer}>
                    <ActivityIndicator size="large" color="#FF6347" />
                    <Text style={styles.loadingText}>Finding profiles...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable onPress={fetchProfiles} style={styles.button}>
                        <Text style={styles.buttonText}>Try Again</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    if (profiles.length === 0) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.infoText}>No other profiles found yet. Check back soon!</Text>
                     <Pressable onPress={fetchProfiles} style={styles.button}>
                        <Text style={styles.buttonText}>Refresh</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const currentProfile = profiles[currentIndex];

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.storyContainer}>
                {/* Progress Bars */}
                <View style={styles.progressBarsContainer}>
                    {profiles.map((_, index) => (
                        <View
                            key={`progress-${index}`}
                            style={[
                                styles.progressBarSegment,
                                index === currentIndex ? styles.progressBarSegmentActive : styles.progressBarSegmentInactive,
                            ]}
                        />
                    ))}
                </View>

                {/* Profile Card Display */}
                {currentProfile ? (
                    <ProfileCard
                        profile={currentProfile}
                        onLike={handleLikeProfile} 
                        isVisible={true} 
                    />
                ) : (
                    // This case should ideally not be hit if profiles.length > 0 and currentIndex is valid
                    <View style={styles.centeredMessageContainer}> 
                        <Text style={styles.infoText}>Loading profile...</Text>
                    </View>
                )}

                {/* Tap Navigation Areas */}
                <Pressable style={styles.tapAreaLeft} onPress={goToPrevProfile} />
                <Pressable style={styles.tapAreaRight} onPress={goToNextProfile} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#1c1c1e', 
    },
    storyContainer: {
        flex: 1,
        justifyContent: 'center', 
        alignItems: 'center', 
        position: 'relative', 
    },
    centeredMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#f0f0f0',
    },
    errorText: {
        color: '#FF6347', 
        textAlign: 'center',
        fontSize: 16,
        marginBottom: 20,
    },
    infoText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#d3d3d3', 
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    button: {
        marginTop: 10, // Adjusted from 20 to 10 if error/info text has margin bottom
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#FF6347',
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressBarsContainer: {
        position: 'absolute',
        top: 10, 
        left: 10,
        right: 10,
        flexDirection: 'row',
        height: 3,
        zIndex: 10,
        gap: 4, 
    },
    progressBarSegment: {
        flex: 1,
        height: '100%',
        borderRadius: 1.5,
    },
    progressBarSegmentActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    progressBarSegmentInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    tapAreaLeft: {
        position: 'absolute',
        left: 0,
        top: 0, 
        bottom: 0,
        width: '30%', 
        zIndex: 5, 
        // backgroundColor: 'rgba(0, 255, 0, 0.05)', // For debugging tap area
    },
    tapAreaRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '70%', // Covers right 70% of the screen for 'next'
        zIndex: 5,
        // backgroundColor: 'rgba(255, 0, 0, 0.05)', // For debugging tap area
    },
});
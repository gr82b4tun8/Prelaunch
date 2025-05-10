// screens/ProfileBrowseScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView, // We'll use this for content padding inside the gradient & for overlays
    Alert,
    Pressable,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Ensure this is installed
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../../App';

import ProfileCard, { Profile } from '../components/ProfileCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FetchedUserProfileData {
    user_id: string;
    first_name: string;
    last_name?: string | null;
    date_of_birth: string;
    gender: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    looking_for?: string | null;
    profile_pictures: string[] | null;
    created_at: string;
    updated_at: string;
    is_profile_complete: boolean;
}

export default function ProfileBrowseScreen() {
    const { user } = useApp();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getPublicImageUrl = useCallback((pathOrUrl: string | null | undefined): string | null => {
        if (!pathOrUrl) return null;
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
        try {
            const { data } = supabase.storage.from('profile_pictures').getPublicUrl(pathOrUrl);
            return data?.publicUrl ?? null;
        } catch (err) {
            console.error(`getPublicImageUrl: Error for path "${pathOrUrl}":`, err);
            return null;
        }
    }, []);

    const fetchProfiles = useCallback(async () => {
        if (!user) return;
        console.log(`Workspaceing profiles, excluding user ID: ${user.id}`);
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('individual_profiles')
                .select('user_id, first_name, last_name, date_of_birth, gender, bio, interests, location, looking_for, profile_pictures, created_at, updated_at, is_profile_complete')
                .eq('is_profile_complete', true)
                .neq('user_id', user.id)
                .limit(50);

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                console.log(`Workspaceed ${data.length} raw profiles.`);
                const transformedProfiles: Profile[] = await Promise.all(
                    data.map(async (rawProfile: FetchedUserProfileData) => {
                        const profilePicturesValues = Array.isArray(rawProfile.profile_pictures) ? rawProfile.profile_pictures : [];
                        const publicUrlsPromises = profilePicturesValues.map(pathOrUrl => getPublicImageUrl(pathOrUrl));
                        const resolvedUrls = await Promise.all(publicUrlsPromises);
                        const validPublicUrls = resolvedUrls.filter(url => url !== null) as string[];
                        
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
                            profile_pictures: validPublicUrls,
                            created_at: rawProfile.created_at || new Date().toISOString(),
                            updated_at: rawProfile.updated_at || new Date().toISOString(),
                        };
                    })
                );
                setProfiles(transformedProfiles);
                setCurrentIndex(0);
            } else {
                setProfiles([]);
                setCurrentIndex(0);
            }
        } catch (err: any) {
            console.error("Error fetching profiles:", err.message);
            setError(err.message || "Failed to fetch profiles.");
            setProfiles([]);
            setCurrentIndex(0);
        } finally {
            setLoading(false);
        }
    }, [user, getPublicImageUrl]);

    useEffect(() => {
        if (user) fetchProfiles();
        else {
            setProfiles([]);
            setCurrentIndex(0);
            setLoading(false);
            setError(null);
        }
    }, [user, fetchProfiles]);

    const goToNextProfile = useCallback(() => setCurrentIndex(prev => Math.min(prev + 1, profiles.length - 1)), [profiles.length]);
    const goToPrevProfile = useCallback(() => setCurrentIndex(prev => Math.max(prev - 1, 0)), []);

    // --- MODIFIED LIKING LOGIC ---
    const handleLikeProfile = useCallback(async (likedProfileId: string) => {
        if (!user) {
            Alert.alert("Login Required", "Please log in to like profiles.");
            return;
        }

        console.log(`Attempting to like profile: ${likedProfileId}`);
        // Note: No isLiking state in this component, proceed with caution for rapid clicks.
        // If ProfileCard's onLike can be called rapidly, consider adding a loading state for the like action.

        try {
            const likerUserId = user.id;
            const likeData = { liker_user_id: likerUserId, liked_user_id: likedProfileId };
            
            console.log('Inserting like:', likeData);
            const { error: insertError } = await supabase.from('likes').insert([likeData]);

            if (insertError) {
                if (insertError.code === '23505') { // Unique violation (already liked)
                    console.warn(`Like already exists for profile ${likedProfileId}`);
                    Alert.alert("Already Liked", `You've already liked ${profiles.find(p => p.id === likedProfileId)?.first_name || 'this profile'}.`);
                } else {
                    // Throw other insert errors to be caught by the generic catch block
                    throw new Error(`Failed to insert like: ${insertError.message} (Code: ${insertError.code})`);
                }
            } else {
                console.log(`Successfully liked profile ${likedProfileId}`);
                Alert.alert("Liked!", `${profiles.find(p => p.id === likedProfileId)?.first_name || 'Profile'} has been liked.`);
            }
        } catch (err: any) {
            console.error("Error in handleLikeProfile:", err);
            Alert.alert("Error Liking Profile", err.message || "Could not record like. Please try again.");
        }
    }, [user, profiles]);
    // --- END OF MODIFIED LIKING LOGIC ---

    if (!user && !loading) {
        return (
            <SafeAreaView style={styles.safeAreaSolidBackground}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.infoText}>Please log in to browse profiles.</Text>
                </View>
            </SafeAreaView>
        );
    }
    if (loading) {
        return (
            <SafeAreaView style={styles.safeAreaSolidBackground}>
                <View style={styles.centeredMessageContainer}>
                    <ActivityIndicator size="large" color="#FF6347" />
                    <Text style={styles.loadingText}>Finding profiles...</Text>
                </View>
            </SafeAreaView>
        );
    }
    if (error) {
        return (
            <SafeAreaView style={styles.safeAreaSolidBackground}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable onPress={fetchProfiles} style={styles.button}><Text style={styles.buttonText}>Try Again</Text></Pressable>
                </View>
            </SafeAreaView>
        );
    }
    if (profiles.length === 0 && user) {
        return (
            <SafeAreaView style={styles.safeAreaSolidBackground}>
                <View style={styles.centeredMessageContainer}>
                    <Text style={styles.infoText}>No other profiles found yet. Check back soon!</Text>
                    <Pressable onPress={fetchProfiles} style={styles.button}><Text style={styles.buttonText}>Refresh</Text></Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const currentProfile = profiles[currentIndex];

    return (
        <LinearGradient
            colors={['#FF6B6B', '#FFD166']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientFullScreen}
        >
            {currentProfile ? (
                <ProfileCard
                    profile={currentProfile}
                    onLike={handleLikeProfile} // This now uses the updated logic
                    isVisible={true}
                    onRequestNextProfile={goToNextProfile}
                    onRequestPrevProfile={goToPrevProfile}
                />
            ) : (
                !loading && (
                    <View style={styles.centeredMessageContainerOnGradient}>
                        <Text style={styles.infoText}>No profile to display.</Text>
                    </View>
                )
            )}

            {/* Progress bars overlay, shown only when there are profiles and a current profile exists */}
            {profiles.length > 0 && currentProfile && (
                <SafeAreaView style={styles.progressSafeArea}>
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
                </SafeAreaView>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientFullScreen: {
        flex: 1,
    },
    safeAreaSolidBackground: { 
        flex: 1,
        backgroundColor: '#1c1c1e',
    },
    centeredMessageContainer: { // For loading/error/login states on solid background
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centeredMessageContainerOnGradient: { // For "No profile to display" on gradient background
        flex: 1, // Takes up space if ProfileCard isn't rendered
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'transparent', // Ensures gradient shows through
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
        color: '#d3d3d3', // Consider a lighter color if on dark gradient, or keep as is
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    button: {
        marginTop: 10,
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
    progressSafeArea: { // SafeAreaView for progress bars, positioned absolutely
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10, // Ensures progress bars are on top of ProfileCard
    },
    progressBarsContainer: { // Container for the actual progress bar segments
        flexDirection: 'row',
        height: 3,
        marginHorizontal: 10, // Spacing from screen edges for the group of bars
        gap: 4,             // Spacing between individual bar segments
        marginTop: 10,      // Spacing from the top edge of the SafeAreaView content area
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
});
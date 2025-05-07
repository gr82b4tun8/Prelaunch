// screens/ProfileBrowseScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    Pressable, // Keep Pressable for buttons like "Try Again", "Refresh"
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
        if (!pathOrUrl) {
            return null;
        }
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
            return pathOrUrl;
        }
        try {
            const { data } = supabase.storage
                .from('profile_pictures')
                .getPublicUrl(pathOrUrl);
            return data?.publicUrl ?? null;
        } catch (err) {
            console.error(`getPublicImageUrl: Error getting public URL for path "${pathOrUrl}":`, err);
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
                            profile_pictures: validPublicUrls,
                            created_at: rawProfile.created_at || new Date().toISOString(),
                            updated_at: rawProfile.updated_at || new Date().toISOString(),
                        };
                    })
                );
                setProfiles(transformedProfiles);
                setCurrentIndex(0);
                console.log(`Transformed ${transformedProfiles.length} profiles.`);
            } else {
                console.log("No profiles data received or data array is empty.");
                setProfiles([]);
                setCurrentIndex(0);
            }
        } catch (err: any) {
            console.error("Catch block error fetching profiles:", err);
            setError(err.message || "Failed to fetch profiles.");
            setProfiles([]);
            setCurrentIndex(0);
        } finally {
            setLoading(false);
        }
    }, [user, getPublicImageUrl]);

    useEffect(() => {
        if (user) {
            console.log("User found, fetching profiles...");
            fetchProfiles();
        } else {
            console.log("User not available yet.");
            setProfiles([]);
            setCurrentIndex(0);
            setLoading(false);
            setError(null);
        }
    }, [user, fetchProfiles]);

    const goToNextProfile = useCallback(() => {
        setCurrentIndex(prevIndex => {
            if (prevIndex < profiles.length - 1) {
                return prevIndex + 1;
            }
            return prevIndex;
        });
    }, [profiles.length]);

    const goToPrevProfile = useCallback(() => {
        setCurrentIndex(prevIndex => {
            if (prevIndex > 0) {
                return prevIndex - 1;
            }
            return prevIndex;
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
        } catch (err: any) {
            console.error("Error liking profile:", err);
            Alert.alert("Error", err.message || "Could not record your like. Please try again.");
        }
    }, [user, profiles]);

    if (!user && !loading) {
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
                {/* Progress Bars for overall profile Browse */}
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
                        // ---- NEW PROPS FOR ProfileCard ----
                        // ProfileCard needs to implement its own tap handling for image navigation
                        // and then call these functions to navigate between profiles when appropriate
                        // (e.g., at the first/last image of the current profile).
                        onRequestNextProfile={goToNextProfile}
                        onRequestPrevProfile={goToPrevProfile}
                    />
                ) : (
                    <View style={styles.centeredMessageContainer}> 
                        <Text style={styles.infoText}>Loading profile...</Text>
                    </View>
                )}

                {/* The large Pressable tapAreaLeft and tapAreaRight have been REMOVED from here.
                    The ProfileCard component should now be responsible for:
                    1. Handling taps to navigate its own internal images (if multiple exist).
                       This includes rendering its own "arrows" or tap zones for image navigation.
                    2. Calling `onRequestNextProfile` or `onRequestPrevProfile` when a tap
                       (e.g., on the edge of the card or a specific arrow) indicates that
                       navigation should proceed to the next or previous user profile, typically
                       after exhausting the current profile's images or from the first image.
                */}
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
    progressBarsContainer: {
        position: 'absolute',
        top: 10, 
        left: 10,
        right: 10,
        flexDirection: 'row',
        height: 3,
        zIndex: 10, // Ensure it's above the ProfileCard if ProfileCard is full screen
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
    // The styles for `tapAreaLeft` and `tapAreaRight` are no longer used by Pressables
    // in this component. You can remove them if they are not used elsewhere.
    /*
    tapAreaLeft: {
        position: 'absolute',
        left: 0,
        top: 0, 
        bottom: 0,
        width: '30%', 
        zIndex: 5, 
    },
    tapAreaRight: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '70%', 
        zIndex: 5,
    },
    */
});